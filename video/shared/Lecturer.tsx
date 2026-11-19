import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { color, font } from "./theme";
import type { Cue, Pose } from "./types";

// MeoLearn as the lecturer: a larger mascot standing bottom-right that bobs while it is
// speaking, holds still between sentences, and "says" the subtitles in a speech bubble.
// Sprites are the cut ones from web/public/pet; motion is transform-only.

export const PET_WIDTH = 250;
export const PET_RIGHT = 26;
export const PET_BOTTOM = 14;
const PET_HEIGHT = PET_WIDTH * (327 / 376);

/** Where pointer lines start: roughly the pet's raised paw / chest, in 1280x720 space. */
export const POINTER_ORIGIN = { x: 1280 - PET_RIGHT - PET_WIDTH * 0.66, y: 720 - PET_BOTTOM - PET_HEIGHT * 0.3 };

const effect: Partial<Record<Pose, string>> = {
  curious: "question",
  happy: "note",
  angry: "anger",
  sleepy: "zzz",
};

export const Lecturer = ({ pose, cues, bubble = true }: { pose: Pose; cues: Cue[]; bubble?: boolean }) => {
  const frame = useCurrentFrame();
  const cue = cues.find((c) => frame >= c.from && frame < c.to);
  const speaking = Boolean(cue);

  // Talking: quick small bob and tilt; silent: slow breath. Blend over a few frames.
  const sinceStart = cue ? frame - cue.from : 0;
  const untilEnd = cue ? cue.to - frame : 0;
  const talk = speaking ? Math.min(1, sinceStart / 4, untilEnd / 4) : 0;
  const bob = Math.abs(Math.sin((frame / 30) * Math.PI * 4.2)) * 5 * talk;
  const tilt = Math.sin((frame / 30) * Math.PI * 2.1) * 1.6 * talk;
  const breath = Math.sin((frame / 30) * Math.PI * 0.8) * 0.016;
  const shake = pose === "angry" ? Math.sin(frame * 1.6) * 2.5 : 0;
  const fx = effect[pose];
  const fxFloat = Math.sin((frame / 30) * Math.PI * 1.2) * 5;

  return (
    <>
      {cue && bubble && <SpeechBubble text={cue.text} from={cue.from} frame={frame} />}
      <div style={{ position: "absolute", right: PET_RIGHT, bottom: PET_BOTTOM, width: PET_WIDTH, height: PET_HEIGHT }}>
        <div
          style={{
            position: "absolute",
            left: "12%",
            right: "12%",
            bottom: -4,
            height: 16,
            borderRadius: "50%",
            background: "rgba(35, 74, 38, 0.13)",
            transform: `scaleX(${1 - bob / 40})`,
          }}
        />
        <Img
          src={staticFile(`pet/${pose}.webp`)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            transformOrigin: "50% 100%",
            transform: `translate(${shake}px, ${-bob}px) rotate(${tilt}deg) scale(${1 + breath}, ${1 - breath})`,
          }}
        />
        {fx && (
          <Img
            src={staticFile(`pet/fx-${fx}.webp`)}
            style={{ position: "absolute", right: -4, top: -12 + fxFloat, width: PET_WIDTH * 0.22 }}
          />
        )}
      </div>
    </>
  );
};

// The bubble sits beside the pet's face (its mouth is ~45% down the sprite), growing upward
// for longer lines, with the tail pointing at the mouth.
const MOUTH_FROM_BOTTOM = PET_BOTTOM + PET_HEIGHT * 0.55;

const SpeechBubble = ({ text, from, frame }: { text: string; from: number; frame: number }) => {
  const pop = interpolate(frame - from, [0, 6], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        right: PET_RIGHT + PET_WIDTH - 22,
        bottom: MOUTH_FROM_BOTTOM - 22,
        maxWidth: 760,
        padding: "9px 16px",
        background: color.surface,
        border: `2.5px solid ${color.ink}`,
        borderRadius: 16,
        boxShadow: `3px 3px 0 ${color.ink}`,
        fontFamily: font.body,
        fontSize: 21,
        lineHeight: 1.35,
        color: color.ink,
        transformOrigin: "100% 100%",
        transform: `scale(${pop})`,
      }}
    >
      {text}
      <svg width={26} height={20} style={{ position: "absolute", right: -22, bottom: 10 }} viewBox="0 0 26 20">
        <path d="M0 2 L24 12 L0 16 Z" fill={color.surface} stroke={color.ink} strokeWidth={2.5} strokeLinejoin="round" />
        <rect x={-3} y={3.5} width={4} height={11} fill={color.surface} />
      </svg>
    </div>
  );
};
