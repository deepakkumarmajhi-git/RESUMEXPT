export interface InterviewQuestionSetResult {
  technicalQuestions: string[];
  hrQuestions: string[];
  codingQuestions: string[];
  focusAreas: string[];
}

export interface InterviewFinalReport {
  overallScore: number;
  summary: string;
  highlights: string[];
  improvements: string[];
  recommendation: string;
}

export interface MockInterviewResponse {
  feedback: string;
  nextQuestion: string;
  isComplete: boolean;
  finalReport?: InterviewFinalReport;
}
