// Keep uploads safely below Vercel's 4.5 MB function request limit,
// allowing room for multipart form-data overhead.
export const MAX_RESUME_FILE_SIZE = 4 * 1024 * 1024;
export const MAX_STORED_RESUME_TEXT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const GENERIC_BINARY_RESUME_TYPES = new Set([
  "",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
]);

type ResumeFileKind = "pdf" | "docx";

function getResumeExtension(fileName: string) {
  const normalizedFileName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedFileName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return normalizedFileName.slice(lastDotIndex + 1);
}

export function getResumeFileKind(file: { name?: string; type?: string }): ResumeFileKind | null {
  const normalizedType = file.type?.trim().toLowerCase() ?? "";
  const extension = getResumeExtension(file.name ?? "");

  if (normalizedType === "application/pdf") {
    return "pdf";
  }

  if (
    normalizedType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }

  if (extension === "pdf" && GENERIC_BINARY_RESUME_TYPES.has(normalizedType)) {
    return "pdf";
  }

  if (extension === "docx" && GENERIC_BINARY_RESUME_TYPES.has(normalizedType)) {
    return "docx";
  }

  return null;
}

export function isAllowedResumeType(type: string, fileName = "") {
  return getResumeFileKind({ name: fileName, type }) !== null;
}

export function validateResumeFile(
  file: Pick<File, "name" | "size" | "type">,
) {
  if (!isAllowedResumeType(file.type, file.name)) {
    return "Please upload a PDF or DOCX file.";
  }

  if (file.size > MAX_RESUME_FILE_SIZE) {
    return "Resume files must be 5MB or smaller.";
  }

  return null;
}

export function cleanResumeText(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
