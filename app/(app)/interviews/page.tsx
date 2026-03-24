import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InterviewGeneratorForm } from "@/components/forms/interview-generator-form";
import { getCurrentSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { InterviewSetModel } from "@/models/InterviewSet";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";

export default async function InterviewsPage() {
  const session = await getCurrentSession();
  await connectToDatabase();

  const [interviewSets, analyses, resumes] = await Promise.all([
    InterviewSetModel.find({ userId: session!.user.id })
      .sort({ createdAt: -1 })
      .lean(),
    ResumeAnalysisModel.find({ userId: session!.user.id })
      .select("resumeId targetRole createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    ResumeModel.find({ userId: session!.user.id })
      .select("fileName")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const analysisOptions = analyses.map((analysis) => {
    const resume = resumes.find(
      (resumeItem) => resumeItem._id.toString() === analysis.resumeId.toString(),
    );

    return {
      id: analysis._id.toString(),
      resumeId: analysis.resumeId.toString(),
      label: `${analysis.targetRole} • ${resume?.fileName ?? "Resume"}`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          Interview generator
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Build the right question set before the real conversation.
        </h1>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          Generate technical, HR, and coding questions, then launch a text or voice mock interview from any saved set.
        </p>
      </div>

      <InterviewGeneratorForm analyses={analysisOptions} />

      <Card>
        <CardHeader>
          <CardTitle>Saved interview sets</CardTitle>
          <CardDescription>
            Revisit previous question sets and resume practice from where you left off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {interviewSets.length ? (
            interviewSets.map((set) => (
              <Link
                key={set._id.toString()}
                href={`/interviews/${set._id.toString()}`}
                className="block rounded-[1.4rem] border border-border/60 bg-card/70 p-4 transition hover:border-primary/50 hover:bg-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{set.role}</p>
                  <Badge variant="secondary">{set.experienceLevel}</Badge>
                  <Badge variant="outline">{set.difficulty}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {set.technicalQuestions.length} technical • {set.hrQuestions.length} HR • {set.codingQuestions.length} coding
                </p>
              </Link>
            ))
          ) : (
            <p className="rounded-[1.4rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              No interview sets yet. Generate one above to start practicing.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
