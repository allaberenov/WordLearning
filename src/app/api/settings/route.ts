import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireApiUser();
    const settings = await getOrCreateSettings(user.id, user.timezone);
    return apiOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = await readJson(request, settingsSchema, { maxBytes: 8_000 });
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...input },
      update: input
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { timezone: input.timezone }
    });
    return apiOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
