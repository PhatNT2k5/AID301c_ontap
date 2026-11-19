import { interpolate, useCurrentFrame } from "remotion";
import { POINTER_ORIGIN } from "./Lecturer";
import { color, ease } from "./theme";

export type PointerTarget = { x: number; y: number; at: number };

const SHOW_FRAMES = 54;

/** The lecturer's "laser pointer": a dashed curve from the pet to whatever was just introduced.
 * Only the most recent target is shown, and it fades after ~1.8 s. */
export const Pointer = ({ targets }: { targets: PointerTarget[] }) => {
  const frame = useCurrentFrame();
  const current = targets.filter((t) => frame >= t.at).sort((a, b) => b.at - a.at)[0];
  if (!current) return null;
  const age = frame - current.at;
  if (age > SHOW_FRAMES) return null;

  const draw = interpolate(age, [0, 10], [0, 1], { easing: ease, extrapolateRight: "clamp" });
  const fade = interpolate(age, [SHOW_FRAMES - 12, SHOW_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { x: x0, y: y0 } = POINTER_ORIGIN;
  const { x: x1, y: y1 } = current;
  // Bow the curve upward so it reads as a gesture, not a connector.
  const cx = (x0 + x1) / 2;
  const cy = Math.min(y0, y1) - 70;
  const pulse = 1 + Math.sin(age * 0.45) * 0.18;

  return (
    <svg width={1280} height={720} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: fade }}>
      <path
        d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`}
        fill="none"
        stroke={color.warn}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="2 9"
        opacity={draw}
      />
      <circle cx={x1} cy={y1} r={9 * pulse * draw} fill="rgba(125, 97, 16, 0.25)" />
      <circle cx={x1} cy={y1} r={4.5 * draw} fill={color.warn} />
    </svg>
  );
};
