"use client";

import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { startTransition, useState } from "react";
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
import { cn } from "@/utils/cn";
import { MAX_RESUME_FILE_SIZE } from "@/utils/file";

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
  const maxResumeSizeMb = Math.round(MAX_RESUME_FILE_SIZE / 1024 / 1024);

  const openAnalysisPage = (resumeId: string) => {
    startTransition(() => {
      router.push(`/analysis/${resumeId}`);
      router.refresh();
    });
  };

  const dropzone = useDropzone({
    multiple: false,
    maxSize: MAX_RESUME_FILE_SIZE,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    onDrop: (acceptedFiles, fileRejections) => {
      onFileSelect(acceptedFiles[0] ?? fileRejections[0]?.file ?? null);
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
    let uploadedResumeId: string | null = null;

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

      uploadedResumeId = uploadResult.payload.data.id;

      const analyzeResponse = await fetch(
        `/api/resumes/${uploadedResumeId}/analyze`,
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
      setTargetRole("");
      openAnalysisPage(uploadedResumeId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed.";

      if (uploadedResumeId) {
        toast.error(`Resume uploaded, but analysis failed: ${message}`);
        openAnalysisPage(uploadedResumeId);
      } else {
        toast.error(message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-5 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">
          Upload a new resume
        </CardTitle>
        <CardDescription>
          Drag in a PDF or DOCX file, then run an ATS analysis tailored to your
          target role.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div
            {...dropzone.getRootProps()}
            className={cn(
              "rounded-[1.6rem] border border-dashed border-border bg-secondary/35 p-5 text-center transition hover:border-primary hover:bg-secondary/60 sm:rounded-[1.8rem] sm:p-8",
              dropzone.isDragActive && "border-primary bg-secondary/60",
            )}
          >
            <input {...dropzone.getInputProps()} />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-semibold">
              {dropzone.isDragActive ? "Drop resume to upload" : "Drop resume here"}
            </p>
            <p className="mt-2 break-words text-sm text-muted-foreground">
              {fileLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF or DOCX, max {maxResumeSizeMb}MB
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={(clickEvent) => {
                  clickEvent.preventDefault();
                  clickEvent.stopPropagation();
                  dropzone.open();
                }}
              >
                <FileText className="h-4 w-4" />
                Browse files
              </Button>
              <p className="text-xs text-muted-foreground">
                Mobile and desktop uploads are supported.
              </p>
            </div>
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
