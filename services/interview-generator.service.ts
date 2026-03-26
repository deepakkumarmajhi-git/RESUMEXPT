import { env } from "@/lib/env";
import { completeChatWithSarvam, SarvamServiceError } from "@/services/sarvam.service";
import type { InterviewQuestionSetResult } from "@/types/interview";
import { cleanResumeText } from "@/utils/file";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MAX_INTERVIEW_RESUME_CHARS = 5000;

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

type InterviewGenerationContext = {
  targetRole?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  missingSkills?: string[];
  suggestions?: string[];
  keywordsMatch?: number;
};

type InterviewGenerationResult = {
  questions: InterviewQuestionSetResult;
  provider: "sarvam" | "openai";
  rawResponse: unknown;
};

export class InterviewGenerationServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "InterviewGenerationServiceError";
    this.statusCode = statusCode;
  }
}

function sanitizeList(value: unknown, limit: number) {
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

  return [...uniqueValues].slice(0, limit);
}

function extractCompletionText(payload: OpenAIChatCompletionPayload) {
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

function extractJsonCandidate(rawText: string) {
  const normalized = rawText.replace(/```json|```/gi, "").trim();
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return normalized.slice(firstBrace, lastBrace + 1);
  }

  return normalized;
}

function parseInterviewJson(rawText: string) {
  const cleaned = extractJsonCandidate(rawText);

  try {
    return JSON.parse(cleaned) as unknown;
  } catch (error) {
    console.error("Failed to parse interview generation JSON", error, cleaned);
    throw new InterviewGenerationServiceError("Invalid AI response.", 502);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeInterviewQuestionSet(parsed: unknown): InterviewQuestionSetResult {
  const record = isRecord(parsed) ? parsed : {};

  return {
    technicalQuestions: sanitizeList(record.technicalQuestions, 4),
    hrQuestions: sanitizeList(record.hrQuestions, 3),
    codingQuestions: sanitizeList(record.codingQuestions, 3),
    focusAreas: sanitizeList(record.focusAreas, 4),
  };
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
    return new InterviewGenerationServiceError(
      "OpenAI interview fallback is misconfigured. Set a valid OPENAI_API_KEY and try again.",
      503,
    );
  }

  if (status === 429 || /quota|rate limit|billing/i.test(message)) {
    return new InterviewGenerationServiceError(
      "OpenAI interview fallback is unavailable because the configured OPENAI_API_KEY has no quota or is rate-limited.",
      503,
    );
  }

  return new InterviewGenerationServiceError(
    `OpenAI interview fallback failed: ${message}`,
    status >= 500 ? 502 : status,
  );
}

function prepareResumeTextForInterview(text?: string) {
  return text ? cleanResumeText(text).slice(0, MAX_INTERVIEW_RESUME_CHARS).trim() : "";
}

function buildInterviewGenerationPrompt(params: {
  role: string;
  experienceLevel: "entry" | "mid" | "senior";
  difficulty: "easy" | "medium" | "hard";
  resumeText?: string;
  analysis?: InterviewGenerationContext;
}) {
  const preparedResumeText = prepareResumeTextForInterview(params.resumeText);
  const analysis = params.analysis;

  return `
You are an expert technical interviewer and interview coach.

Build a realistic interview set for this candidate.

Target role: ${params.role}
Experience level: ${params.experienceLevel}
Difficulty: ${params.difficulty}

Resume context:
${preparedResumeText || "Not provided"}

Resume analysis context:
${JSON.stringify(
  {
    targetRole: analysis?.targetRole || "",
    summary: analysis?.summary || "",
    strengths: analysis?.strengths || [],
    weaknesses: analysis?.weaknesses || [],
    missingSkills: analysis?.missingSkills || [],
    suggestions: analysis?.suggestions || [],
    keywordsMatch: analysis?.keywordsMatch ?? null,
  },
  null,
  2,
)}

Return ONLY valid JSON in this exact shape:
{
  "technicalQuestions": ["string"],
  "hrQuestions": ["string"],
  "codingQuestions": ["string"],
  "focusAreas": ["string"]
}

Requirements:
- Generate exactly 4 technical questions, 3 HR questions, 3 coding questions, and 4 focus areas.
- Personalize the questions to the candidate's actual resume when context is available.
- Use the target role, stated experience level, and difficulty as the primary framing.
- If the resume shows specific projects, tools, domains, or achievements, reflect them in the questions.
- Use the analysis summary, strengths, weaknesses, and missing skills to tailor emphasis areas.
- Avoid generic duplicate questions.
- Keep every question concise and interview-ready.
- Coding questions should fit the candidate's likely stack from the resume when possible.
`.trim();
}

async function generateWithSarvam(params: {
  role: string;
  experienceLevel: "entry" | "mid" | "senior";
  difficulty: "easy" | "medium" | "hard";
  resumeText?: string;
  analysis?: InterviewGenerationContext;
}): Promise<InterviewGenerationResult> {
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
          content: buildInterviewGenerationPrompt(params),
        },
      ],
      temperature: 0.25,
      maxTokens: 1100,
      reasoningEffort: "medium",
    });

    const parsed = parseInterviewJson(response.text);

    return {
      questions: normalizeInterviewQuestionSet(parsed),
      provider: "sarvam",
      rawResponse: response.rawResponse,
    };
  } catch (error) {
    if (error instanceof SarvamServiceError) {
      throw new InterviewGenerationServiceError(error.message, error.statusCode);
    }

    if (error instanceof InterviewGenerationServiceError) {
      throw error;
    }

    throw new InterviewGenerationServiceError("Sarvam interview generation failed.", 502);
  }
}

