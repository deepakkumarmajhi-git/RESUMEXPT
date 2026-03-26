import { ResumeUploadCard } from "@/components/forms/resume-upload-card";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          Resume upload
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Upload once, analyze instantly.
        </h1>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          We extract clean text from PDF and DOCX resumes, store the result
          securely, and send the analysis request server-side.
        </p>
      </div>
      <ResumeUploadCard />
    </div>
  );
}
