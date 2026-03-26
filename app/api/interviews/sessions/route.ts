import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";
import { InterviewSetModel } from "@/models/InterviewSet";
import {
  getQuestionTargetCount,
  MockInterviewServiceError,
  runInterview,
} from "@/services/mock-interview.service";

const createSessionSchema = z.object({
  interviewSetId: z.string().min(1),
  mode: z.enum(["text", "voice"]).default("text"),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUserSession();
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid session request.", 422, parsed.error.flatten());
    }

    await connectToDatabase();

    const interviewSet = await InterviewSetModel.findOne({
      _id: parsed.data.interviewSetId,
      userId: user.id,
    }).lean();

    if (!interviewSet) {
      return errorResponse("Interview set not found.", 404);
    }

    const seedQuestions = [
      ...interviewSet.technicalQuestions,
      ...interviewSet.hrQuestions,
      ...interviewSet.codingQuestions,
    ];

    if (!seedQuestions.length) {
      return errorResponse("This interview set has no questions.", 422);
    }

    const [resume, analysis] = await Promise.all([
      interviewSet.resumeId
        ? ResumeModel.findOne({
            _id: interviewSet.resumeId,
            userId: user.id,
          })
            .select("+cleanedText")
            .lean()
        : Promise.resolve(null),
      interviewSet.resumeAnalysisId
        ? ResumeAnalysisModel.findOne({
            _id: interviewSet.resumeAnalysisId,
            userId: user.id,
          })
            .select(
              "summary strengths weaknesses missingSkills missingKeywords suggestions",
            )
            .lean()
        : Promise.resolve(null),
    ]);

    const questionTargetCount = getQuestionTargetCount(interviewSet.difficulty);
    const openingTurn = await runInterview({
      messages: [],
      jobRole: interviewSet.role,
      difficulty: interviewSet.difficulty,
      totalQuestions: questionTargetCount,
      askedQuestions: 0,
      context: {
        resumeText: resume?.cleanedText,
        focusAreas: interviewSet.focusAreas,
        seedQuestions,
        analysisSummary: analysis?.summary,
        strengths: analysis?.strengths,
        weaknesses: analysis?.weaknesses,
        missingSkills:
          analysis?.missingSkills?.length > 0
            ? analysis?.missingSkills
            : analysis?.missingKeywords,
        suggestions: analysis?.suggestions,
      },
    });

    if (openingTurn.result.type !== "question") {
      return errorResponse("Unable to generate the opening interview question.", 502);
    }

    const session = await InterviewSessionModel.create({
      userId: user.id,
      interviewSetId: interviewSet._id,
      resumeId: interviewSet.resumeId,
      mode: parsed.data.mode,
      questionTargetCount,
      transcript: [
        {
          role: "assistant",
          content: openingTurn.result.question,
          createdAt: new Date(),
        },
      ],
    });

    return successResponse(
      {
        id: session._id.toString(),
        openingQuestion: openingTurn.result.question,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to start interview session", error);
    if (error instanceof MockInterviewServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Unable to start the interview session.", 500);
  }
}
