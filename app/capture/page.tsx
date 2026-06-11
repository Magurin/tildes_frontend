"use client";

import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguagePicker from "../components/LanguagePicker";
import LanguageNameForm from "../components/LanguageNameForm";
import CaptureMode from "../components/CaptureMode";

export default function CapturePage() {
  const { activeId, active, loading } = useLanguages();

  if (loading) return <p className="pt-6 text-muted">Загрузка…</p>;

  // Word capture needs a target language first.
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
            Дайте языку название, чтобы начать запись слов от носителей.
          </p>
        </header>
        <div className="card p-4">
          <LanguageNameForm />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Запись слов
        </h1>
        <p className="mt-1 text-sm text-muted">
          Нарисуйте слово и произнесите его голосом — так растёт датасет языка.
        </p>
      </header>

      <LanguagePicker />

      <CaptureMode languageId={activeId} />
    </div>
  );
}
