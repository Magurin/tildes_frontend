"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type LanguageSummary = {
  id: string;
  name: string;
  native_name: string | null;
  iso_code: string | null;
  status: string;
  description: string | null;
  speaker_count: number | null;
  response_count: number;
  entry_count: number;
};

type Ctx = {
  languages: LanguageSummary[];
  activeId: string | null;
  active: LanguageSummary | null;
  setActiveId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
};

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "tildes.activeLanguage";

export function ActiveLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [languages, setLanguages] = useState<LanguageSummary[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/languages", { cache: "no-store" });
      const json = await res.json();
      const list: LanguageSummary[] = json.languages ?? [];
      setLanguages(list);
      setActiveIdState((cur) => {
        const stored =
          cur ?? (typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null);
        if (stored && list.some((l) => l.id === stored)) return stored;
        return list[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const active = languages.find((l) => l.id === activeId) ?? null;

  return (
    <LanguageContext.Provider
      value={{ languages, activeId, active, setActiveId, loading, refresh }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguages() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguages must be used within ActiveLanguageProvider");
  return ctx;
}
