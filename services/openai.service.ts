import { env } from "@/lib/env";
import type {
  InterviewFinalReport,
  InterviewQuestionSetResult,
  MockInterviewResponse,
} from "@/types/interview";
import type { ResumeAnalysisResult } from "@/types/resume";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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

export class OpenAIServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "OpenAIServiceError";
    this.statusCode = statusCode;
  }
}

function parseJsonResponse<T>(rawText: string | undefined, fallback: T): T {
  if (!rawText) return fallback;

  const normalized = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    console.error("Failed to parse OpenAI JSON response", error, normalized);
    return fallback;
  }
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
    return new OpenAIServiceError(
      "OpenAI API access is misconfigured. Set a valid OPENAI_API_KEY and restart the server.",
      503,
    );
  }

  if (status === 429 || /quota|rate limit|billing/i.test(message)) {
    return new OpenAIServiceError(
      "OpenAI API quota is currently unavailable. Try again later or use a different key.",
      503,
    );
  }

  return new OpenAIServiceError(
    `OpenAI request failed: ${message}`,
    status >= 500 ? 502 : status,
  );
}

async function generateJsonContent(prompt: string, temperature: number) {
  if (!env.OPENAI_API_KEY) {
    throw new OpenAIServiceError(
      "OpenAI is not configured. Set OPENAI_API_KEY and restart the server.",
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
      temperature,
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
          content: prompt,
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
    throw new OpenAIServiceError("OpenAI returned an empty response.", 502);
  }

  return content;
}

export async function analyzeResume(
  resumeText: string,
  targetRole: string,
): Promise<ResumeAnalysisResult> {
  const prompt = `
You are an expert ATS reviewer and career coach.
Analyze the resume for the target role: "${targetRole}".

Return ONLY valid JSON with this exact shape:
{
  "atsScore": number between 0 and 100,
  "summary": "short summary paragraph",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingSkills": ["string"],
  "suggestions": ["string"],
  "keywordsMatch": number between 0 and 100
}

Keep arrays concise but specific. Use evidence from the resume.

Resume:
${resumeText}
`.trim();

  const responseText = await generateJsonContent(prompt, 0.4);
  const parsed = parseJsonResponse<Partial<ResumeAnalysisResult>>(responseText, {
    atsScore: 0,
    summary: "We could not parse the AI analysis result.",
    strengths: [],
    weaknesses: [],
    missingSkills: [],
    suggestions: [],
    keywordsMatch: 0,
    keywordsMatched: [],
    missingKeywords: [],
  });

  const missingSkills = Array.isArray(parsed.missingSkills)
    ? parsed.missingSkills
    : Array.isArray(parsed.missingKeywords)
      ? parsed.missingKeywords
      : [];

  return {
    atsScore: typeof parsed.atsScore === "number" ? parsed.atsScore : 0,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "We could not parse the AI analysis result.",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    missingSkills,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    keywordsMatch:
      typeof parsed.keywordsMatch === "number" ? parsed.keywordsMatch : 0,
    keywordsMatched: Array.isArray(parsed.keywordsMatched)
      ? parsed.keywordsMatched
      : [],
    missingKeywords: missingSkills,
  };
}

export async function generateInterviewQuestions(params: {
  role: string;
  experienceLevel: "entry" | "mid" | "senior";
  difficulty: "easy" | "medium" | "hard";
  resumeText?: string;
  analysisSummary?: string;
}): Promise<InterviewQuestionSetResult> {
  const prompt = `
You are an expert interviewer building a realistic interview set.
Role: ${params.role}
Experience level: ${params.experienceLevel}
Difficulty: ${params.difficulty}

Use the resume context if available:
Resume text:
${params.resumeText || "Not provided"}

Analysis summary:
${params.analysisSummary || "Not provided"}

Return ONLY valid JSON in this exact shape:
{
  "technicalQuestions": ["string"],
  "hrQuestions": ["string"],
  "codingQuestions": ["string"],
  "focusAreas": ["string"]
}

Generate 4 technical questions, 3 HR questions, 3 coding questions, and 4 focus areas.
Keep them role-specific and realistic.
`.trim();

  const responseText = await generateJsonContent(prompt, 0.5);

  return parseJsonResponse<InterviewQuestionSetResult>(responseText, {
    technicalQuestions: [],
    hrQuestions: [],
    codingQuestions: [],
    focusAreas: [],
  });
}

export async function runMockInterview(params: {
  role: string;
  questionIndex: number;
  totalQuestions: number;
  questions: string[];
  currentQuestion: string;
  candidateAnswer: string;
  transcript: Array<{ role: string; content: string }>;
}): Promise<MockInterviewResponse> {
  const finalQuestion = params.questionIndex >= params.totalQuestions - 1;

  const prompt = `
You are a senior interviewer coaching a candidate.
Role: ${params.role}
Current question number: ${params.questionIndex + 1} of ${params.totalQuestions}
Current question: ${params.currentQuestion}
Candidate answer: ${params.candidateAnswer}
Full question list: ${JSON.stringify(params.questions)}
Conversation transcript: ${JSON.stringify(params.transcript)}

Return ONLY valid JSON in this exact shape:
{
  "type": "question" | "final_report",
  "question": "next question string",
  "overallScore": number between 0 and 100,
  "communicationScore": number between 0 and 100,
  "technicalScore": number between 0 and 100,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"],
  "summary": "short paragraph"
}

Rules:
- If the interview should continue, set type to "question" and provide only the next question.
- If this was the final question, set type to "final_report" and provide the final report fields.
- Do not provide answer feedback during the interview.
- Keep the tone concise and professional.
`.trim();

  const responseText = await generateJsonContent(prompt, 0.45);

  const fallbackReport: InterviewFinalReport = {
    overallScore: 0,
    communicationScore: 0,
    technicalScore: 0,
    summary: "The final interview report could not be generated.",
    strengths: [],
    weaknesses: [],
    suggestions: [],
  };

  const parsed = parseJsonResponse<Record<string, unknown>>(responseText, {});

  if (parsed.type === "final_report") {
    return {
      type: "final_report",
      overallScore:
        typeof parsed.overallScore === "number" ? parsed.overallScore : 0,
      communicationScore:
        typeof parsed.communicationScore === "number"
          ? parsed.communicationScore
          : 0,
      technicalScore:
        typeof parsed.technicalScore === "number" ? parsed.technicalScore : 0,
      summary:
        typeof parsed.summary === "string" ? parsed.summary : fallbackReport.summary,
      strengths: Array.isArray(parsed.strengths)
        ? (parsed.strengths.filter((item): item is string => typeof item === "string"))
        : [],
      weaknesses: Array.isArray(parsed.weaknesses)
        ? (parsed.weaknesses.filter((item): item is string => typeof item === "string"))
        : [],
      suggestions: Array.isArray(parsed.suggestions)
        ? (parsed.suggestions.filter((item): item is string => typeof item === "string"))
        : [],
    };
  }

  return {
    type: "question",
    question:
      typeof parsed.question === "string"
        ? parsed.question
        : finalQuestion
          ? ""
          : params.questions[params.questionIndex + 1] || "",
  };
}
