"use client";

import { useLanguages } from "./ActiveLanguageProvider";

/** Compact active-language selector shared by the Bot and Upload screens. */
export default function LanguagePicker({ label = "Язык" }: { label?: string }) {
  const { languages, activeId, setActiveId, loading } = useLanguages();

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <select
        className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        value={activeId ?? ""}
        onChange={(e) => setActiveId(e.target.value)}
        disabled={loading || languages.length === 0}
      >
        {languages.length === 0 && <option value="">Нет языков</option>}
        {languages.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
            {l.native_name ? ` · ${l.native_name}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
