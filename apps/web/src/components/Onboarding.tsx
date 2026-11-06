"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LAST_DONE_OPTIONS,
  discreetBody,
  displayName,
  isLocalDate,
  kindsFor,
  todayIn,
  type AppMode,
  type BeardVariant,
  type Gender,
  type ItemKind,
  type LastDoneAnswer,
} from "@hygge/core";
import { useApp } from "@/lib/app-state";
import { Chip, Icon, ItemIcon, PrimaryButton, SkyDecor } from "./ui";
import type { UiIconName } from "@/lib/icons";

type Step = "welcome" | "mode" | "gender" | "last" | "reminders" | "islamic" | "done";
const STEP_ICON: Record<Step, UiIconName> = {
  welcome: "leaf",
  mode: "sliders",
  gender: "person",
  last: "calendar",
  reminders: "bell",
  islamic: "crescent",
  done: "check",
};
const STEP_NAME: Partial<Record<Step, string>> = {
  mode: "Your way",
  gender: "Your profile",
  last: "Your starting point",
  reminders: "Your reminders",
  islamic: "Islamic touches",
};
const HOURS = [7, 9, 12, 18, 21];
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;
const DAYS: [string, number | null][] = [
  ["Sat", 6],
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["None", null],
];

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={`h-6 w-6 shrink-0 rounded-full ${on ? "border-[8px] border-tint" : "border-2 border-line"}`}
    />
  );
}

