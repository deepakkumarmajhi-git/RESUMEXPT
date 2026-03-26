export interface InterviewQuestionSetResult {
  technicalQuestions: string[];
  hrQuestions: string[];
  codingQuestions: string[];
  focusAreas: string[];
}

export interface InterviewFinalReport {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface MockInterviewQuestionResult {
  type: "question";
  question: string;
}

export interface MockInterviewFinalReportResult extends InterviewFinalReport {
  type: "final_report";
}

export type MockInterviewResponse =
  | MockInterviewQuestionResult
  | MockInterviewFinalReportResult;
