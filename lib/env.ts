import { z } from "zod";

const resolvedOpenAIApiKey = process.env.OPENAI_API_KEY?.trim();

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET or AUTH_SECRET is required"),
  AUTH_URL: z.string().url("NEXTAUTH_URL or AUTH_URL must be a valid URL"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  SARVAM_API_KEY: z.string().min(1, "SARVAM_API_KEY is required"),
  SARVAM_BASE_URL: z.string().url("SARVAM_BASE_URL must be a valid URL"),
  SARVAM_TARGET_LANGUAGE_CODE: z.string().min(1).default("en-IN"),
  SARVAM_TTS_SPEAKER: z.string().min(1).default("simran"),
});

const parsedEnv = envSchema.safeParse({
  MONGODB_URI: process.env.MONGODB_URI,
  AUTH_SECRET: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  AUTH_URL: process.env.NEXTAUTH_URL ?? process.env.AUTH_URL,
  OPENAI_API_KEY: resolvedOpenAIApiKey,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  SARVAM_API_KEY: process.env.SARVAM_API_KEY,
  SARVAM_BASE_URL: process.env.SARVAM_BASE_URL,
  SARVAM_TARGET_LANGUAGE_CODE: process.env.SARVAM_TARGET_LANGUAGE_CODE,
  SARVAM_TTS_SPEAKER: process.env.SARVAM_TTS_SPEAKER,
});

if (!parsedEnv.success) {
  console.error(
    "Invalid environment configuration",
    parsedEnv.error.flatten().fieldErrors,
  );
  throw new Error("Environment variables are misconfigured.");
}

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = parsedEnv.data.AUTH_SECRET;
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = parsedEnv.data.AUTH_URL;
}

process.env.OPENAI_API_KEY = parsedEnv.data.OPENAI_API_KEY;

export const env = parsedEnv.data;