function Card({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col gap-2.5 rounded-[28px] bg-paper p-5 text-left text-ink ${selected ? "border-2 border-tint shadow-[0_8px_22px_var(--shadow)]" : "border-2 border-line"}`}
    >
      {children}
    </button>
  );
}

function IconSquare({
  name,
  size = 88,
  filled,
  rotate,
}: {
  name: UiIconName;
  size?: number;
  filled: "gold" | "tint" | "line";
  rotate: number;
}) {
  const bg =
    filled === "gold"
      ? "bg-gold text-on-gold"
      : filled === "tint"
        ? "bg-tint text-paper"
        : "bg-sky-line text-sky-ink";
  return (
    <span
      className={`flex items-center justify-center rounded-[28px] ${bg}`}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
    >
      <Icon name={name} size={42} strokeWidth={1.6} />
    </span>
  );
}

export function Onboarding() {
  const { completeOnboarding, resolvedTheme } = useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<AppMode>("islamic");
  const [gender, setGender] = useState<Gender | null>(null);
  const [beard, setBeard] = useState<BeardVariant>("trim");
  const [last, setLast] = useState<Partial<Record<ItemKind, LastDoneAnswer["kind"]>>>({});
  const [dates, setDates] = useState<Partial<Record<ItemKind, string>>>({});
  const [hour, setHour] = useState(9);
  const [discreet, setDiscreet] = useState(false);
  const [weekday, setWeekday] = useState<number | null>(5);
  const [qurbani, setQurbani] = useState(false);
  const [saving, setSaving] = useState(false);
  const timezone = useMemo(detectTimeZone, []);
  const today = todayIn(timezone);

  // Preview the chosen gender's colors right away.
  useEffect(() => {
    document.documentElement.dataset.family = gender ?? "neutral";
  }, [gender]);

  const steps: Step[] = useMemo(
    () =>
      mode === "islamic"
        ? ["welcome", "mode", "gender", "last", "reminders", "islamic", "done"]
        : ["welcome", "mode", "gender", "last", "reminders", "done"],
    [mode],
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)]!;
  const inner = steps.length - 2;
  const go = (d: number) => setStepIndex((i) => Math.max(0, Math.min(steps.length - 1, i + d)));
  const canContinue = step !== "gender" || gender !== null;

  const finish = async () => {
    if (!gender || saving) return;
    setSaving(true);
    const answers: Partial<Record<ItemKind, LastDoneAnswer>> = {};
    for (const kind of kindsFor(gender)) {
      const a = last[kind];
      if (!a || a === "unknown") continue;
      if (a === "date") {
        const d = dates[kind];
        if (d && isLocalDate(d) && d <= today) answers[kind] = { kind: "date", date: d };
      } else answers[kind] = { kind: a } as LastDoneAnswer;
    }
    await completeOnboarding({
      mode,
      gender,
      beard,
      last: answers,
      reminderHour: hour,
      discreet,
      preferredWeekday: mode === "islamic" ? weekday : null,
      plansQurbani: mode === "islamic" && qurbani,
      timezone,
    });
    setSaving(false);
  };

  // ---------- full-sky screens ----------
  if (step === "welcome" || step === "done") {
    const done = step === "done";
    const tiles: [UiIconName, "gold" | "tint" | "line", number][] = done
      ? [
          ["check", "gold", -4],
          ["bell", "line", 5],
          ["calendar", "line", 3],
          ["leaf", "tint", -5],
        ]
      : [
          ["scissors", "gold", -5],
          ["razor", "line", 4],
          ["comb", "line", 3],
          ["clipper", "tint", -4],
        ];
    return (
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-between gap-8 overflow-hidden bg-sky px-6 pb-8 pt-14 text-sky-ink">
        <SkyDecor theme={resolvedTheme} />
        <div className="relative flex flex-col gap-6">
          <div aria-hidden="true" className="grid grid-cols-[repeat(2,88px)] gap-3.5 p-1.5">
            {tiles.map(([name, fill, rot]) => (
              <IconSquare key={name} name={name} filled={fill} rotate={rot} />
            ))}
          </div>
          {done ? (
            <div className="flex flex-col gap-3.5">
              <h1 className="display text-[44px] font-extrabold leading-none">
                All set. Hygge is counting.
              </h1>
              <p className="text-lg leading-snug text-sky-muted">
                You&apos;ll hear from Hygge at {hourLabel(hour)}, once a day, only when something is
                coming up.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <h1 className="display text-[64px] font-extrabold leading-[0.95]">Hygge</h1>
              <p className="text-xl leading-snug text-sky-muted">
                Log the day you groom. Hygge keeps count and gently tells you when it&apos;s time
                again.
              </p>
            </div>
          )}
        </div>
        <div className="relative flex flex-col gap-2.5">
          {done ? (
            <PrimaryButton
              onClick={() => void finish()}
              disabled={saving || !gender}
              className="h-[58px] text-lg"
            >
              {saving ? "Saving…" : "Go to today"}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => go(1)} className="h-[58px] text-lg">
              Start, no account needed
            </PrimaryButton>
          )}
        </div>
      </div>
    );
  }

  // ---------- step screens ----------
  const items = gender ? kindsFor(gender) : [];
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="relative flex items-center gap-3.5 overflow-hidden bg-sky py-[18px] pl-3 pr-4 pb-[30px] text-sky-ink">
        <SkyDecor theme={resolvedTheme} />
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Back"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <Icon name="back" size={22} />
        </button>
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold text-on-gold">
          <Icon name={STEP_ICON[step]} size={26} />
        </span>
        <div className="relative flex flex-1 flex-col gap-px">
          <span className="text-[13px] font-semibold text-sky-muted">
            Step {stepIndex} of {inner}
          </span>
          <span className="display text-lg font-bold">{STEP_NAME[step]}</span>
          <span className="mt-1.5 h-1 overflow-hidden rounded-full bg-sky-line">
            <span
              className="block h-1 rounded-full bg-gold"
              style={{ width: `${Math.round((stepIndex / (inner + 1)) * 100)}%` }}
            />
          </span>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          className="relative h-11 shrink-0 rounded-full px-3 text-[15px] font-semibold text-sky-muted"
        >
          Skip
        </button>
      </header>

      <main className="-mt-[18px] flex flex-1 flex-col gap-3.5 rounded-t-[28px] bg-bg px-5 pb-4 pt-[26px]">
        {step === "mode" ? (
          <>
            <h2 className="display text-[30px] font-extrabold leading-tight">
              How would you like to use Hygge?
            </h2>
            <p className="text-base text-muted">You can switch anytime in Settings.</p>
            {(
              [
                [
                  "islamic",
                  "Islamic mode",
                  "Follows the sunnah of the fitrah and its forty-day limit. Adds Hijri dates, Dhul Hijjah and Qurbani reminders, ihram pauses and short hadith notes.",
                  "crescent",
                ],
                [
                  "default",
                  "Default mode",
                  "A simple, private grooming tracker with gentle reminders. No religious content.",
                  "leaf",
                ],
              ] as const
            ).map(([key, title, desc, icon]) => (
              <Card key={key} selected={mode === key} onClick={() => setMode(key)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${mode === key ? "bg-tint text-paper" : "bg-tint-soft text-ink"}`}
                    >
                      <Icon name={icon} size={24} />
                    </span>
                    <span className="display text-[21px] font-extrabold">{title}</span>
                  </span>
                  <Radio on={mode === key} />
                </span>
                <span className="text-[15px] leading-relaxed text-muted">{desc}</span>
              </Card>
            ))}
          </>
        ) : null}

        {step === "gender" ? (
          <>
            <h2 className="display text-[30px] font-extrabold leading-tight">Who is Hygge for?</h2>
            <p className="text-base text-muted">This sets what you track and your colors.</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["male", "Male", "Pubic hair, armpits, nails, head hair, beard, moustache"],
                  [
                    "female",
                    "Female",
                    "Pubic hair, armpits, nails, head hair, body and facial hair, cycle",
                  ],
                ] as const
              ).map(([key, title, desc]) => (
                <Card key={key} selected={gender === key} onClick={() => setGender(key)}>
                  <span
                    data-family={key}
                    data-theme={resolvedTheme}
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-sky text-gold"
                  >
                    <Icon name={key} size={40} />
                  </span>
                  <span className="display text-[21px] font-extrabold">{title}</span>
                  <span className="text-[13px] leading-snug text-muted">{desc}</span>
                </Card>
              ))}
            </div>
            {gender === "male" ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-base font-bold">Your beard</span>
                <div
                  role="group"
                  aria-label="Beard"
                  className="grid grid-cols-2 gap-1 rounded-full border border-line bg-paper p-1"
                >
                  {(["trim", "shave"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={beard === v}
                      onClick={() => setBeard(v)}
                      className={`min-h-12 rounded-full text-[15px] font-bold ${beard === v ? "bg-tint text-paper" : "text-muted"}`}
                    >
                      {v === "trim" ? "Trim" : "Shave"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {step === "last" ? (
          <>
            <h2 className="display text-[30px] font-extrabold leading-tight">When did you last…</h2>
            <p className="text-base text-muted">
              A rough guess is fine. Your countdowns start right away.
            </p>
            {!gender ? (
              <p className="rounded-3xl bg-paper p-4 text-muted">
                Pick who Hygge is for first (go back one step).
              </p>
            ) : null}
            {items.map((kind) => {
              const picked = last[kind];
              return (
                <div
                  key={kind}
                  className="flex flex-col gap-3 rounded-[28px] border border-line bg-paper p-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${picked && picked !== "unknown" ? "bg-tint text-paper" : "bg-tint-soft text-ink"}`}
                    >
                      <ItemIcon kind={kind} size={24} />
                    </span>
                    <span className="display text-lg font-bold">
                      {displayName(kind, kind === "beard" ? beard : null)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LAST_DONE_OPTIONS.map((o) => (
                      <Chip
                        key={o.kind}
                        selected={picked === o.kind}
                        onClick={() => setLast((l) => ({ ...l, [kind]: o.kind }))}
                      >
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                  {picked === "date" ? (
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
                      Date
                      <input
                        type="date"
                        max={today}
                        value={dates[kind] ?? ""}
                        onChange={(e) => setDates((d) => ({ ...d, [kind]: e.target.value }))}
                        className="h-12 rounded-full border-[1.5px] border-line bg-bg px-[18px] text-base text-ink"
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
            <p className="text-sm text-muted">
              Nails are set to every 7 days and everything else to every 40. You can change each one
              later.
            </p>
          </>
        ) : null}

        {step === "reminders" ? (
          <>
            <h2 className="display text-[30px] font-extrabold leading-tight">
              One calm message a day
            </h2>
            <p className="text-base text-muted">
              Only on days something is coming up. Never between 10 pm and 7 am.
            </p>
            <span className="text-base font-bold">What time?</span>
            <div className="flex flex-wrap gap-2">
              {HOURS.map((h) => (
                <Chip key={h} selected={hour === h} onClick={() => setHour(h)}>
                  {hourLabel(h)}
                </Chip>
              ))}
            </div>
            <span className="mt-1 text-base font-bold">On your lock screen</span>
            {(
              [
                [
                  false,
                  "Detailed",
                  "Hygge · 2 gentle reminders",
                  "Pubic hair removal in 3 days\nNail clipping: today's a good day for it",
                ],
                [true, "Discreet", "Hygge", discreetBody(2)],
              ] as const
            ).map(([val, title, pt, pb]) => (
              <Card key={title} selected={discreet === val} onClick={() => setDiscreet(val)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="display text-lg font-extrabold">{title}</span>
                  <Radio on={discreet === val} />
                </span>
                <span className="flex items-start gap-3 rounded-[22px] bg-sky px-3.5 py-3 text-sky-ink">
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-gold text-on-gold">
                    <Icon name="leaf" size={20} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold tracking-wider text-sky-muted">
                      HYGGE · NOW
                    </span>
                    <span className="text-sm font-bold">{pt}</span>
                    <span className="whitespace-pre-line text-sm leading-snug text-sky-muted">
                      {pb}
                    </span>
                  </span>
                </span>
              </Card>
            ))}
          </>
        ) : null}

        {step === "islamic" ? (
          <>
            <h2 className="display text-[30px] font-extrabold leading-tight">
              A few Islamic touches
            </h2>
            <div className="flex flex-col gap-2.5 rounded-[28px] border border-line bg-paper p-[18px]">
              <span className="display text-lg font-bold">A preferred grooming day?</span>
              <span className="text-sm text-muted">
                Hygge suggests it when it falls before your deadline.
              </span>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(([label, v]) => (
                  <Chip key={label} selected={weekday === v} onClick={() => setWeekday(v)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 rounded-[28px] border border-line bg-paper p-[18px]">
              <span className="display text-lg font-bold">Offering Qurbani this year?</span>
              <span className="text-sm leading-snug text-muted">
                If yes, Hygge reminds you to groom before Dhul Hijjah and pauses until your
                sacrifice day (Sahih Muslim 1977).
              </span>
              <div className="flex flex-wrap gap-2">
                <Chip selected={qurbani} onClick={() => setQurbani(true)}>
                  Yes
                </Chip>
                <Chip selected={!qurbani} onClick={() => setQurbani(false)}>
                  No or not sure
                </Chip>
              </div>
            </div>
            <p className="text-sm leading-snug text-muted">
              Going for Hajj or Umrah? Add your ihram dates in Settings and Hygge pauses with you.
            </p>
          </>
        ) : null}
      </main>

      <div className="sticky bottom-0 bg-bg px-5 pb-[26px] pt-2.5">
        <PrimaryButton
          onClick={() => go(1)}
          disabled={!canContinue}
          className="h-[58px] w-full text-lg"
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
