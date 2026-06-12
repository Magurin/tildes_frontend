"use client";

import Link from "next/link";
import { AuthForm, useAuthSession } from "../components/ModeratorAuth";

const ROLE_LABEL: Record<string, string> = {
  user: "Пользователь",
  moderator: "Модератор",
  admin: "Администратор",
};

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
          <div>
            <p className="font-semibold text-foreground">
              {session.user.email}
            </p>
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
