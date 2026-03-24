export interface ResumeAnalysisResult {
  atsScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  keywordsMatched: string[];
  missingKeywords: string[];
}

export interface DashboardStats {
  totalResumes: number;
  averageAtsScore: number;
  interviewCount: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "resume" | "analysis" | "interview";
  title: string;
  subtitle: string;
  createdAt: string | Date;
}
