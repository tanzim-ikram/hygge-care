"use client";

import { useState } from "react";
import { AppProvider, useApp } from "@/lib/app-state";
import { Onboarding } from "./Onboarding";
import { Settings } from "./Settings";
import { ItemSheet, LogSeveralSheet } from "./Sheets";
import { Today } from "./Today";
import { Icon, ItemIcon } from "./ui";

function Toast() {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[96px] z-50 mx-auto flex max-w-md items-center gap-3 px-5"
    >
      <div
        className="flex w-full items-center gap-3 rounded-full bg-ink py-2.5 pl-3.5 pr-2.5 text-bg"
        style={{ boxShadow: "0 12px 28px var(--shadow)" }}
      >
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gold text-on-gold">
          <Icon name="check" size={14} strokeWidth={3} />
        </span>
        <span className="flex-1 text-[15px] font-semibold">{toast.text}</span>
        {toast.undo ? (
          <button
            type="button"
            onClick={() => {
              toast.undo?.();
            }}
            className="h-10 rounded-full bg-gold px-4 text-sm font-bold text-on-gold"
          >
            Undo
          </button>
        ) : (
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss"
            className="flex h-10 w-10 items-center justify-center"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Shell() {
  const { ready, error, data } = useApp();
  const [view, setView] = useState<"today" | "settings">("today");
  const [itemId, setItemId] = useState<string | null>(null);
  const [several, setSeveral] = useState(false);

  if (!ready) {
    return (
      <div
        className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 text-muted"
        role="status"
      >
        <ItemIcon kind="head_hair" size={36} />
        <span className="display text-xl font-bold text-ink">Hygge</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="rounded-3xl bg-warm-soft p-5 text-ink">
          Couldn&apos;t load your data: {error}
        </p>
      </div>
    );
  }
  if (!data.profile.onboarded) return <Onboarding />;

  const navItem = (key: "today" | "settings", label: string, icon: "home" | "gear") => (
    <button
      key={key}
      type="button"
      onClick={() => setView(key)}
      aria-current={view === key ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 ${view === key ? "text-ink" : "text-muted"}`}
    >
      <Icon name={icon} size={22} />
      <span className={`text-[13px] ${view === key ? "font-bold" : "font-semibold"}`}>{label}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${view === key ? "bg-gold" : "bg-transparent"}`} />
    </button>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      {view === "today" ? (
        <Today onOpenItem={setItemId} onLogSeveral={() => setSeveral(true)} />
      ) : (
        <Settings />
      )}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-2 border-t border-line bg-bg px-2 pb-2 pt-1"
      >
        {navItem("today", "Today", "home")}
        {navItem("settings", "Settings", "gear")}
      </nav>
      <ItemSheet itemId={itemId} onClose={() => setItemId(null)} />
      <LogSeveralSheet open={several} onClose={() => setSeveral(false)} />
      <Toast />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
