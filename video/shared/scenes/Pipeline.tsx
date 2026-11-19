import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color } from "../theme";
import type { PipelineData } from "../types";
import { card, rise, sweep } from "./ui";

const TOP = 170;
const HEIGHT = 270;
const LEFT = 56;
const WIDTH = 940;
const ARROW = 56;

/** Boxes joined by arrows; once the flow starts, data packets keep travelling through them. */
export const Pipeline = ({ data, beats }: { data: PipelineData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const n = data.stages.length;
  const boxW = (WIDTH - ARROW * (n - 1)) / n;
  const xOf = (i: number) => LEFT + i * (boxW + ARROW);
  const midY = TOP + 44;
  const flowAt = beats.flow;
  const swept = sweep(frame, beats, n);

  const targets: PointerTarget[] = [];
  data.stages.forEach((st, i) => {
    if (beats[st.id] !== undefined) targets.push({ x: xOf(i) + boxW / 2, y: TOP + 40, at: beats[st.id] });
    st.items.forEach((it, k) => {
      if (beats[it.id] !== undefined) targets.push({ x: xOf(i) + boxW - 24, y: TOP + 92 + k * 46, at: beats[it.id] });
    });
  });

  // Packets: three dots spaced along the whole line, looping every 3 s.
  const packets =
    flowAt !== undefined && frame >= flowAt
      ? [0, 1 / 3, 2 / 3].map((offset) => {
          // From the first box centre to the last one: n - 1 segments, never past the last box.
          const t = (((frame - flowAt) / 90 + offset) % 1) * Math.max(n - 1, 0);
          const seg = Math.floor(t);
          const local = t - seg;
          return { x: xOf(seg) + boxW / 2 + local * (boxW + ARROW), seg };
        })
      : [];

  // While data flows, the box the lead packet is passing through lights up; after the last
  // beat the review sweep takes over.
  const lead = packets[0];
  const flowing = lead ? Math.min(n - 1, Math.round((lead.x - xOf(0) - boxW / 2) / (boxW + ARROW))) : -1;
  const active = swept >= 0 ? swept : flowing;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
        {data.stages.slice(1).map((st, i) => {
          const p = appear(frame, beats[st.id], 12);
          const x0 = xOf(i) + boxW + 6;
          const x1 = xOf(i + 1) - 8;
          return (
            <g key={st.id} opacity={p}>
              <line x1={x0} y1={midY} x2={x0 + (x1 - x0) * p} y2={midY} stroke={color.accent} strokeWidth={4} strokeLinecap="round" />
              <polygon points={`${x1 - 12},${midY - 8} ${x1},${midY} ${x1 - 12},${midY + 8}`} fill={color.accent} />
            </g>
          );
        })}
      </svg>
      {data.stages.map((st, i) => {
        const p = appear(frame, beats[st.id], 14);
        return (
          <div
            key={st.id}
            style={{
              position: "absolute",
              left: xOf(i),
              top: TOP,
              width: boxW,
              height: HEIGHT,
              padding: "14px 14px",
              ...card(
                active === i
                  ? { background: color.mint, borderColor: color.accent, boxShadow: `5px 5px 0 ${color.accent}` }
                  : {},
              ),
              ...rise(p, 20),
              ...(active === i ? { transform: "translateY(-8px)" } : {}),
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 14 }}>{st.label}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {st.items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    fontSize: 17,
                    padding: "7px 10px",
                    borderRadius: 10,
                    background: color.surface2,
                    border: `1.5px solid ${color.lineSoft}`,
                    ...rise(appear(frame, beats[it.id], 12), 10),
                  }}
                >
                  {it.text}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {packets.map((pk, k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: pk.x - 9,
            top: midY - 9,
            width: 18,
            height: 18,
            borderRadius: 5,
            background: color.warn,
            border: `2px solid ${color.surface}`,
            transform: `rotate(${(frame * 6) % 360}deg)`,
          }}
        />
      ))}
      <Pointer targets={targets} />
    </div>
  );
};
