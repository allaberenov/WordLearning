import { formatDurationRu } from "@/lib/duration";

export type ProviderRateLimitDetails = {
  provider: "groq";
  retryAfterSeconds: number | null;
  limitType: "RPM" | "TPM" | "RPD" | "TPD" | "QUOTA" | "UNKNOWN";
  limitRequests: number | null;
  remainingRequests: number | null;
  resetRequests: string | null;
  limitTokens: number | null;
  remainingTokens: number | null;
  resetTokens: string | null;
  providerMessage: string | null;
};

function parseHeaderNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parseRetryAfter(value: string | null, now = new Date()) {
  if (!value) return null;

  const trimmed = value.trim();
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) return Math.max(0, Math.ceil(numeric));

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;

  return Math.max(0, Math.ceil((timestamp - now.getTime()) / 1000));
}

function includesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function resetLooksLong(resetValue: string | null, retryAfterSeconds: number | null) {
  if (retryAfterSeconds != null) return retryAfterSeconds >= 60 * 60;
  if (!resetValue) return false;

  const numeric = resetValue.match(/(\d+(?:\.\d+)?)/)?.[1];
  if (!numeric) return false;

  const value = Number(numeric);
  if (!Number.isFinite(value)) return false;

  if (/d/i.test(resetValue)) return value >= 1;
  if (/h/i.test(resetValue)) return value >= 1;
  if (/m/i.test(resetValue)) return value >= 60;
  if (/s/i.test(resetValue)) return value >= 60 * 60;
  return value >= 60 * 60;
}

export function detectGroqLimitType(
  details: Pick<
    ProviderRateLimitDetails,
    | "retryAfterSeconds"
    | "remainingRequests"
    | "resetRequests"
    | "remainingTokens"
    | "resetTokens"
    | "providerMessage"
  >
): ProviderRateLimitDetails["limitType"] {
  const message = details.providerMessage?.toLowerCase() || "";

  if (includesAny(message, [/tokens?\s+per\s+day/, /\btpd\b/])) return "TPD";
  if (includesAny(message, [/requests?\s+per\s+day/, /\brpd\b/])) return "RPD";
  if (includesAny(message, [/tokens?\s+per\s+minute/, /\btpm\b/])) return "TPM";
  if (includesAny(message, [/requests?\s+per\s+minute/, /\brpm\b/])) return "RPM";
  if (includesAny(message, [/quota/, /billing/, /insufficient/])) return "QUOTA";

  if (details.remainingTokens === 0) {
    return resetLooksLong(details.resetTokens, details.retryAfterSeconds) ? "TPD" : "TPM";
  }

  if (details.remainingRequests === 0) {
    return resetLooksLong(details.resetRequests, details.retryAfterSeconds) ? "RPD" : "RPM";
  }

  return "UNKNOWN";
}

export function parseGroqRateLimitHeaders(
  headers: Headers,
  providerMessage: string | null = null
): ProviderRateLimitDetails {
  const details: ProviderRateLimitDetails = {
    provider: "groq",
    retryAfterSeconds: parseRetryAfter(headers.get("retry-after")),
    limitType: "UNKNOWN",
    limitRequests: parseHeaderNumber(headers.get("x-ratelimit-limit-requests")),
    remainingRequests: parseHeaderNumber(headers.get("x-ratelimit-remaining-requests")),
    resetRequests: headers.get("x-ratelimit-reset-requests"),
    limitTokens: parseHeaderNumber(headers.get("x-ratelimit-limit-tokens")),
    remainingTokens: parseHeaderNumber(headers.get("x-ratelimit-remaining-tokens")),
    resetTokens: headers.get("x-ratelimit-reset-tokens"),
    providerMessage: providerMessage ? providerMessage.slice(0, 300) : null
  };

  details.limitType = detectGroqLimitType(details);
  return details;
}

export function toPublicGroqRateLimitDetails(details: ProviderRateLimitDetails) {
  return {
    ...details,
    providerMessage: null
  };
}

export function buildGroqRateLimitMessage(details: ProviderRateLimitDetails) {
  const duration = details.retryAfterSeconds != null
    ? ` через ${formatDurationRu(details.retryAfterSeconds)}`
    : " немного позже";

  if (details.limitType === "RPD" || details.limitType === "TPD" || details.limitType === "QUOTA") {
    const reset = details.retryAfterSeconds != null
      ? ` Ориентир: через ${formatDurationRu(details.retryAfterSeconds)}.`
      : "";
    return `Суточная квота Groq исчерпана. Генерация станет доступна после сброса лимита.${reset}`;
  }

  if (details.limitType === "TPM") {
    return `Временный лимит токенов Groq исчерпан. Повторите запрос${duration}.`;
  }

  if (details.limitType === "RPM") {
    return `Временный лимит Groq исчерпан. Повторите запрос${duration}.`;
  }

  return "Groq временно ограничил генерацию. Повторите запрос позже.";
}