async function generateWithOpenAI(params: {
  role: string;
  experienceLevel: "entry" | "mid" | "senior";
  difficulty: "easy" | "medium" | "hard";
  resumeText?: string;
  analysis?: InterviewGenerationContext;
}): Promise<InterviewGenerationResult> {
  if (!env.OPENAI_API_KEY) {
    throw new InterviewGenerationServiceError(
      "OpenAI interview fallback is unavailable. Set OPENAI_API_KEY to enable it.",
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
      temperature: 0.35,
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
          content: buildInterviewGenerationPrompt(params),
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

  const content = payload ? extractCompletionText(payload) : "";
  if (!content) {
    throw new InterviewGenerationServiceError(
      "OpenAI returned an empty interview response.",
      502,
    );
  }

  const parsed = parseInterviewJson(content);

  return {
    questions: normalizeInterviewQuestionSet(parsed),
    provider: "openai",
    rawResponse: parsed,
  };
}

export async function generateInterviewQuestions(params: {
  role: string;
  experienceLevel: "entry" | "mid" | "senior";
  difficulty: "easy" | "medium" | "hard";
  resumeText?: string;
  analysis?: InterviewGenerationContext;
}): Promise<InterviewGenerationResult> {
  const canUseOpenAIFallback = Boolean(
    env.OPENAI_FALLBACK_ENABLED && env.OPENAI_API_KEY,
  );

  let sarvamError: InterviewGenerationServiceError | null = null;

  try {
    return await generateWithSarvam(params);
  } catch (error) {
    sarvamError =
      error instanceof InterviewGenerationServiceError
        ? error
        : new InterviewGenerationServiceError("Sarvam interview generation failed.", 502);
    console.warn("Sarvam interview generation failed, attempting next fallback.", error);
  }

  if (!canUseOpenAIFallback) {
    throw sarvamError;
  }

  try {
    return await generateWithOpenAI(params);
  } catch (error) {
    if (error instanceof InterviewGenerationServiceError) {
      throw new InterviewGenerationServiceError(
        `${sarvamError.message} OpenAI interview fallback is also unavailable: ${error.message}`,
        sarvamError.statusCode,
      );
    }

    throw new InterviewGenerationServiceError("OpenAI interview fallback failed.", 502);
  }
}
