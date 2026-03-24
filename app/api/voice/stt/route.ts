import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { transcribeAudio } from "@/services/sarvam.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUserSession();
    const formData = await request.formData();
    const file = formData.get("file");
    const languageCode = formData.get("languageCode");

    if (!(file instanceof File)) {
      return errorResponse("Audio file is required.", 422);
    }

    const result = await transcribeAudio(
      file,
      typeof languageCode === "string" ? languageCode : undefined,
    );

    return successResponse(result);
  } catch (error) {
    console.error("Speech-to-text failed", error);
    return errorResponse("Unable to transcribe your audio right now.", 500);
  }
}
