import { connectToDatabase } from "@/lib/db";
import { InterviewSessionModel } from "@/models/InterviewSession";
import { InterviewSetModel } from "@/models/InterviewSet";
import { ResumeAnalysisModel } from "@/models/ResumeAnalysis";
import { ResumeModel } from "@/models/Resume";
import { UserModel } from "@/models/User";
import { UserPreferencesModel } from "@/models/UserPreferences";
import type { DashboardStats } from "@/types/resume";
import { average } from "@/utils/format";

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  await connectToDatabase();

  const [resumes, analyses, sessions] = await Promise.all([
    ResumeModel.find({ userId })
      .select("fileName targetRole status createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    ResumeAnalysisModel.find({ userId })
      .select("atsScore targetRole createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    InterviewSessionModel.find({ userId })
      .select("status mode createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const recentActivity = [
    ...resumes.slice(0, 3).map((resume) => ({
      id: resume._id.toString(),
      type: "resume" as const,
      title: `Uploaded ${resume.fileName}`,
      subtitle: resume.targetRole || "Resume stored and ready for analysis",
      createdAt: resume.createdAt,
    })),
    ...analyses.slice(0, 3).map((analysis) => ({
      id: analysis._id.toString(),
      type: "analysis" as const,
      title: `Resume scored ${analysis.atsScore}/100`,
      subtitle: analysis.targetRole,
      createdAt: analysis.createdAt,
    })),
    ...sessions.slice(0, 3).map((session) => ({
      id: session._id.toString(),
      type: "interview" as const,
      title:
        session.status === "completed"
          ? "Completed a mock interview"
          : "Started a mock interview",
      subtitle: `${session.mode} mode`,
      createdAt: session.createdAt,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);

  return {
    totalResumes: resumes.length,
    averageAtsScore: average(analyses.map((analysis) => analysis.atsScore)),
    interviewCount: sessions.length,
    recentActivity,
  };
}

export async function getHistorySnapshot(userId: string) {
  await connectToDatabase();

  const [resumes, analyses, interviewSets, interviewSessions] = await Promise.all([
    ResumeModel.find({ userId })
      .select("fileName targetRole status createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    ResumeAnalysisModel.find({ userId })
      .select("resumeId targetRole atsScore createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    InterviewSetModel.find({ userId })
      .select("resumeId resumeAnalysisId role experienceLevel difficulty createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    InterviewSessionModel.find({ userId })
      .select("interviewSetId resumeId mode status score createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return {
    resumes,
    analyses,
    interviewSets,
    interviewSessions,
  };
}

export async function getProfileData(userId: string) {
  await connectToDatabase();

  const [user, preferences] = await Promise.all([
    UserModel.findById(userId).lean(),
    UserPreferencesModel.findOne({ userId }).lean(),
  ]);

  return {
    user,
    preferences,
  };
}
