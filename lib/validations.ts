import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long."),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number."),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export const resumeUploadSchema = z.object({
  targetRole: z.string().trim().min(2).max(120).optional().or(z.literal("")),
});

export const resumeAnalysisSchema = z.object({
  targetRole: z.string().trim().min(2).max(120),
});

export const interviewGeneratorSchema = z.object({
  resumeId: z.string().optional(),
  resumeAnalysisId: z.string().optional(),
  role: z.string().trim().min(2).max(120),
  experienceLevel: z.enum(["entry", "mid", "senior"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const interviewMessageSchema = z.object({
  message: z.string().trim().min(2).max(5000),
});

export const voiceTranscriptSchema = z.object({
  languageCode: z.string().trim().min(2).optional(),
});

export const voiceSynthesisSchema = z.object({
  text: z.string().trim().min(2).max(2500),
  languageCode: z.string().trim().min(2).optional(),
  speaker: z.string().trim().min(2).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  targetRole: z.string().trim().max(120).optional().or(z.literal("")),
  yearsOfExperience: z.coerce.number().min(0).max(50).optional(),
  preferredLanguage: z.string().trim().min(2).max(10),
  defaultVoiceMode: z.boolean(),
  ttsSpeaker: z.string().trim().min(2).max(50),
  interviewDifficulty: z.enum(["easy", "medium", "hard"]),
  emailNotifications: z.boolean(),
});
