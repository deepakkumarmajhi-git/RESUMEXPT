import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { resumeAnalysisSchema } from "@/lib/validations";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";
import { analyzeResume, OpenAIServiceError } from "@/services/openai.service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserSession();
    const body = await request.json();
    const parsed = resumeAnalysisSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid analysis request.", 422, parsed.error.flatten());
    }

    const { id } = await context.params;
    await connectToDatabase();

    const resume = await ResumeModel.findOne({ _id: id, userId: user.id }).select(
      "targetRole status latestAnalysisId +cleanedText",
    );
    if (!resume) {
      return errorResponse("Resume not found.", 404);
    }

    const analysisResult = await analyzeResume(
      resume.cleanedText,
      parsed.data.targetRole,
    );

    const analysis = await ResumeAnalysisModel.create({
      userId: user.id,
      resumeId: resume._id,
      targetRole: parsed.data.targetRole,
      ...analysisResult,
      rawResponse: analysisResult,
    });

    resume.targetRole = parsed.data.targetRole;
    resume.status = "analyzed";
    resume.latestAnalysisId = analysis._id;
    await resume.save();

    return successResponse(
      {
        id: analysis._id.toString(),
        ...analysisResult,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Resume analysis failed", error);
    if (error instanceof OpenAIServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Unable to analyze the resume right now.", 500);
  }
}
