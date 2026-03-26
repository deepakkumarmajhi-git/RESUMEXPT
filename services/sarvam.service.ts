import axios from "axios";
import { env } from "@/lib/env";

const sarvamClient = axios.create({
  baseURL: env.SARVAM_BASE_URL,
  headers: {
    "api-subscription-key": env.SARVAM_API_KEY,
  },
});

type SarvamChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type SarvamChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class SarvamServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "SarvamServiceError";
    this.statusCode = statusCode;
  }
}

function normalizeSarvamError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return new SarvamServiceError("Sarvam request failed unexpectedly.", 502);
  }

  const status = error.response?.status ?? 502;
  const apiMessage =
    (typeof error.response?.data?.error?.message === "string"
      ? error.response?.data?.error?.message
      : undefined) ||
    (typeof error.response?.data?.message === "string"
      ? error.response?.data?.message
      : undefined) ||
    error.message ||
    "Sarvam request failed unexpectedly.";

  if (
    status === 401 ||
    status === 403 ||
    /invalid api key|incorrect api key|permission|unauthorized|forbidden/i.test(
      apiMessage,
    )
  ) {
    return new SarvamServiceError(
      "Sarvam API access is misconfigured. Check SARVAM_API_KEY.",
      503,
    );
  }

  if (status === 429 || /quota|rate limit|billing/i.test(apiMessage)) {
    return new SarvamServiceError(
      "Sarvam is temporarily unavailable because of quota or rate limits.",
      503,
    );
  }

  return new SarvamServiceError(`Sarvam request failed: ${apiMessage}`, status);
}

export async function completeChatWithSarvam(params: {
  messages: SarvamChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
}) {
  try {
    const response = await sarvamClient.post<SarvamChatCompletionPayload>(
      "/v1/chat/completions",
      {
        messages: params.messages,
        model: params.model || env.SARVAM_CHAT_MODEL,
        max_tokens: params.maxTokens ?? 900,
        temperature: params.temperature ?? 0.2,
        reasoning_effort: params.reasoningEffort ?? "medium",
      },
    );

    const text = response.data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new SarvamServiceError("Sarvam returned an empty response.", 502);
    }

    return {
      text,
      rawResponse: response.data,
    };
  } catch (error) {
    if (error instanceof SarvamServiceError) {
      throw error;
    }

    throw normalizeSarvamError(error);
  }
}

export async function transcribeAudio(file: File, languageCode?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", "saarika:v2.5");
  formData.append("language_code", languageCode || env.SARVAM_TARGET_LANGUAGE_CODE);

  const response = await sarvamClient.post("/speech-to-text", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return {
    transcript: response.data?.transcript ?? "",
    languageCode:
      response.data?.language_code ?? languageCode ?? env.SARVAM_TARGET_LANGUAGE_CODE,
  };
}

export async function synthesizeSpeech(params: {
  text: string;
  languageCode?: string;
  speaker?: string;
}) {
  const response = await sarvamClient.post("/text-to-speech", {
    text: params.text,
    target_language_code:
      params.languageCode || env.SARVAM_TARGET_LANGUAGE_CODE,
    speaker: params.speaker || env.SARVAM_TTS_SPEAKER,
    model: "bulbul:v3",
    speech_sample_rate: 24000,
  });

  const audio = response.data?.audios?.[0] ?? "";
  return {
    audio,
    mimeType: "audio/wav",
  };
}
