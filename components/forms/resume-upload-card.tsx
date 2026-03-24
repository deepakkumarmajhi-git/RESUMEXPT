"use client";

import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  getApiErrorMessage,
  hasApiData,
  readApiPayload,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResumeUploadCard() {
  const router = useRouter();
  const {
    file,
    error,
    fileLabel,
    isUploading,
    setIsUploading,
    onFileSelect,
    reset,
  } = useFileUpload();
  const [targetRole, setTargetRole] = useState("");

  const dropzone = useDropzone({
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    onDrop: (acceptedFiles) => {
      onFileSelect(acceptedFiles[0] ?? null);
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      toast.error("Please choose a PDF or DOCX file first.");
      return;
    }

    if (!targetRole.trim()) {
      toast.error("Add the role you want the resume scored against.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetRole", targetRole);

      const uploadResponse = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await readApiPayload<{ id: string }>(uploadResponse);
      if (!uploadResponse.ok || !hasApiData(uploadResult.payload)) {
        throw new Error(
          getApiErrorMessage(
            uploadResponse,
            uploadResult.rawText,
            uploadResult.payload,
            "Unable to upload the resume right now.",
          ),
        );
      }

      const analyzeResponse = await fetch(
        `/api/resumes/${uploadResult.payload.data.id}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetRole,
          }),
        },
      );

      const analyzeResult = await readApiPayload(analyzeResponse);
      if (!analyzeResponse.ok || !hasApiData(analyzeResult.payload)) {
        throw new Error(
          getApiErrorMessage(
            analyzeResponse,
            analyzeResult.rawText,
            analyzeResult.payload,
            "Unable to analyze the resume right now.",
          ),
        );
      }

      toast.success("Resume uploaded and analyzed successfully.");
      reset();
      router.push(`/analysis/${uploadResult.payload.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl">Upload a new resume</CardTitle>
        <CardDescription>
          Drag in a PDF or DOCX file, then run an ATS analysis tailored to your target role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div
            {...dropzone.getRootProps()}
            className="rounded-[1.8rem] border border-dashed border-border bg-secondary/35 p-8 text-center transition hover:border-primary hover:bg-secondary/60"
          >
            <input {...dropzone.getInputProps()} />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-semibold">Drop resume here</p>
            <p className="mt-2 text-sm text-muted-foreground">{fileLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF or DOCX, max 5MB
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="targetRole">Target role</Label>
            <Input
              id="targetRole"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder="Senior Full-Stack Engineer"
              required
            />
          </div>

          <Button className="w-full" disabled={isUploading} type="submit">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Upload and analyze
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
