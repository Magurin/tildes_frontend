"use client";

import { useLanguages } from "../components/ActiveLanguageProvider";
import LanguageSwitcher from "../components/LanguageSwitcher";
import LanguageNameForm from "../components/LanguageNameForm";
import Translator from "../components/Translator";

export default function TranslatePage() {
  const { active, activeId, loading } = useLanguages();

  if (loading) return <p className="pt-6 text-muted">Загрузка…</p>;

  // A target language is required before translating.
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
            С какого языка начнём? Дайте ему название, чтобы переводить.
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
      <LanguageSwitcher />
      <Translator
        languageId={activeId}
        targetName={active.name}
        isoCode={active.iso_code}
      />
    </div>
  );
}
