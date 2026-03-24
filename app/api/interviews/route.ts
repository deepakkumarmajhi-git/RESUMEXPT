import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { interviewGeneratorSchema } from "@/lib/validations";
import { InterviewSetModel } from "@/models/InterviewSet";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";
import {
  generateInterviewQuestions,
  OpenAIServiceError,
} from "@/services/openai.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUserSession();
    await connectToDatabase();

    const interviewSets = await InterviewSetModel.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(interviewSets);
  } catch (error) {
    console.error("Failed to list interview sets", error);
    return errorResponse("Unable to load interview sets.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserSession();
    const body = await request.json();
    const parsed = interviewGeneratorSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "Invalid interview generation request.",
        422,
        parsed.error.flatten(),
      );
    }

    await connectToDatabase();

    const [resume, analysis] = await Promise.all([
      parsed.data.resumeId
        ? ResumeModel.findOne({
            _id: parsed.data.resumeId,
            userId: user.id,
          })
            .select("+cleanedText")
            .lean()
        : Promise.resolve(null),
      parsed.data.resumeAnalysisId
        ? ResumeAnalysisModel.findOne({
            _id: parsed.data.resumeAnalysisId,
            userId: user.id,
          }).lean()
        : Promise.resolve(null),
    ]);

    const questions = await generateInterviewQuestions({
      role: parsed.data.role,
      experienceLevel: parsed.data.experienceLevel,
      difficulty: parsed.data.difficulty,
      resumeText: resume?.cleanedText,
      analysisSummary: analysis?.summary,
    });

    const interviewSet = await InterviewSetModel.create({
      userId: user.id,
      resumeId: parsed.data.resumeId || null,
      resumeAnalysisId: parsed.data.resumeAnalysisId || null,
      role: parsed.data.role,
      experienceLevel: parsed.data.experienceLevel,
      difficulty: parsed.data.difficulty,
      ...questions,
    });

    return successResponse(
      {
        id: interviewSet._id.toString(),
        ...questions,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Interview generation failed", error);
    if (error instanceof OpenAIServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Unable to generate interview questions.", 500);
  }
}
