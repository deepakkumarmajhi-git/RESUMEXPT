export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.18),transparent_32%)]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-10">
        <div className="hidden rounded-[2rem] border border-border/60 bg-card/70 p-10 shadow-2xl backdrop-blur lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            ResumeXpt
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            AI-powered resume analysis and interview coaching in one workspace.
          </h1>
          <p className="mt-6 text-base leading-8 text-muted-foreground">
            Upload a resume, benchmark it against ATS expectations, generate
            custom question sets, and rehearse with text or voice-based mock
            interviews.
          </p>
        </div>
        <div className="flex w-full justify-center">{children}</div>
      </div>
    </div>
  );
}
