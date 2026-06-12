"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export type ClientRole = "user" | "moderator" | "admin";

/**
 * Auth session + role for client components.
 *
 * The role comes from `app_metadata.role` in the JWT — set only via the
 * admin API, so the client can trust it for showing/hiding UI. Every
 * mutating request still carries the JWT and is re-checked server-side.
 */
export function useAuthSession() {
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

  const metaRole = session?.user.app_metadata?.role;
  const role: ClientRole =
    metaRole === "admin" || metaRole === "moderator" ? metaRole : "user";

  return {
    session,
    role,
    isModerator: role === "moderator" || role === "admin",
    isAdmin: role === "admin",
    loading,
    /** Header for mutating API calls; {} while signed out. */
    authHeader: session
      ? { Authorization: `Bearer ${session.access_token}` }
      : ({} as Record<string, string>),
    signOut: () => getSupabaseBrowser().auth.signOut(),
  };
}

/** Backward-compatible alias (pre-roles name). */
export const useModeratorSession = useAuthSession;

/** Email+password вход / регистрация. */
export function AuthForm({ note }: { note?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = getSupabaseBrowser();
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) setError("Не удалось войти: проверьте почту и пароль.");
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (err)
        setError(
          err.message.includes("already registered")
            ? "Эта почта уже зарегистрирована — попробуйте войти."
            : "Не удалось зарегистрироваться. Пароль — от 6 символов.",
        );
      else if (!data.session)
        setInfo("Письмо с подтверждением отправлено — проверьте почту.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4">
      <div>
        <div className="flex rounded-xl bg-surface-2 p-1">
          {(
            [
              ["signin", "Вход"],
              ["signup", "Регистрация"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              className={`pressable flex-1 rounded-lg py-2 text-sm font-medium ${
                mode === m
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {note && <p className="mt-2 text-sm text-muted">{note}</p>}
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
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-accent">
          {info}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !email.trim() || !password}
        className="pressable rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "…" : mode === "signin" ? "Войти" : "Зарегистрироваться"}
      </button>
    </form>
  );
}

/** Backward-compatible alias (login-only name). */
export const ModeratorLogin = AuthForm;
