import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { interviewMessageSchema } from "@/lib/validations";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { InterviewSetModel } from "@/models/InterviewSet";
import { runMockInterview, OpenAIServiceError } from "@/services/openai.service";

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

    const questions = [
      ...interviewSet.technicalQuestions,
      ...interviewSet.hrQuestions,
      ...interviewSet.codingQuestions,
    ];

    const currentQuestion = questions[session.currentQuestionIndex] ?? "";
    session.transcript.push({
      role: "user",
      content: parsed.data.message,
      createdAt: new Date(),
    });

    const aiResult = await runMockInterview({
      role: interviewSet.role,
      questionIndex: session.currentQuestionIndex,
      totalQuestions: questions.length,
      questions,
      currentQuestion,
      candidateAnswer: parsed.data.message,
      transcript: session.transcript.map((entry: { role: string; content: string }) => ({
        role: entry.role,
        content: entry.content,
      })),
    });

    const replyText = aiResult.isComplete
      ? `${aiResult.feedback}\n\nFinal summary: ${aiResult.finalReport?.summary ?? ""}`
      : `${aiResult.feedback}\n\nNext question: ${aiResult.nextQuestion}`;

    session.transcript.push({
      role: "assistant",
      content: replyText,
      feedback: aiResult.feedback,
      createdAt: new Date(),
    });

    if (aiResult.isComplete) {
      session.status = "completed";
      session.score = aiResult.finalReport?.overallScore ?? 0;
      session.finalReport = aiResult.finalReport ?? null;
      session.currentQuestionIndex = questions.length;
    } else {
      session.currentQuestionIndex += 1;
    }

    await session.save();

    return successResponse({
      reply: replyText,
      isComplete: aiResult.isComplete,
      finalReport: aiResult.finalReport,
      session,
    });
  } catch (error) {
    console.error("Failed to handle interview response", error);
    if (error instanceof OpenAIServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Unable to continue the mock interview.", 500);
  }
}
