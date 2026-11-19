import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { appear, color, font } from "./theme";


/** Shared layout: dotted paper, small section label, one headline (≤ 8 words) and the visual.
 * The lecturer and its speech bubble are drawn above all scenes in Chapter. */
export const Frame = ({
  section,
  headline,
  children,
}: {
  section: string;
  headline?: string;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const head = appear(frame, 0, 16);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color.paper,
        backgroundImage: `radial-gradient(${color.dot} 1.3px, transparent 1.5px)`,
        backgroundSize: "12px 12px",
        fontFamily: font.body,
        color: color.ink,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 34,
          fontSize: 20,
          fontWeight: 600,
          color: color.accent,
          letterSpacing: "0.01em",
        }}
      >
        {section}
      </div>
      {headline && (
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 66,
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            opacity: head,
            transform: `translateY(${(1 - head) * 14}px)`,
          }}
        >
          {headline}
        </div>
      )}
      <AbsoluteFill>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
