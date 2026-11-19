import { useCurrentFrame } from "remotion";
import { Pointer, type PointerTarget } from "../Pointer";
import { appear, color, font, shown } from "../theme";
import type { QuizData } from "../types";

/** Exam question in its original English: options appear as they are read, a 3-second
 * countdown ring, then the answer is revealed with a one-line explanation. */
export const Quiz = ({ data, beats }: { data: QuizData; beats: Record<string, number> }) => {
  const frame = useCurrentFrame();
  const q = appear(frame, beats.question ?? 0, 16);
  const revealed = shown(frame, beats.reveal);
  const countAt = beats.count;
  const counting = countAt !== undefined && frame >= countAt && !revealed;
  const secondsLeft = counting ? 3 - Math.floor((frame - countAt) / 30) : 0;
  const ring = counting ? ((frame - countAt) % 30) / 30 : 0;

  // Approximate layout: question wraps at ~48 chars per line (34px), options are a 2-column grid.
  // Five or six options take three rows; a compact layout keeps the explanation on screen.
  const compact = data.options.length > 4;
  const L = compact
    ? { qSize: 28, qChars: 58, qLine: 36, gap: 18, optH: 60, optGap: 12, optSize: 19, optPad: "9px 14px", explainSize: 20 }
    : { qSize: 34, qChars: 48, qLine: 44, gap: 26, optH: 74, optGap: 16, optSize: 22, optPad: "14px 16px", explainSize: 22 };
  const qLines = Math.max(1, Math.ceil(data.question.length / L.qChars));
  const gridTop = 74 + qLines * L.qLine + L.gap;
  const optionCenter = (idx: number) => ({
    x: 56 + (idx % 2) * 450 + 380,
    y: gridTop + Math.floor(idx / 2) * (L.optH + L.optGap) + L.optH / 2,
  });
  const targets: PointerTarget[] = [];
  data.options.forEach((opt, idx) => {
    const at = beats[`opt_${opt.key}`];
    if (at !== undefined) targets.push({ ...optionCenter(idx), at });
  });
  // While an option is read aloud, a bar sweeps under it until the next option (or the countdown).
  const readEnd = (key: string): number => {
    const at = beats[`opt_${key}`];
    const later = data.options.map((o) => beats[`opt_${o.key}`]).filter((t) => t !== undefined && t > at);
    return later.length ? Math.min(...later) : (beats.count ?? at + 60);
  };
  const answerIdx = data.options.findIndex((o) => data.answer.includes(o.key));
  if (beats.reveal !== undefined && answerIdx >= 0) targets.push({ ...optionCenter(answerIdx), at: beats.reveal });

  return (
    <>
    <div style={{ position: "absolute", left: 56, top: 74, width: 900, display: "flex", flexDirection: "column", gap: L.gap }}>
      <div
        style={{
          fontSize: L.qSize,
          fontWeight: 600,
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
          position: "relative",
          paddingBottom: 10,
          opacity: q,
          transform: `translateY(${(1 - q) * 12}px)`,
        }}
      >
        {beats.question_end !== undefined && frame < beats.question_end ? (
          <Karaoke text={data.question} from={beats.question} to={beats.question_end} frame={frame} dim={1} />
        ) : (
          data.question
        )}
        {beats.question_end !== undefined && frame < beats.question_end + 10 && (
          <span
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 5,
              borderRadius: 3,
              background: color.accent,
              width: `${Math.min(1, Math.max(0, (frame - beats.question) / Math.max(beats.question_end - beats.question, 1))) * 100}%`,
            }}
          />
        )}
        {data.multi && (
          <span
            style={{
              marginLeft: 12,
              fontSize: 20,
              padding: "2px 12px",
              borderRadius: 999,
              background: color.warnBg,
              color: color.warn,
              border: `2px solid ${color.warn}`,
              verticalAlign: "middle",
            }}
          >
            Chọn {data.answer.length} đáp án
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: L.optGap,
        }}
      >
        {data.options.map((opt) => {
          const p = appear(frame, beats[`opt_${opt.key}`], 12);
          const right = data.answer.includes(opt.key);
          const bg = revealed ? (right ? color.rightBg : color.surface) : color.surface;
          const border = revealed ? (right ? color.right : color.lineSoft) : color.ink;
          const start = beats[`opt_${opt.key}`];
          const end = start === undefined ? 0 : readEnd(opt.key);
          const reading = start !== undefined && frame >= start && frame < end + 10 && !revealed;
          const pulse = revealed && right ? 0.008 * Math.sin(((frame - beats.reveal) / 30) * Math.PI * 1.4) : 0;
          const sweep = reading ? Math.min(1, (frame - start) / Math.max(end - start, 1)) : 0;
          return (
            <div
              key={opt.key}
              style={{
                position: "relative",
                overflow: "hidden",
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: L.optPad,
                minHeight: L.optH,
                background: bg,
                border: `2.5px solid ${border}`,
                borderRadius: 14,
                boxShadow: revealed && right ? `3px 3px 0 ${color.right}` : "none",
                opacity: p * (revealed && !right ? 0.45 : 1),
                transform: `translateY(${(1 - p) * 14}px) scale(${revealed && right ? 1.012 + pulse : 1})`,
              }}
            >
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: 40,
                  height: 40,
                  flex: "none",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  border: `2.5px solid ${revealed && right ? color.right : color.ink}`,
                  background: revealed && right ? color.right : color.surface,
                  color: revealed && right ? color.surface : color.ink,
                  fontWeight: 600,
                  fontSize: 20,
                }}
              >
                {opt.key}
              </span>
              <span style={{ fontSize: L.optSize, lineHeight: 1.3, position: "relative", zIndex: 1 }}>
                {reading ? <Karaoke text={opt.text} from={start} to={end} frame={frame} dim={1} /> : opt.text}
              </span>
              {reading && (
                <span style={{ position: "absolute", left: 0, bottom: 0, height: 5, width: `${sweep * 100}%`, background: color.accent }} />
              )}
            </div>
          );
        })}
      </div>

      {counting && (
        <svg width={150} height={150} style={{ position: "absolute", left: 985, top: 150 }}>
          <circle cx={75} cy={75} r={58} fill={color.surface} stroke={color.lineSoft} strokeWidth={8} />
          <circle
            cx={75}
            cy={75}
            r={58}
            fill="none"
            stroke={color.accent}
            strokeWidth={8}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={ring}
            transform="rotate(-90 75 75)"
          />
          <text x={75} y={92} textAnchor="middle" fontSize={52} fontWeight={600} fill={color.ink} fontFamily={font.body}>
            {secondsLeft}
          </text>
        </svg>
      )}

      {revealed && (
        <div
          style={{
            padding: "14px 18px",
            background: color.surface,
            border: `2.5px solid ${color.right}`,
            borderRadius: 14,
            fontSize: L.explainSize,
            lineHeight: 1.4,
            opacity: appear(frame, beats.reveal, 12),
          }}
        >
          <span style={{ color: color.right, fontWeight: 600, marginRight: 10 }}>Đáp án {data.answer.join(", ")}.</span>
          <Karaoke text={data.explain} from={beats.explain ?? beats.reveal} to={beats.explain_end ?? beats.reveal + 1} frame={frame} dim={0.25} />
        </div>
      )}
    </div>
    <Pointer targets={targets} />
    </>
  );
};

/** Karaoke reading: the word being spoken gets a solid highlight (roughly following the voice,
 * by word count); words not reached yet are shown at `dim` opacity. */
const Karaoke = ({ text, from, to, frame, dim }: { text: string; from: number; to: number; frame: number; dim: number }) => {
  const words = text.split(" ");
  const progress = (frame - from) / Math.max(to - from, 1);
  const current = progress >= 0 && progress < 1 ? Math.floor(progress * words.length) : -1;
  const reached = progress >= 1 ? words.length : Math.max(current, 0);
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span
            style={{
              opacity: i <= reached ? 1 : dim,
              borderRadius: 6,
              padding: "0 3px",
              margin: "0 -3px",
              ...(i === current ? { background: color.accent, color: color.surface } : {}),
            }}
          >
            {w}
          </span>{" "}
        </span>
      ))}
    </>
  );
};
