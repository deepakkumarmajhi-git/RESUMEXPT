import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { interviewMessageSchema } from "@/lib/validations";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { InterviewSetModel } from "@/models/InterviewSet";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";
import {
  buildEmptyFinalReport,
  MockInterviewServiceError,
  runInterview,
} from "@/services/mock-interview.service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserSession();
    const body = await request.json();
    const parsed = interviewMessageSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid message.", 422, parsed.error.flatten());
    }

    const { id } = await context.params;
    await connectToDatabase();

    const session = await InterviewSessionModel.findOne({
      _id: id,
      userId: user.id,
    });

    if (!session) {
      return errorResponse("Interview session not found.", 404);
    }

    if (session.status === "completed") {
      return errorResponse("This interview session has already ended.", 409);
    }

    const interviewSet = await InterviewSetModel.findOne({
      _id: session.interviewSetId,
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

    const currentQuestion =
      session.transcript
        .slice()
        .reverse()
        .find((entry: { role: string; content: string }) => entry.role === "assistant")
        ?.content ?? "";

    if (!Array.isArray(session.transcript)) {
      session.transcript = [];
    }

    if (!Array.isArray(session.answers)) {
      session.answers = [];
    }

    if (
      typeof session.questionTargetCount !== "number" ||
      session.questionTargetCount < 1
    ) {
      session.questionTargetCount = seedQuestions.length || 6;
    }

    session.transcript.push({
      role: "user",
      content: parsed.data.message,
      createdAt: new Date(),
    });

    session.answers.push({
      question: currentQuestion,
      answer: parsed.data.message,
      createdAt: new Date(),
    });

    const askedQuestions = session.currentQuestionIndex + 1;
    const aiTurn = await runInterview({
      messages: session.transcript.map((entry: { role: "assistant" | "user" | "system"; content: string }) => ({
        role: entry.role,
        content: entry.content,
      })),
      jobRole: interviewSet.role,
      difficulty: interviewSet.difficulty,
      totalQuestions: session.questionTargetCount || seedQuestions.length || 6,
      askedQuestions,
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

    let assistantMessage = "";
    let finalReport = null;

    if (aiTurn.result.type === "final_report") {
      finalReport = aiTurn.result;
      assistantMessage =
        "That concludes the interview. Your final evaluation report is ready.";
      session.transcript.push({
        role: "assistant",
        content: assistantMessage,
        createdAt: new Date(),
      });
      session.status = "completed";
      session.score = aiTurn.result.overallScore ?? 0;
      session.finalReport = aiTurn.result ?? buildEmptyFinalReport();
      session.currentQuestionIndex = session.questionTargetCount;
    } else {
      assistantMessage = aiTurn.result.question;
      session.transcript.push({
        role: "assistant",
        content: assistantMessage,
        createdAt: new Date(),
      });
      session.currentQuestionIndex += 1;
    }

    await session.save();

    return successResponse({
      assistantMessage,
      isComplete: session.status === "completed",
      finalReport,
      session,
    });
  } catch (error) {
    console.error("Failed to handle interview response", error);
    if (error instanceof MockInterviewServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Unable to continue the mock interview.", 500);
  }
}
