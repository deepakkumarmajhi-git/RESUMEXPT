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

function toStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function getScore(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  return Math.max(0, Math.min(100, Math.round(fallback)));
}

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

  const analysisRecord = await ResumeAnalysisModel.findOne({
    resumeId: resume._id,
    userId: session!.user.id,
  })
    .sort({ createdAt: -1 })
    .lean();

  const strengths = toStringList(analysisRecord?.strengths);
  const weaknesses = toStringList(analysisRecord?.weaknesses);
  const suggestions = toStringList(analysisRecord?.suggestions);
  const matchedKeywords = toStringList(analysisRecord?.keywordsMatched);
  const fallbackMissingKeywords = toStringList(analysisRecord?.missingKeywords);
  const missingSkills = (() => {
    const directMissingSkills = toStringList(analysisRecord?.missingSkills);
    return directMissingSkills.length > 0 ? directMissingSkills : fallbackMissingKeywords;
  })();

  const keywordsMatch = (() => {
    if (!analysisRecord) {
      return 0;
    }

    const totalSignals = matchedKeywords.length + missingSkills.length;
    const derivedScore =
      totalSignals > 0 ? (matchedKeywords.length / totalSignals) * 100 : 0;

    return getScore(analysisRecord.keywordsMatch, derivedScore);
  })();

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

      {analysisRecord ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>ATS score</CardTitle>
              <CardDescription>
                Target role: {analysisRecord.targetRole}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-[1.8rem] bg-secondary/35 p-6">
                <p className="text-5xl font-bold">{analysisRecord.atsScore}/100</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {analysisRecord.summary}
                </p>
                <Progress className="mt-6" value={analysisRecord.atsScore} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Keyword match
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{keywordsMatch}%</p>
                  <Progress
                    className="mt-4"
                    indicatorClassName="bg-linear-to-r from-amber-500 to-yellow-500"
                    value={keywordsMatch}
                  />
                </div>

                <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Missing skills
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{missingSkills.length}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Skills or keywords the model expects for this role but could not find clearly in the resume.
                  </p>
                </div>
              </div>

              {matchedKeywords.length > 0 ? (
                <div>
                  <Separator className="mb-6" />
                  <p className="text-sm font-semibold">Matched keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matchedKeywords.map((keyword) => (
                      <Badge key={keyword} variant="success">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Strengths</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {strengths.map((item) => (
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
                {weaknesses.map((item) => (
                  <Badge key={item} variant="destructive">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Missing skills</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {missingSkills.map((item) => (
                  <Badge key={item} variant="warning">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {suggestions.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.35rem] border border-border/70 bg-secondary/35 p-4 text-sm leading-7 text-foreground/85"
                  >
                    {item}
                  </div>
                ))}
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
