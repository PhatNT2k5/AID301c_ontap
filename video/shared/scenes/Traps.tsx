import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color } from "../theme";
import type { RecapData, TrapsData } from "../types";
import { Badge, card, rise, sweep } from "./ui";

const TOP = 150;
const ROW = 68;

/** Common exam traps: the wrong belief appears, gets struck through, and the fix slides in. */
export const Traps = ({ data, beats }: { data: TrapsData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const swept = sweep(frame, beats, data.traps.length);
  const targets: PointerTarget[] = [];
  data.traps.forEach((t, i) => {
    const y = TOP + i * ROW + 28;
    if (beats[t.id] !== undefined) targets.push({ x: 470, y, at: beats[t.id] });
    if (beats[`fix_${t.id}`] !== undefined) targets.push({ x: 940, y, at: beats[`fix_${t.id}`] });
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {data.traps.map((t, i) => {
        const p = appear(frame, beats[t.id], 12);
        const fix = appear(frame, beats[`fix_${t.id}`], 14);
        return (
          <div
            key={t.id}
            style={{
              position: "absolute",
              left: 56,
              top: TOP + i * ROW,
              width: 940,
              height: ROW - 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 14px",
              ...card({
                borderColor: fix > 0 ? color.ink : color.wrong,
                boxShadow: `3px 3px 0 ${fix > 0 ? color.ink : color.wrong}`,
                ...(i === swept ? { background: color.mint } : {}),
              }),
              ...rise(p, 12),
            }}
          >
            <Badge size={34} fill={color.wrong} ink={color.surface} border={color.wrong}>
              ✗
            </Badge>
            <span
              style={{
                width: 380,
                fontSize: 19,
                lineHeight: 1.25,
                color: fix > 0 ? color.muted : color.wrong,
                textDecoration: fix > 0.5 ? "line-through" : "none",
              }}
            >
              {t.wrong}
            </span>
            <span style={{ fontSize: 22, color: color.accent, opacity: fix }}>→</span>
            <span style={{ flex: 1, fontSize: 19, lineHeight: 1.25, fontWeight: 600, color: color.right, ...rise(fix, 8) }}>{t.right}</span>
          </div>
        );
      })}
      <Pointer targets={targets} />
    </div>
  );
};

/** Chapter wrap-up: one tile per idea, ticked off as the lecturer names it. */
export const Recap = ({ data, beats }: { data: RecapData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const swept = sweep(frame, beats, data.items.length);
  const targets: PointerTarget[] = data.items
    .map((it, i) => ({ x: 56 + (i % 2) * 470 + 420, y: 160 + Math.floor(i / 2) * 120 + 50, at: beats[it.id] }))
    .filter((t): t is PointerTarget => t.at !== undefined);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {data.items.map((it, i) => {
        const p = appear(frame, beats[it.id], 14);
        return (
          <div
            key={it.id}
            style={{
              position: "absolute",
              left: 56 + (i % 2) * 470,
              top: 160 + Math.floor(i / 2) * 120,
              width: 450,
              height: 100,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 18px",
              ...card(
                i === swept
                  ? { background: color.mint, borderColor: color.accent, boxShadow: `5px 5px 0 ${color.accent}` }
                  : { background: p > 0.5 ? color.rightBg : color.surface },
              ),
              ...rise(p, 16),
            }}
          >
            <Badge size={44} fill={color.right} ink={color.surface} border={color.right}>
              ✓
            </Badge>
            <span style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.3 }}>{it.text}</span>
          </div>
        );
      })}
      <Pointer targets={targets} />
    </div>
  );
};
