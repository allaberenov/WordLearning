import { NextResponse } from "next/server";
import { apiOk, handleApiError, readJson } from "@/lib/api";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireRateLimit(`auth:login:${getClientIp(request)}`, 10, 15 * 60 * 1000);
    const input = await readJson(request, loginSchema, { maxBytes: 5_000 });
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Неверный email или пароль.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const session = await createSession(user.id);
    const response = apiOk({ user: { id: user.id, email: user.email, name: user.name } });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
