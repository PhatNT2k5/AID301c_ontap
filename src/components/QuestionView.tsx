import type { Question } from "../types";
import { reviewReasonLabel } from "../data";

type Props = {
  question: Question;
  selected: string[];
  revealed: boolean;
  onToggle: (key: string) => void;
};

export const ReviewBadge = ({ question }: { question: Question }) =>
  question.needsReview ? (
    <span className="badge-warn" title="Đáp án này chưa được xác minh từ đáp án chính thức">
      ⚠ Cần kiểm tra · {reviewReasonLabel(question)}
    </span>
  ) : null;

const optionState = (key: string, q: Question, selected: string[], revealed: boolean) => {
  if (!revealed) return selected.includes(key) ? "picked" : "idle";
  const isAnswer = q.answer.includes(key);
  if (isAnswer) return "right";
  return selected.includes(key) ? "wrong" : "dim";
};

export const QuestionView = ({ question, selected, revealed, onToggle }: Props) => (
  <div>
    <p className="q-text">{question.question}</p>
    {question.code && <pre className="code-block">{question.code}</pre>}
    {question.multi && (
      <p className="hint">Chọn {question.answer.length} đáp án rồi bấm Kiểm tra.</p>
    )}
    <ul className="options" role={question.multi ? "group" : "radiogroup"}>
      {question.options.map((opt) => {
        const state = optionState(opt.key, question, selected, revealed);
        return (
          <li key={opt.key}>
            <button
              type="button"
              className={`option option-${state}`}
              aria-pressed={selected.includes(opt.key)}
              disabled={revealed}
              onClick={() => onToggle(opt.key)}
            >
              <span className="option-key">{opt.key}</span>
              <span className="option-text">{opt.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);
