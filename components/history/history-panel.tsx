"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { formatDate } from "@/utils/date";

type HistoryPanelProps = {
  resumes: Array<{
    _id: string;
    fileName: string;
    targetRole: string;
    status: string;
    createdAt: string;
  }>;
  sessions: Array<{
    _id: string;
    status: string;
    mode: string;
    createdAt: string;
  }>;
};

export function HistoryPanel({ resumes, sessions }: HistoryPanelProps) {
  const router = useRouter();

  const deleteResource = async (url: string, message: string) => {
    try {
      const response = await fetch(url, {
        method: "DELETE",
      });
      const result = await readApiPayload<{ deleted: boolean }>(response);
      if (!response.ok || !hasApiData(result.payload)) {
        throw new Error(
          getApiErrorMessage(
            response,
            result.rawText,
            result.payload,
            "Delete failed.",
          ),
        );
      }

      toast.success(message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Past resumes</CardTitle>
          <CardDescription>
            Review or remove uploaded resumes and their linked analyses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {resumes.length ? (
            resumes.map((resume) => (
              <div
                key={resume._id}
                className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-border/60 bg-card/70 p-4"
              >
                <div>
                  <p className="font-semibold">{resume.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {resume.targetRole || "No role set"} • {resume.status} •{" "}
                    {formatDate(resume.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/analysis/${resume._id}`}>View</Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      deleteResource(
                        `/api/resumes/${resume._id}`,
                        "Resume deleted successfully.",
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-[1.4rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              No resumes yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interview sessions</CardTitle>
          <CardDescription>
            Track mock interviews completed in text or voice mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length ? (
            sessions.map((session) => (
              <div
                key={session._id}
                className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-border/60 bg-card/70 p-4"
              >
                <div>
                  <p className="font-semibold">
                    {session.status === "completed"
                      ? "Completed"
                      : "In progress"}{" "}
                    interview
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session.mode} mode • {formatDate(session.createdAt)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    deleteResource(
                      `/api/interviews/sessions/${session._id}`,
                      "Interview session deleted successfully.",
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-[1.4rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              No interview sessions yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
