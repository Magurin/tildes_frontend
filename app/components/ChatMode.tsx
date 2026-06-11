"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon } from "./icons";

type Msg = { role: "user" | "model"; content: string };

/** Free-form chat grounded in the language's collected data. */
export default function ChatMode({
  languageId,
  ready,
}: {
  languageId: string;
  ready: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language_id: languageId, message }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, { role: "model", content: json.reply }]);
      } else {
        setError(json.error ?? "Ошибка генерации");
      }
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!ready && (
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Датасет ещё мал — ответы будут точнее после записи слов. Чат доступен в
          режиме предпросмотра.
        </div>
      )}

      <div className="flex min-h-[40vh] flex-col gap-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            Спросите перевод, значение слова или правило языка.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 ${
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start border border-border bg-surface text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="self-start rounded-2xl border border-border bg-surface px-4 py-2.5 text-muted">
            …
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-20 flex items-end gap-2 bg-background pb-1">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Сообщение…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          aria-label="Отправить"
          className="pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <SendIcon width={22} height={22} aria-hidden />
        </button>
      </div>
    </div>
  );
}
