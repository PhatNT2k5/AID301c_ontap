import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { QuestionMeta, QuestionView, useAnswerKeys, type OptionState } from "../../components/QuestionView";
import { chapters, questionById, questions } from "../../data";
import { playComplete } from "../../lib/sound";
import { loadJson, removeKey, saveJson } from "../../lib/storage";
import { formatClock, sameSet, shuffle } from "../../lib/text";
import { navigate } from "../../lib/useHashRoute";
import { useStore } from "../../store";

type Exam = {
  ids: string[];
  answers: Record<string, string[]>;
  flagged: string[];
  current: number;
  startedAt: number;
  limitSec: number | null;
  finishedAt: number | null;
};

const KEY = "exam-current";
const isExamQuestion = (id: string) => !id.startsWith("qz");

export const ExamPage = () => {
  const [exam, setExamState] = useState<Exam | null>(() => loadJson<Exam | null>(KEY, null));
  const setExam = (next: Exam | null) => {
    setExamState(next);
    if (next) saveJson(KEY, next);
    else removeKey(KEY);
  };

  if (!exam) return <ExamSetup onStart={setExam} />;
  if (exam.finishedAt === null) return <ExamRunner exam={exam} onChange={setExam} />;
  return <ExamResult exam={exam} onNew={() => setExam(null)} />;
};

/* ---------- setup ---------- */

const counts = [20, 30, 50] as const;

