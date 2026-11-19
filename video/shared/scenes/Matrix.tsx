import { interpolate, useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color, font } from "../theme";
import type { MatrixData } from "../types";
import { card, rise, sweep } from "./ui";

const CELL = 58;
const LEFT = 80;
const TOP = 170;

/** A mostly-zero matrix: zeros fade out on "fade", then each non-zero is written down as a
 * (row, col, value) triple in the COO list on the right. */
export const Matrix = ({ data, beats }: { data: MatrixData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const grid = appear(frame, beats.grid ?? 0, 16);
  const fade = beats.fade === undefined ? 0 : interpolate(frame, [beats.fade, beats.fade + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cols = data.rows[0]?.length ?? 0;
  const listLeft = LEFT + cols * CELL + 90;
  const listIn = appear(frame, beats.list, 14);
  const active = data.triples[sweep(frame, beats, data.triples.length)];

  const targets: PointerTarget[] = data.triples
    .map((t, k) => ({ x: listLeft + 250, y: TOP + 74 + k * 50, at: beats[t.id] }))
    .filter((t): t is PointerTarget => t.at !== undefined);
  if (beats.fade !== undefined) targets.push({ x: LEFT + (cols * CELL) / 2, y: TOP + data.rows.length * CELL + 10, at: beats.fade });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: LEFT, top: TOP, opacity: grid }}>
        {data.rows.map((row, r) =>
          row.map((v, c) => {
            const zero = v === 0;
            const picked = data.triples.find((t) => t.r === r && t.c === c);
            const pickedOn = picked && beats[picked.id] !== undefined && frame >= beats[picked.id];
            const swept = active !== undefined && active.r === r && active.c === c;
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  position: "absolute",
                  left: c * CELL,
                  top: r * CELL,
                  width: CELL - 6,
                  height: CELL - 6,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: font.mono,
                  fontSize: 24,
                  borderRadius: 10,
                  border: `2px solid ${swept ? color.accent : zero ? color.lineSoft : color.ink}`,
                  background: swept ? color.accent : pickedOn ? color.warnBg : zero ? color.surface : color.mint,
                  color: swept ? color.surface : zero ? color.muted : color.ink,
                  opacity: zero ? 1 - fade * 0.82 : 1,
                  transform: swept ? "scale(1.14)" : !zero && fade > 0 ? `scale(${1 + fade * 0.06})` : undefined,
                }}
              >
                {v}
              </div>
            );
          }),
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: listLeft,
          top: TOP,
          width: 300,
          padding: "14px 18px",
          ...card(),
          ...rise(listIn, 16),
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>(hàng, cột, giá trị)</div>
        {data.triples.map((t) => (
          <div
            key={t.id}
            style={{
              fontFamily: font.mono,
              fontSize: 24,
              lineHeight: "50px",
              borderRadius: 10,
              padding: "0 8px",
              margin: "0 -8px",
              ...rise(appear(frame, beats[t.id], 10), 8),
              ...(active === t ? { background: color.accent, color: color.surface } : {}),
            }}
          >
            ({t.r}, {t.c}, {data.rows[t.r][t.c]})
          </div>
        ))}
      </div>
      {data.note && (
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: TOP + data.rows.length * CELL + 26,
            fontSize: 24,
            fontWeight: 600,
            color: color.accent,
            ...rise(appear(frame, beats[data.note.id], 14)),
          }}
        >
          {data.note.text}
        </div>
      )}
      <Pointer targets={targets} />
    </div>
  );
};
