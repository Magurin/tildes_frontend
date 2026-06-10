"use client";

import { useState } from "react";
import { useLanguages } from "./ActiveLanguageProvider";

/** Create + name a new language, then make it active. */
export default function LanguageNameForm({
  onDone,
}: {
  onDone?: () => void;
}) {
  const { refresh, setActiveId } = useLanguages();
  const [name, setName] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название языка");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          native_name: nativeName.trim() || null,
        }),
      });
      const json = await res.json();
      if (res.ok && json.language?.id) {
        await refresh();
        setActiveId(json.language.id);
        setName("");
        setNativeName("");
        onDone?.();
      } else {
        setError(json.error ?? "Не удалось создать язык");
      }
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название языка (например, Айну)"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={nativeName}
        onChange={(e) => setNativeName(e.target.value)}
        placeholder="Самоназвание (необязательно)"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={create}
        disabled={busy}
        className="pressable w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Создание…" : "Сохранить язык"}
      </button>
    </div>
  );
}
