import { useState } from "react";
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
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
};

type Feedback = "none" | "correct" | "wrong";

/** One question with instant feedback. Remount (key) it for each new turn. */
export const PracticeCard = ({ question, nextLabel, wrongNote, onAnswered, onNext }: Props) => {
  const { settings, notebook } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const revealed = feedback !== "none";

  const check = (picked: string[]) => {
    const correct = sameSet(picked, question.answer);
    setFeedback(correct ? "correct" : "wrong");
    if (!correct) notebook.recordWrong(question.id);
    if (settings.soundOn) (correct ? playCorrect : playWrong)();
    emitPet({ type: correct ? "correct" : "wrong" });
    onAnswered(correct);
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
            <details>
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
          </div>
        </div>
      )}
    </article>
  );
};
