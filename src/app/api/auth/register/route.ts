import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, handleApiError, readJson } from "@/lib/api";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireRateLimit(`auth:register:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    const input = await readJson(request, registerSchema, { maxBytes: 5_000 });
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name || null,
        settings: {
          create: {
            timezone: "UTC",
            interfaceLanguage: "ru",
            newCardsPerDay: 10,
            maxReviewsPerDay: 100,
            desiredRetention: 0.9,
            theme: "SYSTEM"
          }
        }
      },
      include: { settings: true }
    });

    const session = await createSession(user.id);
    const response = apiOk({ user: { id: user.id, email: user.email, name: user.name } });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует.", code: "EMAIL_EXISTS" },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
}
