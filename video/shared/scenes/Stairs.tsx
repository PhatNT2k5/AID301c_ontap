import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color } from "../theme";
import type { StairsData } from "../types";
import { sweep } from "./ui";

const LEFT = 56;
const WIDTH = 920;
const BASE = 500;
const RISE = 52;

/** Ordered stages as a staircase; a marker climbs to the newest step. */
export const Stairs = ({ data, beats }: { data: StairsData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const n = data.steps.length;
  const w = WIDTH / n;
  const topOf = (i: number) => BASE - 120 - i * RISE;
  const reached = data.steps.reduce((acc, s, i) => (beats[s.id] !== undefined && frame >= beats[s.id] ? i : acc), -1);
  const climbAt = reached >= 0 ? beats[data.steps[reached].id] : 0;
  const hop = reached >= 0 ? appear(frame, climbAt, 12) : 0;
  const prevX = reached > 0 ? LEFT + (reached - 1) * w + w / 2 : LEFT + w / 2;
  const prevY = reached > 0 ? topOf(reached - 1) : topOf(0);
  const ballX = reached >= 0 ? prevX + (LEFT + reached * w + w / 2 - prevX) * hop : 0;
  const ballY = reached >= 0 ? prevY + (topOf(reached) - prevY) * hop - Math.sin(hop * Math.PI) * 40 - 16 : 0;

  const targets: PointerTarget[] = data.steps
    .map((s, i) => ({ x: LEFT + i * w + w / 2, y: topOf(i) + 40, at: beats[s.id] }))
    .filter((t): t is PointerTarget => t.at !== undefined);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {data.steps.map((step, i) => {
        // Before its own beat a step can already show as a faint outline ("ghost" beat).
        const ghost = appear(frame, beats.ghost, 16) * 0.2 + appear(frame, beats.count ?? beats.ghost, 16) * 0.16;
        const p = Math.max(appear(frame, beats[step.id], 14), ghost);
        const num = Math.max(appear(frame, beats.count ?? beats[step.id], 10), p);
        const cap = appear(frame, beats[`cap_${step.id}`] ?? beats[step.id], 12);
        const top = topOf(i);
        const swept = sweep(frame, beats, n);
        const active = swept >= 0 ? i === swept : i === reached;
        return (
          <div
            key={step.id}
            style={{
              position: "absolute",
              left: LEFT + i * w,
              top,
              width: w - 10,
              height: BASE - top,
              background: active ? color.mint : color.surface,
              border: `2.5px solid ${color.ink}`,
              borderBottom: "none",
              borderRadius: "14px 14px 0 0",
              padding: "12px 12px 0",
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px)`,
              transformOrigin: "50% 100%",
            }}
          >
            <div style={{ fontSize: 15, color: color.accent, fontWeight: 600, opacity: num / Math.max(p, 0.01) }}>{i + 1}</div>
            <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{step.label}</div>
            {step.caption && (
              <div style={{ fontSize: 15, color: color.inkSoft, marginTop: 6, lineHeight: 1.3, opacity: cap }}>{step.caption}</div>
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: LEFT - 10, top: BASE, width: WIDTH + 10, height: 3, background: color.ink }} />
      {reached >= 0 && (
        <div
          style={{
            position: "absolute",
            left: ballX - 13,
            top: ballY - 13,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: color.warn,
            border: `3px solid ${color.surface}`,
            boxShadow: `0 0 0 2px ${color.warn}`,
          }}
        />
      )}
      <Pointer targets={targets} />
    </div>
  );
};
