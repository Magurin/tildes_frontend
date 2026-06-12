"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakerIcon } from "./icons";

/** Inference backend (Railway) with the MMS-TTS voices. */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
/** Languages with a verified MMS voice on the backend. */
const TTS_LANGS = new Set(["alt", "kjh", "cjs", "nog", "crh"]);

/** Whether the speak button will render for this language at all. */
export function ttsAvailable(isoCode?: string | null): boolean {
  return Boolean(BACKEND_URL) && TTS_LANGS.has(isoCode ?? "");
}

/**
 * «Озвучить» — speaks target-language text with the language's MMS voice.
 * Renders nothing when the backend or the voice is unavailable, so it can
 * be dropped anywhere a term is displayed.
 */
export default function SpeakButton({
  text,
  isoCode,
  onError,
}: {
  text: string;
  isoCode?: string | null;
  onError?: (message: string) => void;
}) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cut playback when the text changes (e.g. next flashcard) or on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [text]);

  if (!ttsAvailable(isoCode) || !text.trim()) return null;

  async function speak() {
    if (speaking) return;
    setSpeaking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, iso_code: isoCode }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      await audio.play();
    } catch {
      onError?.("Озвучка недоступна");
      setSpeaking(false);
    }
  }

  return (
    <button
      onClick={speak}
      disabled={speaking}
      aria-label="Озвучить"
      className="pressable inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:text-primary disabled:opacity-50"
    >
      <SpeakerIcon width={16} height={16} aria-hidden />
      {speaking ? "Звучит…" : "Озвучить"}
    </button>
  );
}
