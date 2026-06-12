"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/** Display name: user_metadata.display_name, Google's name, or the email prefix. */
export function displayNameOf(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};
  return (
    (typeof meta.display_name === "string" && meta.display_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "Без имени"
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden {...props}>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3a7.24 7.24 0 0 1-10.8-3.8H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.26 14.28a7.18 7.18 0 0 1 0-4.56v-3.1H1.27a12.02 12.02 0 0 0 0 10.77l3.99-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.97 11.97 0 0 0 1.27 6.61l3.99 3.11A7.16 7.16 0 0 1 12 4.76Z"
      />
    </svg>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] " +
  "placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-ring";

/** Вход / регистрация: почта+пароль (с логином) или Google. */
export default function AuthForm({ note }: { note?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function switchMode(m: "signin" | "signup") {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function google() {
    setError(null);
    const { error: err } = await getSupabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (err)
      setError(
        err.message.toLowerCase().includes("not enabled")
          ? "Вход через Google ещё не подключён."
          : "Не удалось открыть вход через Google.",
      );
  }

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
        options: { data: { display_name: name.trim() } },
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
    <div className="card overflow-hidden">
      {/* Mode toggle */}
      <div className="flex border-b border-border">
        {(
          [
            ["signin", "Вход"],
            ["signup", "Регистрация"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className={`pressable flex-1 py-3.5 text-sm font-semibold transition-colors ${
              mode === m
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5 p-5">
        {note && <p className="text-sm text-muted">{note}</p>}

        {mode === "signup" && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Логин
            <input
              required
              minLength={2}
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как вас называть"
              autoComplete="nickname"
              className={inputCls}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Почта
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Пароль
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Минимум 6 символов" : "Ваш пароль"}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            className={inputCls}
          />
        </label>

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
          className="pressable mt-1 rounded-xl bg-primary px-4 py-3.5 text-base font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "…" : mode === "signin" ? "Войти" : "Создать аккаунт"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">или</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={google}
          className="pressable inline-flex items-center justify-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-[15px] font-medium text-foreground hover:bg-surface-2"
        >
          <GoogleIcon />
          Продолжить с Google
        </button>
      </form>
    </div>
  );
}
