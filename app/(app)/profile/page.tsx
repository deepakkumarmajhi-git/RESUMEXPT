import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { getCurrentSession } from "@/lib/auth/session";
import { getProfileData } from "@/services/dashboard.service";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  const profile = await getProfileData(session!.user.id);

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          Profile
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Personal settings and coaching defaults.
        </h1>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          Keep your profile, target role, voice mode, and interview preferences
          up to date.
        </p>
      </div>

      <ProfileSettingsForm
        initialValues={{
          name: profile.user?.name ?? "",
          headline: profile.user?.headline ?? "",
          targetRole:
            profile.preferences?.targetRole || profile.user?.targetRole || "",
          yearsOfExperience: profile.user?.yearsOfExperience ?? 0,
          preferredLanguage: profile.preferences?.preferredLanguage ?? "en-IN",
          defaultVoiceMode: profile.preferences?.defaultVoiceMode ?? false,
          ttsSpeaker: profile.preferences?.ttsSpeaker ?? "simran",
          interviewDifficulty:
            profile.preferences?.interviewDifficulty ?? "medium",
          emailNotifications: profile.preferences?.emailNotifications ?? true,
        }}
      />
    </div>
  );
}
