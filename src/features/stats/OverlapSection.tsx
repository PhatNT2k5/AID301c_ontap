import { useState } from "react";
import { QuestionCompact } from "../lookup/LookupPage";
import type { OverlapStats } from "./sourceStats";

const PAGE = 10;
const share = (part: number, whole: number): string => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");

/** How much of the FPT exams the Quizlet sets already cover, for the selected scope. */
export const OverlapSection = ({ data, scopeLabel }: { data: OverlapStats; scopeLabel: string }) => {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const both = data.both.length;
  const total = data.examOnly + both + data.quizletOnly;
  // Three groups of distinct questions; segments carry their own count where they fit.
  const groups = [
    { key: "exam", label: "Chỉ có trong đề FPT", count: data.examOnly, cls: "ov-exam" },
    { key: "both", label: "Vừa trong Quizlet vừa ra đề", count: both, cls: "ov-both" },
    { key: "quizlet", label: "Chỉ có trong Quizlet", count: data.quizletOnly, cls: "ov-quizlet" },
  ].filter((g) => g.count > 0);

  return (
    <section className="window overlap">
      <div className="window-bar" aria-hidden>
        <span>quizlet_vs_de_thi.stats</span>
        <i />
        <i />
        <i />
      </div>
      <div className="overlap-body">
        <h2 className="stats-title">Quizlet có trùng với đề thi không?</h2>
        <p className="overlap-lead">
          {data.quizletDistinct > 0 ? (
            <>
              {both > 0 ? "Có." : "Không."} Trong <b>{data.quizletDistinct}</b> câu Quizlet ({scopeLabel}), <b>{both}</b> câu đã ra trong ít nhất
              một đề FPT ({share(both, data.quizletDistinct)}).
            </>
          ) : (
            <>Phạm vi này không có câu Quizlet nào.</>
          )}
        </p>

        <h3 className="overlap-h">{total} câu chia thành 3 nhóm</h3>
        <div className="ov-bar" role="img" aria-label={groups.map((g) => `${g.label}: ${g.count} câu`).join(", ")}>
          {groups.map((g) => (
            <span key={g.key} className={`ov-seg ${g.cls}`} style={{ flexGrow: g.count }} title={`${g.label}: ${g.count} câu`}>
              {g.count / total >= 0.08 ? g.count : ""}
            </span>
          ))}
        </div>
        <ul className="src-legend">
          {groups.map((g) => (
            <li key={g.key}>
              <span className={`swatch ${g.cls}`} aria-hidden />
              {g.label} · {g.count}
            </li>
          ))}
        </ul>

        <h3 className="overlap-h">Mỗi đề FPT có bao nhiêu câu nằm sẵn trong Quizlet</h3>
        <ul className="meter-list">
          {data.perExam.map((e) => (
            <li key={e.id}>
              <span className="meter-name">{e.id}</span>
              <span className="meter" aria-hidden>
                <span style={{ width: share(e.inQuizlet, e.total) }} />
              </span>
              <span className="meter-figure">
                <b>{e.inQuizlet}</b>/{e.total} câu · {share(e.inQuizlet, e.total)}
              </span>
            </li>
          ))}
        </ul>

        <p className="muted small overlap-note">
          Quizlet 1 ({data.quizlet1} câu) và Quizlet 2 ({data.quizlet2} câu) trùng nhau {data.quizletShared} câu, nên gộp
          lại chỉ còn {data.quizletDistinct} câu khác nhau. Nắm chắc bộ Quizlet là đã gặp trước khoảng{" "}
          {share(
            data.perExam.reduce((s, e) => s + e.inQuizlet, 0),
            data.perExam.reduce((s, e) => s + e.total, 0),
          )}{" "}
          số câu trong các đề FPT.
        </p>

        {both > 0 && (
          <button className="btn btn-primary" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? "Ẩn danh sách" : `Xem ${both} câu vừa trong Quizlet vừa ra đề`}
          </button>
        )}
      </div>

      {open && (
        <div className="overlap-list">
          <div className="card-list">
            {data.both.slice(0, limit).map((q) => (
              <QuestionCompact key={q.id} question={q} />
            ))}
          </div>
          {limit < both && (
            <button className="btn" onClick={() => setLimit((n) => n + PAGE)}>
              Xem thêm ({both - limit} câu)
            </button>
          )}
        </div>
      )}
    </section>
  );
};
