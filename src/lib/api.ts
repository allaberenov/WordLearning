import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function readJson<T>(
  request: Request,
  schema: ZodSchema<T>,
  options: { maxBytes?: number } = {}
) {
  const maxBytes = options.maxBytes ?? 20_000;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new ApiError(413, "Размер запроса слишком большой.", "PAYLOAD_TOO_LARGE");
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new ApiError(413, "Размер запроса слишком большой.", "PAYLOAD_TOO_LARGE");
  }

  try {
    return schema.parse(JSON.parse(raw)) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(422, "Проверьте введенные данные.", "VALIDATION_ERROR", error.flatten());
    }
    throw new ApiError(400, "Некорректный JSON в запросе.", "BAD_JSON");
  }
}

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status }
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: "Неожиданная ошибка сервера.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
