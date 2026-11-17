import { useDeferredValue, useMemo, useState } from "react";
import { QuestionMeta } from "../../components/QuestionView";
import { chapters, questions, reviewReasonLabel } from "../../data";
import { fold } from "../../lib/text";
import { useStore } from "../../store";
import type { Question } from "../../types";

/** Read-only question card with the answer marked and a collapsible explanation. */
export const QuestionCompact = ({ question: q, note }: { question: Question; note?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <article className="card compact">
      {note && <p className="result-tag tag-wrong">{note}</p>}
      <QuestionMeta question={q} />
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
      <button className="link small" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? "Ẩn giải thích" : "Xem giải thích"}
      </button>
      {open && <p className="explanation">{q.explanation}</p>}
    </article>
  );
};

const index = questions.map((q) => ({
  q,
  text: fold([q.question, q.code ?? "", ...q.options.map((o) => o.text), q.explanation].join(" ")),
}));

type Filter = "all" | "review" | "starred" | "mistakes";
const PAGE = 20;

export const LookupPage = ({ initialFilter = "all" }: { initialFilter?: Filter }) => {
  const { notebook } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [chapterId, setChapterId] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [limit, setLimit] = useState(PAGE);
  const deferred = useDeferredValue(query);

  const flagged = questions.filter((q) => q.needsReview);
  const reasons = [...new Set(flagged.map(reviewReasonLabel))];

  const results = useMemo(() => {
    const terms = fold(deferred).split(/\s+/).filter(Boolean);
    return index
      .filter(({ q, text }) => {
        if (chapterId && q.chapterId !== chapterId) return false;
        if (filter === "review" && !q.needsReview) return false;
        if (filter === "review" && reason && reviewReasonLabel(q) !== reason) return false;
        if (filter === "starred" && !notebook.starred.includes(q.id)) return false;
        if (filter === "mistakes" && !notebook.mistakes[q.id]) return false;
        return terms.every((t) => text.includes(t));
      })
      .map(({ q }) => q);
  }, [deferred, filter, chapterId, reason, notebook.starred, notebook.mistakes]);

  const setF = (f: Filter) => {
    setFilter(f);
    setReason("");
    setLimit(PAGE);
  };

  return (
    <div>
      <header className="page-head">
        <h1>Tra cứu</h1>
        <p className="lead">Tìm theo từ khóa trong câu hỏi, đáp án và giải thích. Gõ không dấu cũng được.</p>
      </header>

      <div className="search">
        <input
          type="search"
          value={query}
          placeholder="Ví dụ: smote, docker, p-value, kiem dinh"
          aria-label="Tìm câu hỏi"
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
        />
        <select
          value={chapterId}
          aria-label="Lọc theo chương"
          onChange={(e) => {
            setChapterId(Number(e.target.value));
            setLimit(PAGE);
          }}
        >
          <option value={0}>Mọi chương</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              Chương {c.id}. {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="chips" role="group" aria-label="Bộ lọc">
        <button className={`chip ${filter === "all" ? "chip-on" : ""}`} onClick={() => setF("all")}>
          Tất cả
        </button>
        <button className={`chip ${filter === "review" ? "chip-on" : ""}`} onClick={() => setF("review")}>
          Cần kiểm tra đáp án ({flagged.length})
        </button>
        <button className={`chip ${filter === "starred" ? "chip-on" : ""}`} onClick={() => setF("starred")}>
          Đã đánh dấu ({notebook.starred.length})
        </button>
        <button className={`chip ${filter === "mistakes" ? "chip-on" : ""}`} onClick={() => setF("mistakes")}>
          Từng làm sai ({Object.keys(notebook.mistakes).length})
        </button>
      </div>

      {filter === "review" && (
        <div className="note">
          <p>
            Những câu này chưa có đáp án chính thức: đáp án do AI giải, lấy theo bình luận trên fuexam, hoặc các nguồn
            cho đáp án khác nhau. Nếu thấy sai, sửa trong <code>data/questions.json</code> rồi build lại.
          </p>
          <div className="chips">
            <button className={`chip chip-sm ${reason === "" ? "chip-on" : ""}`} onClick={() => setReason("")}>
              Mọi lý do
            </button>
            {reasons.map((r) => (
              <button key={r} className={`chip chip-sm ${reason === r ? "chip-on" : ""}`} onClick={() => setReason(r)}>
                {r} ({flagged.filter((q) => reviewReasonLabel(q) === r).length})
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="result-count">{results.length} câu</p>
      <ol className="card-list">
        {results.slice(0, limit).map((q) => (
          <li key={q.id}>
            <QuestionCompact question={q} />
          </li>
        ))}
      </ol>
      {results.length > limit && (
        <button className="btn block-btn" onClick={() => setLimit((l) => l + PAGE)}>
          Xem thêm {Math.min(PAGE, results.length - limit)} câu
        </button>
      )}
      {results.length === 0 && <p className="empty">Không có câu nào khớp. Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc.</p>}
    </div>
  );
};
