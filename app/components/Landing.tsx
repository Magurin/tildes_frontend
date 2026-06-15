"use client";

import Link from "next/link";
import { useLanguages } from "./ActiveLanguageProvider";
import {
  ChatIcon,
  BookIcon,
  MicIcon,
  GlobeIcon,
  SpeakerIcon,
  SparklesIcon,
  ArrowRight,
  RepeatIcon,
} from "./icons";

/* Royalty-free by construction: a hand-built flat scene of Altai/Siberian
   mountains, a river and a rising sun — themed to the project palette. */
function HeroScene() {
  return (
    <svg
      viewBox="0 0 480 300"
      className="h-auto w-full"
      role="img"
      aria-label="Горы, река и восходящее солнце"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe6c8" />
          <stop offset="100%" stopColor="#faf6ee" />
        </linearGradient>
        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>

      <rect width="480" height="300" fill="url(#sky)" />

      {/* Sun */}
      <circle cx="240" cy="104" r="42" fill="#f59e0b" opacity="0.9" />
      <g stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M240 36v-20M240 192v16M328 104h20M152 104h-20M302 42l12-12M178 166l-12 12M302 166l12 12M178 42l-12-12" />
      </g>

      {/* Far ridge */}
      <path
        d="M0 200 L70 150 L130 188 L200 132 L270 184 L340 138 L410 186 L480 150 L480 300 L0 300 Z"
        fill="#d9a066"
        opacity="0.5"
      />
      {/* Mid ridge */}
      <path
        d="M0 230 L80 176 L150 214 L230 160 L300 210 L380 168 L480 214 L480 300 L0 300 Z"
        fill="#b45309"
        opacity="0.65"
      />
      {/* Snow caps */}
      <path d="M230 160 L210 188 L250 188 Z" fill="#fff" opacity="0.85" />
      <path d="M80 176 L62 200 L98 200 Z" fill="#fff" opacity="0.8" />

      {/* River */}
      <path
        d="M214 300 C232 250 200 232 236 210 C268 192 244 176 262 158 L300 300 Z"
        fill="url(#river)"
        opacity="0.9"
      />

      {/* Near hills */}
      <path
        d="M0 262 C120 226 180 280 260 256 C340 232 420 268 480 250 L480 300 L0 300 Z"
        fill="#0f766e"
        opacity="0.85"
      />

      {/* Birds */}
      <g
        stroke="#292524"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      >
        <path d="M360 70 q8 -8 16 0 q8 -8 16 0" />
        <path d="M390 92 q6 -6 12 0 q6 -6 12 0" />
      </g>
    </svg>
  );
}

const STAT_FALLBACK = { langs: 8, words: 41855 };

function fmt(n: number) {
  return n.toLocaleString("ru-RU").replace(/ /g, " ");
}

const STATUS_DOT: Record<string, string> = {
  endangered: "#b45309",
  vulnerable: "#ca8a04",
  critical: "#b91c1c",
};

