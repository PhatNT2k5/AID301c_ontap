import { Icon } from "../../components/Icon";
import { chapters, fptExams, questions, sections } from "../../data";
import { formatClock, shuffle } from "../../lib/text";
import { navigate } from "../../lib/useHashRoute";
import { useStore } from "../../store";
import { startFixedExam } from "../exam/ExamPage";

const statusLabel = { done: "đã xong", doing: "đang làm", new: "chưa làm" } as const;

export const ReviewHome = () => {
  const { progress: api, notebook } = useStore();
  const done = sections.filter((s) => api.statusOf(s.id) === "done");
  const learned = done.reduce((n, s) => n + s.questionIds.length, 0);
  const next = api.firstOpen;
  const nextRun = next ? api.getRun(next.id) : undefined;
  const mistakeCount = Object.keys(notebook.mistakes).length;

  return (
    <div className="wide home">
      <header className="page-head home-head">
        <h1>Ôn tập</h1>
        <p className="lead">
          {questions.length} câu từ 4 đề thi và 2 bộ Quizlet, chia thành {sections.length} section. Chọn section nào làm
          cũng được, trả lời đúng hết mọi câu thì section đó xong.
        </p>
      </header>

      <div className="home-main">
      <section className="resume">
        <div className="resume-progress">
          <div className="resume-numbers">
            <span>
              <strong>{done.length}</strong>/{sections.length} section
            </span>
            <span>
              <strong>{learned}</strong>/{questions.length} câu
            </span>
          </div>
          <div className="meter meter-lg">
            <div className="meter-fill" style={{ width: `${(learned / questions.length) * 100}%` }} />
          </div>
        </div>
        {next ? (
          <button className="btn btn-primary btn-lg" onClick={() => navigate(`review/${next.id}`)}>
            {nextRun ? `Làm tiếp section ${next.index + 1}` : `Bắt đầu section ${next.index + 1}`}
          </button>
        ) : (
          <p className="resume-done">Bạn đã xong toàn bộ section. Thử sức với bài thi thử nhé.</p>
        )}
        {mistakeCount > 0 && (
          <button className="link small" onClick={() => navigate("notebook")}>
            {mistakeCount} câu từng làm sai đang nằm trong sổ tay
          </button>
        )}
      </section>

      <ol className="sheet" aria-label="Bản đồ section">
        {chapters.map((chapter) => {
          const list = sections.filter((s) => s.chapterId === chapter.id);
          if (list.length === 0) return null;
          const chapterDone = list.filter((s) => api.statusOf(s.id) === "done").length;
          return (
            <li key={chapter.id} className="sheet-row">
              <div className="sheet-label">
                <span className="sheet-chapter">Chương {chapter.id}</span>
                <span className="sheet-title">{chapter.title}</span>
                <span className="sheet-count">
                  {chapterDone}/{list.length}
                </span>
                <button className="sheet-video" onClick={() => navigate(`study/${chapter.id}`)}>
                  <Icon name="study" size={14} /> Video chương
                </button>
              </div>
              <ol className="bubbles">
                {list.map((s) => {
                  const status = api.statusOf(s.id);
                  const run = api.getRun(s.id);
                  const partial = status === "doing" && run ? run.solved.length / s.questionIds.length : 0;
                  return (
                    <li key={s.id}>
                      <button
                        className={`bubble ${status === "done" ? "bubble-done" : status === "doing" ? "bubble-open" : "bubble-open-plain"}`}
                        style={partial ? { ["--fill" as string]: `${partial * 100}%` } : undefined}
                        title={`Section ${s.index + 1}: ${s.questionIds.length} câu, ${statusLabel[status]}`}
                        aria-label={`Section ${s.index + 1}, ${s.questionIds.length} câu, ${statusLabel[status]}`}
                        onClick={() => navigate(`review/${s.id}`)}
                      >
                        {s.index + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>

      <div className="legend" aria-hidden>
        <span>
          <i className="bubble-mini bubble-done" /> Đã xong
        </span>
        <span>
          <i className="bubble-mini bubble-open" /> Đang làm
        </span>
        <span>
          <i className="bubble-mini" /> Chưa làm
        </span>
      </div>

      <button
        className="link small danger"
        onClick={() => {
          if (window.confirm("Xoá toàn bộ tiến độ section và các phần luyện đề? Sổ tay và lịch sử thi thử vẫn giữ nguyên.")) api.resetAll();
        }}
      >
        Xoá tiến độ section
      </button>
      </div>

      <HomeAside />
    </div>
  );
};

const QUICK_SIZE = 20;

const HomeAside = () => {
  const { progress, notebook } = useStore();
  const mistakes = Object.keys(notebook.mistakes).length;
  const lastExam = notebook.exams[0];

  return (
    <aside className="home-aside">
      <section className="window widget">
        <div className="window-bar" aria-hidden>
          <span>thi_nhanh.exe</span>
          <i />
          <i />
          <i />
        </div>
        <div className="widget-body">
          <p className="widget-title">Thi nhanh {QUICK_SIZE} câu</p>
          <p className="muted small">Bốc ngẫu nhiên từ cả 6 chương, hẹn giờ 24 phút.</p>
          <button
            className="btn btn-primary block-btn"
            onClick={() => startFixedExam(shuffle(questions.map((q) => q.id)).slice(0, QUICK_SIZE))}
          >
            Bắt đầu
          </button>
          {lastExam && (
            <p className="widget-foot">
              Lần gần nhất: <strong>{((lastExam.correct / lastExam.total) * 10).toFixed(1)}</strong>/10 ·{" "}
              {lastExam.correct}/{lastExam.total} câu · {formatClock(lastExam.seconds)}
            </p>
          )}
        </div>
      </section>

      <section className="window widget">
        <div className="window-bar" aria-hidden>
          <span>so_tay.txt</span>
          <i />
          <i />
          <i />
        </div>
        <div className="widget-body">
          <div className="widget-stats">
            <button onClick={() => navigate("notebook")}>
              <strong>{mistakes}</strong>
              <span>câu sai</span>
            </button>
            <button onClick={() => navigate("notebook")}>
              <strong>{notebook.starred.length}</strong>
              <span>đánh dấu</span>
            </button>
          </div>
          {mistakes > 0 ? (
            <button className="btn block-btn" onClick={() => navigate("notebook/mistakes")}>
              Luyện lại {mistakes} câu sai
            </button>
          ) : (
            <p className="muted small">Câu nào làm sai sẽ tự vào đây để luyện lại.</p>
          )}
        </div>
      </section>

      <section className="window widget">
        <div className="window-bar" aria-hidden>
          <span>de_thi_fe/</span>
          <i />
          <i />
          <i />
        </div>
        <ul className="widget-body widget-exams">
          {fptExams.map((exam) => {
            const done = exam.parts.filter((p) => progress.progress.completed.includes(p.id)).length;
            return (
              <li key={exam.id}>
                <button onClick={() => navigate(`exams/${exam.id}`)}>
                  <span className="term-tag term-tag-sm">{exam.term}</span>
                  <span className="we-label">{exam.label}</span>
                  <span className="we-count">
                    {done}/{exam.parts.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="widget-tip">
        <p className="widget-title">Phím tắt</p>
        <p>
          <kbd>1</kbd>–<kbd>4</kbd> hoặc <kbd>A</kbd>–<kbd>D</kbd> chọn đáp án
        </p>
        <p>
          <kbd>Enter</kbd> sang câu tiếp
        </p>
        <p>
          <kbd>←</kbd> <kbd>→</kbd> chuyển câu khi thi
        </p>
      </section>
    </aside>
  );
};
