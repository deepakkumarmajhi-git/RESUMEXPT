export interface UserPreferencesDTO {
  preferredLanguage: string;
  defaultVoiceMode: boolean;
  ttsSpeaker: string;
  targetRole: string;
  interviewDifficulty: "easy" | "medium" | "hard";
  emailNotifications: boolean;
}
