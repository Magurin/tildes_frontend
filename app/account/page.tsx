"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthSession } from "../components/ModeratorAuth";
import AuthForm, { displayNameOf } from "../components/AuthForm";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PencilIcon } from "../components/icons";

const ROLE_LABEL: Record<string, string> = {
  user: "Пользователь",
  moderator: "Модератор",
  admin: "Администратор",
};

/** Display name with inline editing (saved to user_metadata.display_name). */
function ProfileName({
  user,
}: {
  user: { email?: string; user_metadata?: Record<string, unknown> };
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayNameOf(user));
  const [busy, setBusy] = useState(false);

  async function save() {
    const value = name.trim();
    if (!value || busy) return;
    setBusy(true);
    await getSupabaseBrowser().auth.updateUser({
      data: { display_name: value },
    });
    setBusy(false);
    setEditing(false);
  }

  if (editing)
    return (
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={save}
          disabled={busy || !name.trim()}
          className="pressable rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          ОК
        </button>
      </div>
    );

  return (
    <div className="flex items-center gap-2">
      <p className="text-xl font-semibold text-foreground">{name}</p>
      <button
        onClick={() => setEditing(true)}
        aria-label="Изменить логин"
        className="pressable rounded-lg p-1.5 text-muted hover:text-foreground"
      >
        <PencilIcon width={15} height={15} aria-hidden />
      </button>
    </div>
  );
}

export default function AccountPage() {
  const { session, role, isModerator, isAdmin, loading, signOut } =
    useAuthSession();

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Профиль
        </h1>
        <p className="mt-1 text-sm text-muted">
          Вход открывает функции вашей роли: модераторы записывают слова
          носителей и пополняют словари.
        </p>
      </header>

      {loading ? (
        <p className="text-muted">Загрузка…</p>
      ) : !session ? (
        <AuthForm />
      ) : (
        <div className="card flex flex-col gap-4 p-4">
          <ProfileName user={session.user} />
          <div className="-mt-3">
            <p className="text-sm text-muted">{session.user.email}</p>
            <p className="mt-0.5 text-sm text-muted">
              Роль: {ROLE_LABEL[role]}
            </p>
          </div>

          {isModerator && (
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/capture" className="text-primary underline">
                Запись слов носителей →
              </Link>
              <Link href="/upload" className="text-primary underline">
                Загрузка материалов →
              </Link>
            </div>
          )}
          {!isModerator && (
            <p className="text-sm text-muted">
              Права модератора выдаёт администратор проекта.
            </p>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="pressable inline-block w-fit rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Управление пользователями
            </Link>
          )}

          <button
            onClick={signOut}
            className="pressable w-fit rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
