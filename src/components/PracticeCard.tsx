import { useEffect, useRef, useState } from "react";
import type { Question } from "../types";
import { playCorrect, playWrong } from "../lib/sound";
import { sameSet } from "../lib/text";
import { useStore } from "../store";
import { emitPet } from "../features/pet/petBus";
import { QuestionMeta, QuestionView, useAnswerKeys, type OptionState } from "./QuestionView";

type Props = {
  question: Question;
  nextLabel: string;
  wrongNote?: string;
  /** When set, a correct answer moves on by itself after this many ms. */
  autoNextMs?: number;
  onAnswered: (correct: boolean, picked: string[]) => void;
  onNext: () => void;
};

type Feedback = "none" | "correct" | "wrong";

/** One question with instant feedback. Remount (key) it for each new turn. */
export const PracticeCard = ({ question, nextLabel, wrongNote, autoNextMs, onAnswered, onNext }: Props) => {
  const { settings, notebook } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [autoPaused, setAutoPaused] = useState(false);
  const revealed = feedback !== "none";
  const autoNextActive = feedback === "correct" && autoNextMs !== undefined && !autoPaused;

  // The parent passes a fresh onNext each render; always call the latest one.
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    if (!autoNextActive) return;
    const timer = window.setTimeout(() => onNextRef.current(), autoNextMs);
    return () => window.clearTimeout(timer);
  }, [autoNextActive, autoNextMs]);

  const check = (picked: string[]) => {
    const correct = sameSet(picked, question.answer);
    setFeedback(correct ? "correct" : "wrong");
    if (!correct) notebook.recordWrong(question.id);
    if (settings.soundOn) (correct ? playCorrect : playWrong)();
    emitPet({ type: correct ? "correct" : "wrong" });
    onAnswered(correct, picked);
  };

  const toggle = (key: string) => {
    if (revealed) return;
    if (!question.multi) {
      setSelected([key]);
      check([key]);
      return;
    }
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  };

  const primary = () => {
    if (revealed) onNext();
    else if (question.multi && selected.length > 0) check(selected);
  };

  useAnswerKeys(question.options, toggle, primary);

  const stateOf = (key: string): OptionState => {
    if (!revealed) return selected.includes(key) ? "picked" : "idle";
    if (question.answer.includes(key)) return "right";
    return selected.includes(key) ? "wrong" : "dim";
  };

  return (
    <article className="card">
      <QuestionMeta question={question} />
      <QuestionView question={question} stateOf={stateOf} disabled={revealed} onToggle={toggle} />

      {question.multi && !revealed && (
        <button className="btn btn-primary" disabled={selected.length === 0} onClick={() => check(selected)}>
          Kiểm tra
        </button>
      )}

      {revealed && (
        <div className={`feedback feedback-${feedback}`} role="status">
          <p className="feedback-title">
            {feedback === "correct" ? "Chính xác" : `Chưa đúng. Đáp án là ${question.answer.join(", ")}.`}
            {feedback === "wrong" && wrongNote ? <span className="feedback-note"> {wrongNote}</span> : null}
          </p>
          {feedback === "wrong" ? (
            <p className="explanation">{question.explanation}</p>
          ) : (
            <details onToggle={(e) => e.currentTarget.open && setAutoPaused(true)}>
              <summary>Xem giải thích</summary>
              <p className="explanation">{question.explanation}</p>
            </details>
          )}
          <div className="feedback-actions">
            <button className="btn btn-primary" autoFocus onClick={onNext}>
              {nextLabel}
            </button>
            <span className="kbd-hint">
              <kbd>Enter</kbd>
            </span>
            {feedback === "correct" && autoNextMs !== undefined && (
              <span className="auto-next-status" aria-live="polite">
                {autoPaused ? "Đã dừng tự qua câu" : "Tự qua câu…"}
              </span>
            )}
          </div>
          {autoNextActive && (
            <div className="auto-next-bar" aria-hidden>
              <span style={{ animationDuration: `${autoNextMs}ms` }} />
            </div>
          )}
        </div>
      )}
    </article>
  );
};
