import { InferSchemaType, model, models, Schema } from "mongoose";

const userPreferencesSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    preferredLanguage: {
      type: String,
      default: "en-IN",
    },
    defaultVoiceMode: {
      type: Boolean,
      default: false,
    },
    ttsSpeaker: {
      type: String,
      default: "simran",
    },
    targetRole: {
      type: String,
      default: "",
    },
    interviewDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export type UserPreferencesDocument = InferSchemaType<typeof userPreferencesSchema>;

export const UserPreferencesModel =
  models.UserPreferences || model("UserPreferences", userPreferencesSchema);
