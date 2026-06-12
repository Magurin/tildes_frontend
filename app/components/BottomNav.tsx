"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ChatIcon, BookIcon, MicIcon, UserIcon } from "./icons";
import { useAuthSession } from "./ModeratorAuth";

const tabs = [
  { href: "/", label: "Главная", Icon: HomeIcon, exact: true },
  { href: "/chat", label: "Перевод", Icon: ChatIcon },
  // «Запись» — сбор данных от носителей, виден только модераторам.
  { href: "/capture", label: "Запись", Icon: MicIcon, moderator: true },
  { href: "/learn", label: "Учить", Icon: BookIcon },
  { href: "/account", label: "Профиль", Icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isModerator } = useAuthSession();
  const visible = tabs.filter((t) => !t.moderator || isModerator);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Основная навигация"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {visible.map(({ href, label, Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <Icon
                  width={24}
                  height={24}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
