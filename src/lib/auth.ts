import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export const SESSION_COOKIE = "wl_session";
const SESSION_DAYS = 30;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a long random value.");
    }
    return "development-only-auth-secret-change-me";
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createRawSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function createSession(userId: string) {
  const token = createRawSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          settings: true
        }
      }
    }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");
  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "Пользовательская сессия истекла. Войдите снова.", "UNAUTHORIZED");
  }
  return user;
}

export async function destroyCurrentSession(response: NextResponse) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hashSessionToken(token) } })
      .catch(() => undefined);
  }
  clearSessionCookie(response);
}
