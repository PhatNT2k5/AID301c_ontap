import { useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { QuestionMeta, QuestionView } from "../../components/QuestionView";
import { questionById } from "../../data";
import type { SectionResult } from "./progress";

type Props = {
  title: string;
  /** Question ids in the order they appear in the section. */
  questionIds: string[];
  /** Missing for sections finished before results were saved. */
  result?: SectionResult;
  /** True right after finishing, false when reopening a finished section. */
  justFinished: boolean;
  actions: ReactNode;
};

type Filter = "all" | "missed";

const CONFETTI_COUNT = 14;

const summaryText = (total: number, result?: SectionResult): string => {
  if (!result) return `Section này có ${total} câu. Lần làm trước chưa lưu chi tiết, nhưng bạn vẫn xem lại được đáp án.`;
  const missed = Object.keys(result.wrongPicks).length;
  if (result.mistakes === 0) return `Đúng cả ${total} câu ngay lần đầu.`;
  return `Đúng cả ${total} câu, có ${missed} câu từng sai (${result.mistakes} lượt) trước khi đúng.`;
};

/** End-of-section screen: the result plus every question with its answer, for reviewing. */
export const SectionRecap = ({ title, questionIds, result, justFinished, actions }: Props) => {
  const wrongPicks = result?.wrongPicks ?? {};
  const missedCount = questionIds.filter((id) => wrongPicks[id]).length;
  const [filter, setFilter] = useState<Filter>("all");

  const rows = questionIds.map((id, i) => ({ i, q: questionById.get(id), picked: wrongPicks[id] }));
  const shown = filter === "missed" ? rows.filter((r) => r.picked) : rows;

  return (
    <div>
      <section className={`panel finish ${justFinished ? "finish-party" : ""}`}>
        {justFinished && (
          <div className="confetti" aria-hidden>
            {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
        )}
        <span className="finish-mark" aria-hidden>
          <Icon name="check" size={34} />
        </span>
        <h2>{justFinished ? `Chúc mừng! ${title}` : title}</h2>
        <p>{summaryText(questionIds.length, result)}</p>
        <div className="row">{actions}</div>
      </section>

      <div className="list-head">
        <h2>Xem lại câu hỏi</h2>
        {missedCount > 0 && (
          <div className="seg">
            <button className={filter === "all" ? "seg-on" : ""} onClick={() => setFilter("all")}>
              Tất cả ({questionIds.length})
            </button>
            <button className={filter === "missed" ? "seg-on" : ""} onClick={() => setFilter("missed")}>
              Từng sai ({missedCount})
            </button>
          </div>
        )}
      </div>

      <ol className="card-list">
        {shown.map(({ i, q, picked }) =>
          q ? (
            <li key={q.id} className="card">
              {result && (
                <p className={`result-tag ${picked ? "tag-wrong" : "tag-right"}`}>
                  Câu {i + 1}: {picked ? `lần đầu chọn ${picked.join(", ")}, đáp án ${q.answer.join(", ")}` : "đúng ngay"}
                </p>
              )}
              <QuestionMeta question={q} />
              <QuestionView
                question={q}
                disabled
                onToggle={() => undefined}
                stateOf={(key) => (q.answer.includes(key) ? "right" : picked?.includes(key) ? "wrong" : "dim")}
              />
              <details open={Boolean(picked)}>
                <summary>Giải thích</summary>
                <p className="explanation">{q.explanation}</p>
              </details>
            </li>
          ) : (
            <li key={i} className="empty">
              Thiếu dữ liệu câu hỏi.
            </li>
          ),
        )}
      </ol>
    </div>
  );
};
