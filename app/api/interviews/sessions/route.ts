import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { InterviewSetModel } from "@/models/InterviewSet";

const createSessionSchema = z.object({
  interviewSetId: z.string().min(1),
  mode: z.enum(["text", "voice"]).default("text"),
});

export const runtime = "nodejs";

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

    const allQuestions = [
      ...interviewSet.technicalQuestions,
      ...interviewSet.hrQuestions,
      ...interviewSet.codingQuestions,
    ];

    if (!allQuestions.length) {
      return errorResponse("This interview set has no questions.", 422);
    }

    const session = await InterviewSessionModel.create({
      userId: user.id,
      interviewSetId: interviewSet._id,
      resumeId: interviewSet.resumeId,
      mode: parsed.data.mode,
      transcript: [
        {
          role: "assistant",
          content: allQuestions[0],
          createdAt: new Date(),
        },
      ],
    });

    return successResponse(
      {
        id: session._id.toString(),
        openingQuestion: allQuestions[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to start interview session", error);
    return errorResponse("Unable to start the interview session.", 500);
  }
}