const ExamSetup = ({ onStart }: { onStart: (exam: Exam) => void }) => {
  const { notebook } = useStore();
  const [count, setCount] = useState<number>(50);
  const [timed, setTimed] = useState(true);
  const [examOnly, setExamOnly] = useState(false);
  const [picked, setPicked] = useState<number[]>(chapters.map((c) => c.id));

  const pool = questions.filter((q) => picked.includes(q.chapterId) && (!examOnly || isExamQuestion(q.id)));
  const size = Math.min(count, pool.length);
  const minutes = Math.round(size * 1.2);

  const toggleChapter = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].sort((a, b) => a - b)));

  const start = () =>
    onStart({
      ids: shuffle(pool.map((q) => q.id)).slice(0, size),
      answers: {},
      flagged: [],
      current: 0,
      startedAt: Date.now(),
      limitSec: timed ? minutes * 60 : null,
      finishedAt: null,
    });

  return (
    <div>
      <header className="page-head">
        <h1>Thi thử</h1>
        <p className="lead">
          Câu hỏi bốc ngẫu nhiên, chỉ chấm điểm khi nộp bài. Câu làm sai sẽ tự vào sổ tay để luyện lại.
        </p>
      </header>

      <div className="panel form">
        <fieldset>
          <legend>Số câu</legend>
          <div className="seg">
            {counts.map((c) => (
              <button key={c} className={count === c ? "seg-on" : ""} aria-pressed={count === c} onClick={() => setCount(c)}>
                {c} câu
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Chương</legend>
          <div className="chips">
            {chapters.map((c) => (
              <button
                key={c.id}
                className={`chip ${picked.includes(c.id) ? "chip-on" : ""}`}
                aria-pressed={picked.includes(c.id)}
                title={c.title}
                onClick={() => toggleChapter(c.id)}
              >
                Chương {c.id}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="switch">
          <input type="checkbox" checked={examOnly} onChange={(e) => setExamOnly(e.target.checked)} />
          <span>Chỉ lấy câu có trong đề thi thật (bỏ câu chỉ có trên Quizlet)</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          <span>Hẹn giờ {minutes} phút (1,2 phút/câu như đề thật)</span>
        </label>

        <div className="form-foot">
          <span className="muted">
            {size} câu{size < count ? ` (chỉ có ${pool.length} câu phù hợp)` : ""}
          </span>
          <button className="btn btn-primary btn-lg" disabled={size === 0} onClick={start}>
            Bắt đầu thi
          </button>
        </div>
      </div>

      {notebook.exams.length > 0 && (
        <section className="history">
          <h2>Lần thi gần đây</h2>
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Đúng</th>
                <th>Điểm</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {notebook.exams.slice(0, 8).map((r) => (
                <tr key={r.at}>
                  <td>{new Date(r.at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>
                    {r.correct}/{r.total}
                  </td>
                  <td className="num">{((r.correct / r.total) * 10).toFixed(1)}</td>
                  <td>{formatClock(r.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

/* ---------- running ---------- */

const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
};

const ExamRunner = ({ exam, onChange }: { exam: Exam; onChange: (exam: Exam) => void }) => {
  const { notebook, settings } = useStore();
  const now = useNow();
  const id = exam.ids[exam.current];
  const question = questionById.get(id);
  const picked = exam.answers[id] ?? [];
  const answeredCount = exam.ids.filter((x) => (exam.answers[x] ?? []).length > 0).length;
  const elapsed = (now - exam.startedAt) / 1000;
  const remaining = exam.limitSec === null ? null : exam.limitSec - elapsed;

  const submit = (auto = false) => {
    if (!auto) {
      const missing = exam.ids.length - answeredCount;
      const msg = missing > 0 ? `Còn ${missing} câu chưa làm. Vẫn nộp bài?` : "Nộp bài?";
      if (!window.confirm(msg)) return;
    }
    const finishedAt = Date.now();
    let correct = 0;
    for (const qid of exam.ids) {
      const q = questionById.get(qid);
      if (q && sameSet(exam.answers[qid] ?? [], q.answer)) correct++;
      else notebook.recordWrong(qid);
    }
    notebook.addExam({
      at: finishedAt,
      total: exam.ids.length,
      correct,
      seconds: Math.round((finishedAt - exam.startedAt) / 1000),
    });
    if (settings.soundOn) playComplete();
    onChange({ ...exam, finishedAt });
  };

  // Auto-submit when time runs out.
  useEffect(() => {
    if (remaining !== null && remaining <= 0) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining !== null && remaining <= 0]);

  const go = (index: number) => onChange({ ...exam, current: Math.max(0, Math.min(exam.ids.length - 1, index)) });

  const toggle = (key: string) => {
    if (!question) return;
    const next = question.multi ? (picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]) : [key];
    onChange({ ...exam, answers: { ...exam.answers, [id]: next } });
  };

  useAnswerKeys(question?.options ?? [], toggle, () => go(exam.current + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") go(exam.current + 1);
      if (e.key === "ArrowLeft") go(exam.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!question) return <p className="empty">Thiếu dữ liệu câu hỏi {id}.</p>;

  const flagged = exam.flagged.includes(id);
  const toggleFlag = () =>
    onChange({ ...exam, flagged: flagged ? exam.flagged.filter((x) => x !== id) : [...exam.flagged, id] });
  const stateOf = (key: string): OptionState => (picked.includes(key) ? "picked" : "idle");
  const lowTime = remaining !== null && remaining < 300;

  return (
    <div className="exam">
      <header className="exam-bar">
        <span className={`clock ${lowTime ? "clock-low" : ""}`} aria-live="off">
          <Icon name="exam" size={18} />
          {remaining === null ? formatClock(elapsed) : formatClock(remaining)}
        </span>
        <span className="muted">
          Đã làm {answeredCount}/{exam.ids.length}
        </span>
        <button className="btn btn-primary" onClick={() => submit()}>
          Nộp bài
        </button>
      </header>

      <div className="exam-layout">
        <div>
          <p className="session-title">
            Câu {exam.current + 1}
            <span>/{exam.ids.length}</span>
          </p>
          <article className="card">
            <QuestionMeta question={question} />
            <QuestionView question={question} stateOf={stateOf} disabled={false} onToggle={toggle} />
            <div className="exam-nav">
              <button className="btn" disabled={exam.current === 0} onClick={() => go(exam.current - 1)}>
                Câu trước
              </button>
              <button className={`btn ${flagged ? "btn-flag" : ""}`} aria-pressed={flagged} onClick={toggleFlag}>
                {flagged ? "Bỏ đánh dấu" : "Xem lại sau"}
              </button>
              <button
                className="btn btn-primary"
                disabled={exam.current === exam.ids.length - 1}
                onClick={() => go(exam.current + 1)}
              >
                Câu sau
              </button>
            </div>
          </article>
          <p className="kbd-hint block">
            <kbd>1</kbd>–<kbd>4</kbd> chọn đáp án · <kbd>←</kbd> <kbd>→</kbd> chuyển câu
          </p>
        </div>

        <aside className="navigator" aria-label="Bảng câu hỏi">
          <ol className="bubbles bubbles-sm">
            {exam.ids.map((qid, i) => {
              const done = (exam.answers[qid] ?? []).length > 0;
              const cls = [
                "bubble",
                done ? "bubble-done" : "bubble-open-plain",
                i === exam.current ? "bubble-current" : "",
                exam.flagged.includes(qid) ? "bubble-flag" : "",
              ].join(" ");
              return (
                <li key={qid}>
                  <button className={cls} aria-label={`Câu ${i + 1}${done ? ", đã làm" : ""}`} onClick={() => go(i)}>
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="legend small">
            <span>
              <i className="bubble-mini bubble-done" /> Đã làm
            </span>
            <span>
              <i className="bubble-mini bubble-flag-mini" /> Xem lại
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
};

/* ---------- result ---------- */

const ExamResult = ({ exam, onNew }: { exam: Exam; onNew: () => void }) => {
  const [onlyWrong, setOnlyWrong] = useState(true);
  const rows = exam.ids.map((qid, i) => {
    const q = questionById.get(qid);
    const given = exam.answers[qid] ?? [];
    return { i, q, given, ok: q ? sameSet(given, q.answer) : false };
  });
  const correct = rows.filter((r) => r.ok).length;
  const total = rows.length;
  const score = (correct / total) * 10;
  const seconds = Math.round(((exam.finishedAt ?? exam.startedAt) - exam.startedAt) / 1000);

  const byChapter = chapters
    .map((c) => {
      const inChapter = rows.filter((r) => r.q?.chapterId === c.id);
      return { c, total: inChapter.length, ok: inChapter.filter((r) => r.ok).length };
    })
    .filter((x) => x.total > 0);

  const shown = onlyWrong ? rows.filter((r) => !r.ok) : rows;

  return (
    <div>
      <section className="panel result">
        <div className="score">
          <span className="score-num">{score.toFixed(1)}</span>
          <span className="score-of">/10</span>
        </div>
        <p>
          Đúng <strong>{correct}</strong>/{total} câu trong {formatClock(seconds)}.{" "}
          {score >= 8 ? "Rất chắc tay." : score >= 5 ? "Qua môn, nhưng còn chỗ hổng." : "Cần ôn thêm trước khi thi."}
        </p>
        <ul className="chapter-bars">
          {byChapter.map(({ c, total: t, ok }) => (
            <li key={c.id}>
              <span className="cb-label">
                Chương {c.id}. {c.title}
              </span>
              <span className="cb-bar">
                <span style={{ width: `${(ok / t) * 100}%` }} />
              </span>
              <span className="cb-num">
                {ok}/{t}
              </span>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn btn-primary" onClick={onNew}>
            Làm đề mới
          </button>
          {correct < total && (
            <button className="btn" onClick={() => navigate("notebook")}>
              Luyện lại câu sai
            </button>
          )}
        </div>
      </section>

      <div className="list-head">
        <h2>Xem lại bài</h2>
        <div className="seg">
          <button className={onlyWrong ? "seg-on" : ""} onClick={() => setOnlyWrong(true)}>
            Câu sai ({total - correct})
          </button>
          <button className={!onlyWrong ? "seg-on" : ""} onClick={() => setOnlyWrong(false)}>
            Tất cả
          </button>
        </div>
      </div>

      <ol className="card-list">
        {shown.map(({ i, q, given, ok }) =>
          q ? (
            <li key={q.id} className="card">
              <p className={`result-tag ${ok ? "tag-right" : "tag-wrong"}`}>
                Câu {i + 1}: {ok ? "đúng" : given.length === 0 ? "bỏ trống" : `sai, bạn chọn ${given.join(", ")}`}
              </p>
              <QuestionMeta question={q} />
              <QuestionView
                question={q}
                disabled
                onToggle={() => undefined}
                stateOf={(key) =>
                  q.answer.includes(key) ? "right" : given.includes(key) ? "wrong" : "dim"
                }
              />
              <details open={!ok}>
                <summary>Giải thích</summary>
                <p className="explanation">{q.explanation}</p>
              </details>
            </li>
          ) : null,
        )}
      </ol>
    </div>
  );
};
