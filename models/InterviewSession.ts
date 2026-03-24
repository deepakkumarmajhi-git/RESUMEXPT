import { InferSchemaType, model, models, Schema } from "mongoose";

const transcriptEntrySchema = new Schema(
  {
    role: {
      type: String,
      enum: ["assistant", "user", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const finalReportSchema = new Schema(
  {
    overallScore: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      trim: true,
      default: "",
    },
    highlights: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    recommendation: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const interviewSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    interviewSetId: {
      type: Schema.Types.ObjectId,
      ref: "InterviewSet",
      required: true,
      index: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    mode: {
      type: String,
      enum: ["text", "voice"],
      default: "text",
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    transcript: {
      type: [transcriptEntrySchema],
      default: [],
    },
    finalReport: {
      type: finalReportSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, interviewSetId: 1, createdAt: -1 });

export type InterviewSessionDocument = InferSchemaType<typeof interviewSessionSchema>;

export const InterviewSessionModel =
  models.InterviewSession || model("InterviewSession", interviewSessionSchema);
