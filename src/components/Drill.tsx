import { useEffect, useState, type ReactNode } from "react";
import { questionById } from "../data";
import { PracticeCard } from "./PracticeCard";
import { emitPet } from "../features/pet/petBus";

export type DrillRun = {
  queue: string[];
  solved: string[];
  mistakes: number;
  /** First wrong pick per question, kept so a finished run can be reviewed. */
  wrongPicks?: Record<string, string[]>;
};

type Props = {
  run: DrillRun;
  header: ReactNode;
  onChange: (run: DrillRun) => void;
  onFinish: (run: DrillRun) => void;
  onCorrect?: (id: string) => void;
  /** When set, a correct answer moves to the next question after this many ms. */
  autoNextMs?: number;
};

/** Queue drill: a correct answer leaves the queue, a wrong one goes to the back until answered right. */
export const Drill = ({ run, header, onChange, onFinish, onCorrect, autoNextMs }: Props) => {
  const [turn, setTurn] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastPicked, setLastPicked] = useState<string[]>([]);
  useEffect(() => emitPet({ type: "start" }), []);
  const total = run.queue.length + run.solved.length;
  const currentId = run.queue[0];
  const question = currentId ? questionById.get(currentId) : undefined;

  if (!question) return <p className="empty">Thiếu dữ liệu câu hỏi {currentId}.</p>;

  const next = () => {
    const [head, ...rest] = run.queue;
    const updated: DrillRun = lastCorrect
      ? { ...run, queue: rest, solved: [...run.solved, head] }
      : {
          ...run,
          queue: [...rest, head],
          mistakes: run.mistakes + 1,
          wrongPicks: { [head]: lastPicked, ...run.wrongPicks },
        };
    setTurn((t) => t + 1);
    if (updated.queue.length === 0) {
      emitPet({ type: "complete" });
      onFinish(updated);
    }
    else onChange(updated);
  };

  const isLast = run.queue.length === 1;

  return (
    <div className="session">
      <header className="session-head">
        {header}
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={run.solved.length}>
          <div className="meter-fill" style={{ width: `${(run.solved.length / total) * 100}%` }} />
        </div>
        <p className="session-count">
          Đúng {run.solved.length}/{total}
          {run.mistakes > 0 && <span> · sai {run.mistakes} lượt</span>}
          <span className="kbd-hint">
            Phím <kbd>1</kbd>–<kbd>4</kbd> để chọn
          </span>
        </p>
      </header>
      <PracticeCard
        key={`${question.id}-${turn}`}
        question={question}
        wrongNote={run.queue.length > 1 ? "Câu này sẽ quay lại sau." : undefined}
        nextLabel={isLast && lastCorrect ? "Hoàn thành" : "Câu tiếp"}
        autoNextMs={autoNextMs}
        onAnswered={(correct, picked) => {
          setLastCorrect(correct);
          setLastPicked(picked);
          if (correct) onCorrect?.(question.id);
        }}
        onNext={next}
      />
    </div>
  );
};
