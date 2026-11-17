import { useState } from "react";
import { chapters, questions, reviewReasonLabel } from "../../data";

export const AuditPage = () => {
  const flagged = questions.filter((q) => q.needsReview);
  const reasons = [...new Set(flagged.map(reviewReasonLabel))];
  const [filter, setFilter] = useState<string>("all");
  const shown = filter === "all" ? flagged : flagged.filter((q) => reviewReasonLabel(q) === filter);

  return (
    <div>
      <section className="intro">
        <h1>Cần kiểm tra</h1>
        <p>
          {flagged.length} câu chưa có đáp án chính thức. Đáp án hiện tại do AI giải, lấy theo bình luận trên
          fuexam, hoặc các nguồn đang cho đáp án khác nhau. Hãy đối chiếu rồi sửa trong{" "}
          <code>web/data/questions.json</code> nếu thấy sai.
        </p>
        <div className="chips" role="group" aria-label="Lọc theo lý do">
          <button className={`chip ${filter === "all" ? "chip-on" : ""}`} onClick={() => setFilter("all")}>
            Tất cả ({flagged.length})
          </button>
          {reasons.map((r) => (
            <button key={r} className={`chip ${filter === r ? "chip-on" : ""}`} onClick={() => setFilter(r)}>
              {r} ({flagged.filter((q) => reviewReasonLabel(q) === r).length})
            </button>
          ))}
        </div>
      </section>

      <ol className="audit-list">
        {shown.map((q) => (
          <li key={q.id} className="card">
            <div className="card-meta">
              <span className="muted small">
                {q.id} · {q.sources.join(", ")} · Chương {q.chapterId}{" "}
                {chapters.find((c) => c.id === q.chapterId)?.title}
              </span>
              <span className="badge-warn">⚠ {reviewReasonLabel(q)}</span>
            </div>
            <p className="q-text">{q.question}</p>
            {q.code && <pre className="code-block">{q.code}</pre>}
            <ul className="options static">
              {q.options.map((o) => (
                <li key={o.key} className={`option ${q.answer.includes(o.key) ? "option-right" : "option-dim"}`}>
                  <span className="option-key">{o.key}</span>
                  <span className="option-text">{o.text}</span>
                </li>
              ))}
            </ul>
            <p className="explanation">{q.explanation}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};
