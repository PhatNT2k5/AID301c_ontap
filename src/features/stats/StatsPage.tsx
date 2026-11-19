import { useMemo, useState, type MouseEvent } from "react";
import { questions } from "../../data";
import { OverlapSection } from "./OverlapSection";
import { chapterStats, overallStats, overlapFor, type ScopeStats, type SourceSlice } from "./sourceStats";

const pct = (share: number): string => `${Math.round(share * 100)}%`;

type Tip = { x: number; y: number; title: string; lines: string[] };

/** Tooltip positioned inside a `position: relative` chart box, drawn above the pointer. */
const Tooltip = ({ tip }: { tip: Tip | null }) =>
  tip ? (
    <div className="viz-tip" role="status" style={{ left: tip.x, top: tip.y }}>
      <strong>{tip.title}</strong>
      {tip.lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  ) : null;

const tipAt = (e: MouseEvent<Element>, title: string, lines: string[]): Tip => {
  const box = (e.currentTarget as Element).closest(".viz-box")?.getBoundingClientRect();
  return { x: e.clientX - (box?.left ?? 0), y: e.clientY - (box?.top ?? 0), title, lines };
};

const sliceLines = (s: SourceSlice, stats: ScopeStats): string[] => [
  `${s.count} câu · ${pct(s.share)} số lượt`,
  `${s.kind}`,
  `trên tổng ${stats.appearances} lượt`,
];

/* ---------- pie ---------- */

const R = 104;
const C = 120;

const point = (angle: number, r = R): [number, number] => [C + r * Math.sin(angle), C - r * Math.cos(angle)];

const arcPath = (a0: number, a1: number): string => {
  // A single full slice cannot be drawn as one arc; split it in two halves.
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return `${arcPath(0, Math.PI)} ${arcPath(Math.PI, Math.PI * 2)}`;
  const [x0, y0] = point(a0);
  const [x1, y1] = point(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${C} ${C} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
};

const Pie = ({
  stats,
  active,
  onActive,
}: {
  stats: ScopeStats;
  active: string | null;
  onActive: (id: string | null) => void;
}) => {
  const [tip, setTip] = useState<Tip | null>(null);
  let angle = 0;
  const arcs = stats.slices
    .filter((s) => s.count > 0)
    .map((s) => {
      const a0 = angle;
      angle += s.share * Math.PI * 2;
      return { s, a0, a1: angle };
    });

  return (
    <div className="viz-box pie-box">
      <svg viewBox="0 0 240 240" className="pie" role="img" aria-label="Biểu đồ tròn phân phối câu hỏi theo nguồn">
        {arcs.map(({ s, a0, a1 }) => {
          const mid = (a0 + a1) / 2;
          const lift = active === s.id ? 6 : 0;
          const [dx, dy] = [lift * Math.sin(mid), -lift * Math.cos(mid)];
          const [lx, ly] = point(mid, R * 0.64);
          return (
            <g
              key={s.id}
              transform={`translate(${dx} ${dy})`}
              className={active && active !== s.id ? "pie-dim" : undefined}
              onMouseMove={(e) => {
                onActive(s.id);
                setTip(tipAt(e, s.label, sliceLines(s, stats)));
              }}
              onMouseLeave={() => {
                onActive(null);
                setTip(null);
              }}
            >
              <path d={arcPath(a0, a1)} fill={`var(--src-${s.slot + 1})`} className="pie-slice" />
              {/* Direct % label only where the slice is wide enough to hold it. */}
              {s.share >= 0.07 && (
                <text x={lx} y={ly} className="pie-label" textAnchor="middle" dominantBaseline="central">
                  {pct(s.share)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
};

/** Legend that doubles as the table view: swatch, source, count, share. */
const Legend = ({
  stats,
  active,
  onActive,
}: {
  stats: ScopeStats;
  active: string | null;
  onActive: (id: string | null) => void;
}) => (
  <table className="src-table">
    <thead>
      <tr>
        <th scope="col">Nguồn</th>
        <th scope="col">Số câu</th>
        <th scope="col">Tỷ lệ</th>
      </tr>
    </thead>
    <tbody>
      {stats.slices.map((s) => (
        <tr
          key={s.id}
          className={active === s.id ? "src-row-on" : undefined}
          tabIndex={0}
          onMouseEnter={() => onActive(s.id)}
          onMouseLeave={() => onActive(null)}
          onFocus={() => onActive(s.id)}
          onBlur={() => onActive(null)}
        >
          <th scope="row">
            <span className="swatch" style={{ background: `var(--src-${s.slot + 1})` }} aria-hidden />
            <span className="src-name">
              {s.label}
              <small>{s.kind}</small>
            </span>
          </th>
          <td>{s.count}</td>
          <td>{pct(s.share)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* ---------- chapter comparison: one 100% bar per chapter on a shared axis ---------- */

const CompareBars = ({ active, onActive }: { active: string | null; onActive: (id: string | null) => void }) => {
  const [tip, setTip] = useState<Tip | null>(null);
  return (
    <div className="viz-box compare">
      {chapterStats.map(({ chapter, stats }) => (
        <div key={chapter.id} className="compare-row">
          <span className="compare-name">
            Ch{chapter.id}
            <small>{stats.questions} câu</small>
          </span>
          <div className="compare-bar" role="img" aria-label={`Chương ${chapter.id}: ${stats.slices.map((s) => `${s.label} ${pct(s.share)}`).join(", ")}`}>
            {stats.slices
              .filter((s) => s.count > 0)
              .map((s) => (
                <span
                  key={s.id}
                  className={`compare-seg ${active && active !== s.id ? "seg-dim" : ""}`}
                  style={{ flexGrow: s.count, background: `var(--src-${s.slot + 1})` }}
                  onMouseMove={(e) => {
                    onActive(s.id);
                    setTip(tipAt(e, `Chương ${chapter.id} · ${s.label}`, sliceLines(s, stats)));
                  }}
                  onMouseLeave={() => {
                    onActive(null);
                    setTip(null);
                  }}
                />
              ))}
          </div>
        </div>
      ))}
      <div className="compare-axis" aria-hidden>
        <span />
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
};

/* ---------- page ---------- */

export const StatsPage = () => {
  const [scope, setScope] = useState(0); // 0 = all chapters
  const [active, setActive] = useState<string | null>(null);
  const current = scope === 0 ? overallStats : chapterStats.find((c) => c.chapter.id === scope)?.stats ?? overallStats;
  const chapter = chapterStats.find((c) => c.chapter.id === scope)?.chapter;
  const exams = current.slices.filter((s) => s.kind === "Đề FPT");
  const most = Math.max(...exams.map((s) => s.count));
  const leaders = exams.filter((s) => s.count === most);
  const overlap = useMemo(() => overlapFor(scope === 0 ? questions : questions.filter((q) => q.chapterId === scope)), [scope]);

  return (
    <div className="wide stats">
      <header className="page-head">
        <h1>Câu hỏi đến từ đâu</h1>
        <p className="lead">
          Mỗi câu trong bộ ôn được gom từ 4 đề thi FPT và 2 bộ Quizlet. Biểu đồ đếm số lượt xuất hiện: một câu có mặt ở
          cả đề SU26 FE và Quizlet 1 được tính cho cả hai nguồn.
        </p>
      </header>

      <div className="chips" role="group" aria-label="Chọn phạm vi">
        <button className={`chip ${scope === 0 ? "chip-on" : ""}`} aria-pressed={scope === 0} onClick={() => setScope(0)}>
          Cả 6 chương
        </button>
        {chapterStats.map(({ chapter: c }) => (
          <button
            key={c.id}
            className={`chip ${scope === c.id ? "chip-on" : ""}`}
            aria-pressed={scope === c.id}
            onClick={() => setScope(c.id)}
            title={c.title}
          >
            Chương {c.id}
          </button>
        ))}
      </div>

      <section className="window stats-main">
        <div className="window-bar" aria-hidden>
          <span>{chapter ? `chuong_${chapter.id}` : "ca_6_chuong"}.stats</span>
          <i />
          <i />
          <i />
        </div>
        <div className="stats-body">
          <div>
            <h2 className="stats-title">{chapter ? `Chương ${chapter.id}: ${chapter.title}` : "Cả 6 chương"}</h2>
            <p className="stats-figures">
              <span>
                <b>{current.questions}</b> câu
              </span>
              <span>
                <b>{current.appearances}</b> lượt xuất hiện
              </span>
              <span>
                <b>{current.repeated}</b> câu có ở 2 nguồn trở lên
              </span>
            </p>
            <Pie stats={current} active={active} onActive={setActive} />
          </div>
          <div>
            <Legend stats={current} active={active} onActive={setActive} />
            <p className="muted small stats-note">
              {leaders.length === exams.length
                ? `Bốn đề FPT góp bằng nhau (${most} câu mỗi đề); khác biệt nằm ở từng chương. `
                : `Trong 4 đề FPT, ${leaders.map((s) => s.label).join(" và ")} góp nhiều câu nhất cho phạm vi này (${most} câu${leaders.length > 1 ? " mỗi đề" : ""}). `}
              Câu có ở nhiều nguồn thường là câu hay lặp lại, nên ôn kỹ.
            </p>
          </div>
        </div>
      </section>

      <OverlapSection key={scope} data={overlap} scopeLabel={chapter ? `chương ${chapter.id}` : "cả 6 chương"} />

      <section className="stats-compare">
        <h2>So sánh 6 chương</h2>
        <p className="muted small">Mỗi thanh là 100% số lượt của một chương. Rê chuột hoặc chạm vào từng đoạn để xem số câu.</p>
        <ul className="src-legend" aria-label="Chú thích màu">
          {overallStats.slices.map((s) => (
            <li key={s.id}>
              <span className="swatch" style={{ background: `var(--src-${s.slot + 1})` }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <CompareBars active={active} onActive={setActive} />
      </section>
    </div>
  );
};
