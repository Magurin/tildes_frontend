"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Moderator session for client components.
 *
 * Whether the account is actually a moderator is decided server-side
 * (MODERATOR_EMAILS); here a session only unlocks the UI — every mutating
 * request still carries the JWT and is re-checked by the route handler.
 */
export function useModeratorSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    loading,
    /** Header for mutating API calls; {} while signed out. */
    authHeader: session
      ? { Authorization: `Bearer ${session.access_token}` }
      : ({} as Record<string, string>),
    signOut: () => getSupabaseBrowser().auth.signOut(),
  };
}

/** Email+password sign-in card shown in place of moderator-only UI. */
export function ModeratorLogin({ note }: { note?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError("Не удалось войти: проверьте почту и пароль.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="font-semibold text-foreground">Вход для модераторов</h2>
        <p className="mt-1 text-sm text-muted">
          {note ?? "Загрузка материалов доступна только модераторам проекта."}
        </p>
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Почта"
        autoComplete="email"
        className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
        autoComplete="current-password"
        className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !email.trim() || !password}
        className="pressable rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}
