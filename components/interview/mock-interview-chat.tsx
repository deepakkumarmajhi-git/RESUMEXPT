"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Mic,
  MicOff,
  PlayCircle,
  Send,
  Sparkles,
  Volume2,
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
  const chatEndRef = useRef<HTMLDivElement | null>(null);
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

  const latestAssistantMessage = useMemo(
    () =>
      transcript
        .slice()
        .reverse()
        .find((entry) => entry.role === "assistant")?.content ?? "",
    [transcript],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, isSending, isStarting]);

  const speak = async (text: string) => {
    if (!text.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const result = await readApiPayload<{ audioUrl: string }>(response);
      if (!response.ok || !hasApiData(result.payload)) {
        return;
      }

      const audio = new Audio(result.payload.data.audioUrl);
      await audio.play();
    } catch (error) {
      console.error("TTS playback failed", error);
    }
  };

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
      setMessage("");
      setVoiceMode(mode === "voice");
      if (mode === "voice") {
        void speak(result.payload.data.openingQuestion);
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start session.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!sessionId) {
      toast.error("Start a mock interview first.");
      return;
    }

    if (finalReport) {
      toast.error("This interview is already complete. Restart to try again.");
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
        assistantMessage: string;
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

      if (voiceMode && result.payload.data.assistantMessage) {
        void speak(result.payload.data.assistantMessage);
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
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    await sendMessage(trimmed);
  };

  const handleVoiceSubmit = async () => {
    try {
      if (!voice.isRecording) {
        await voice.startRecording();
        return;
      }

      const blob = await voice.stopRecording();
      if (!blob) {
        return;
      }

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
              <CardTitle>Mock interview</CardTitle>
              <CardDescription>
                Practice the {role} role with an AI interviewer. It asks one question
                at a time and saves evaluation for the final report only.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={voiceMode ? "secondary" : "outline"}>
                {voiceMode ? "Voice mode" : "Text mode"}
              </Badge>
              <Button
                variant="outline"
                onClick={() => startSession(voiceMode ? "voice" : "text")}
                disabled={isStarting || isSending}
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
                disabled={isStarting || isSending}
              >
                {voiceMode ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
                Toggle voice
              </Button>
              <Button
                variant="outline"
                onClick={() => void speak(latestAssistantMessage)}
                disabled={!latestAssistantMessage}
              >
                <Volume2 className="h-4 w-4" />
                Replay question
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
                Start a session to let the AI interviewer ask the opening question.
              </div>
            )}

            {(isStarting || isSending) && !finalReport ? (
              <div className="max-w-[88%] rounded-[1.6rem] bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI thinking...</span>
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-6 space-y-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your answer here..."
              disabled={voiceMode || isSending || Boolean(finalReport)}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={voiceMode || isSending || Boolean(finalReport)}
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
                disabled={!voiceMode || isSending || Boolean(finalReport)}
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
            A full evaluation is generated only after the interview is complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {finalReport ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.4rem] bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-primary">Overall</p>
                  <p className="mt-2 text-3xl font-bold">{finalReport.overallScore}</p>
                </div>
                <div className="rounded-[1.4rem] bg-secondary/50 p-4">
                  <p className="text-sm font-semibold">Communication</p>
                  <p className="mt-2 text-3xl font-bold">
                    {finalReport.communicationScore}
                  </p>
                </div>
                <div className="rounded-[1.4rem] bg-secondary/50 p-4">
                  <p className="text-sm font-semibold">Technical</p>
                  <p className="mt-2 text-3xl font-bold">
                    {finalReport.technicalScore}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-7 text-muted-foreground">
                {finalReport.summary}
              </p>

              <div>
                <p className="text-sm font-semibold">Strengths</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {finalReport.strengths.map((item) => (
                    <Badge key={item} variant="success">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Weaknesses</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {finalReport.weaknesses.map((item) => (
                    <Badge key={item} variant="destructive">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Suggestions</p>
                <div className="mt-3 grid gap-3">
                  {finalReport.suggestions.map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.35rem] border border-border/70 bg-secondary/35 p-4 text-sm leading-7 text-foreground/85"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              Complete the mock interview to generate a final evaluation with
              communication, technical scoring, strengths, weaknesses, and next
              steps.
            </div>
          )}

          <div className="rounded-[1.4rem] border border-border/60 bg-secondary/35 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Voice interview mode
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Record spoken answers, convert them to text with Sarvam STT, and
              hear each AI interview question with Sarvam TTS.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
