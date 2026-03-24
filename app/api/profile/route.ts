import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validations";
import { UserModel } from "@/models/User";
import { UserPreferencesModel } from "@/models/UserPreferences";
import { getProfileData } from "@/services/dashboard.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUserSession();
    const profile = await getProfileData(user.id);
    return successResponse(profile);
  } catch (error) {
    console.error("Profile fetch failed", error);
    return errorResponse("Unable to load profile settings.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUserSession();
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid profile update.", 422, parsed.error.flatten());
    }

    await connectToDatabase();

    await Promise.all([
      UserModel.updateOne(
        { _id: user.id },
        {
          name: parsed.data.name,
          headline: parsed.data.headline || "",
          targetRole: parsed.data.targetRole || "",
          yearsOfExperience: parsed.data.yearsOfExperience ?? 0,
        },
      ),
      UserPreferencesModel.updateOne(
        { userId: user.id },
        {
          preferredLanguage: parsed.data.preferredLanguage,
          defaultVoiceMode: parsed.data.defaultVoiceMode,
          ttsSpeaker: parsed.data.ttsSpeaker,
          targetRole: parsed.data.targetRole || "",
          interviewDifficulty: parsed.data.interviewDifficulty,
          emailNotifications: parsed.data.emailNotifications,
        },
        { upsert: true },
      ),
    ]);

    return successResponse({ updated: true });
  } catch (error) {
    console.error("Profile update failed", error);
    return errorResponse("Unable to update profile settings.", 500);
  }
}
