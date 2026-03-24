"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Loader2,
  Mic,
  MicOff,
  PlayCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useVoiceInterview } from "@/hooks/use-voice-interview";
import {
  getApiErrorMessage,
  hasApiData,
  readApiPayload,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewFinalReport } from "@/types/interview";

type TranscriptEntry = {
  role: "assistant" | "user" | "system";
  content: string;
  feedback?: string;
  createdAt?: string;
};

type MockInterviewChatProps = {
  interviewSetId: string;
  role: string;
  initialSession?: {
    id: string;
    mode: "text" | "voice";
    status: "active" | "completed";
    transcript: TranscriptEntry[];
    finalReport?: InterviewFinalReport | null;
  } | null;
};

export function MockInterviewChat({
  interviewSetId,
  role,
  initialSession,
}: MockInterviewChatProps) {
  const router = useRouter();
  const voice = useVoiceInterview();
  const [sessionId, setSessionId] = useState(initialSession?.id ?? "");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(
    initialSession?.transcript ?? [],
  );
  const [message, setMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState(initialSession?.mode === "voice");
  const [finalReport, setFinalReport] = useState<InterviewFinalReport | null>(
    initialSession?.finalReport ?? null,
  );

  const startSession = async (mode: "text" | "voice") => {
    setIsStarting(true);

    try {
      const response = await fetch("/api/interviews/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interviewSetId,
          mode,
        }),
      });

      const result = await readApiPayload<{
        id: string;
        openingQuestion: string;
      }>(response);
      if (!response.ok || !hasApiData(result.payload)) {
        throw new Error(
          getApiErrorMessage(
            response,
            result.rawText,
            result.payload,
            "Unable to start interview.",
          ),
        );
      }

      setSessionId(result.payload.data.id);
      setTranscript([
        {
          role: "assistant",
          content: result.payload.data.openingQuestion,
        },
      ]);
      setFinalReport(null);
      setVoiceMode(mode === "voice");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start session.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const speak = async (text: string) => {
    try {
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const result = await readApiPayload<{ audioUrl: string }>(response);
      if (!response.ok || !hasApiData(result.payload)) return;

      const audio = new Audio(result.payload.data.audioUrl);
      await audio.play();
    } catch (error) {
      console.error("TTS playback failed", error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!sessionId) {
      toast.error("Start a mock interview first.");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        `/api/interviews/sessions/${sessionId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: content }),
        },
      );

      const result = await readApiPayload<{
        reply: string;
        finalReport: InterviewFinalReport | null;
        session: {
          transcript: TranscriptEntry[];
        };
      }>(response);
      if (!response.ok || !hasApiData(result.payload)) {
        throw new Error(
          getApiErrorMessage(
            response,
            result.rawText,
            result.payload,
            "Unable to send answer.",
          ),
        );
      }

      setTranscript(result.payload.data.session.transcript);
      setFinalReport(result.payload.data.finalReport ?? null);
      setMessage("");

      if (voiceMode && result.payload.data.reply) {
        void speak(result.payload.data.reply);
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to continue interview.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const submitTextAnswer = async () => {
    if (!message.trim()) return;
    await sendMessage(message.trim());
  };

  const handleVoiceSubmit = async () => {
    try {
      if (!voice.isRecording) {
        await voice.startRecording();
        return;
      }

      const blob = await voice.stopRecording();
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", new File([blob], "answer.webm", { type: blob.type }));

      const response = await fetch("/api/voice/stt", {
        method: "POST",
        body: formData,
      });

      const result = await readApiPayload<{ transcript: string }>(response);
      if (!response.ok || !hasApiData(result.payload)) {
        throw new Error(
          getApiErrorMessage(
            response,
            result.rawText,
            result.payload,
            "Unable to transcribe audio.",
          ),
        );
      }

      toast.success("Audio transcribed successfully.");
      await sendMessage(result.payload.data.transcript);
      voice.clear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice mode failed.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <Card className="min-h-[560px]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Mock interview coach</CardTitle>
              <CardDescription>
                Practice answers for the {role} role with AI feedback after every
                response.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={voiceMode ? "secondary" : "outline"}>
                {voiceMode ? "Voice mode" : "Text mode"}
              </Badge>
              <Button
                variant="outline"
                onClick={() => startSession(voiceMode ? "voice" : "text")}
                disabled={isStarting}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {sessionId ? "Restart interview" : "Start interview"}
              </Button>
              <Button
                variant={voiceMode ? "secondary" : "outline"}
                onClick={() => setVoiceMode((current) => !current)}
              >
                {voiceMode ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
                Toggle voice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex h-full flex-col">
          <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto pr-1">
            {transcript.length ? (
              transcript.map((entry, index) => (
                <div
                  key={`${entry.role}-${index}`}
                  className={`max-w-[88%] rounded-[1.6rem] px-4 py-3 text-sm leading-7 ${
                    entry.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{entry.content}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
                Start a session to let the AI interviewer ask the opening
                question.
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your answer here..."
              disabled={voiceMode || isSending}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={voiceMode || isSending}
                onClick={submitTextAnswer}
                type="button"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send answer
              </Button>
              <Button
                type="button"
                variant={voice.isRecording ? "destructive" : "secondary"}
                onClick={handleVoiceSubmit}
                disabled={!voiceMode || isSending}
              >
                {voice.isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {voice.isRecording ? "Stop recording" : "Record answer"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Final report</CardTitle>
          <CardDescription>
            Your interview summary appears here when the mock session is complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {finalReport ? (
            <>
              <div className="rounded-[1.4rem] bg-primary/10 p-4">
                <p className="text-sm font-semibold text-primary">Overall score</p>
                <p className="mt-2 text-4xl font-bold">
                  {finalReport.overallScore}/100
                </p>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                {finalReport.summary}
              </p>
              <div>
                <p className="text-sm font-semibold">Highlights</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {finalReport.highlights.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold">Improve next</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {finalReport.improvements.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.4rem] border border-border/60 bg-card/60 p-4 text-sm">
                <p className="font-semibold">Recommendation</p>
                <p className="mt-2 text-muted-foreground">
                  {finalReport.recommendation}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              Complete a mock interview and the AI coach will generate a summary
              report with strengths, improvement areas, and a recommendation.
            </div>
          )}

          <div className="rounded-[1.4rem] border border-border/60 bg-secondary/35 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Voice interview mode
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn on voice mode to record spoken answers, transcribe them with
              Sarvam AI, and optionally listen to AI feedback aloud.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
