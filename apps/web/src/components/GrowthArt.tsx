import { growthScene } from "@/lib/growth";
import type { ItemKind } from "@hygge/core";

const SKIN = {
  top: "#EAB992",
  mid: "#D9A27F",
  deep: "#C88B6C",
  root: "#8A6450",
  bulb: "#6B4A3A",
  pore: "#B98163",
  open: "#9C6B52",
  bg: "#F4EFEA",
};

/** Square illustration: hair out of skin, or a growing nail. `p` is progress (1 = due, above = past). */
export function GrowthArt({
  kind,
  p,
  seed,
  size,
  label,
}: {
  kind: ItemKind;
  p: number;
  seed: number;
  size: number;
  label?: string;
}) {
  const big = size >= 120;
  const scene = growthScene(kind, p, seed, big ? 200 : 60);
  if (scene.kind === "nail") {
    return (
      <svg
        width={size}
        height={size}
        viewBox={big ? "0 16 120 120" : "12 18 96 96"}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        style={{ display: "block" }}
      >
        <rect x="0" y="0" width="120" height="140" fill={SKIN.bg} />
        <path
          d="M22 140 V72 Q22 40 60 40 Q98 40 98 72 V140 Z"
          fill="#DDA582"
          stroke="#C98E6A"
          strokeWidth="1.5"
        />
        <path d={scene.freeEdge} fill="#F8F1E8" stroke="#E0CFBF" strokeWidth="1.2" />
        <rect x="36" y="50" width="48" height="58" rx="21" fill="#EDB3A8" />
        <path d="M42 100 Q60 88 78 100 Q76 108 70 108 H50 Q44 108 42 100 Z" fill="#F6D8CF" />
        {big ? (
          <path
            d="M42 62 Q46 54 56 53"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
          />
        ) : null}
      </svg>
    );
  }
  const s = scene.size;
  const skinH = s - scene.surface;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${s} ${s}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: "block" }}
    >
      <rect width={s} height={s} fill={SKIN.bg} />
      <rect y={scene.surface} width={s} height={skinH} fill={SKIN.mid} />
      {big ? (
        <rect
          y={scene.surface + skinH * 0.5}
          width={s}
          height={skinH}
          fill={SKIN.deep}
          opacity="0.55"
        />
      ) : null}
      <rect y={scene.surface} width={s} height={big ? 4 : 2} fill={SKIN.top} />
      {scene.roots.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={SKIN.root}
          strokeWidth={scene.rootWidth}
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}
      {scene.bulbs.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={SKIN.bulb} opacity="0.55" />
      ))}
      {scene.pores.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={SKIN.pore} opacity="0.6" />
      ))}
      {scene.openings.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={SKIN.open} />
      ))}
      {scene.hairs.map((d, i) => (
        <path key={i} d={d} fill={scene.hairColor} />
      ))}
    </svg>
  );
}
