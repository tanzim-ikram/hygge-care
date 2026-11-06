"use client";

import { useState } from "react";
import { WEEKDAY_NAMES } from "@hygge/core";
import { useApp } from "@/lib/app-state";
import { Chip, Switch } from "./ui";
import type { ThemeMode } from "@/lib/store";

const HOURS = [7, 9, 12, 18, 21];
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[28px] border border-line bg-paper p-[18px]">
      <h2 className="display text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export function Settings() {
  const { data, saveProfile, setThemeMode, applyGender, storeKind, deleteEverything } = useApp();
  const p = data.profile;
  const [confirm, setConfirm] = useState(false);
  const beard = data.items.find((i) => i.kind === "beard")?.variant ?? "trim";

  return (
    <div className="flex flex-col gap-3.5 px-5 pb-28 pt-6">
      <h1 className="display text-[28px] font-extrabold">Settings</h1>

      <Section title="Appearance">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
          {(["day", "night", "system"] as ThemeMode[]).map((m) => (
            <Chip key={m} selected={p.themeMode === m} onClick={() => void setThemeMode(m)}>
              {m === "day" ? "Day" : m === "night" ? "Night" : "Match my device"}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Mode">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mode">
          <Chip
            selected={p.mode === "islamic"}
            onClick={() => void saveProfile({ mode: "islamic" })}
          >
            Islamic
          </Chip>
          <Chip
            selected={p.mode === "default"}
            onClick={() => void saveProfile({ mode: "default" })}
          >
            Default
          </Chip>
        </div>
        <p className="text-sm text-muted">
          Islamic mode adds Hijri dates, Dhul Hijjah and Qurbani reminders, ihram pauses and hadith
          notes.
        </p>
        {p.mode === "islamic" ? (
          <>
            <span className="text-[15px] font-bold">Preferred grooming day</span>
            <div className="flex flex-wrap gap-2">
              {[6, 0, 1, 2, 3, 4, 5].map((d) => (
                <Chip
                  key={d}
                  selected={p.preferredWeekday === d}
                  onClick={() => void saveProfile({ preferredWeekday: d })}
                >
                  {WEEKDAY_NAMES[d]!.slice(0, 3)}
                </Chip>
              ))}
              <Chip
                selected={p.preferredWeekday === null}
                onClick={() => void saveProfile({ preferredWeekday: null })}
              >
                None
              </Chip>
            </div>
            <Switch
              label="Offering Qurbani this year"
              hint="Pauses reminders from 1 Dhul Hijjah until your sacrifice day"
              on={p.plansQurbani}
              onChange={(v) => void saveProfile({ plansQurbani: v })}
            />
          </>
        ) : null}
      </Section>

      <Section title="For">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Gender">
          <Chip selected={p.gender === "male"} onClick={() => void applyGender("male", beard)}>
            Male
          </Chip>
          <Chip selected={p.gender === "female"} onClick={() => void applyGender("female", beard)}>
            Female
          </Chip>
        </div>
        <p className="text-sm text-muted">
          Switching never deletes anything. Items that don&apos;t apply are just turned off.
        </p>
      </Section>

      <Section title="Reminders">
        <span className="text-[15px] font-bold">One calm message a day, at</span>
        <div className="flex flex-wrap gap-2">
          {HOURS.map((h) => (
            <Chip
              key={h}
              selected={p.reminderHour === h}
              onClick={() => void saveProfile({ reminderHour: h })}
            >
              {hourLabel(h)}
            </Chip>
          ))}
        </div>
        <Switch
          label="Discreet notifications"
          hint="Lock screens say only “Hygge: a gentle reminder”"
          on={p.discreet}
          onChange={(v) => void saveProfile({ discreet: v })}
        />
        <p className="text-sm text-muted">
          Quiet hours: {hourLabel(p.quietStart)} to {hourLabel(p.quietEnd)}. Sending reminders is
          coming soon.
        </p>
      </Section>

      <Section title="Your data">
        <p className="text-sm text-muted">
          {storeKind === "cloud"
            ? "Your data is saved to your Hygge account."
            : "Your data is saved only in this browser. Signing in to sync across devices comes with an account."}
        </p>
        {confirm ? (
          <div className="flex flex-col gap-2.5 rounded-3xl bg-warm-soft p-4 text-ink">
            <p className="text-[15px] font-semibold">
              Delete everything? This can&apos;t be undone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="h-12 rounded-full border-[1.5px] border-line font-semibold"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => void deleteEverything()}
                className="h-12 rounded-full bg-ink font-bold text-bg"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="h-12 rounded-full border-[1.5px] border-line font-semibold text-ink"
          >
            Delete all my data
          </button>
        )}
      </Section>

      <Section title="About">
        <p className="text-sm text-muted">
          Icons: Material Design Icons (Apache 2.0), Health Icons (MIT), and “beard” by Delapouite
          from game-icons.net (CC BY 3.0).
        </p>
      </Section>
    </div>
  );
}
