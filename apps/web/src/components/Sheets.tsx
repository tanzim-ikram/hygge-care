"use client";

import { useState } from "react";
import { addDays, checkInterval, isLocalDate, lastDoneText, plural } from "@hygge/core";
import { useApp } from "@/lib/app-state";
import { Chip, ItemIcon, Sheet, Stepper, Switch } from "./ui";

export function LogSeveralSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { states, today, logDone } = useApp();
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [when, setWhen] = useState<"today" | "yesterday" | "date">("today");
  const [date, setDate] = useState("");
  const ids = Object.keys(picked).filter((k) => picked[k]);
  const doneOn = when === "today" ? today : when === "yesterday" ? addDays(today, -1) : date;
  const valid = ids.length > 0 && isLocalDate(doneOn) && doneOn <= today;

  const close = () => {
    setPicked({});
    setWhen("today");
    setDate("");
    onClose();
  };
  const save = async () => {
    if (!valid) return;
    await logDone(
      ids.map((itemId) => ({ itemId, doneOn })),
      `${plural(ids.length, "thing")} logged`,
    );
    close();
  };

  return (
    <Sheet open={open} onClose={close} label="Log several">
      <h2 aria-hidden="true" className="display text-2xl font-extrabold">
        What did you take care of?
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {states.map((s) => {
          const on = !!picked[s.item.id];
          return (
            <button
              key={s.item.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked((p) => ({ ...p, [s.item.id]: !p[s.item.id] }))}
              className={`flex min-h-14 items-center gap-2.5 rounded-full border-[1.5px] px-4 text-left text-[15px] font-semibold ${on ? "border-tint bg-tint text-paper" : "border-line text-ink"}`}
            >
              <ItemIcon kind={s.item.kind} size={22} />
              {s.name}
            </button>
          );
        })}
      </div>
      <span className="text-[15px] font-bold">When?</span>
      <div className="flex flex-wrap gap-2">
        <Chip selected={when === "today"} onClick={() => setWhen("today")}>
          Today
        </Chip>
        <Chip selected={when === "yesterday"} onClick={() => setWhen("yesterday")}>
          Yesterday
        </Chip>
        <Chip selected={when === "date"} onClick={() => setWhen("date")}>
          Pick a date
        </Chip>
      </div>
      {when === "date" ? (
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
          Date
          <input
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 rounded-full border-[1.5px] border-line bg-bg px-[18px] text-base text-ink"
          />
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={!valid}
        className={`h-14 rounded-full text-[17px] font-bold ${valid ? "bg-gold text-on-gold" : "bg-bg text-muted"}`}
      >
        {ids.length ? `Log ${plural(ids.length, "thing")}` : "Tap what you did"}
      </button>
    </Sheet>
  );
}

export function ItemSheet({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const { states, data, today, updateItem } = useApp();
  const state = states.find((s) => s.item.id === itemId) ?? null;
  if (!state)
    return (
      <Sheet open={false} onClose={onClose} label="Item">
        {null}
      </Sheet>
    );
  const item = state.item;
  const check = checkInterval(item.kind, item.intervalDays, data.profile.mode);
  const set = (patch: Parameters<typeof updateItem>[1]) => void updateItem(item.id, patch);

  return (
    <Sheet open onClose={onClose} label={`${state.name} settings`}>
      <div className="flex items-center gap-3.5">
        <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-tint-soft text-ink">
          <ItemIcon kind={item.kind} size={30} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="display text-2xl font-extrabold">{state.name}</h3>
          <span className="text-sm text-muted">{lastDoneText(state.lastDone, today)}</span>
        </div>
      </div>

      {item.kind === "beard" ? (
        <div
          role="group"
          aria-label="Beard"
          className="grid grid-cols-2 gap-1 rounded-full bg-bg p-1"
        >
          {(["trim", "shave"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={item.variant === v}
              onClick={() => set({ variant: v })}
              className={`min-h-12 rounded-full text-[15px] font-bold ${item.variant === v ? "bg-paper text-ink shadow" : "text-muted"}`}
            >
              {v === "trim" ? "Trim" : "Shave"}
            </button>
          ))}
        </div>
      ) : null}

      <Stepper
        label="Every"
        value={plural(item.intervalDays, "day")}
        decLabel="Fewer days"
        incLabel="More days"
        onDec={() => set({ intervalDays: Math.max(1, item.intervalDays - 1) })}
        onInc={() => set({ intervalDays: Math.min(365, item.intervalDays + 1) })}
      />
      <Stepper
        label="Remind me"
        value={item.leadDays ? `${plural(item.leadDays, "day")} early` : "Off"}
        decLabel="Remind later"
        incLabel="Remind earlier"
        onDec={() => set({ leadDays: Math.max(0, item.leadDays - 1) })}
        onInc={() => set({ leadDays: Math.min(14, item.leadDays + 1) })}
      />
      {check.note ? (
        <div className="rounded-3xl bg-tint-soft px-[18px] py-3.5 text-sm leading-relaxed text-ink">
          {check.note}
        </div>
      ) : null}
      <Switch
        label="On the day"
        hint="When it's due"
        on={item.remindOnDue}
        onChange={(v) => set({ remindOnDue: v })}
      />
      <Switch
        label="Daily after that"
        hint="Stops after 7 days"
        on={item.remindOverdueDaily}
        onChange={(v) => set({ remindOverdueDaily: v })}
      />
      <Switch
        label="Track this"
        hint="Turn off to hide it"
        on={item.enabled}
        onChange={(v) => {
          set({ enabled: v });
          if (!v) onClose();
        }}
      />
      <button
        type="button"
        onClick={onClose}
        className="h-14 rounded-full bg-gold text-[17px] font-bold text-on-gold"
      >
        Done
      </button>
    </Sheet>
  );
}
