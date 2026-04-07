import mammoth from "mammoth";
import { cleanResumeText, getResumeFileKind } from "@/utils/file";

async function ensurePdfRuntimePolyfills() {
  if (
    typeof globalThis.DOMMatrix !== "undefined" &&
    typeof globalThis.ImageData !== "undefined" &&
    typeof globalThis.Path2D !== "undefined"
  ) {
    return;
  }

  const canvasModule = await import("@napi-rs/canvas");

  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix =
      canvasModule.DOMMatrix as unknown as typeof globalThis.DOMMatrix;
  }

  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData =
      canvasModule.ImageData as unknown as typeof globalThis.ImageData;
  }

  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D =
      canvasModule.Path2D as unknown as typeof globalThis.Path2D;
  }
}

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileKind = getResumeFileKind(file);

  if (fileKind === "pdf") {
    await ensurePdfRuntimePolyfills();
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
