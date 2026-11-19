import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color } from "../theme";
import type { IntroData } from "../types";
import { Badge, rise } from "./ui";

const Y = 360;
const X0 = 110;
const X1 = 930;

/** Chapter opener: course label, then a road with one stop per section of the chapter. */
export const Intro = ({ data, beats }: { data: IntroData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const n = data.stops.length;
  const xOf = (i: number) => (n === 1 ? (X0 + X1) / 2 : X0 + ((X1 - X0) * i) / (n - 1));
  const lastShown = data.stops.reduce((acc, s, i) => (beats[s.id] !== undefined && frame >= beats[s.id] ? i : acc), -1);
  // The road starts drawing soon after the course label even if its own cue comes later,
  // so the opener never sits still for long while the greeting is spoken.
  const roadAt = beats.road === undefined ? undefined : Math.min(beats.road, (beats.course ?? beats.road) + 45);
  const road = appear(frame, roadAt, 40);
  const targets: PointerTarget[] = data.stops
    .map((s, i) => ({ x: xOf(i), y: Y + 18, at: beats[s.id] }))
    .filter((t): t is PointerTarget => t.at !== undefined);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 52,
          top: 270,
          fontSize: 24,
          fontWeight: 600,
          color: color.ink,
          padding: "6px 18px",
          borderRadius: 999,
          background: color.surface2,
          border: `2px solid ${color.lineSoft}`,
          ...rise(appear(frame, beats.course)),
        }}
      >
        {data.course}
      </div>
      <div
        style={{
          position: "absolute",
          left: 52,
          top: 178,
          fontSize: 72,
          fontWeight: 600,
          color: color.accent,
          lineHeight: 1,
          ...rise(appear(frame, beats.chapter ?? 0)),
        }}
      >
        Chương {data.chapterNo}
      </div>
      <svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} y1={Y} x2={X0 + (X1 - X0) * road} y2={Y} stroke={color.lineSoft} strokeWidth={6} strokeLinecap="round" />
        {lastShown > 0 && (
          <line x1={X0} y1={Y} x2={xOf(lastShown)} y2={Y} stroke={color.accent} strokeWidth={6} strokeLinecap="round" />
        )}
      </svg>
      {data.stops.map((stop, i) => {
        const p = appear(frame, beats[stop.id], 14);
        return (
          <div
            key={stop.id}
            style={{
              position: "absolute",
              left: xOf(i) - 90,
              top: Y - 24,
              width: 180,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: p,
              transform: `scale(${0.7 + p * 0.3})`,
            }}
          >
            <Badge size={48} fill={i <= lastShown ? color.ink : color.surface} ink={i <= lastShown ? color.paper : color.ink}>
              {i + 1}
            </Badge>
            <span style={{ fontSize: 20, fontWeight: 600, textAlign: "center", lineHeight: 1.25 }}>{stop.label}</span>
          </div>
        );
      })}
      <Pointer targets={targets} />
    </div>
  );
};
