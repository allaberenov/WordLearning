import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  try {
    const response = NextResponse.json({ ok: true });
    await destroyCurrentSession(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
