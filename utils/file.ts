export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_STORED_RESUME_TEXT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function isAllowedResumeType(type: string) {
  return ALLOWED_RESUME_TYPES.includes(type);
}

export function validateResumeFile(file: File) {
  if (!isAllowedResumeType(file.type)) {
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
