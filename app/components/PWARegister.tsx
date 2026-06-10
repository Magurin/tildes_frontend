"use client";

import { useEffect, useState } from "react";

/** Registers the service worker and shows a one-time iOS install hint. */
export default function PWARegister() {
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window);
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const dismissed = localStorage.getItem("tildes.iosHintDismissed");
    // One-time detection from browser APIs available only after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIOS && !isStandalone && !dismissed) setShowIosHint(true);
  }, []);

  if (!showIosHint) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 text-sm shadow-lg">
      <p className="text-foreground">
        Установите Tildes AI: нажмите «Поделиться» ⎋, затем «На экран
        «Домой»» ➕.
      </p>
      <button
        className="pressable mt-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground"
        onClick={() => {
          localStorage.setItem("tildes.iosHintDismissed", "1");
          setShowIosHint(false);
        }}
      >
        Понятно
      </button>
    </div>
  );
}
