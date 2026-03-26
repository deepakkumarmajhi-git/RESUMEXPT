"use client";

import { useEffect, useRef, useState } from "react";

export function useVoiceInterview() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    streamRef.current = stream;
    chunksRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return null;

    const recorder = mediaRecorderRef.current;

    const stopped = new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const nextUrl = URL.createObjectURL(blob);
        setAudioUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextUrl;
        });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        resolve(blob);
      };
    });

    recorder.stop();
    setIsRecording(false);
    return stopped;
  };

  return {
    isRecording,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    clear: () => {
      setAudioBlob(null);
      setAudioUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
  };
}
