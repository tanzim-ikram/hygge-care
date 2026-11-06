/** Hair growing out of a skin cross-section, and a nail growing past a fingertip. Pure geometry. */
import type { ItemKind } from "@hygge/core";

function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647), (s - 1) / 2147483646);
}

interface HairParams {
  curl: number;
  wave: number;
  bend: number;
  width: number;
  lean: number;
  color?: string;
}

const HAIR: Record<Exclude<ItemKind, "nails">, HairParams> = {
  pubic_hair: { curl: 5, wave: 22, bend: 0.15, width: 2.4, lean: 0.28 },
  armpit_hair: { curl: 3, wave: 30, bend: 0.2, width: 2.2, lean: 0.35 },
  head_hair: { curl: 1.5, wave: 60, bend: 0.35, width: 2.0, lean: 0.3 },
  beard: { curl: 2, wave: 40, bend: 0.3, width: 2.7, lean: 0.2 },
  moustache: { curl: 1, wave: 60, bend: 0.25, width: 2.6, lean: 0.55 },
  body_hair: { curl: 1.5, wave: 40, bend: 0.3, width: 1.7, lean: 0.5, color: "#3F2C22" },
  facial_hair: { curl: 1, wave: 40, bend: 0.3, width: 1.4, lean: 0.4, color: "#4E392D" },
};

export interface HairScene {
  kind: "hair";
  size: number;
  surface: number;
  hairs: string[];
  roots: string[];
  bulbs: { cx: number; cy: number; rx: number; ry: number }[];
  pores: { cx: number; cy: number; r: number }[];
  openings: { cx: number; cy: number; rx: number; ry: number }[];
  hairColor: string;
  rootWidth: number;
}
export interface NailScene {
  kind: "nail";
  freeEdge: string;
}

/** p = 0: just done, 1: due, above 1: past due. The scene is a square of `size` units. */
export function growthScene(
  kind: ItemKind,
  p: number,
  seed: number,
  size = 200,
): HairScene | NailScene {
  if (kind === "nails") {
    const top = 49 - Math.min(Math.max(p, 0), 1.25) * 22;
    return {
      kind: "nail",
      freeEdge: `M38 64 L38 ${(top + 12).toFixed(1)} Q38 ${top.toFixed(1)} 60 ${top.toFixed(1)} Q82 ${top.toFixed(1)} 82 ${(top + 12).toFixed(1)} L82 64 Z`,
    };
  }
  const k = HAIR[kind];
  const big = size >= 120;
  const n = big ? 11 : 6;
  const surface = size * (big ? 0.64 : 0.6);
  const maxLen = size * (big ? 0.52 : 0.5);
  const r = rng(seed);
  const margin = size * 0.06;
  const curl = k.curl * (big ? 1 : 0.5);
  const wave = k.wave * (big ? 1 : 0.5);
  const width = k.width * (big ? 1 : 0.9);
  const hairs: string[] = [];
  const roots: string[] = [];
  const bulbs: HairScene["bulbs"] = [];
  const openings: HairScene["openings"] = [];
  const pores: HairScene["pores"] = [];
  const f = (x: number) => x.toFixed(2);
  for (let i = 0; i < n; i++) {
    const bx = margin + ((i + 0.5) * (size - 2 * margin)) / n + (r() - 0.5) * (size / n) * 0.6;
    const by = surface + 0.5;
    const lean = k.lean + (r() - 0.5) * 0.45;
    const len = maxLen * Math.min(Math.max(p, 0), 1.25) * (0.88 + r() * 0.22);
    const phase = r() * 6.28;
    const w = wave * (0.8 + r() * 0.4);
    const amp = curl * (0.7 + r() * 0.6) * Math.min(1, len / (maxLen * 0.5));
    const w0 = width * (0.85 + r() * 0.3);
    const dx = Math.sin(lean),
      dy = -Math.cos(lean),
      nx = -dy,
      ny = dx;
    const left: string[] = [];
    const right: string[] = [];
    for (let s = 0; s <= 18; s++) {
      const t = s / 18;
      const along = t * len;
      const off =
        amp * Math.sin((along / w) * 6.283 + phase) * Math.min(1, along / 8) +
        k.bend * t * t * len * 0.25;
      const cx = bx + dx * along + nx * off;
      const cy = by + dy * along + ny * off;
      const half = (w0 * (1 - 0.82 * Math.pow(t, 1.3))) / 2;
      left.push(`${f(cx + nx * half)} ${f(cy + ny * half)}`);
      right.unshift(`${f(cx - nx * half)} ${f(cy - ny * half)}`);
    }
    if (len > 0.5) hairs.push(`M${left.join(" L")} L${right.join(" L")}Z`);
    openings.push({ cx: bx, cy: surface + 0.6, rx: w0 * 1.3, ry: w0 * 0.55 });
    if (big) {
      const rl = 38 * (0.85 + r() * 0.3);
      const ex = bx - dx * rl * 0.9;
      const ey = by + rl;
      roots.push(
        `M${f(bx)} ${f(by)} Q ${f(bx - dx * rl * 0.4)} ${f(by + rl * 0.5)} ${f(ex)} ${f(ey)}`,
      );
      bulbs.push({ cx: ex, cy: ey + w0, rx: w0 * 1.5, ry: w0 * 2 });
    }
  }
  const poreCount = big ? 14 : 5;
  for (let j = 0; j < poreCount; j++) {
    pores.push({
      cx: r() * size,
      cy: surface + 3 + r() * (size - surface - 4) * 0.25,
      r: 0.4 + r() * 0.5,
    });
  }
  return {
    kind: "hair",
    size,
    surface,
    hairs,
    roots,
    bulbs,
    pores,
    openings,
    hairColor: k.color ?? "#241812",
    rootWidth: width * 0.9,
  };
}
