"use client";

import { useState } from "react";
import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";
import LanguageNameForm from "../components/LanguageNameForm";
import Translator from "../components/Translator";
import ChatMode from "../components/ChatMode";
import { DATASET_THRESHOLD } from "@/lib/config";

export default function BotPage() {
  const { active, activeId, loading } = useLanguages();
  const [mode, setMode] = useState<"translate" | "chat">("translate");
  const [adding, setAdding] = useState(false);

  if (loading) return <p className="pt-6 text-muted">Загрузка…</p>;

  // On entering the Bot the user must name the language they document.
  if (!activeId || !active) {
    return (
      <div className="flex flex-col gap-5 pt-2">
        <header>
          <h1
            className="text-2xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Назовите язык
          </h1>
          <p className="mt-1 text-sm text-muted">
            С какого языка начнём? Дайте ему название, чтобы переводить и вести
            диалог.
          </p>
        </header>
        <div className="card p-4">
          <LanguageNameForm />
        </div>
      </div>
    );
  }

  const chatReady =
    active.response_count + active.entry_count >= DATASET_THRESHOLD;

  return (
    <div className="flex flex-col gap-4">
      {/* Active language switcher + add new */}
      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <LanguageSwitcher />
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="pressable shrink-0 rounded-2xl bg-surface-2 px-4 text-sm font-medium text-foreground"
        >
          {adding ? "Отмена" : "+ Язык"}
        </button>
      </div>
      {adding && (
        <div className="card p-4">
          <LanguageNameForm onDone={() => setAdding(false)} />
        </div>
      )}

      {/* Mode toggle: translator / free chat */}
      <div className="flex rounded-xl bg-surface-2 p-1">
        <button
          onClick={() => setMode("translate")}
          className={`pressable flex-1 rounded-lg py-2.5 text-sm font-medium ${
            mode === "translate"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted"
          }`}
        >
          Перевод
        </button>
        <button
          onClick={() => setMode("chat")}
          className={`pressable flex-1 rounded-lg py-2.5 text-sm font-medium ${
            mode === "chat" ? "bg-surface text-foreground shadow-sm" : "text-muted"
          }`}
        >
          Диалог{!chatReady && " 🔒"}
        </button>
      </div>

      {mode === "translate" ? (
        <Translator languageId={activeId} targetName={active.name} />
      ) : (
        <ChatMode languageId={activeId} ready={chatReady} />
      )}
    </div>
  );
}
