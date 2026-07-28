import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  getGroqQueueSnapshot,
  resetGroqQueueForTests,
  runWithGroqQueue
} from "@/lib/ai/groq-limiter";

const envNames = ["GROQ_MAX_CONCURRENCY", "GROQ_QUEUE_MAX_SIZE", "GROQ_QUEUE_TIMEOUT_MS"];
const originalEnv = new Map(envNames.map((name) => [name, process.env[name]]));

function restoreEnv() {
  for (const name of envNames) {
    const value = originalEnv.get(name);
    if (value == null) delete process.env[name];
    else process.env[name] = value;
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

describe("Groq request queue", () => {
  afterEach(() => {
    resetGroqQueueForTests();
    restoreEnv();
  });

  it("respects max concurrency", async () => {
    process.env.GROQ_MAX_CONCURRENCY = "1";
    process.env.GROQ_QUEUE_MAX_SIZE = "2";
    process.env.GROQ_QUEUE_TIMEOUT_MS = "1000";

    const firstRelease = deferred<string>();
    const started: string[] = [];

    const first = runWithGroqQueue("generate_card", new AbortController().signal, async () => {
      started.push("first");
      return firstRelease.promise;
    });
    const second = runWithGroqQueue("generate_card", new AbortController().signal, async () => {
      started.push("second");
      return "second-result";
    });

    await Promise.resolve();
    expect(started).toEqual(["first"]);
    expect(getGroqQueueSnapshot()).toEqual({ activeRequests: 1, queuedRequests: 1 });

    firstRelease.resolve("first-result");

    await expect(Promise.all([first, second])).resolves.toEqual(["first-result", "second-result"]);
    expect(started).toEqual(["first", "second"]);
  });

  it("rejects when the queue is full", async () => {
    process.env.GROQ_MAX_CONCURRENCY = "1";
    process.env.GROQ_QUEUE_MAX_SIZE = "1";
    process.env.GROQ_QUEUE_TIMEOUT_MS = "1000";

    const firstRelease = deferred<string>();
    const first = runWithGroqQueue("generate_card", new AbortController().signal, () => firstRelease.promise);
    const second = runWithGroqQueue("generate_card", new AbortController().signal, async () => "queued");

    await expect(
      runWithGroqQueue("generate_card", new AbortController().signal, async () => "overflow")
    ).rejects.toMatchObject({ code: "GROQ_QUEUE_FULL" });

    firstRelease.resolve("first");
    await Promise.all([first, second]);
  });

  it("removes an aborted waiting request", async () => {
    process.env.GROQ_MAX_CONCURRENCY = "1";
    process.env.GROQ_QUEUE_MAX_SIZE = "2";
    process.env.GROQ_QUEUE_TIMEOUT_MS = "1000";

    const firstRelease = deferred<string>();
    const first = runWithGroqQueue("sentence_check", new AbortController().signal, () => firstRelease.promise);
    const waitingController = new AbortController();
    const waiting = runWithGroqQueue("sentence_check", waitingController.signal, async () => "unused");

    waitingController.abort();

    await expect(waiting).rejects.toMatchObject({ code: "REQUEST_ABORTED" });
    expect(getGroqQueueSnapshot()).toEqual({ activeRequests: 1, queuedRequests: 0 });

    firstRelease.resolve("first");
    await first;
  });

  it("times out waiting requests", async () => {
    process.env.GROQ_MAX_CONCURRENCY = "1";
    process.env.GROQ_QUEUE_MAX_SIZE = "2";
    process.env.GROQ_QUEUE_TIMEOUT_MS = "20";

    const firstRelease = deferred<string>();
    const first = runWithGroqQueue("generate_card", new AbortController().signal, () => firstRelease.promise);
    const waiting = runWithGroqQueue("generate_card", new AbortController().signal, async () => "unused");

    await expect(waiting).rejects.toBeInstanceOf(ApiError);
    await expect(waiting).rejects.toMatchObject({ code: "GROQ_QUEUE_TIMEOUT" });

    firstRelease.resolve("first");
    await first;
  });
});
