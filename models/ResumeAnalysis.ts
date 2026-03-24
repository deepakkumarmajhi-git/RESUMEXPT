import { InferSchemaType, model, models, Schema } from "mongoose";

const resumeAnalysisSchema = new Schema(
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
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
    },
    atsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    keywordsMatched: {
      type: [String],
      default: [],
    },
    missingKeywords: {
      type: [String],
      default: [],
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

resumeAnalysisSchema.index({ userId: 1, createdAt: -1 });
resumeAnalysisSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

export type ResumeAnalysisDocument = InferSchemaType<typeof resumeAnalysisSchema>;

export const ResumeAnalysisModel =
  models.ResumeAnalysis || model("ResumeAnalysis", resumeAnalysisSchema);
