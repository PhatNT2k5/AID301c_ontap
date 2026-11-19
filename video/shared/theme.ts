import { Easing, interpolate } from "remotion";

// Colors mirror the light theme tokens in web/src/index.css.
export const color = {
  paper: "#edf4dc",
  dot: "rgba(70, 120, 60, 0.2)",
  surface: "#f9fcf1",
  surface2: "#e2efcd",
  ink: "#234a26",
  inkSoft: "#3f6a3b",
  muted: "#677f5d",
  lineSoft: "#c2d7a7",
  accent: "#3b8a4a",
  mint: "#b9e2c0",
  right: "#2a7a3b",
  rightBg: "#d3eecf",
  wrong: "#b5443c",
  wrongBg: "#f6ddd5",
  warn: "#7d6110",
  warnBg: "#f2e8b5",
  codeBg: "#1f3322",
  codeInk: "#e4f1dc",
} as const;

export const font = {
  body: '"Be Vietnam Pro", "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", Consolas, monospace',
} as const;

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** 0 → 1 over `len` frames starting at `at` (eased). Before `at` it is 0. */
export const appear = (frame: number, at: number | undefined, len = 14): number =>
  at === undefined
    ? 0
    : interpolate(frame, [at, at + len], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const shown = (frame: number, at: number | undefined): boolean => at !== undefined && frame >= at;
