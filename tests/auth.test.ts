import { describe, expect, it } from "vitest";
import { hashPassword, hashSessionToken, verifyPassword } from "@/lib/auth";

describe("auth primitives", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("demo12345");
    expect(hash).not.toBe("demo12345");
    await expect(verifyPassword("demo12345", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("hashes session tokens deterministically without storing raw token", () => {
    const token = "session-token";
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
