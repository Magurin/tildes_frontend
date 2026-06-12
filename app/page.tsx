"use client";

import Link from "next/link";
import { useLanguages } from "./components/ActiveLanguageProvider";
import { ChatIcon, BookIcon, ChevronRight } from "./components/icons";

// Moderator tools (upload, словари) живут в «Профиле» — здесь только то,
// что нужно обычному посетителю.
const actions = [
  {
    href: "/chat",
    title: "Поговорить с ботом",
    desc: "Рисуйте слово и произносите его голосом, затем — чат",
    Icon: ChatIcon,
  },
  {
    href: "/learn",
    title: "Учить язык",
    desc: "Карточки из собранного словаря — для новых носителей",
    Icon: BookIcon,
  },
];

export default function Home() {
  const { active, loading } = useLanguages();

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2">
        <p className="text-sm font-medium text-primary">Tildes AI</p>
        <h1
          className="mt-1 text-3xl leading-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Сохраняем умирающие языки вместе с носителями
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-muted">
          Носитель рисует слово и произносит его голосом — так растёт датасет.
          Когда данных достаточно, бот переходит в режим живого диалога.
        </p>
      </header>

      {!loading && active && (
        <div className="card p-4">
          <p className="text-xs font-medium text-muted">Активный язык</p>
          <p
            className="mt-0.5 text-xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {active.name}
            {active.native_name && (
              <span className="ml-2 text-base text-muted">
                {active.native_name}
              </span>
            )}
          </p>
          <div className="mt-3 flex gap-3 text-sm text-muted">
            <span>Ответов: {active.response_count}</span>
            <span aria-hidden>·</span>
            <span>Слов: {active.entry_count}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {actions.map(({ href, title, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="card pressable flex items-center gap-4 p-4"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-primary">
              <Icon width={24} height={24} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">
                {title}
              </span>
              <span className="block text-sm text-muted">{desc}</span>
            </span>
            <ChevronRight width={20} height={20} className="text-muted" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
