import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { resumeTextAnalysisSchema } from "@/lib/validations";
import {
  analyzeResume,
  ResumeAnalysisServiceError,
} from "@/services/resume-analysis.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUserSession();
    const body = await request.json();
    const parsed = resumeTextAnalysisSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "Invalid analysis request.",
        422,
        parsed.error.flatten(),
      );
    }

    const result = await analyzeResume(parsed.data.resumeText, parsed.data.jobRole);

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      provider: result.provider,
    });
  } catch (error) {
    console.error("Direct resume analysis failed", error);
    if (error instanceof ResumeAnalysisServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    return errorResponse("Unable to analyze the resume right now.", 500);
  }
}
