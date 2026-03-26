import { env } from "@/lib/env";
import { completeChatWithSarvam, SarvamServiceError } from "@/services/sarvam.service";
import type { InterviewFinalReport, MockInterviewResponse } from "@/types/interview";
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

type ConversationMessage = {
  role: "assistant" | "user" | "system";
  content: string;
};

type InterviewContext = {
  resumeText?: string;
  focusAreas?: string[];
  seedQuestions?: string[];
  analysisSummary?: string;
  strengths?: string[];
  weaknesses?: string[];
  missingSkills?: string[];
  suggestions?: string[];
};

type InterviewRunResult = {
  result: MockInterviewResponse;
  provider: "sarvam" | "openai";
  rawResponse: unknown;
};

export class MockInterviewServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "MockInterviewServiceError";
    this.statusCode = statusCode;
  }
}

function normalizeTextList(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const values = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.replace(/\s+/g, " ").trim();
    if (normalized) {
      values.add(normalized);
    }
  }

  return [...values].slice(0, limit);
}

function clampScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }

  return 0;
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

function parseJsonPayload(rawText: string) {
  const cleaned = extractJsonCandidate(rawText);

  try {
    return JSON.parse(cleaned) as unknown;
  } catch (error) {
    console.error("Failed to parse interview AI JSON response", error, cleaned);
    throw new MockInterviewServiceError("Invalid AI interview response.", 502);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeInterviewResponse(parsed: unknown): MockInterviewResponse {
  const record = isRecord(parsed) ? parsed : {};
  const type = typeof record.type === "string" ? record.type.trim() : "";

  if (type === "final_report") {
    return {
      type: "final_report",
      overallScore: clampScore(record.overallScore),
      communicationScore: clampScore(record.communicationScore),
      technicalScore: clampScore(record.technicalScore),
      strengths: normalizeTextList(record.strengths, 6),
      weaknesses: normalizeTextList(record.weaknesses, 6),
      suggestions: normalizeTextList(record.suggestions, 6),
      summary:
        typeof record.summary === "string" && record.summary.trim()
          ? record.summary.trim()
          : "The interview is complete. Review the final report.",
    };
  }

  if (typeof record.question === "string" && record.question.trim()) {
    return {
      type: "question",
      question: record.question.trim(),
    };
  }

  throw new MockInterviewServiceError("AI interview response was missing a valid question or final report.", 502);
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
    return new MockInterviewServiceError(
      "OpenAI interview engine is misconfigured. Set a valid OPENAI_API_KEY and try again.",
      503,
    );
  }

  if (status === 429 || /quota|rate limit|billing/i.test(message)) {
    return new MockInterviewServiceError(
      "OpenAI interview engine is unavailable because the configured OPENAI_API_KEY has no quota or is rate-limited.",
      503,
    );
  }

  return new MockInterviewServiceError(
    `OpenAI interview engine failed: ${message}`,
    status >= 500 ? 502 : status,
  );
}

function getQuestionTargetCount(difficulty: "easy" | "medium" | "hard") {
  switch (difficulty) {
    case "easy":
      return 5;
    case "hard":
      return 7;
    default:
      return 6;
  }
}

function buildInterviewPrompt(params: {
  messages: ConversationMessage[];
  jobRole: string;
  difficulty: "easy" | "medium" | "hard";
  totalQuestions: number;
  askedQuestions: number;
  context?: InterviewContext;
}) {
  const preparedResumeText = params.context?.resumeText
    ? cleanResumeText(params.context.resumeText).slice(0, MAX_INTERVIEW_RESUME_CHARS)
    : "";

  return `
You are a professional interviewer conducting a mock interview.

Role: ${params.jobRole}
Difficulty: ${params.difficulty}
Total questions to ask in this interview: ${params.totalQuestions}
Questions already asked: ${params.askedQuestions}

Rules:
- Ask only ONE question at a time
- DO NOT provide feedback during the interview
- Wait for candidate answer
- Maintain context of previous answers
- Questions should be a mix of technical and HR
- Keep the tone realistic and professional
- Use the candidate's resume, prior answers, and focus areas when available
- If ${params.askedQuestions} is less than ${params.totalQuestions}, return type "question"
- If ${params.askedQuestions} is equal to ${params.totalQuestions}, return type "final_report"

Resume context:
${preparedResumeText || "Not provided"}

Interview focus areas:
${JSON.stringify(params.context?.focusAreas ?? [])}

Seed question bank:
${JSON.stringify(params.context?.seedQuestions ?? [])}

Analysis context:
${JSON.stringify(
  {
    summary: params.context?.analysisSummary ?? "",
    strengths: params.context?.strengths ?? [],
    weaknesses: params.context?.weaknesses ?? [],
    missingSkills: params.context?.missingSkills ?? [],
    suggestions: params.context?.suggestions ?? [],
  },
  null,
  2,
)}

If interview is ongoing, return:
{
  "type": "question",
  "question": "string"
}

If interview is finished, return:
{
  "type": "final_report",
  "overallScore": number,
  "communicationScore": number,
  "technicalScore": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"],
  "summary": "string"
}

Conversation:
${JSON.stringify(params.messages)}
`.trim();
}

async function runInterviewWithSarvam(params: {
  messages: ConversationMessage[];
  jobRole: string;
  difficulty: "easy" | "medium" | "hard";
  totalQuestions: number;
  askedQuestions: number;
  context?: InterviewContext;
}): Promise<InterviewRunResult> {
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
          content: buildInterviewPrompt(params),
        },
      ],
      temperature: 0.25,
      maxTokens: 1100,
      reasoningEffort: "medium",
    });

    const parsed = parseJsonPayload(response.text);

    return {
      result: normalizeInterviewResponse(parsed),
      provider: "sarvam",
      rawResponse: response.rawResponse,
    };
  } catch (error) {
    if (error instanceof SarvamServiceError) {
      throw new MockInterviewServiceError(error.message, error.statusCode);
    }

    if (error instanceof MockInterviewServiceError) {
      throw error;
    }

    throw new MockInterviewServiceError("Sarvam interview engine failed.", 502);
  }
}

