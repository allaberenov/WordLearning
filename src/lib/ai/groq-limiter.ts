import { ApiError } from "@/lib/api";
import { formatDurationRu } from "@/lib/duration";
import { checkRateLimit, readPositiveIntEnv } from "@/lib/rate-limit";

export type GroqOperation = "generate_card" | "sentence_check";

type QueueEntry = {
  operation: GroqOperation;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  signal?: AbortSignal;
  timeout: ReturnType<typeof setTimeout> | null;
  abortHandler: (() => void) | null;
};

let activeRequests = 0;
const queue: QueueEntry[] = [];

export function getGroqGlobalRateLimits() {
  return {
    requestsPerMinute: readPositiveIntEnv("GROQ_GLOBAL_RPM", 25),
    requestsPerDay: readPositiveIntEnv("GROQ_GLOBAL_RPD", 900)
  };
}

function localLimitDetails(retryAfterSeconds: number, limitType: "RPM" | "RPD") {
  return {
    provider: "groq",
    retryAfterSeconds,
    limitType,
    limitRequests: null,
    remainingRequests: 0,
    resetRequests: null,
    limitTokens: null,
    remainingTokens: null,
    resetTokens: null,
    providerMessage: null
  };
}

export function requireGroqGlobalRateLimit(operation: GroqOperation) {
  const limits = getGroqGlobalRateLimits();
  const minute = checkRateLimit("groq:global:minute", limits.requestsPerMinute, 60 * 1000);
  if (!minute.ok) {
    throw new ApiError(
      429,
      `Временный лимит Groq исчерпан. Повторите запрос через ${formatDurationRu(minute.retryAfter)}.`,
      "GROQ_RATE_LIMITED",
      localLimitDetails(minute.retryAfter, "RPM")
    );
  }

  const day = checkRateLimit("groq:global:day", limits.requestsPerDay, 24 * 60 * 60 * 1000);
  if (!day.ok) {
    throw new ApiError(
      429,
      "Суточная квота Groq исчерпана. Генерация станет доступна после сброса лимита.",
      "GROQ_RATE_LIMITED",
      localLimitDetails(day.retryAfter, "RPD")
    );
  }

  console.info("Groq local provider limit accepted", {
    operation,
    remainingMinute: minute.remaining,
    remainingDay: day.remaining
  });
}

function getQueueConfig() {
  return {
    maxConcurrency: readPositiveIntEnv("GROQ_MAX_CONCURRENCY", 1),
    maxSize: readPositiveIntEnv("GROQ_QUEUE_MAX_SIZE", 20),
    timeoutMs: readPositiveIntEnv("GROQ_QUEUE_TIMEOUT_MS", 15_000)
  };
}

function cleanup(entry: QueueEntry) {
  if (entry.timeout) clearTimeout(entry.timeout);
  if (entry.signal && entry.abortHandler) {
    entry.signal.removeEventListener("abort", entry.abortHandler);
  }
  entry.timeout = null;
  entry.abortHandler = null;
}

function removeQueuedEntry(entry: QueueEntry) {
  const index = queue.indexOf(entry);
  if (index >= 0) queue.splice(index, 1);
}

function runEntry(entry: QueueEntry) {
  cleanup(entry);
  activeRequests += 1;

  entry
    .run()
    .then(entry.resolve, entry.reject)
    .finally(() => {
      activeRequests = Math.max(0, activeRequests - 1);
      drainQueue();
    });
}

function drainQueue() {
  const { maxConcurrency } = getQueueConfig();
  while (activeRequests < maxConcurrency && queue.length > 0) {
    const entry = queue.shift();
    if (!entry) return;
    if (entry.signal?.aborted) {
      cleanup(entry);
      entry.reject(new ApiError(499, "Запрос отменён.", "REQUEST_ABORTED"));
      continue;
    }
    runEntry(entry);
  }
}

export function runWithGroqQueue<T>(
  operation: GroqOperation,
  signal: AbortSignal,
  task: () => Promise<T>
): Promise<T> {
  const { maxConcurrency, maxSize, timeoutMs } = getQueueConfig();

  if (signal.aborted) {
    return Promise.reject(new ApiError(499, "Запрос отменён.", "REQUEST_ABORTED"));
  }

  if (activeRequests < maxConcurrency) {
    activeRequests += 1;
    return task().finally(() => {
      activeRequests = Math.max(0, activeRequests - 1);
      drainQueue();
    });
  }

  if (queue.length >= maxSize) {
    return Promise.reject(
      new ApiError(
        429,
        "Очередь AI-запросов заполнена. Повторите запрос через несколько секунд.",
        "GROQ_QUEUE_FULL",
        { provider: "groq", operation, maxSize }
      )
    );
  }

  return new Promise<T>((resolve, reject) => {
    const entry: QueueEntry = {
      operation,
      run: task,
      resolve: (value) => resolve(value as T),
      reject,
      signal,
      timeout: null,
      abortHandler: null
    };

    entry.abortHandler = () => {
      removeQueuedEntry(entry);
      cleanup(entry);
      reject(new ApiError(499, "Запрос отменён.", "REQUEST_ABORTED"));
    };

    entry.timeout = setTimeout(() => {
      removeQueuedEntry(entry);
      cleanup(entry);
      reject(
        new ApiError(
          429,
          `Очередь AI-запросов не освободилась за ${formatDurationRu(Math.ceil(timeoutMs / 1000))}. Повторите позже.`,
          "GROQ_QUEUE_TIMEOUT",
          { provider: "groq", operation, timeoutMs }
        )
      );
    }, timeoutMs);

    signal.addEventListener("abort", entry.abortHandler, { once: true });
    queue.push(entry);
    drainQueue();
  });
}

export function getGroqQueueSnapshot() {
  return {
    activeRequests,
    queuedRequests: queue.length
  };
}

export function resetGroqQueueForTests() {
  for (const entry of queue) {
    cleanup(entry);
    entry.reject(new ApiError(499, "Запрос отменён.", "REQUEST_ABORTED"));
  }
  queue.length = 0;
  activeRequests = 0;
}

// The limiter and queue are in-memory and protect only one Node.js process.
// Use Redis or another shared store when running multiple replicas.
