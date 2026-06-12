"use client";

import Link from "next/link";
import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguagePicker from "../components/LanguagePicker";
import LanguageNameForm from "../components/LanguageNameForm";
import CaptureMode from "../components/CaptureMode";
import { AuthForm, useAuthSession } from "../components/ModeratorAuth";

export default function CapturePage() {
  const { activeId, active, loading } = useLanguages();
  const { session, isModerator, loading: authLoading } = useAuthSession();

  if (loading || authLoading)
    return <p className="pt-6 text-muted">Загрузка…</p>;

  // Capture writes to the dataset — moderators only.
  if (!isModerator)
    return (
      <div className="flex flex-col gap-5 pt-2">
        <header>
          <h1
            className="text-2xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Запись слов
          </h1>
          <p className="mt-1 text-sm text-muted">
            Запись данных от носителей доступна модераторам проекта.
          </p>
        </header>
        {!session ? (
          <AuthForm note="Войдите как модератор, чтобы записывать слова." />
        ) : (
          <div className="card p-5 text-sm text-muted">
            У вашего аккаунта нет прав модератора. Их выдаёт администратор —{" "}
            <Link href="/account" className="text-primary underline">
              профиль
            </Link>
            .
          </div>
        )}
      </div>
    );

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
