import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MockInterviewChat } from "@/components/interview/mock-interview-chat";
import { getCurrentSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { InterviewSetModel } from "@/models/InterviewSet";

type InterviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterviewDetailPage({
  params,
}: InterviewDetailPageProps) {
  const { id } = await params;
  const session = await getCurrentSession();
  await connectToDatabase();

  const interviewSet = await InterviewSetModel.findOne({
    _id: id,
    userId: session!.user.id,
  }).lean();

  if (!interviewSet) {
    notFound();
  }

  const latestSession = await InterviewSessionModel.findOne({
    interviewSetId: interviewSet._id,
    userId: session!.user.id,
  })
    .sort({ updatedAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            Interview set
          </p>
          <Badge variant="secondary">{interviewSet.experienceLevel}</Badge>
          <Badge variant="outline">{interviewSet.difficulty}</Badge>
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          {interviewSet.role}
        </h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              {interviewSet.technicalQuestions.map((item: string, index: number) => (
                <p key={item}>
                  {index + 1}. {item}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>HR questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              {interviewSet.hrQuestions.map((item: string, index: number) => (
                <p key={item}>
                  {index + 1}. {item}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coding questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              {interviewSet.codingQuestions.map((item: string, index: number) => (
                <p key={item}>
                  {index + 1}. {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        <MockInterviewChat
          interviewSetId={interviewSet._id.toString()}
          role={interviewSet.role}
          initialSession={
            latestSession
              ? {
                  id: latestSession._id.toString(),
                  mode: latestSession.mode,
                  status: latestSession.status,
                  transcript: latestSession.transcript.map((entry: {
                    role: "assistant" | "user" | "system";
                    content: string;
                    feedback?: string;
                    createdAt?: Date;
                  }) => ({
                    role: entry.role,
                    content: entry.content,
                    feedback: entry.feedback,
                    createdAt: entry.createdAt?.toString(),
                  })),
                  finalReport: latestSession.finalReport,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
