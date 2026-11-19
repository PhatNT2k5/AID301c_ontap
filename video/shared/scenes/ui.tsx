import type { CSSProperties, ReactNode } from "react";
import { color } from "../theme";

// Small building blocks shared by scenes: the hand-drawn card and the round badge.

export const card = (extra: CSSProperties = {}): CSSProperties => ({
  background: color.surface,
  border: `2.5px solid ${color.ink}`,
  borderRadius: 16,
  boxShadow: `3px 3px 0 ${color.ink}`,
  ...extra,
});

export const Badge = ({
  children,
  size = 44,
  fill = color.surface,
  ink = color.ink,
  border = color.ink,
}: {
  children: ReactNode;
  size?: number;
  fill?: string;
  ink?: string;
  border?: string;
}) => (
  <span
    style={{
      width: size,
      height: size,
      flex: "none",
      display: "grid",
      placeItems: "center",
      borderRadius: "50%",
      border: `2.5px solid ${border}`,
      background: fill,
      color: ink,
      fontWeight: 600,
      fontSize: size * 0.48,
    }}
  >
    {children}
  </span>
);

/** Review sweep for the tail of a scene: once every beat has played, the narration often keeps
 * summarising for several seconds. Highlighting the items one by one keeps the picture moving
 * (no freeze) and points back at what is being summarised. Returns the active index, or -1. */
export const sweep = (frame: number, beats: Record<string, number>, count: number, period = 40): number => {
  const times = Object.values(beats);
  if (count === 0 || times.length === 0) return -1;
  const start = Math.max(...times) + 36;
  return frame < start ? -1 : Math.floor((frame - start) / period) % count;
};

/** Fade + rise style for an element whose appear progress is `p` (0..1). */
export const rise = (p: number, dist = 14): CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * dist}px)`,
});
