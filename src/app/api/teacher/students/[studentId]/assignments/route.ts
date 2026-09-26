import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { teacherAssignmentSchema } from "@/lib/schemas";
import { createTeacherAssignment } from "@/lib/teacher";

export const runtime = "nodejs";

type Params = { params: Promise<{ studentId: string }> };

export async function POST(request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { studentId } = await context.params;
    const input = await readJson(request, teacherAssignmentSchema, { maxBytes: 8_000 });
    const deck = await createTeacherAssignment({
      teacherId: user.id,
      studentId,
      name: input.name,
      description: input.description,
      words: input.words
    });
    return apiOk({ deck }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
