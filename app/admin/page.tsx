"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthSession } from "../components/ModeratorAuth";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "moderator" | "admin";
  created_at: string;
  last_sign_in_at: string | null;
};

const ROLE_LABEL = { user: "пользователь", moderator: "модератор", admin: "админ" };

export default function AdminPage() {
  const { session, isAdmin, loading, authHeader } = useAuthSession();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !isAdmin) return;
    fetch("/api/admin/users", { headers: authHeader, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setUsers(json.users))
      .catch(() => setError("Не удалось загрузить пользователей"));
    // authHeader is derived from session — session is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, isAdmin]);

  async function setRole(user: AdminUser, role: "user" | "moderator") {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ user_id: user.id, role }),
      });
      const json = await res.json();
      if (res.ok)
        setUsers((u) =>
          u ? u.map((x) => (x.id === user.id ? { ...x, role } : x)) : u,
        );
      else setError(json.error ?? "Не удалось изменить роль");
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="pt-6 text-muted">Загрузка…</p>;
  if (!session || !isAdmin)
    return (
      <div className="pt-6 text-center text-muted">
        <p>Раздел доступен только администраторам.</p>
        <Link href="/account" className="text-primary underline">
          Войти
        </Link>
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Пользователи
        </h1>
        <p className="mt-1 text-sm text-muted">
          Модераторы получают доступ к «Записи» и загрузке материалов.
        </p>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {users === null ? (
        <p className="text-muted">Загрузка списка…</p>
      ) : users.length === 0 ? (
        <p className="text-muted">Пока никто не зарегистрировался.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-foreground">
                  {u.name ?? u.email}
                </p>
                <p className="truncate text-xs text-muted">
                  {u.name ? `${u.email} · ` : ""}
                  {ROLE_LABEL[u.role]} · с{" "}
                  {new Date(u.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
              {u.role === "admin" ? (
                <span className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-primary">
                  админ
                </span>
              ) : (
                <button
                  onClick={() =>
                    setRole(u, u.role === "moderator" ? "user" : "moderator")
                  }
                  disabled={busyId === u.id}
                  className={`pressable shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                    u.role === "moderator"
                      ? "bg-surface-2 text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {u.role === "moderator" ? "Снять модератора" : "Сделать модератором"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
