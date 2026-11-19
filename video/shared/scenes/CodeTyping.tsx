import { interpolate, useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color, font } from "../theme";
import type { CodeData } from "../types";
import { sweep } from "./ui";

const FRAMES_PER_CHAR = 0.9;

/** Renders typed text, highlighting marked substrings once their beat has passed. */
const Marked = ({
  text,
  marks,
  beats,
  frame,
}: {
  text: string;
  marks: { text: string; beat: string }[];
  beats: Record<string, number>;
  frame: number;
}) => {
  const live = marks.filter((m) => beats[m.beat] !== undefined && frame >= beats[m.beat] && text.includes(m.text));
  if (live.length === 0) return <>{text}</>;
  const parts: { text: string; on: boolean }[] = [];
  let rest = text;
  for (const m of live) {
    const at = rest.indexOf(m.text);
    if (at < 0) continue;
    parts.push({ text: rest.slice(0, at), on: false }, { text: m.text, on: true });
    rest = rest.slice(at + m.text.length);
  }
  parts.push({ text: rest, on: false });
  return (
    <>
      {parts.map((p, i) =>
        p.on ? (
          <span key={i} style={{ background: color.mint, color: color.codeBg, borderRadius: 4, padding: "1px 2px" }}>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
};
const MAX_TYPE_FRAMES = 42;

/** Code typed line by line on its beats, current line highlighted, with the matching
 * pipeline stage lighting up on the right. */
export const CodeTyping = ({ data, beats }: { data: CodeData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();

  // A line without its own beat is typed right after the previous one.
  const starts: number[] = [];
  data.lines.forEach((line, i) => {
    const own = line.beat !== undefined ? beats[line.beat] : undefined;
    const prev = i === 0 ? 0 : starts[i - 1] + Math.min(data.lines[i - 1].text.length * FRAMES_PER_CHAR, MAX_TYPE_FRAMES);
    starts.push(own ?? prev);
  });
  const current = starts.reduce((acc, s, i) => (frame >= s ? i : acc), -1);
  const activeStage = data.stages.reduce((acc, st, i) => {
    const on = beats[`on_${st.id}`];
    return on !== undefined && frame >= on ? i : acc;
  }, -1);
  const swept = sweep(frame, beats, data.stages.length);

  // Geometry of the code panel (JetBrains Mono 19px is ~11.4px per character).
  const lineY = (i: number) => 170 + 2.5 + 18 + i * 34 + 17;
  const textX = (col: number) => 56 + 2.5 + 18 + 34 + 18 + col * 11.4;
  const targets: PointerTarget[] = [];
  data.lines.forEach((line, i) => {
    if (line.beat && beats[line.beat] !== undefined) targets.push({ x: textX(Math.min(line.text.length, 12)), y: lineY(i) + 12, at: beats[line.beat] });
    for (const m of line.marks ?? []) {
      const col = line.text.indexOf(m.text);
      if (col >= 0 && beats[m.beat] !== undefined) targets.push({ x: textX(col + m.text.length / 2), y: lineY(i) + 14, at: beats[m.beat] });
    }
  });
  data.stages.forEach((st, i) => {
    const y = 176 + i * (76 + 16) + 38;
    for (const id of [st.id, `on_${st.id}`]) if (beats[id] !== undefined) targets.push({ x: 1096, y, at: beats[id] });
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 170,
          width: 700,
          padding: "18px 0",
          background: color.codeBg,
          border: `2.5px solid ${color.ink}`,
          borderRadius: 16,
          boxShadow: `4px 4px 0 ${color.ink}`,
          fontFamily: font.mono,
          fontSize: 19,
          lineHeight: "34px",
          color: color.codeInk,
        }}
      >
        {data.lines.map((line, i) => {
          const len = line.text.length;
          const typeFrames = Math.min(len * FRAMES_PER_CHAR, MAX_TYPE_FRAMES);
          const chars =
            len === 0
              ? 0
              : Math.round(
                  interpolate(frame, [starts[i], starts[i] + typeFrames], [0, len], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                );
          const typing = frame >= starts[i] && chars < len;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                padding: "0 18px",
                background: i === current ? "rgba(185, 226, 192, 0.16)" : "transparent",
                minHeight: 34,
              }}
            >
              <span style={{ width: 34, color: "#7f9c7a", textAlign: "right", marginRight: 18 }}>{i + 1}</span>
              <span style={{ whiteSpace: "pre" }}>
                <Marked text={line.text.slice(0, chars)} marks={line.marks ?? []} beats={beats} frame={frame} />
                {typing && <span style={{ background: color.mint, color: color.codeBg }}> </span>}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 800, top: 176, width: 300, display: "grid", gap: 16 }}>
        {data.stages.map((st, i) => {
          const p = appear(frame, beats[st.id], 12);
          const on = swept >= 0 ? i === swept : i === activeStage;
          const done = i < activeStage;
          return (
            <div
              key={st.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 14px",
                background: on ? color.mint : color.surface,
                border: `2.5px solid ${p > 0 ? color.ink : color.lineSoft}`,
                borderRadius: 14,
                boxShadow: on ? `3px 3px 0 ${color.ink}` : "none",
                opacity: 0.35 + p * 0.65,
                transform: `translateX(${(1 - p) * 20}px)`,
              }}
            >
              <span
                style={{
                  width: 46,
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  border: `2.5px solid ${color.ink}`,
                  background: done || on ? color.ink : color.surface,
                  color: done || on ? color.paper : color.ink,
                  fontSize: 24,
                  fontWeight: 600,
                  flex: "none",
                }}
              >
                {st.label[0]}
              </span>
              <span>
                <span style={{ display: "block", fontSize: 24, fontWeight: 600 }}>{st.label}</span>
                <span style={{ display: "block", fontSize: 15, color: color.muted, fontFamily: font.mono }}>{st.hint}</span>
              </span>
            </div>
          );
        })}
      </div>
      <Pointer targets={targets} />
    </div>
  );
};
