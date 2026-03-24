import axios from "axios";
import { env } from "@/lib/env";

const sarvamClient = axios.create({
  baseURL: env.SARVAM_BASE_URL,
  headers: {
    "api-subscription-key": env.SARVAM_API_KEY,
  },
});

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
