import { apiOk, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireApiUser();
    return apiOk({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        settings: user.settings
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
