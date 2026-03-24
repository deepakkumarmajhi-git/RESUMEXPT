"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getApiErrorMessage,
  hasApiData,
  readApiPayload,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileSettingsFormProps = {
  initialValues: {
    name: string;
    headline: string;
    targetRole: string;
    yearsOfExperience: number;
    preferredLanguage: string;
    defaultVoiceMode: boolean;
    ttsSpeaker: string;
    interviewDifficulty: "easy" | "medium" | "hard";
    emailNotifications: boolean;
  };
};

export function ProfileSettingsForm({
  initialValues,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await readApiPayload<{ updated: boolean }>(response);
      if (!response.ok || !hasApiData(result.payload)) {
        throw new Error(
          getApiErrorMessage(
            response,
            result.rawText,
            result.payload,
            "Unable to save profile settings.",
          ),
        );
      }

      toast.success("Profile updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile and preferences</CardTitle>
        <CardDescription>
          Update your role target, interview defaults, voice settings, and notifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={form.headline}
              onChange={(event) => updateField("headline", event.target.value)}
              placeholder="Full-stack engineer focused on scalable apps"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetRole">Target role</Label>
            <Input
              id="targetRole"
              value={form.targetRole}
              onChange={(event) => updateField("targetRole", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsOfExperience">Years of experience</Label>
            <Input
              id="yearsOfExperience"
              type="number"
              min={0}
              max={50}
              value={form.yearsOfExperience}
              onChange={(event) =>
                updateField("yearsOfExperience", Number(event.target.value))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredLanguage">Preferred language</Label>
            <Input
              id="preferredLanguage"
              value={form.preferredLanguage}
              onChange={(event) =>
                updateField("preferredLanguage", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ttsSpeaker">TTS speaker</Label>
            <Input
              id="ttsSpeaker"
              value={form.ttsSpeaker}
              onChange={(event) => updateField("ttsSpeaker", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interviewDifficulty">Default interview difficulty</Label>
            <select
              id="interviewDifficulty"
              className="flex h-11 w-full rounded-2xl border border-input bg-card/80 px-4 text-sm"
              value={form.interviewDifficulty}
              onChange={(event) =>
                updateField(
                  "interviewDifficulty",
                  event.target.value as "easy" | "medium" | "hard",
                )
              }
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="space-y-3 rounded-[1.4rem] border border-border/60 bg-secondary/35 p-4">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Default voice mode
              <input
                type="checkbox"
                checked={form.defaultVoiceMode}
                onChange={(event) =>
                  updateField("defaultVoiceMode", event.target.checked)
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Email notifications
              <input
                type="checkbox"
                checked={form.emailNotifications}
                onChange={(event) =>
                  updateField("emailNotifications", event.target.checked)
                }
              />
            </label>
          </div>

          <div className="md:col-span-2">
            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
