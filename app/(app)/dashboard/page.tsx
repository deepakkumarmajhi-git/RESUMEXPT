import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnalyticsCards } from "@/components/dashboard/analytics-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/session";
import { getDashboardStats } from "@/services/dashboard.service";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const stats = await getDashboardStats(session!.user.id);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Welcome back
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {session?.user?.name}, keep building interview-ready momentum.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
              Upload a fresh resume, compare ATS fit for your next role, and
              run a tailored mock interview from the same dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/upload">
                  Upload new resume
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/interviews">Generate interview set</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What you can do next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Benchmark your latest resume against ATS requirements",
              "Generate role-specific technical, HR, and coding questions",
              "Switch to voice mode for realistic spoken practice",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[1.4rem] bg-secondary/35 p-4"
              >
                <div className="mt-1 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <AnalyticsCards stats={stats} />
      <RecentActivity items={stats.recentActivity} />
    </div>
  );
}
