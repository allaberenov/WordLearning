import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { teacherInviteSchema } from "@/lib/schemas";
import { sendTeacherRequest } from "@/lib/teacher";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = await readJson(request, teacherInviteSchema, { maxBytes: 2_000 });
    const result = await sendTeacherRequest(user.id, input.email);
    return apiOk(
      {
        request: result.link,
        student: result.student
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
