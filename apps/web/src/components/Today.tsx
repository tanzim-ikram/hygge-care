"use client";

import { useState } from "react";
import {
  EMPTY_STATES,
  GUEST_BANNER,
  ISLAMIC_REFERENCES,
  formatHijri,
  lastDoneText,
  nextUp,
  rowSubtitle,
  sortByUrgency,
  statusHeadline,
  WEEKDAY_NAMES,
  addDays,
  weekday,
  type ItemState,
} from "@hygge/core";
import { useApp } from "@/lib/app-state";
import { GrowthArt } from "./GrowthArt";
import { Icon, ItemIcon, SkyDecor } from "./ui";

/** Progress for the drawing: 1 = due today, above 1 = past due (not capped like the ring). */
export function growthProgress(s: ItemState): number {
  if (s.daysLeft === null) return 0.05;
  return (s.item.intervalDays - s.daysLeft) / s.item.intervalDays;
}

function tileStyle(status: ItemState["status"]) {
  if (status === "due_today") return "bg-gold text-on-gold";
  if (status === "overdue")
    return "bg-warm-soft text-ink shadow-[0_0_0_2px_var(--warm-fill),0_0_14px_var(--glow)]";
  return "bg-tint-soft text-ink";
}

function subtitleColor(status: ItemState["status"]) {
  if (status === "overdue") return "text-warm";
  if (status === "ok" || status === "not_started") return "text-muted";
  return "text-tint";
}

