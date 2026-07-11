import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/schemas";
import { classifyTypedAnswer, normalizeWord } from "@/lib/utils";

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
});
