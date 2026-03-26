import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { env } from "@/lib/env";
import {
  completeChatWithSarvam,
  SarvamServiceError,
} from "@/services/sarvam.service";
import type { ResumeAnalysisResult } from "@/types/resume";
import { cleanResumeText } from "@/utils/file";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MAX_ANALYSIS_RESUME_CHARS = 5000;

const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    "atsScore",
    "summary",
    "strengths",
    "weaknesses",
    "missingSkills",
    "suggestions",
    "keywordsMatch",
  ],
  propertyOrdering: [
    "atsScore",
    "summary",
    "strengths",
    "weaknesses",
    "missingSkills",
    "suggestions",
    "keywordsMatch",
  ],
  properties: {
    atsScore: {
      type: Type.INTEGER,
      minimum: 0,
      maximum: 100,
    },
    summary: {
      type: Type.STRING,
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },
    weaknesses: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },
    missingSkills: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },
    keywordsMatch: {
      type: Type.INTEGER,
      minimum: 0,
      maximum: 100,
    },
  },
};

type OpenAIChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

type ResumeAnalysisServiceResult = {
  analysis: ResumeAnalysisResult;
  provider: "gemini" | "sarvam" | "openai";
  rawResponse: unknown;
};

export class ResumeAnalysisServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "ResumeAnalysisServiceError";
    this.statusCode = statusCode;
  }
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueValues = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.replace(/\s+/g, " ").trim();
    if (normalized) {
      uniqueValues.add(normalized);
    }
  }

  return [...uniqueValues].slice(0, 8);
}

function toScore(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampScore(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return clampScore(parsed);
    }
  }

  return clampScore(fallback);
}

function prepareResumeTextForAnalysis(text: string) {
  return cleanResumeText(text).slice(0, MAX_ANALYSIS_RESUME_CHARS).trim();
}

function buildResumeAnalysisPrompt(resumeText: string, jobRole: string) {
  return `
You are an expert ATS resume analyzer.

Analyze the following resume for the job role: "${jobRole}".

Return ONLY valid JSON in this format:

{
  "atsScore": number (0-100),
  "summary": "short summary",
  "strengths": ["point1", "point2"],
  "weaknesses": ["point1", "point2"],
  "missingSkills": ["skill1", "skill2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "keywordsMatch": number (0-100)
}

Rules:
- Be concise and evidence-based.
- Keep list items specific to the resume and role.
- Do not include markdown or any text outside the JSON object.

Resume:
${resumeText}
`.trim();
}

function extractJsonCandidate(rawText: string) {
  const normalized = rawText.replace(/```json|```/gi, "").trim();
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return normalized.slice(firstBrace, lastBrace + 1);
  }

  return normalized;
}

function normalizeAnalysisResponse(parsed: unknown): ResumeAnalysisResult {
  const record = isRecord(parsed) ? parsed : {};
  const strengths = toStringList(record.strengths);
  const weaknesses = toStringList(record.weaknesses);
  const fallbackMissingSkills = toStringList(record.missingKeywords);
  const missingSkills = toStringList(record.missingSkills);
  const keywordsMatched = toStringList(record.keywordsMatched);

  const totalKeywordSignals = keywordsMatched.length + missingSkills.length;
  const derivedKeywordScore =
    totalKeywordSignals > 0
      ? (keywordsMatched.length / totalKeywordSignals) * 100
      : 0;

  const resolvedMissingSkills =
    missingSkills.length > 0 ? missingSkills : fallbackMissingSkills;

  return {
    atsScore: toScore(record.atsScore),
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary.trim()
        : "We could not generate a resume summary.",
    strengths,
    weaknesses,
    missingSkills: resolvedMissingSkills,
    suggestions: toStringList(record.suggestions),
    keywordsMatch: toScore(record.keywordsMatch, derivedKeywordScore),
    keywordsMatched,
    missingKeywords: resolvedMissingSkills,
  };
}

function parseAnalysisJson(rawText: string) {
  const cleaned = extractJsonCandidate(rawText);

  try {
    return JSON.parse(cleaned) as unknown;
  } catch (error) {
    console.error("Failed to parse AI JSON response", error, cleaned);
    throw new ResumeAnalysisServiceError("Invalid AI response.", 502);
  }
}

