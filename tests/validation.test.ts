import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { getGenerationRateLimits, requireGenerationRateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/schemas";
import { classifyTypedAnswer, normalizeWord } from "@/lib/utils";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("validation and text comparison", () => {
  it("validates registration and login payloads", () => {
    expect(registerSchema.safeParse({ email: "user@example.com", password: "strongpass" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
  });

  it("normalizes duplicates case-insensitively and trims extra spaces", () => {
    expect(normalizeWord("  Look   up  ")).toBe("look up");
    expect(normalizeWord("Abandon")).toBe(normalizeWord(" abandon "));
  });

  it("separates typo from wrong answer", () => {
    expect(classifyTypedAnswer("abandno", "abandon")).toBe("typo");
    expect(classifyTypedAnswer("leave", "abandon")).toBe("wrong");
    expect(classifyTypedAnswer(" ABANDON ", "abandon")).toBe("correct");
  });

  it("reads generation request limits from env", () => {
    const originalRpm = process.env.GENERATION_RATE_LIMIT_RPM;
    const originalRpd = process.env.GENERATION_RATE_LIMIT_RPD;

    try {
      process.env.GENERATION_RATE_LIMIT_RPM = "7";
      process.env.GENERATION_RATE_LIMIT_RPD = "77";
      expect(getGenerationRateLimits()).toEqual({ requestsPerMinute: 7, requestsPerDay: 77 });
    } finally {
      restoreEnv("GENERATION_RATE_LIMIT_RPM", originalRpm);
      restoreEnv("GENERATION_RATE_LIMIT_RPD", originalRpd);
    }
  });

  it("rate limits generation requests by minute and day", () => {
    const originalRpm = process.env.GENERATION_RATE_LIMIT_RPM;
    const originalRpd = process.env.GENERATION_RATE_LIMIT_RPD;
    const request = new Request("http://localhost/api/generate", {
      headers: { "x-forwarded-for": "203.0.113.31" }
    });

    try {
      process.env.GENERATION_RATE_LIMIT_RPM = "1";
      process.env.GENERATION_RATE_LIMIT_RPD = "1";
      requireGenerationRateLimit("rate-limit-test-user", request);
      expect(() => requireGenerationRateLimit("rate-limit-test-user", request)).toThrow(ApiError);
    } finally {
      restoreEnv("GENERATION_RATE_LIMIT_RPM", originalRpm);
      restoreEnv("GENERATION_RATE_LIMIT_RPD", originalRpd);
    }
  });
});
