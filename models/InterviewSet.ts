import { InferSchemaType, model, models, Schema } from "mongoose";

const interviewSetSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    resumeAnalysisId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeAnalysis",
      default: null,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    technicalQuestions: {
      type: [String],
      default: [],
    },
    hrQuestions: {
      type: [String],
      default: [],
    },
    codingQuestions: {
      type: [String],
      default: [],
    },
    focusAreas: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

interviewSetSchema.index({ userId: 1, createdAt: -1 });
interviewSetSchema.index({ userId: 1, role: 1, createdAt: -1 });

export type InterviewSetDocument = InferSchemaType<typeof interviewSetSchema>;

export const InterviewSetModel =
  models.InterviewSet || model("InterviewSet", interviewSetSchema);
