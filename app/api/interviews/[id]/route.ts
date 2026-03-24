import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { InterviewSetModel } from "@/models/InterviewSet";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserSession();
    const { id } = await context.params;
    await connectToDatabase();

    const [interviewSet, sessions] = await Promise.all([
      InterviewSetModel.findOne({ _id: id, userId: user.id }).lean(),
      InterviewSessionModel.find({ interviewSetId: id, userId: user.id })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    if (!interviewSet) {
      return errorResponse("Interview set not found.", 404);
    }

    return successResponse({ interviewSet, sessions });
  } catch (error) {
    console.error("Interview set fetch failed", error);
    return errorResponse("Unable to load this interview set.", 500);
  }
}
