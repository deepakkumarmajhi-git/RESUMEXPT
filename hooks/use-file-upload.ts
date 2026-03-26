"use client";

import { useMemo, useState } from "react";
import { validateResumeFile } from "@/utils/file";

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileLabel = useMemo(() => {
    if (!file) return "Choose a PDF or DOCX resume";
    return `${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  const onFileSelect = (nextFile: File | null) => {
    if (!nextFile) {
      setFile(null);
      setError(null);
      return;
    }

    const validationError = validateResumeFile(nextFile);
    setError(validationError);
    setFile(validationError ? null : nextFile);
  };

  return {
    file,
    error,
    fileLabel,
    isUploading,
    setIsUploading,
    onFileSelect,
    reset: () => {
      setFile(null);
      setError(null);
      setIsUploading(false);
    },
  };
}
