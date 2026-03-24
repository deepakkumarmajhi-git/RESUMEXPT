import Link from "next/link";
import { ArrowRight, Brain, FileScan, Mic, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: FileScan,
    description:
      "Upload PDF or DOCX resumes and get structured scoring, strengths, weak points, and suggested improvements.",
  },
  {
    icon: Target,
    title: "Role-based interview generation",
    description:
      "Generate technical, HR, and coding questions customized to your target role and seniority.",
  },
  {
    icon: Brain,
    title: "AI mock interview coach",
    description:
      "Practice answer-by-answer with contextual feedback and a final coaching report.",
  },
  {
    icon: Mic,
    title: "Voice interview mode",
    description:
      "Speak your answers, transcribe them with Sarvam AI, and listen to spoken AI feedback.",
  },
];

export default function LandingPage() {
  return (
    <div className="hero-grid min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            ResumeXpt
          </p>
          <p className="text-sm text-muted-foreground">
            AI Resume Analyzer + Interview Coach
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 lg:px-8 lg:pt-14">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <h1 className="max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-foreground lg:text-7xl">
              Turn every resume into a sharper application and every interview into practice that compounds.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              ResumeXpt helps candidates upload resumes, score them against ATS expectations, build custom interview sets, and rehearse with an AI interviewer in text or voice mode.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create your workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">View dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="animate-float">
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                  Workflow
                </p>
                <div className="mt-5 space-y-4">
                  {[
                    "Upload a resume and extract clean text",
                    "Analyze ATS score, strengths, and missing keywords",
                    "Generate role-specific interview questions",
                    "Practice in text or voice mode and review the final report",
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className={`animate-fade-in-up ${index === 1 ? "animation-delay-150" : ""} ${index >= 2 ? "animation-delay-300" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