export default function Landing() {
  const { languages, active } = useLanguages();

  // Real, non-empty languages drive the showcase and counters.
  const real = languages.filter((l) => l.iso_code && l.entry_count > 0);
  const langCount = real.length || STAT_FALLBACK.langs;
  const wordCount =
    real.reduce((s, l) => s + l.entry_count, 0) || STAT_FALLBACK.words;
  const showcase = [...real].sort((a, b) => b.entry_count - a.entry_count).slice(0, 6);

  return (
    <div className="flex flex-col gap-14 pb-4">
      {/* ───────── Hero ───────── */}
      <section className="animate-fade-up overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface-2/80 to-surface">
        <div className="px-6 pt-8 sm:px-9 sm:pt-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-primary ring-1 ring-border">
            <SparklesIcon width={13} height={13} aria-hidden />
            Языки, которых нет ни в Google, ни в Яндексе
          </span>
          <h1
            className="mt-4 text-4xl leading-[1.08] text-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Сохраняем языки, пока звучит хотя бы один голос
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
            Tildes — платформа возрождения исчезающих языков Сибири и тюркского
            мира. Переводчик на собственной нейросети, живой голос и карточки для
            тех, кто хочет вернуть язык предков.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="pressable inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)]"
            >
              Открыть переводчик
              <ArrowRight width={18} height={18} aria-hidden />
            </Link>
            <Link
              href="/learn"
              className="pressable inline-flex items-center gap-2 rounded-xl bg-surface px-5 py-3 text-base font-medium text-foreground ring-1 ring-border hover:bg-surface-2"
            >
              Учить язык
            </Link>
          </div>
        </div>
        <div className="mt-8 animate-float-slow">
          <HeroScene />
        </div>
      </section>

      {/* ───────── Problem ───────── */}
      <section
        className="animate-fade-up rounded-3xl bg-foreground px-6 py-10 text-center sm:px-10 sm:py-14"
        style={{ animationDelay: "80ms" }}
      >
        <p
          className="text-5xl text-[#f4ecdd] sm:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Каждые&nbsp;2&nbsp;недели
        </p>
        <p className="mt-2 text-lg font-medium text-[#d9a066]">
          в мире умирает язык
        </p>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-[#c8bfae]">
          Из почти 7000 языков мира под угрозой исчезновения — около половины. С
          последним носителем уходит не словарь, а целый способ видеть мир: имена
          трав, счёт оленей, песни, которым тысячи лет.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-7">
          {[
            ["~7000", "языков на Земле"],
            ["40%", "под угрозой"],
            ["к 2100", "исчезнет половина"],
          ].map(([n, l]) => (
            <div key={l}>
              <p
                className="text-2xl text-[#f4ecdd] sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {n}
              </p>
              <p className="mt-1 text-xs leading-4 text-[#a8a096]">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Niche / languages ───────── */}
      <section className="animate-fade-up" style={{ animationDelay: "120ms" }}>
        <header className="text-center">
          <h2
            className="text-3xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Их не переведёт ни один большой сервис
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-muted">
            Google и Яндекс знают сотни языков — но не эти. Мы начали с тех, кому
            больше некуда идти, и собрали для них первый цифровой словарь.
          </p>
        </header>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {showcase.map((l) => (
            <Link
              key={l.id}
              href="/chat"
              className="card pressable flex flex-col gap-1 p-4"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_DOT[l.status] ?? "#b45309" }}
                  aria-hidden
                />
                <span
                  className="truncate text-lg text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {l.native_name ?? l.name}
                </span>
              </span>
              <span className="truncate text-sm text-muted">{l.name}</span>
              <span className="mt-1 text-xs font-medium text-primary">
                {fmt(l.entry_count)} слов
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── Stats band ───────── */}
      <section
        className="animate-fade-up grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-4"
        style={{ animationDelay: "120ms" }}
      >
        {[
          [fmt(langCount), "языков"],
          [`${fmt(wordCount)}+`, "слов в словарях"],
          ["NLLB", "своя нейромодель"],
          ["MMS", "живой голос"],
        ].map(([n, l]) => (
          <div key={l} className="bg-surface px-4 py-7 text-center">
            <p
              className="text-2xl text-primary sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {n}
            </p>
            <p className="mt-1 text-xs text-muted">{l}</p>
          </div>
        ))}
      </section>

      {/* ───────── Features ───────── */}
      <section className="animate-fade-up" style={{ animationDelay: "120ms" }}>
        <header className="text-center">
          <h2
            className="text-3xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Что умеет Tildes
          </h2>
        </header>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/chat",
              Icon: ChatIcon,
              title: "Переводчик с собственным ИИ",
              desc: "Дообученная нейросеть NLLB плюс точный словарь: перевод появляется по мере ввода, за секунды.",
            },
            {
              href: "/chat",
              Icon: MicIcon,
              title: "Голос-в-голос",
              desc: "Наговорите фразу по-русски — и услышьте, как она звучит на языке, которого нет ни в одном переводчике.",
            },
            {
              href: "/learn",
              Icon: BookIcon,
              title: "Учить язык",
              desc: "Карточки из живого словаря с произношением — осваивайте язык предков слово за словом.",
            },
            {
              href: "/account",
              Icon: GlobeIcon,
              title: "Живой словарь",
              desc: "Тысячи слов от носителей и из оцифрованных источников. Экспорт в научный формат CLDF.",
            },
          ].map(({ href, Icon, title, desc }) => (
            <Link
              key={title}
              href={href}
              className="card pressable group flex items-start gap-4 p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-primary">
                <Icon width={22} height={22} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  {title}
                  <ArrowRight
                    width={15}
                    height={15}
                    aria-hidden
                    className="text-muted transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {desc}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── How it works (the loop) ───────── */}
      <section
        className="animate-fade-up rounded-3xl bg-surface-2/60 px-6 py-10 sm:px-10"
        style={{ animationDelay: "120ms" }}
      >
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
            <RepeatIcon width={16} height={16} aria-hidden />
            Как это работает
          </span>
          <h2
            className="mt-2 text-3xl text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Круг, который возвращает язык
          </h2>
        </header>
        <ol className="mt-8 grid gap-6 sm:grid-cols-4">
          {[
            ["Носитель", "записывает слово голосом и рисунком"],
            ["Словарь", "растёт — каждое слово сохраняется навсегда"],
            ["Нейросеть", "учится переводить и говорить на языке"],
            ["Ученики", "осваивают язык — и круг замыкается"],
          ].map(([t, d], i) => (
            <li key={t} className="relative">
              <span
                className="text-3xl text-primary/40"
                style={{ fontFamily: "var(--font-display)" }}
              >
                0{i + 1}
              </span>
              <p className="mt-1 font-semibold text-foreground">{t}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section
        className="animate-fade-up overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center sm:px-10"
        style={{ animationDelay: "120ms" }}
      >
        <SpeakerIcon
          width={32}
          height={32}
          aria-hidden
          className="mx-auto text-primary-foreground/80"
        />
        <h2
          className="mx-auto mt-4 max-w-lg text-3xl leading-tight text-primary-foreground sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Каждое слово — голос, который продолжит звучать
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-primary-foreground/85">
          Начните с перевода или первой карточки. Язык жив, пока на нём говорят —
          и пока кто-то учится.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/chat"
            className="pressable inline-flex items-center gap-2 rounded-xl bg-surface px-6 py-3 text-base font-medium text-primary hover:bg-surface-2"
          >
            Открыть переводчик
            <ArrowRight width={18} height={18} aria-hidden />
          </Link>
          <Link
            href="/learn"
            className="pressable inline-flex items-center rounded-xl bg-[var(--primary-hover)] px-6 py-3 text-base font-medium text-primary-foreground ring-1 ring-white/20 hover:bg-[#7c360c]"
          >
            Учить язык
          </Link>
        </div>
        {active && (
          <p className="mt-6 text-sm text-primary-foreground/70">
            Активный язык:{" "}
            <span className="font-medium text-primary-foreground">
              {active.name}
            </span>
          </p>
        )}
      </section>
    </div>
  );
}
