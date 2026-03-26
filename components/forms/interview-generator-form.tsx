"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
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

type AnalysisOption = {
  id: string;
  label: string;
  resumeId: string;
  targetRole: string;
  resumeName: string;
};

type InterviewGeneratorFormProps = {
  analyses: AnalysisOption[];
};

export function InterviewGeneratorForm({
  analyses,
}: InterviewGeneratorFormProps) {
  const router = useRouter();
  const initialAnalysisId = analyses[0]?.id ?? "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState(analyses[0]?.targetRole ?? "");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [difficulty, setDifficulty] = useState("medium");
  const [selectedAnalysis, setSelectedAnalysis] = useState(initialAnalysisId);
  const [lastAutoRole, setLastAutoRole] = useState(analyses[0]?.targetRole ?? "");

  const selectedContext = analyses.find((item) => item.id === selectedAnalysis) ?? null;

  useEffect(() => {
    if (!selectedContext) {
      return;
    }

    if (!role.trim() || role === lastAutoRole) {
      setRole(selectedContext.targetRole);
      setLastAutoRole(selectedContext.targetRole);
    }
  }, [selectedContext, role, lastAutoRole]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const analysis = analyses.find((item) => item.id === selectedAnalysis);
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          experienceLevel,
          difficulty,
          resumeId: analysis?.resumeId,
          resumeAnalysisId: analysis?.id,
        }),
      });

      const result = await readApiPayload<{ id: string }>(response);
      if (!response.ok || !hasApiData(result.payload)) {
        throw new Error(
          getApiErrorMessage(
            response,
            result.rawText,
            result.payload,
            "Unable to generate interview set.",
          ),
        );
      }

      toast.success("Interview set generated.");
      router.push(`/interviews/${result.payload.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate questions.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an interview set</CardTitle>
        <CardDescription>
          Generate technical, HR, and coding questions aligned to your role, experience level, and analyzed resume.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="analysis">Use analyzed resume context</Label>
            <select
              id="analysis"
              className="flex h-11 w-full rounded-2xl border border-input bg-card/80 px-4 text-sm"
              value={selectedAnalysis}
              onChange={(event) => setSelectedAnalysis(event.target.value)}
            >
              <option value="">No resume context</option>
              {analyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {analysis.label}
                </option>
              ))}
            </select>
            <p className="text-xs leading-6 text-muted-foreground">
              {selectedContext
                ? `Questions will be personalized using ${selectedContext.resumeName} and its saved analysis.`
                : "Select a saved analysis to personalize the interview set to your resume."}
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Frontend Engineer"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experienceLevel">Experience level</Label>
            <select
              id="experienceLevel"
              className="flex h-11 w-full rounded-2xl border border-input bg-card/80 px-4 text-sm"
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value)}
            >
              <option value="entry">Entry level</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior level</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              id="difficulty"
              className="flex h-11 w-full rounded-2xl border border-input bg-card/80 px-4 text-sm"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate interview set
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
