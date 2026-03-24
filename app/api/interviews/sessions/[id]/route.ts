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

    const session = await InterviewSessionModel.findOne({
      _id: id,
      userId: user.id,
    }).lean();

    if (!session) {
      return errorResponse("Interview session not found.", 404);
    }

    const interviewSet = await InterviewSetModel.findOne({
      _id: session.interviewSetId,
      userId: user.id,
    }).lean();

    return successResponse({ session, interviewSet });
  } catch (error) {
    console.error("Failed to load interview session", error);
    return errorResponse("Unable to load this interview session.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserSession();
    const { id } = await context.params;
    await connectToDatabase();

    await InterviewSessionModel.deleteOne({ _id: id, userId: user.id });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Failed to delete interview session", error);
    return errorResponse("Unable to delete this interview session.", 500);
  }
}
