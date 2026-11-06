"use client";

import { useEffect, useId, type ReactNode } from "react";
import type { ItemKind } from "@hygge/core";
import { ITEM_ICONS, UI_ICONS, type UiIconName } from "@/lib/icons";

/** Stroke icon for UI chrome. */
export function Icon({
  name,
  size = 24,
  strokeWidth = 2,
}: {
  name: UiIconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {UI_ICONS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** Real, filled item icon (see lib/icons.ts for sources and licences). */
export function ItemIcon({ kind, size = 28 }: { kind: ItemKind | "period"; size?: number }) {
  const icon = ITEM_ICONS[kind];
  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      {icon.paths.map((p, i) => (
        <path key={i} d={p.d} fillRule={p.evenodd ? "evenodd" : "nonzero"} />
      ))}
    </svg>
  );
}

const STARS: [number, number, number][] = [
  [8, 14, 2],
  [22, 64, 3],
  [36, 8, 2],
  [58, 30, 2],
  [74, 12, 3],
  [90, 40, 2],
  [12, 48, 2],
  [84, 70, 2],
  [66, 58, 2],
  [46, 76, 3],
  [28, 86, 2],
  [94, 88, 2],
];

/** Sky decoration: stars at night, a soft sun and clouds by day. */
export function SkyDecor({ theme }: { theme: "day" | "night" }) {
  if (theme === "night") {
    return (
      <>
        {STARS.map(([x, y, s], i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: s,
              height: s,
              background: "rgba(255,255,255,.5)",
            }}
          />
        ))}
      </>
    );
  }
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          right: -36,
          top: -40,
          width: 150,
          height: 150,
          background:
            "radial-gradient(circle, rgba(244,190,79,.75) 0 30%, rgba(244,190,79,.22) 31% 55%, rgba(244,190,79,0) 56%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          left: "10%",
          top: "26%",
          width: 74,
          height: 22,
          background: "rgba(255,255,255,.75)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          left: "18%",
          top: "22%",
          width: 38,
          height: 20,
          background: "rgba(255,255,255,.75)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          right: "16%",
          top: "58%",
          width: 60,
          height: 18,
          background: "rgba(255,255,255,.6)",
        }}
      />
    </>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 rounded-full border-[1.5px] px-4 text-[15px] font-semibold ${
        selected ? "border-tint bg-tint text-paper" : "border-line bg-transparent text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-14 items-center justify-center gap-2 rounded-full bg-gold px-6 text-[17px] font-bold text-on-gold disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 items-center justify-center rounded-full border-[1.5px] border-line px-6 text-base font-semibold text-ink ${className}`}
    >
      {children}
    </button>
  );
}

export function Switch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-15 w-full items-center justify-between gap-3 rounded-full bg-bg py-2 pl-5 pr-2.5 text-left text-ink"
    >
      <span className="flex flex-col">
        <span className="text-base font-semibold">{label}</span>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </span>
      <span
        className={`flex h-[34px] w-[54px] shrink-0 items-center rounded-full p-[3px] ${on ? "justify-end bg-tint" : "justify-start bg-line"}`}
      >
        <span className={`h-7 w-7 rounded-full shadow ${on ? "bg-gold" : "bg-paper"}`} />
      </span>
    </button>
  );
}

export function Stepper({
  label,
  value,
  onDec,
  onInc,
  decLabel,
  incLabel,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  decLabel: string;
  incLabel: string;
}) {
  const btn =
    "h-11 w-11 rounded-full border border-line bg-paper text-[22px] font-semibold text-ink";
  return (
    <div className="flex items-center justify-between gap-3 rounded-full bg-bg py-2 pl-5 pr-2">
      <span className="text-base font-semibold">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onDec} aria-label={decLabel} className={btn}>
          −
        </button>
        <span className="display min-w-[84px] text-center text-[17px] font-bold">{value}</span>
        <button type="button" onClick={onInc} aria-label={incLabel} className={btn}>
          +
        </button>
      </div>
    </div>
  );
}

/** Bottom sheet with a scrim. Escape or tapping the scrim closes it. */
export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 border-0"
        style={{ background: "var(--scrim)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="relative m-2 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto rounded-[36px] bg-paper px-[18px] pb-[22px] pt-2.5 text-ink"
      >
        <div className="mx-auto h-[5px] w-10 rounded-full bg-line" />
        <h2 id={id} className="sr-only">
          {label}
        </h2>
        {children}
      </div>
    </div>
  );
}
