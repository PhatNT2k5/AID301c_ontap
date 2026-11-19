import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color } from "../theme";
import type { CompareData, CompareSide } from "../types";
import { Badge, card, rise, sweep } from "./ui";

const TOP = 160;
const COL_W = 450;
const GAP = 30;

const toneColor = (tone: CompareSide["tone"]) =>
  tone === "good" ? color.right : tone === "bad" ? color.wrong : color.ink;

/** Two columns side by side (A vs B); items appear on their beats, then a verdict line. */
export const Compare = ({ data, beats }: { data: CompareData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const sides: [CompareSide, string][] = [
    [data.left, "left"],
    [data.right, "right"],
  ];
  const allItems = [...data.left.items, ...data.right.items];
  const activeId = allItems[sweep(frame, beats, allItems.length)]?.id;
  const targets: PointerTarget[] = [];
  sides.forEach(([side, key], col) => {
    const x = 56 + col * (COL_W + GAP);
    if (beats[key] !== undefined) targets.push({ x: x + COL_W / 2, y: TOP + 30, at: beats[key] });
    side.items.forEach((it, k) => {
      if (beats[it.id] !== undefined) targets.push({ x: x + COL_W - 30, y: TOP + 92 + k * 58, at: beats[it.id] });
    });
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {sides.map(([side, key], col) => {
        const p = appear(frame, beats[key], 14);
        const tone = toneColor(side.tone);
        return (
          <div
            key={key}
            style={{
              position: "absolute",
              left: 56 + col * (COL_W + GAP),
              top: TOP,
              width: COL_W,
              minHeight: 250,
              padding: "14px 18px 18px",
              ...card({ borderColor: tone, boxShadow: `3px 3px 0 ${tone}` }),
              ...rise(p, 20),
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 600, color: tone, marginBottom: 12 }}>{side.title}</div>
            <div style={{ display: "grid", gap: 12 }}>
              {side.items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    borderRadius: 12,
                    padding: "4px 8px",
                    margin: "-4px 0 -4px -8px",
                    ...rise(appear(frame, beats[it.id], 12), 10),
                    ...(activeId === it.id
                      ? { background: side.tone === "bad" ? color.wrongBg : side.tone === "good" ? color.rightBg : color.surface2, transform: "translateX(10px)" }
                      : {}),
                  }}
                >
                  <Badge size={32} fill={tone} ink={color.surface} border={tone}>
                    {side.tone === "bad" ? "✗" : side.tone === "good" ? "✓" : "•"}
                  </Badge>
                  <span style={{ fontSize: 20, lineHeight: 1.3 }}>{it.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {data.verdict && (
        <div
          style={{
            position: "absolute",
            left: 56,
            top: TOP + 280,
            width: COL_W * 2 + GAP,
            textAlign: "center",
            fontSize: 26,
            fontWeight: 600,
            color: color.accent,
            ...rise(appear(frame, beats[data.verdict.id], 14)),
          }}
        >
          {data.verdict.text}
        </div>
      )}
      <Pointer targets={targets} />
    </div>
  );
};
