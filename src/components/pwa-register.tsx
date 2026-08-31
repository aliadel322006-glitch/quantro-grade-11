"use client";

import { useEffect, useRef, useState } from "react";

import {
  dispatchConnectivityChange,
  inspectLearningEventQueue,
  installOnlineSyncTrigger,
  syncQueuedLearningEvents,
  type SyncQueueSummary,
} from "@/lib/offline";

type StatusKind =
  | "idle"
  | "offline"
  | "syncing"
  | "synced"
  | "waiting"
  | "unsupported";

interface StatusState {
  readonly kind: StatusKind;
  readonly message: string;
}

interface PwaRegisterProps {
  readonly locale?: "en" | "ar";
}

const TEXT = {
  en: {
    online: "Back online.",
    offline: "You are offline. Your lesson work is saved on this device.",
    syncing: "Back online. Syncing your saved lesson work…",
    synced: "Your saved lesson work is now synchronized.",
    waiting: "Back online. Some saved work will retry automatically.",
    unsupported: "Offline lesson support is unavailable in this browser.",
  },
  ar: {
    online: "عاد الاتصال بالإنترنت.",
    offline: "أنت غير متصل بالإنترنت. تم حفظ عملك على هذا الجهاز.",
    syncing: "عاد الاتصال. جارٍ مزامنة عملك المحفوظ…",
    synced: "تمت مزامنة عملك المحفوظ.",
    waiting: "عاد الاتصال. ستتم إعادة محاولة مزامنة بعض الأعمال تلقائيًا.",
    unsupported: "دعم الدروس دون اتصال غير متاح في هذا المتصفح.",
  },
} as const;

function currentLanguage(): keyof typeof TEXT {
  return document.documentElement.lang.toLowerCase().startsWith("ar")
    ? "ar"
    : "en";
}

function mayRegisterServiceWorker(): boolean {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  return process.env.NODE_ENV === "production" || localHosts.has(location.hostname);
}

function statusAfterSync(
  summary: SyncQueueSummary,
  language: keyof typeof TEXT,
): StatusState {
  if (summary.remaining > 0 || summary.retryScheduled > 0 || summary.failed > 0) {
    return { kind: "waiting", message: TEXT[language].waiting };
  }
  return { kind: "synced", message: TEXT[language].synced };
}

const hiddenStatusStyle = {
  position: "absolute",
  inlineSize: "1px",
  blockSize: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

const visibleStatusStyle = {
  position: "fixed",
  zIndex: 1000,
  insetBlockEnd: "1rem",
  insetInline: "1rem",
  maxInlineSize: "42rem",
  minBlockSize: "44px",
  display: "grid",
  placeItems: "center",
  padding: ".65rem 1rem",
  border: "1px solid currentColor",
  borderRadius: ".75rem",
  background: "#fff8db",
  color: "#4b3c00",
  boxShadow: "0 .5rem 2rem rgb(21 40 31 / 18%)",
  font: "600 .925rem/1.5 system-ui, sans-serif",
} as const;

/**
 * Registers the custom worker and provides a visible, screen-reader-announced
 * connection state. Mount once near the application root.
 */
export function PwaRegister({ locale }: PwaRegisterProps) {
  const [status, setStatus] = useState<StatusState>({
    kind: "idle",
    message: "",
  });
  const clearStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const language = locale ?? currentLanguage();
    let cancelled = false;
    let registerOnLoad: (() => void) | null = null;

    const clearTimer = () => {
      if (clearStatusTimer.current) {
        clearTimeout(clearStatusTimer.current);
        clearStatusTimer.current = null;
      }
    };

    const announceTemporarily = (next: StatusState) => {
      clearTimer();
      setStatus(next);
      clearStatusTimer.current = setTimeout(() => {
        setStatus({ kind: "idle", message: "" });
      }, 5_000);
    };

    const onOffline = () => {
      clearTimer();
      dispatchConnectivityChange(false);
      setStatus({ kind: "offline", message: TEXT[language].offline });
    };

    const onOnline = () => {
      dispatchConnectivityChange(true);
      announceTemporarily({
        kind: "synced",
        message: TEXT[language].online,
      });
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    dispatchConnectivityChange(navigator.onLine !== false);
    if (navigator.onLine === false) {
      queueMicrotask(() => {
        if (!cancelled) {
          onOffline();
        }
      });
    }

    const stopOnlineSync = installOnlineSyncTrigger(
      async () => {
        const pending = await inspectLearningEventQueue({
          includeFailed: false,
        });
        if (pending.length === 0 || cancelled) {
          return;
        }

        clearTimer();
        setStatus({ kind: "syncing", message: TEXT[language].syncing });
        const summary = await syncQueuedLearningEvents({ force: true });
        if (!cancelled) {
          announceTemporarily(statusAfterSync(summary, language));
        }
      },
      { runOnStart: true },
    );

    if (!mayRegisterServiceWorker()) {
      if (!("serviceWorker" in navigator)) {
        queueMicrotask(() => {
          if (!cancelled) {
            announceTemporarily({
              kind: "unsupported",
              message: TEXT[language].unsupported,
            });
          }
        });
      }
    } else {
      const register = async () => {
        if (cancelled) {
          return;
        }
        try {
          await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });
        } catch {
          if (!cancelled) {
            announceTemporarily({
              kind: "unsupported",
              message: TEXT[language].unsupported,
            });
          }
        }
      };

      if (document.readyState === "complete") {
        void register();
      } else {
        registerOnLoad = () => void register();
        window.addEventListener("load", registerOnLoad, { once: true });
      }
    }

    return () => {
      cancelled = true;
      clearTimer();
      stopOnlineSync();
      if (registerOnLoad) {
        window.removeEventListener("load", registerOnLoad);
      }
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [locale]);

  const visible = status.kind !== "idle" && status.kind !== "synced";

  return (
    <output
      aria-atomic="true"
      aria-live={status.kind === "offline" ? "assertive" : "polite"}
      data-connectivity-status={status.kind}
      role="status"
      style={visible ? visibleStatusStyle : hiddenStatusStyle}
    >
      {status.message}
    </output>
  );
}