function normalizeOpenAIError(
  status: number,
  rawText: string,
  payload: OpenAIChatCompletionPayload | null,
) {
  const message =
    payload?.error?.message || rawText || "OpenAI request failed unexpectedly.";

  if (
    status === 401 ||
    status === 403 ||
    /invalid api key|incorrect api key|permission|unauthorized/i.test(message)
  ) {
    return new ResumeAnalysisServiceError(
      "OpenAI fallback is misconfigured. Set a valid OPENAI_API_KEY and try again.",
      503,
    );
  }

  if (status === 429 || /quota|rate limit|billing/i.test(message)) {
    return new ResumeAnalysisServiceError(
      "OpenAI fallback is unavailable because the configured OPENAI_API_KEY has no quota or is rate-limited.",
      503,
    );
  }

  return new ResumeAnalysisServiceError(
    `OpenAI fallback failed: ${message}`,
    status >= 500 ? 502 : status,
  );
}

function extractOpenAICompletionText(payload: OpenAIChatCompletionPayload) {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
}

async function analyzeWithGemini(
  resumeText: string,
  jobRole: string,
): Promise<ResumeAnalysisServiceResult> {
  if (!env.GEMINI_API_KEY) {
    throw new ResumeAnalysisServiceError(
      "Gemini is not configured. Set GEMINI_API_KEY to enable it.",
      503,
    );
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = buildResumeAnalysisPrompt(resumeText, jobRole);

  try {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new ResumeAnalysisServiceError("Gemini returned an empty response.", 502);
    }

    const parsed = parseAnalysisJson(rawText);

    return {
      analysis: normalizeAnalysisResponse(parsed),
      provider: "gemini",
      rawResponse: parsed,
    };
  } catch (error) {
    if (error instanceof ResumeAnalysisServiceError) {
      throw error;
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Gemini request failed unexpectedly.";

    if (/reported as leaked|api key was reported as leaked|leaked/i.test(message)) {
      throw new ResumeAnalysisServiceError(
        "The configured Gemini API key has been blocked by Google as leaked. Create a new Gemini API key, update GEMINI_API_KEY in .env.local, and restart the server.",
        503,
      );
    }

    if (/api key|permission|unauthorized|forbidden/i.test(message)) {
      throw new ResumeAnalysisServiceError(
        `Gemini request was rejected. Verify the configured Gemini API key can access ${env.GEMINI_MODEL}. Original error: ${message}`,
        503,
      );
    }

    if (/quota|rate limit|resource exhausted|429/i.test(message)) {
      throw new ResumeAnalysisServiceError(
        "Gemini is temporarily unavailable because of quota or rate limits.",
        503,
      );
    }

    throw new ResumeAnalysisServiceError(`Gemini analysis failed: ${message}`, 502);
  }
}

async function analyzeWithOpenAI(
  resumeText: string,
  jobRole: string,
): Promise<ResumeAnalysisServiceResult> {
  if (!env.OPENAI_API_KEY) {
    throw new ResumeAnalysisServiceError(
      "OpenAI fallback is unavailable. Set OPENAI_API_KEY to enable it.",
      503,
    );
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.3,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are a precise JSON API. Return only valid JSON and no markdown.",
        },
        {
          role: "user",
          content: buildResumeAnalysisPrompt(resumeText, jobRole),
        },
      ],
    }),
  });

  const rawText = await response.text();
  let payload: OpenAIChatCompletionPayload | null = null;

  try {
    payload = JSON.parse(rawText) as OpenAIChatCompletionPayload;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw normalizeOpenAIError(response.status, rawText, payload);
  }

  const content = payload ? extractOpenAICompletionText(payload) : "";
  if (!content) {
    throw new ResumeAnalysisServiceError("OpenAI returned an empty response.", 502);
  }

  const parsed = parseAnalysisJson(content);

  return {
    analysis: normalizeAnalysisResponse(parsed),
    provider: "openai",
    rawResponse: parsed,
  };
}

