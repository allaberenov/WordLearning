import { describe, expect, it } from "vitest";
import {
  detectGroqLimitType,
  parseGroqRateLimitHeaders,
  parseRetryAfter
} from "@/lib/ai/rate-limit-headers";
import { formatDurationRu } from "@/lib/duration";

describe("Groq rate-limit headers", () => {
  it("parses numeric retry-after", () => {
    expect(parseRetryAfter("18")).toBe(18);
  });

  it("parses HTTP-date retry-after", () => {
    const now = new Date("2026-07-28T10:00:00.000Z");
    expect(parseRetryAfter("Tue, 28 Jul 2026 10:01:30 GMT", now)).toBe(90);
  });

  it("returns null when retry-after is missing", () => {
    expect(parseRetryAfter(null)).toBeNull();
  });

  it("detects RPM, TPM, RPD, TPD, QUOTA and UNKNOWN", () => {
    const base = {
      retryAfterSeconds: null,
      remainingRequests: null,
      resetRequests: null,
      remainingTokens: null,
      resetTokens: null
    };

    expect(detectGroqLimitType({ ...base, providerMessage: "Requests per minute (RPM) reached" })).toBe("RPM");
    expect(detectGroqLimitType({ ...base, providerMessage: "Tokens per minute TPM reached" })).toBe("TPM");
    expect(detectGroqLimitType({ ...base, providerMessage: "Requests per day RPD reached" })).toBe("RPD");
    expect(detectGroqLimitType({ ...base, providerMessage: "Tokens per day TPD reached" })).toBe("TPD");
    expect(detectGroqLimitType({ ...base, providerMessage: "Project quota exceeded" })).toBe("QUOTA");
    expect(detectGroqLimitType({ ...base, providerMessage: null })).toBe("UNKNOWN");
  });

  it("parses Groq request and token headers", () => {
    const headers = new Headers({
      "retry-after": "20",
      "x-ratelimit-limit-requests": "1000",
      "x-ratelimit-remaining-requests": "0",
      "x-ratelimit-reset-requests": "20s",
      "x-ratelimit-limit-tokens": "6000",
      "x-ratelimit-remaining-tokens": "1200",
      "x-ratelimit-reset-tokens": "8s"
    });

    expect(parseGroqRateLimitHeaders(headers, "Requests per minute exceeded")).toMatchObject({
      provider: "groq",
      retryAfterSeconds: 20,
      limitType: "RPM",
      limitRequests: 1000,
      remainingRequests: 0,
      resetRequests: "20s",
      limitTokens: 6000,
      remainingTokens: 1200,
      resetTokens: "8s"
    });
  });

  it("formats long durations without raw seconds", () => {
    expect(formatDurationRu(45)).toBe("45 секунд");
    expect(formatDurationRu(180)).toBe("3 минуты");
    expect(formatDurationRu(77965)).toBe("21 час 39 минут");
  });
});
