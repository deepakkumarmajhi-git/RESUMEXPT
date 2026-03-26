import { FileText, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/types/resume";

type AnalyticsCardsProps = {
  stats: DashboardStats;
};

export function AnalyticsCards({ stats }: AnalyticsCardsProps) {
  const items = [
    {
      label: "Resumes analyzed",
      value: stats.totalResumes,
      description: "Total uploaded resumes in your workspace",
      icon: FileText,
    },
    {
      label: "Average ATS score",
      value: `${stats.averageAtsScore}/100`,
      description: "Rolling average across all completed analyses",
      icon: TrendingUp,
    },
    {
      label: "Interview sessions",
      value: stats.interviewCount,
      description: "Mock interviews completed or currently in progress",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="overflow-hidden">
            <CardHeader className="flex flex-col items-start justify-between gap-4 pb-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <CardTitle className="mt-2 text-2xl sm:text-3xl">
                  {item.value}
                </CardTitle>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
