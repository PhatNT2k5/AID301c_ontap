import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color } from "../theme";
import type { MnemonicData } from "../types";
import { rise } from "./ui";

const TOP = 170;
const TILE = 112;

/** Memory hook: big letter tiles that unfold into words, then the phrase that ties them. */
export const Mnemonic = ({ data, beats }: { data: MnemonicData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const n = data.items.length;
  const gap = Math.min(40, (920 - n * TILE) / Math.max(n - 1, 1));
  const left = 56 + (920 - (n * TILE + (n - 1) * gap)) / 2;
  const xOf = (i: number) => left + i * (TILE + gap);
  const targets: PointerTarget[] = data.items
    .map((it, i) => ({ x: xOf(i) + TILE / 2, y: TOP + TILE + 24, at: beats[it.id] }))
    .filter((t): t is PointerTarget => t.at !== undefined);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {data.items.map((it, i) => {
        const letterIn = appear(frame, beats.letters ?? beats[it.id], 12 + i * 3);
        const word = appear(frame, beats[it.id], 14);
        const hi = Boolean(it.highlight) && word > 0;
        return (
          <div key={it.id} style={{ position: "absolute", left: xOf(i), top: TOP, width: TILE }}>
            <div
              style={{
                width: TILE,
                height: TILE,
                display: "grid",
                placeItems: "center",
                fontSize: 68,
                fontWeight: 600,
                borderRadius: 20,
                border: `3px solid ${color.ink}`,
                background: hi ? color.warnBg : word > 0 ? color.mint : color.surface,
                color: hi ? color.warn : color.ink,
                boxShadow: `4px 4px 0 ${color.ink}`,
                opacity: letterIn,
                transform: `scale(${0.6 + letterIn * 0.4}) rotate(${(1 - letterIn) * -8}deg)`,
              }}
            >
              {it.letter}
            </div>
            <div style={{ marginTop: 14, textAlign: "center", ...rise(word) }}>
              <div style={{ fontSize: 20, fontWeight: 600, whiteSpace: "nowrap" }}>{it.word}</div>
              {it.gloss && <div style={{ fontSize: 16, color: color.inkSoft, marginTop: 2 }}>{it.gloss}</div>}
            </div>
          </div>
        );
      })}
      {data.phrase && (
        <div
          style={{
            position: "absolute",
            left: 56,
            width: 920,
            top: TOP + TILE + 110,
            textAlign: "center",
            fontSize: 30,
            fontWeight: 600,
            color: color.accent,
            ...rise(appear(frame, beats.phrase, 16)),
          }}
        >
          “{data.phrase}”
        </div>
      )}
      <Pointer targets={targets} />
    </div>
  );
};