async function analyzeWithSarvam(
  resumeText: string,
  jobRole: string,
): Promise<ResumeAnalysisServiceResult> {
  try {
    const response = await completeChatWithSarvam({
      messages: [
        {
          role: "system",
          content:
            "You are a precise JSON API. Return only valid JSON and no markdown.",
        },
        {
          role: "user",
          content: buildResumeAnalysisPrompt(resumeText, jobRole),
        },
      ],
      temperature: 0.2,
      maxTokens: 900,
      reasoningEffort: "medium",
    });

    const parsed = parseAnalysisJson(response.text);

    return {
      analysis: normalizeAnalysisResponse(parsed),
      provider: "sarvam",
      rawResponse: response.rawResponse,
    };
  } catch (error) {
    if (error instanceof SarvamServiceError) {
      throw new ResumeAnalysisServiceError(error.message, error.statusCode);
    }

    throw new ResumeAnalysisServiceError("Sarvam analysis failed.", 502);
  }
}

export async function analyzeResume(
  resumeText: string,
  jobRole: string,
): Promise<ResumeAnalysisServiceResult> {
  const preparedResumeText = prepareResumeTextForAnalysis(resumeText);
  const preparedJobRole = jobRole.trim();
  const canUseSarvam = Boolean(env.SARVAM_API_KEY);
  const canUseOpenAIFallback = Boolean(
    env.OPENAI_FALLBACK_ENABLED && env.OPENAI_API_KEY,
  );

  if (!preparedResumeText) {
    throw new ResumeAnalysisServiceError(
      "Resume text is empty after cleaning and cannot be analyzed.",
      422,
    );
  }

  if (!preparedJobRole) {
    throw new ResumeAnalysisServiceError("A target job role is required.", 422);
  }

  if (!env.GEMINI_API_KEY && !canUseSarvam && !canUseOpenAIFallback) {
    throw new ResumeAnalysisServiceError(
      "No AI provider is configured. Set GEMINI_API_KEY, set SARVAM_API_KEY, or enable OPENAI_FALLBACK_ENABLED with a valid OPENAI_API_KEY.",
      503,
    );
  }

  let geminiError: ResumeAnalysisServiceError | null = null;
  let sarvamError: ResumeAnalysisServiceError | null = null;

  if (env.GEMINI_API_KEY) {
    try {
      return await analyzeWithGemini(preparedResumeText, preparedJobRole);
    } catch (error) {
      geminiError =
        error instanceof ResumeAnalysisServiceError
          ? error
          : new ResumeAnalysisServiceError("Gemini analysis failed.", 502);
      console.warn("Gemini analysis failed, attempting next fallback.", error);
    }
  }

  if (canUseSarvam) {
    try {
      return await analyzeWithSarvam(preparedResumeText, preparedJobRole);
    } catch (error) {
      sarvamError =
        error instanceof ResumeAnalysisServiceError
          ? error
          : new ResumeAnalysisServiceError("Sarvam analysis failed.", 502);
      console.warn("Sarvam analysis failed, attempting next fallback.", error);
    }
  }

  if (!canUseOpenAIFallback) {
    if (sarvamError) {
      if (geminiError) {
        throw new ResumeAnalysisServiceError(
          `${geminiError.message} Sarvam fallback is also unavailable: ${sarvamError.message}`,
          geminiError.statusCode,
        );
      }

      throw sarvamError;
    }

    if (geminiError) {
      throw geminiError;
    }

    throw new ResumeAnalysisServiceError(
      "OpenAI fallback is disabled for resume analysis. Set OPENAI_FALLBACK_ENABLED=true to enable it.",
      503,
    );
  }

  try {
    return await analyzeWithOpenAI(preparedResumeText, preparedJobRole);
  } catch (error) {
    if (error instanceof ResumeAnalysisServiceError) {
      if (sarvamError) {
        if (geminiError) {
          throw new ResumeAnalysisServiceError(
            `${geminiError.message} Sarvam fallback is also unavailable: ${sarvamError.message} OpenAI fallback is also unavailable: ${error.message}`,
            geminiError.statusCode,
          );
        }

        throw new ResumeAnalysisServiceError(
          `${sarvamError.message} OpenAI fallback is also unavailable: ${error.message}`,
          sarvamError.statusCode,
        );
      }

      if (geminiError) {
        throw new ResumeAnalysisServiceError(
          `${geminiError.message} OpenAI fallback is also unavailable: ${error.message}`,
          geminiError.statusCode,
        );
      }

      throw error;
    }

    throw new ResumeAnalysisServiceError("OpenAI fallback failed.", 502);
  }
}
