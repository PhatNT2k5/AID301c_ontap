import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color, font } from "../theme";
import type { CycleData } from "../types";

const CX = 560;
const CY = 350;
const RX = 330;
const RY = 172;
const GAP = 0.36; // radians kept clear around each node so arrows do not touch the pills

const angleOf = (i: number, n: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
const point = (a: number) => [CX + RX * Math.cos(a), CY + RY * Math.sin(a)] as const;

const arcPath = (a0: number, a1: number) => {
  const steps = 24;
  let d = "";
  for (let s = 0; s <= steps; s++) {
    const [x, y] = point(a0 + ((a1 - a0) * s) / steps);
    d += `${s === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};

/** Process drawn as a loop: nodes pop in on their beats, the connecting arrow draws toward
 * each new node, and once the loop closes a dot keeps running around it. */
export const Cycle = ({ data, beats }: { data: CycleData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const n = data.nodes.length;
  const loopAt = beats.loop;
  const centerIn = appear(frame, beats.center ?? 0, 18);
  const track = appear(frame, beats.track, 20);

  // Runner: one lap every 4 s after the loop closes.
  const runnerT = loopAt !== undefined && frame > loopAt + 14 ? ((frame - loopAt - 14) / 120) % 1 : null;
  const runnerA = runnerT === null ? 0 : -Math.PI / 2 + runnerT * Math.PI * 2;
  const [rx, ry] = point(runnerA);

  const targets: PointerTarget[] = [];
  if (beats.center !== undefined) targets.push({ x: CX, y: CY - 12, at: beats.center });
  data.nodes.forEach((node, i) => {
    const [x, y] = point(angleOf(i, n));
    if (beats[node.id] !== undefined) targets.push({ x, y: y + 22, at: beats[node.id] });
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
        {data.nodes.map((node, i) => {
          const next = (i + 1) % n;
          const at = next === 0 ? loopAt : beats[data.nodes[next].id];
          const p = appear(frame, at, 16);
          const a0 = angleOf(i, n) + GAP;
          const a1 = angleOf(i + 1, n) - GAP;
          const [ex, ey] = point(a1);
          const [bx, by] = point(a1 - 0.05);
          const rot = (Math.atan2(ey - by, ex - bx) * 180) / Math.PI;
          return (
            <g key={node.id}>
              <path d={arcPath(a0, a1)} fill="none" stroke={color.lineSoft} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" opacity={track} />
              <path
                d={arcPath(a0, a1)}
                pathLength={1}
                fill="none"
                stroke={color.accent}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - p}
              />
              {p > 0.9 && (
                <polygon points="0,-8 14,0 0,8" fill={color.accent} transform={`translate(${ex} ${ey}) rotate(${rot})`} />
              )}
            </g>
          );
        })}
        {runnerT !== null && <circle cx={rx} cy={ry} r={9} fill={color.warn} stroke={color.surface} strokeWidth={3} />}
      </svg>

      <div
        style={{
          position: "absolute",
          left: CX - 160,
          top: CY - 52,
          width: 320,
          textAlign: "center",
          opacity: centerIn,
          transform: `scale(${0.9 + centerIn * 0.1})`,
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-0.02em" }}>{data.center}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
          {(data.centerSub ?? []).map((part) => (
            <span
              key={part.beat}
              style={{
                fontSize: 22,
                fontWeight: 600,
                padding: "3px 14px",
                borderRadius: 999,
                background: color.mint,
                border: `2px solid ${color.accent}`,
                opacity: appear(frame, beats[part.beat]),
              }}
            >
              {part.text}
            </span>
          ))}
        </div>
      </div>

      {/* Empty numbered slots: the six phases exist before they get their names. */}
      {data.nodes.map((node, i) => {
        const p = appear(frame, beats.slots, 10 + i * 3);
        const filled = appear(frame, beats[node.id], 8);
        const [x, y] = point(angleOf(i, n));
        return (
          <div
            key={`slot-${node.id}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 64,
              height: 58,
              display: "grid",
              placeItems: "center",
              border: `2.5px dashed ${color.accent}`,
              borderRadius: 16,
              color: color.accent,
              fontSize: 22,
              fontWeight: 600,
              opacity: p * (1 - filled),
              transform: `translate(-50%, -50%) scale(${0.7 + p * 0.3})`,
            }}
          >
            {i + 1}
          </div>
        );
      })}

      {data.nodes.map((node, i) => {
        const p = appear(frame, beats[node.id], 14);
        const [x, y] = point(angleOf(i, n));
        const active = runnerT !== null && Math.abs(((runnerT * n) % n) - i) < 0.5;
        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              minWidth: 200,
              height: 58,
              padding: "0 18px",
              display: "grid",
              placeItems: "center",
              whiteSpace: "nowrap",
              background: active ? color.mint : color.surface,
              border: `2.5px solid ${color.ink}`,
              borderRadius: 16,
              boxShadow: `3px 3px 0 ${color.ink}`,
              fontFamily: font.body,
              fontSize: 20,
              fontWeight: 600,
              opacity: p,
              transform: `translate(-50%, -50%) scale(${0.6 + p * 0.4})`,
            }}
          >
            <span>
              <span style={{ color: color.accent, marginRight: 8 }}>{i + 1}</span>
              {node.label}
            </span>
          </div>
        );
      })}
      <Pointer targets={targets} />
    </div>
  );
};
