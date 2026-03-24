import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { voiceSynthesisSchema } from "@/lib/validations";
import { synthesizeSpeech } from "@/services/sarvam.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUserSession();
    const body = await request.json();
    const parsed = voiceSynthesisSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid text-to-speech request.", 422, parsed.error.flatten());
    }

    const result = await synthesizeSpeech({
      text: parsed.data.text,
      languageCode: parsed.data.languageCode,
      speaker: parsed.data.speaker,
    });

    return successResponse({
      ...result,
      audioUrl: `data:${result.mimeType};base64,${result.audio}`,
    });
  } catch (error) {
    console.error("Text-to-speech failed", error);
    return errorResponse("Unable to synthesize audio right now.", 500);
  }
}
