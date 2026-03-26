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
    <div className="flex min-w-0 flex-col gap-6 lg:h-[calc(100vh-5.5rem)]">
      <div className="min-w-0 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            Interview set
          </p>
          <Badge variant="secondary">{interviewSet.experienceLevel}</Badge>
          <Badge variant="outline">{interviewSet.difficulty}</Badge>
          <Badge variant="warning">
            {interviewSet.technicalQuestions.length +
              interviewSet.hrQuestions.length +
              interviewSet.codingQuestions.length}{" "}
            seed prompts
          </Badge>
        </div>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl">
          {interviewSet.role}
        </h1>
      </div>

      <div className="grid flex-1 min-h-0 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="grid min-h-0 gap-4 lg:grid-cols-3 xl:grid-cols-1 xl:grid-rows-[1fr_1fr_1fr]">
          <Card className="min-h-0">
            <CardHeader className="pb-4">
              <CardTitle>Technical questions</CardTitle>
            </CardHeader>
            <CardContent className="hide-scrollbar min-h-0 max-h-[18rem] space-y-3 overflow-y-auto text-sm leading-7 text-muted-foreground xl:max-h-none">
              {interviewSet.technicalQuestions.map((item: string, index: number) => (
                <p key={item}>
                  {index + 1}. {item}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card className="min-h-0">
            <CardHeader className="pb-4">
              <CardTitle>HR questions</CardTitle>
            </CardHeader>
            <CardContent className="hide-scrollbar min-h-0 max-h-[18rem] space-y-3 overflow-y-auto text-sm leading-7 text-muted-foreground xl:max-h-none">
              {interviewSet.hrQuestions.map((item: string, index: number) => (
                <p key={item}>
                  {index + 1}. {item}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card className="min-h-0">
            <CardHeader className="pb-4">
              <CardTitle>Coding questions</CardTitle>
            </CardHeader>
            <CardContent className="hide-scrollbar min-h-0 max-h-[18rem] space-y-3 overflow-y-auto text-sm leading-7 text-muted-foreground xl:max-h-none">
              {interviewSet.codingQuestions.map((item: string, index: number) => (
                <p key={item}>
                  {index + 1}. {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0">
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
                      createdAt?: Date;
                    }) => ({
                      role: entry.role,
                      content: entry.content,
                      createdAt: entry.createdAt?.toString(),
                    })),
                    finalReport: latestSession.finalReport,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
