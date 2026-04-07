import mammoth from "mammoth";
import { cleanResumeText, getResumeFileKind } from "@/utils/file";

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileKind = getResumeFileKind(file);

  if (fileKind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      return cleanResumeText(parsed.text || "");
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (fileKind === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return cleanResumeText(result.value || "");
  }

  throw new Error("Unsupported file format.");
}
