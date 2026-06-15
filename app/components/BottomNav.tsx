"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ChatIcon,
  BookIcon,
  MicIcon,
  UploadIcon,
  UserIcon,
} from "./icons";
import { useAuthSession } from "./ModeratorAuth";

const tabs = [
  { href: "/", label: "Главная", Icon: HomeIcon, exact: true },
  { href: "/chat", label: "Перевод", Icon: ChatIcon },
  // «Запись» и «Загрузка» — работа с данными, видны только модераторам.
  { href: "/capture", label: "Запись", Icon: MicIcon, moderator: true },
  { href: "/upload", label: "Загрузка", Icon: UploadIcon, moderator: true },
  { href: "/learn", label: "Учить", Icon: BookIcon },
];

// «Профиль» закреплён внизу панели, отдельно от основной навигации.
const profileTab = { href: "/account", label: "Профиль", Icon: UserIcon };

/** Vertical navigation rail pinned to the left edge. */
export default function BottomNav() {
  const pathname = usePathname();
  const { isModerator } = useAuthSession();
  const visible = tabs.filter((t) => !t.moderator || isModerator);

  const renderTab = (
    { href, label, Icon, exact }: (typeof tabs)[number],
    liClassName?: string,
  ) => {
    const active = exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
    return (
      <li key={href} className={liClassName}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`group pressable flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-3 text-[10px] font-medium leading-tight transition-colors duration-200 hover:bg-surface-2 hover:text-primary ${
            active ? "text-primary" : "text-muted"
          }`}
        >
          <Icon
            width={24}
            height={24}
            strokeWidth={active ? 2.4 : 2}
            aria-hidden
            className="transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-110 group-active:translate-y-0 group-active:scale-100"
          />
          <span className="text-center">{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      className="fixed inset-y-0 left-0 z-40 w-20 border-r border-border bg-surface/95 backdrop-blur"
      aria-label="Основная навигация"
    >
      <ul className="flex h-full flex-col items-stretch gap-1 px-1 py-3">
        {visible.map((t) => renderTab(t))}
        {renderTab(profileTab, "mt-auto")}
      </ul>
    </nav>
  );
}
