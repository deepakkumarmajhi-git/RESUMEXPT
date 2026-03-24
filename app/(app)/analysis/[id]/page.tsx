import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getCurrentSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";

type AnalysisPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  const session = await getCurrentSession();
  await connectToDatabase();

  const resume = await ResumeModel.findOne({
    _id: id,
    userId: session!.user.id,
  })
    .select("fileName targetRole status createdAt updatedAt")
    .lean();

  if (!resume) {
    notFound();
  }

  const analysis = await ResumeAnalysisModel.findOne({
    resumeId: resume._id,
    userId: session!.user.id,
  })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          Resume analysis
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{resume.fileName}</h1>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          Review ATS fit, strengths, weak points, and role-aligned suggestions.
        </p>
      </div>

      {analysis ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>ATS score</CardTitle>
              <CardDescription>
                Target role: {analysis.targetRole}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[1.8rem] bg-secondary/35 p-6">
                <p className="text-5xl font-bold">{analysis.atsScore}/100</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {analysis.summary}
                </p>
                <Progress className="mt-6" value={analysis.atsScore} />
              </div>
              <Separator className="my-6" />
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Keywords matched</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.keywordsMatched.map((keyword: string) => (
                      <Badge key={keyword} variant="success">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">Missing keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.missingKeywords.map((keyword: string) => (
                      <Badge key={keyword} variant="destructive">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Strengths</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.strengths.map((item: string) => (
                  <Badge key={item} variant="success">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weaknesses</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.weaknesses.map((item: string) => (
                  <Badge key={item} variant="destructive">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
                  {analysis.suggestions.map((item: string) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            This resume has not been analyzed yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
