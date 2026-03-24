import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { resumeUploadSchema } from "@/lib/validations";
import { ResumeModel } from "@/models/Resume";
import { extractResumeText } from "@/services/resume-parser.service";
import { MAX_STORED_RESUME_TEXT_BYTES, validateResumeFile } from "@/utils/file";

export const runtime = "nodejs";

function collectErrorMessages(error: unknown, messages = new Set<string>()) {
  if (error instanceof Error) {
    if (error.message) {
      messages.add(error.message);
    }

    if ("cause" in error && error.cause) {
      collectErrorMessages(error.cause, messages);
    }
  }

  return [...messages];
}

export async function GET() {
  try {
    const user = await requireUserSession();
    await connectToDatabase();

    const resumes = await ResumeModel.find({ userId: user.id })
      .select("fileName fileType fileSize targetRole status latestAnalysisId createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(resumes);
  } catch (error) {
    console.error("Failed to list resumes", error);
    return errorResponse("Unable to load resumes.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserSession();
    const formData = await request.formData();
    const file = formData.get("file");
    const targetRole = formData.get("targetRole");

    if (!(file instanceof File)) {
      return errorResponse("A resume file is required.", 422);
    }

    const metadataParse = resumeUploadSchema.safeParse({
      targetRole,
    });

    if (!metadataParse.success) {
      return errorResponse(
        "Invalid upload metadata.",
        422,
        metadataParse.error.flatten(),
      );
    }

    const validationError = validateResumeFile(file);
    if (validationError) {
      return errorResponse(validationError, 422);
    }

    const extractedText = await extractResumeText(file);
    if (!extractedText) {
      return errorResponse("We could not extract text from this resume.", 422);
    }

    if (Buffer.byteLength(extractedText, "utf8") > MAX_STORED_RESUME_TEXT_BYTES) {
      return errorResponse(
        "This resume extracts to too much text to store safely. Please upload a smaller or cleaner file.",
        422,
      );
    }

    await connectToDatabase();

    const resume = await ResumeModel.create({
      userId: user.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      cleanedText: extractedText,
      targetRole: metadataParse.data.targetRole || "",
    });

    return successResponse(
      {
        id: resume._id.toString(),
        fileName: resume.fileName,
        targetRole: resume.targetRole,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Resume upload failed", error);
    const errorMessages = collectErrorMessages(error).join(" ");

    if (/ENOSPC|os error 112|not enough space on the disk/i.test(errorMessages)) {
      return errorResponse(
        "The server is out of local disk space, so the upload could not be processed. Free some space and try again.",
        507,
      );
    }

    if (/Stored resume text exceeds the safe size limit|document is larger than/i.test(errorMessages)) {
      return errorResponse(
        "This resume is too large to store safely after extraction. Please upload a smaller or cleaner file.",
        422,
      );
    }

    return errorResponse("Unable to upload the resume right now.", 500);
  }
}
