import { apiOk, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { teacherRequestResponseSchema } from "@/lib/schemas";
import { respondToTeacherRequest } from "@/lib/teacher";

export const runtime = "nodejs";

type Params = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, context: Params) {
  try {
    const user = await requireApiUser();
    const { requestId } = await context.params;
    const input = await readJson(request, teacherRequestResponseSchema, { maxBytes: 1_000 });
    const teacherRequest = await respondToTeacherRequest(user.id, requestId, input.action);
    return apiOk({ request: teacherRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
