import { InferSchemaType, model, models, Schema } from "mongoose";
import { MAX_STORED_RESUME_TEXT_BYTES } from "@/utils/file";

const hasSafeStoredTextSize = (value: string | null | undefined) =>
  Buffer.byteLength(value ?? "", "utf8") <= MAX_STORED_RESUME_TEXT_BYTES;

const resumeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    rawText: {
      type: String,
      default: "",
      select: false,
      validate: {
        validator: hasSafeStoredTextSize,
        message: "Stored resume text exceeds the safe size limit.",
      },
    },
    cleanedText: {
      type: String,
      required: true,
      select: false,
      validate: {
        validator: hasSafeStoredTextSize,
        message: "Stored resume text exceeds the safe size limit.",
      },
    },
    targetRole: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["uploaded", "analyzed", "failed"],
      default: "uploaded",
    },
    latestAnalysisId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeAnalysis",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, status: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, targetRole: 1, createdAt: -1 });

export type ResumeDocument = InferSchemaType<typeof resumeSchema>;

export const ResumeModel = models.Resume || model("Resume", resumeSchema);