export function Today({
  onOpenItem,
  onLogSeveral,
}: {
  onOpenItem: (id: string) => void;
  onLogSeveral: () => void;
}) {
  const { data, states, today, resolvedTheme, logDone, snooze, storeKind } = useApp();
  const [bannerClosed, setBannerClosed] = useState(false);
  const [hadithOpen, setHadithOpen] = useState(false);
  const p = data.profile;
  const islamic = p.mode === "islamic";
  const sorted = sortByUrgency(states);
  const next = nextUp(states);
  const onTrack = states.filter((s) => s.status === "ok").length;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T00:00:00Z`));
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: p.timezone,
    }).format(new Date()),
  );
  const greeting = islamic
    ? "Assalamu alaikum"
    : hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";
  const initial = (p.displayName || "H").trim().charAt(0).toUpperCase();

  // A gentle nudge when the user's preferred weekday is tomorrow and something is due soon.
  const preferred =
    islamic &&
    p.preferredWeekday !== null &&
    next &&
    next.status !== "ok" &&
    next.status !== "paused" &&
    weekday(addDays(today, 1)) === p.preferredWeekday
      ? `Tomorrow is ${WEEKDAY_NAMES[p.preferredWeekday]}, a good day for it`
      : null;

  const showBanner = p.isGuest && storeKind === "cloud" && !bannerClosed;

  return (
    <div className="flex flex-1 flex-col pb-24">
      <section className="relative flex flex-col gap-[18px] overflow-hidden rounded-b-[40px] bg-sky px-5 pb-[26px] pt-[22px] text-sky-ink">
        <SkyDecor theme={resolvedTheme} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-sky-muted">{greeting}</span>
            <span className="display text-[22px] font-bold">{dateLabel}</span>
            {islamic ? (
              <span className="text-sm font-medium text-sky-muted">
                {formatHijri(today, p.hijriOffset)}
              </span>
            ) : null}
          </div>
          <span
            aria-hidden="true"
            className="display flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-sky-line text-[17px] font-bold"
          >
            {initial}
          </span>
        </div>

        {next ? (
          <div className="relative flex flex-col items-center gap-3.5 text-center">
            <span className="text-xs font-bold tracking-[0.16em] text-sky-muted">NEXT UP</span>
            <div
              className="h-[200px] w-[200px] shrink-0 overflow-hidden rounded-[40px]"
              style={{
                boxShadow:
                  next.status === "overdue"
                    ? "0 0 0 3px var(--warm-fill), 0 0 22px var(--glow)"
                    : next.status === "due_today"
                      ? "0 0 0 3px var(--gold)"
                      : "none",
              }}
            >
              <GrowthArt
                kind={next.item.kind}
                p={growthProgress(next)}
                seed={11}
                size={200}
                label={`${next.name}: ${rowSubtitle(next)}`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="display text-[28px] font-extrabold leading-[1.1]">{next.task}</span>
              <span
                className={`text-base font-semibold ${next.status === "overdue" ? "text-warm" : ""}`}
              >
                {statusHeadline(next)}
              </span>
              <span className="text-[13px] font-semibold text-sky-muted">
                {lastDoneText(next.lastDone, today)}
              </span>
            </div>
            {preferred ? (
              <span className="rounded-full border border-sky-line px-3.5 py-2 text-sm font-semibold">
                {preferred}
              </span>
            ) : null}
            <div className="mt-1 grid w-full grid-cols-[3fr_2fr] gap-2.5">
              <button
                type="button"
                onClick={() =>
                  void logDone([{ itemId: next.item.id, doneOn: today }], `${next.task} logged`)
                }
                className="flex h-14 items-center justify-center gap-2 rounded-full bg-gold text-[17px] font-bold text-on-gold"
              >
                <Icon name="check" size={20} strokeWidth={2.6} />I did it today
              </button>
              <button
                type="button"
                onClick={() => void snooze(next.item.id, "We'll remind you tomorrow")}
                className="h-14 rounded-full border-[1.5px] border-sky-line text-base font-semibold text-sky-ink"
              >
                Tomorrow
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center gap-2 py-6 text-center">
            <span className="display text-2xl font-extrabold">{EMPTY_STATES.noItems.title}</span>
            <span className="text-sky-muted">{EMPTY_STATES.noItems.body}</span>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3.5 px-5 pt-[22px]">
        {showBanner ? (
          <div className="flex items-center gap-3 rounded-3xl border border-line bg-paper py-3 pl-4 pr-3">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{GUEST_BANNER.title}</span>
              <span className="text-[13px] leading-snug text-muted">
                Save your history with a free account.
              </span>
            </div>
            <button
              type="button"
              className="h-11 shrink-0 rounded-full bg-tint-soft px-4 text-sm font-bold text-tint"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setBannerClosed(true)}
              aria-label="Dismiss"
              className="flex h-11 w-9 items-center justify-center text-muted"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between">
          <h2 className="display text-[22px] font-extrabold">Your care</h2>
          <span className="text-sm font-semibold text-muted">{onTrack} on track</span>
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-3xl border border-line bg-paper p-5 text-muted">
            {EMPTY_STATES.noItems.body}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((s) => (
              <div key={s.item.id} className="relative rounded-[28px] border border-line bg-paper">
                <button
                  type="button"
                  onClick={() => onOpenItem(s.item.id)}
                  className="flex w-full flex-col items-start gap-3 rounded-[28px] p-4 text-left text-ink"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-[19px] ${tileStyle(s.status)}`}
                  >
                    <ItemIcon kind={s.item.kind} size={28} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="display text-[17px] font-bold">{s.name}</span>
                    <span className={`text-sm font-semibold ${subtitleColor(s.status)}`}>
                      {rowSubtitle(s)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void logDone([{ itemId: s.item.id, doneOn: today }], `${s.task} logged`)
                  }
                  aria-label={`Mark ${s.name} done today`}
                  className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-line bg-paper text-ink"
                >
                  <Icon name="check" size={18} strokeWidth={2.6} />
                </button>
              </div>
            ))}
          </div>
        )}

        {islamic ? (
          <button
            type="button"
            onClick={() => setHadithOpen((o) => !o)}
            aria-expanded={hadithOpen}
            className="flex flex-col gap-2.5 rounded-[28px] bg-tint-soft p-[18px] text-left text-ink"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="display text-lg font-extrabold">
                {ISLAMIC_REFERENCES.fortyDays.title}
              </span>
              <span className="text-sm font-bold text-tint">{hadithOpen ? "Close" : "Read"}</span>
            </span>
            {hadithOpen ? (
              <>
                <span className="text-[15px] leading-relaxed">
                  “{ISLAMIC_REFERENCES.fortyDays.text}”
                </span>
                <span className="text-[13px] font-semibold text-muted">
                  {ISLAMIC_REFERENCES.fortyDays.source}
                </span>
              </>
            ) : null}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onLogSeveral}
        className="fixed bottom-[76px] left-1/2 z-20 flex h-[52px] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-[22px] text-base font-bold text-bg"
        style={{ boxShadow: "0 10px 24px var(--shadow)" }}
      >
        <Icon name="plus" size={18} strokeWidth={2.4} />
        Log several
      </button>
    </div>
  );
}
