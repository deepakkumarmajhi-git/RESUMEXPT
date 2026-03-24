import mammoth from "mammoth";
import { cleanResumeText } from "@/utils/file";

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      return cleanResumeText(parsed.text || "");
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return cleanResumeText(result.value || "");
  }

  throw new Error("Unsupported file format.");
}
