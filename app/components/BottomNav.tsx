"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  HomeIcon,
  TranslateIcon,
  ScrollIcon,
  MicIcon,
  UploadIcon,
  UserIcon,
  MenuIcon,
  XIcon,
} from "./icons";
import { useAuthSession } from "./ModeratorAuth";

const tabs = [
  { href: "/", label: "Главная", Icon: HomeIcon, exact: true },
  { href: "/chat", label: "Перевод", Icon: TranslateIcon },
  // «Запись» и «Загрузка» — работа с данными, видны только модераторам.
  { href: "/capture", label: "Запись", Icon: MicIcon, moderator: true },
  { href: "/upload", label: "Загрузка", Icon: UploadIcon, moderator: true },
  { href: "/learn", label: "Учить", Icon: ScrollIcon },
];

// «Профиль» отдельно: внизу рейла на десктопе, в бургере сверху на мобилке.
const profileTab = { href: "/account", label: "Профиль", Icon: UserIcon };

/**
 * Адаптивная навигация.
 * - Десктоп (md+): вертикальный рейл слева, профиль закреплён внизу.
 * - Мобилка (<md): нижняя панель с основными вкладками + верхний бар
 *   с бургером, внутри которого профиль.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { isModerator } = useAuthSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const visible = tabs.filter((t) => !t.moderator || isModerator);

  const tabLink = (
    { href, label, Icon, exact }: (typeof tabs)[number],
    className?: string,
  ) => {
    const active = exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={() => setMenuOpen(false)}
        className={`group pressable flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-3 text-[10px] font-medium leading-tight transition-colors duration-200 hover:bg-surface-2 hover:text-primary ${
          active ? "text-primary" : "text-muted"
        } ${className ?? ""}`}
      >
        <Icon
          width={24}
          height={24}
          strokeWidth={active ? 2.25 : 1.75}
          aria-hidden
          className="transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-110 group-active:translate-y-0 group-active:scale-100"
        />
        <span className="text-center">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Десктоп: вертикальный рейл слева */}
      <nav
        className="fixed inset-y-0 left-0 z-40 hidden w-20 border-r border-border bg-surface/95 backdrop-blur md:block"
        aria-label="Основная навигация"
      >
        <ul className="flex h-full flex-col items-stretch gap-1 px-1 py-3">
          {visible.map((t) => (
            <li key={t.href}>{tabLink(t)}</li>
          ))}
          <li className="mt-auto">{tabLink(profileTab)}</li>
        </ul>
      </nav>

      {/* Мобилка: верхний бар с бургером (профиль) */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Меню"
          aria-expanded={menuOpen}
          className="pressable flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-surface-2"
        >
          {menuOpen ? (
            <XIcon width={22} height={22} aria-hidden />
          ) : (
            <MenuIcon width={22} height={22} aria-hidden />
          )}
        </button>
        <span
          className="text-lg text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tildes
        </span>
      </header>

      {/* Мобилка: выпадашка бургера с профилем */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute left-2 top-14 w-48 overflow-hidden rounded-2xl border border-border bg-surface p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={profileTab.href}
              onClick={() => setMenuOpen(false)}
              aria-current={
                pathname === profileTab.href ? "page" : undefined
              }
              className={`pressable flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-surface-2 ${
                pathname === profileTab.href ? "text-primary" : "text-foreground"
              }`}
            >
              <profileTab.Icon width={20} height={20} aria-hidden />
              {profileTab.label}
            </Link>
          </div>
        </div>
      )}

      {/* Мобилка: нижняя панель с основными вкладками */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Основная навигация"
      >
        <ul className="flex items-stretch justify-around px-1 py-1">
          {visible.map((t) => (
            <li key={t.href} className="min-w-0 flex-1">
              {tabLink(t)}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