async function runInterviewWithOpenAI(params: {
  messages: ConversationMessage[];
  jobRole: string;
  difficulty: "easy" | "medium" | "hard";
  totalQuestions: number;
  askedQuestions: number;
  context?: InterviewContext;
}): Promise<InterviewRunResult> {
  if (!env.OPENAI_API_KEY) {
    throw new MockInterviewServiceError(
      "OpenAI interview engine is unavailable. Set OPENAI_API_KEY to enable it.",
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
          content: buildInterviewPrompt(params),
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
    throw new MockInterviewServiceError("OpenAI returned an empty interview response.", 502);
  }

  const parsed = parseJsonPayload(content);

  return {
    result: normalizeInterviewResponse(parsed),
    provider: "openai",
    rawResponse: parsed,
  };
}

export async function runInterview(params: {
  messages: ConversationMessage[];
  jobRole: string;
  difficulty: "easy" | "medium" | "hard";
  totalQuestions?: number;
  askedQuestions?: number;
  context?: InterviewContext;
}): Promise<InterviewRunResult> {
  const totalQuestions = params.totalQuestions ?? getQuestionTargetCount(params.difficulty);
  const askedQuestions = params.askedQuestions ?? 0;
  const canUseOpenAIFallback = Boolean(
    env.OPENAI_FALLBACK_ENABLED && env.OPENAI_API_KEY,
  );

  let sarvamError: MockInterviewServiceError | null = null;

  try {
    return await runInterviewWithSarvam({
      ...params,
      totalQuestions,
      askedQuestions,
    });
  } catch (error) {
    sarvamError =
      error instanceof MockInterviewServiceError
        ? error
        : new MockInterviewServiceError("Sarvam interview engine failed.", 502);
    console.warn("Sarvam interview engine failed, attempting next fallback.", error);
  }

  if (!canUseOpenAIFallback) {
    throw sarvamError;
  }

  try {
    return await runInterviewWithOpenAI({
      ...params,
      totalQuestions,
      askedQuestions,
    });
  } catch (error) {
    if (error instanceof MockInterviewServiceError) {
      throw new MockInterviewServiceError(
        `${sarvamError.message} OpenAI interview fallback is also unavailable: ${error.message}`,
        sarvamError.statusCode,
      );
    }

    throw new MockInterviewServiceError("OpenAI interview fallback failed.", 502);
  }
}

export function buildEmptyFinalReport(): InterviewFinalReport {
  return {
    overallScore: 0,
    communicationScore: 0,
    technicalScore: 0,
    strengths: [],
    weaknesses: [],
    suggestions: [],
    summary: "The final interview report could not be generated.",
  };
}

export { getQuestionTargetCount };
