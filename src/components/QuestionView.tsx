import { useEffect, useRef } from "react";
import type { Question } from "../types";
import { reviewReasonLabel } from "../data";
import { useStore } from "../store";
import { Icon } from "./Icon";

export type OptionState = "idle" | "picked" | "right" | "wrong" | "dim";

type Props = {
  question: Question;
  stateOf: (key: string) => OptionState;
  disabled: boolean;
  onToggle: (key: string) => void;
};

export const ReviewBadge = ({ question }: { question: Question }) =>
  question.needsReview ? (
    <span className="badge-warn" title="Đáp án này chưa được xác minh bằng đáp án chính thức">
      Cần kiểm tra: {reviewReasonLabel(question)}
    </span>
  ) : null;

export const StarButton = ({ id }: { id: string }) => {
  const { notebook } = useStore();
  const on = notebook.starred.includes(id);
  return (
    <button
      type="button"
      className={`icon-btn star ${on ? "star-on" : ""}`}
      aria-pressed={on}
      title={on ? "Bỏ đánh dấu" : "Đánh dấu câu này vào sổ tay"}
      onClick={() => notebook.toggleStar(id)}
    >
      <Icon name="star" filled={on} size={18} />
    </button>
  );
};

export const QuestionMeta = ({ question }: { question: Question }) => (
  <div className="card-meta">
    <span className="meta-src">{question.sources.join(" · ")}</span>
    <span className="meta-right">
      <ReviewBadge question={question} />
      <StarButton id={question.id} />
    </span>
  </div>
);

export const QuestionView = ({ question, stateOf, disabled, onToggle }: Props) => (
  <div>
    <p className="q-text">{question.question}</p>
    {question.code && <pre className="code-block">{question.code}</pre>}
    {question.multi && <p className="hint">Câu nhiều đáp án: chọn {question.answer.length} đáp án.</p>}
    <ul className="options" role={question.multi ? "group" : "radiogroup"}>
      {question.options.map((opt, i) => {
        const state = stateOf(opt.key);
        return (
          <li key={opt.key}>
            <button
              type="button"
              className={`option option-${state}`}
              aria-pressed={state === "picked"}
              aria-keyshortcuts={String(i + 1)}
              disabled={disabled}
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

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Keyboard: 1-9 or A-E pick an option, Enter runs the primary action. */
export const useAnswerKeys = (options: { key: string }[], onPick: (key: string) => void, onEnter: () => void) => {
  const handlers = useRef({ onPick, onEnter, options });
  handlers.current = { onPick, onEnter, options };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const { onPick: pick, onEnter: enter, options: opts } = handlers.current;
      if (e.key === "Enter") {
        // Let focused buttons handle Enter themselves.
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        enter();
        return;
      }
      const k = e.key.toUpperCase();
      const byNumber = /^[1-9]$/.test(k) ? opts[Number(k) - 1] : undefined;
      const byLetter = opts.find((o) => o.key.toUpperCase() === k);
      const hit = byNumber ?? byLetter;
      if (hit) {
        e.preventDefault();
        pick(hit.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
};
