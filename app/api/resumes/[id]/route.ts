import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { InterviewSetModel } from "@/models/InterviewSet";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserSession();
    const { id } = await context.params;
    await connectToDatabase();

    const [resume, analyses] = await Promise.all([
      ResumeModel.findOne({ _id: id, userId: user.id })
        .select("fileName fileType fileSize targetRole status latestAnalysisId createdAt updatedAt")
        .lean(),
      ResumeAnalysisModel.find({ resumeId: id, userId: user.id })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    if (!resume) {
      return errorResponse("Resume not found.", 404);
    }

    return successResponse({ resume, analyses });
  } catch (error) {
    console.error("Resume fetch failed", error);
    return errorResponse("Unable to load this resume.", 500);
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

    const resume = await ResumeModel.findOne({ _id: id, userId: user.id });
    if (!resume) {
      return errorResponse("Resume not found.", 404);
    }

    const interviewSets = await InterviewSetModel.find({
      userId: user.id,
      resumeId: id,
    }).lean();

    await Promise.all([
      ResumeAnalysisModel.deleteMany({ userId: user.id, resumeId: id }),
      InterviewSessionModel.deleteMany({
        userId: user.id,
        interviewSetId: { $in: interviewSets.map((set) => set._id) },
      }),
      InterviewSetModel.deleteMany({ userId: user.id, resumeId: id }),
      ResumeModel.deleteOne({ _id: id, userId: user.id }),
    ]);

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Resume deletion failed", error);
    return errorResponse("Unable to delete this resume.", 500);
  }
}
