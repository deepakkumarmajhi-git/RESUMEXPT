"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  getApiErrorMessage,
  hasApiData,
  readApiPayload,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type RetryAnalysisButtonProps = {
  resumeId: string;
  targetRole: string;
};

export function RetryAnalysisButton({
  resumeId,
  targetRole,
}: RetryAnalysisButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRetry = async () => {
    if (!targetRole.trim()) {
      toast.error("A target role is required before ATS analysis can run.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/resumes/${resumeId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetRole,
        }),
      });

      const result = await readApiPayload(response);
      if (!response.ok || !hasApiData(result.payload)) {
        throw new Error(
          getApiErrorMessage(
            response,
            result.rawText,
            result.payload,
            "Unable to analyze the resume right now.",
          ),
        );
      }

      toast.success("ATS analysis completed.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to analyze the resume.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      className="w-full sm:w-auto"
      disabled={isSubmitting}
      onClick={handleRetry}
      type="button"
    >
      {isSubmitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      Run ATS analysis
    </Button>
  );
}
