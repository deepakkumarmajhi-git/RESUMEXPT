import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityItem } from "@/types/resume";
import { formatRelativeDate } from "@/utils/date";

const activityMeta = {
  resume: {
    icon: FileText,
    badge: "outline" as const,
  },
  analysis: {
    icon: Sparkles,
    badge: "default" as const,
  },
  interview: {
    icon: MessageSquare,
    badge: "secondary" as const,
  },
};

type RecentActivityProps = {
  items: ActivityItem[];
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Recent activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your latest uploads, analyses, and coaching sessions.
          </p>
        </div>
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => {
            const meta = activityMeta[item.type];
            const Icon = meta.icon;
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex flex-col gap-4 rounded-[1.4rem] border border-border/60 bg-card/60 p-4 sm:flex-row sm:items-start"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <Badge variant={meta.badge}>{item.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground sm:shrink-0">
                  {formatRelativeDate(item.createdAt)}
                </p>
              </div>
            );
          })
        ) : (
          <p className="rounded-[1.4rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
            No activity yet. Upload a resume to get your first ATS analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
