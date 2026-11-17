import { useEffect, useMemo, useState } from "react";
import { chapters, questionById, sections } from "../../data";
import { playComplete, playCorrect, playWrong } from "../../lib/sound";
import { navigate } from "../../lib/useHashRoute";
import { QuestionView, ReviewBadge } from "../../components/QuestionView";
import type { ProgressApi, SectionRun } from "./progress";

type Props = {
  sectionId: string;
  api: ProgressApi;
  soundOn: boolean;
};

type Feedback = "none" | "correct" | "wrong";

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

export const ReviewSession = ({ sectionId, api, soundOn }: Props) => {
  const section = sections.find((s) => s.id === sectionId);
  const status = section ? api.statusOf(section.id) : "locked";

  const initialRun = useMemo<SectionRun | null>(() => {
    if (!section) return null;
    return api.getRun(section.id) ?? { queue: [...section.questionIds], solved: [], mistakes: 0 };
    // Only compute when the section changes; later updates go through setRun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const [run, setRun] = useState<SectionRun | null>(initialRun);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setRun(initialRun);
    setSelected([]);
    setFeedback("none");
    setFinished(false);
  }, [initialRun]);

  if (!section || !run) {
    return <p className="empty">Không tìm thấy section này.</p>;
  }
  if (status === "locked") {
    return (
      <div className="panel">
        <p>Section này đang khóa. Hoàn thành các section trước để mở.</p>
        <button className="btn" onClick={() => navigate("review")}>Về danh sách section</button>
      </div>
    );
  }

  const chapter = chapters.find((c) => c.id === section.chapterId);
  const total = section.questionIds.length;
  const sectionNo = section.index + 1;
  const nextSection = sections[section.index + 1];

  if (finished) {
    return (
      <div className="panel finish">
        <p className="finish-mark" aria-hidden>✓</p>
        <h2>Xong section {sectionNo}</h2>
        <p>
          Bạn đã trả lời đúng cả {total} câu
          {run.mistakes > 0 ? `, sai ${run.mistakes} lượt trước khi đúng.` : " ngay lần đầu."}
        </p>
        <div className="row">
          {nextSection && (
            <button className="btn btn-primary" onClick={() => navigate(`review/${nextSection.id}`)}>
              Sang section {sectionNo + 1}
            </button>
          )}
          <button className="btn" onClick={() => navigate("review")}>Về danh sách section</button>
        </div>
      </div>
    );
  }

  const currentId = run.queue[0];
  const question = questionById.get(currentId);
  if (!question) return <p className="empty">Thiếu dữ liệu câu hỏi {currentId}.</p>;

  const persist = (next: SectionRun) => {
    setRun(next);
    api.saveRun(section.id, next);
  };

  const check = (picked: string[]) => {
    const correct = sameSet(picked, question.answer);
    setFeedback(correct ? "correct" : "wrong");
    if (soundOn) (correct ? playCorrect : playWrong)();
  };

  const toggle = (key: string) => {
    if (feedback !== "none") return;
    if (question.multi) {
      setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
      return;
    }
    setSelected([key]);
    check([key]);
  };

  // Correct answers leave the queue; wrong ones go to the back and must be answered again.
  const advance = () => {
    const [head, ...rest] = run.queue;
    const next: SectionRun =
      feedback === "correct"
        ? { ...run, queue: rest, solved: [...run.solved, head] }
        : { ...run, queue: [...rest, head], mistakes: run.mistakes + 1 };
    setSelected([]);
    setFeedback("none");
    if (next.queue.length === 0) {
      api.completeSection(section.id);
      setRun(next);
      setFinished(true);
      if (soundOn) playComplete();
      return;
    }
    persist(next);
  };

  const solvedCount = run.solved.length;

  return (
    <div className="session">
      <header className="session-head">
        <button className="link" onClick={() => navigate("review")}>← Danh sách section</button>
        <p className="session-title">
          Section {sectionNo} <span className="muted">· {chapter?.title}</span>
        </p>
        <div className="meter" aria-label={`Đã đúng ${solvedCount} trên ${total} câu`}>
          <div className="meter-fill" style={{ width: `${(solvedCount / total) * 100}%` }} />
        </div>
        <p className="muted small">
          Đúng {solvedCount}/{total} · còn {run.queue.length} câu trong hàng chờ
        </p>
      </header>

      <article className="card">
        <div className="card-meta">
          <span className="muted small">{question.sources.join(", ")}</span>
          <ReviewBadge question={question} />
        </div>
        <QuestionView question={question} selected={selected} revealed={feedback !== "none"} onToggle={toggle} />

        {question.multi && feedback === "none" && (
          <button
            className="btn btn-primary"
            disabled={selected.length === 0}
            onClick={() => check(selected)}
          >
            Kiểm tra
          </button>
        )}

        {feedback !== "none" && (
          <div className={`feedback feedback-${feedback}`} role="status">
            <p className="feedback-title">
              {feedback === "correct"
                ? "Chính xác!"
                : `Chưa đúng. Đáp án: ${question.answer.join(", ")}. Câu này sẽ quay lại ở cuối section.`}
            </p>
            {feedback === "wrong" && <p className="explanation">{question.explanation}</p>}
            {feedback === "correct" && (
              <details>
                <summary>Xem giải thích</summary>
                <p className="explanation">{question.explanation}</p>
              </details>
            )}
            <button className="btn btn-primary" autoFocus onClick={advance}>
              {run.queue.length === 1 && feedback === "correct" ? "Hoàn thành section" : "Câu tiếp"}
            </button>
          </div>
        )}
      </article>

      <button
        className="link small"
        onClick={() => {
          api.resetSection(section.id);
          const fresh = { queue: [...section.questionIds], solved: [], mistakes: 0 };
          setRun(fresh);
          setSelected([]);
          setFeedback("none");
        }}
      >
        Làm lại section này từ đầu
      </button>
    </div>
  );
};
