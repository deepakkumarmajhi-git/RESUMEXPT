import { HistoryPanel } from "@/components/history/history-panel";
import { getCurrentSession } from "@/lib/auth/session";
import { getHistorySnapshot } from "@/services/dashboard.service";

export default async function HistoryPage() {
  const session = await getCurrentSession();
  const history = await getHistorySnapshot(session!.user.id);

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          History
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Review your resume and interview archive.
        </h1>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          View previous uploads, analyses, and interview sessions in one place.
        </p>
      </div>

      <HistoryPanel
        resumes={history.resumes.map((resume) => ({
          _id: resume._id.toString(),
          fileName: resume.fileName,
          targetRole: resume.targetRole,
          status: resume.status,
          createdAt: resume.createdAt.toString(),
        }))}
        sessions={history.interviewSessions.map((sessionItem) => ({
          _id: sessionItem._id.toString(),
          status: sessionItem.status,
          mode: sessionItem.mode,
          createdAt: sessionItem.createdAt.toString(),
        }))}
      />
    </div>
  );
}
