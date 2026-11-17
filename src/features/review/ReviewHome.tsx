import { chapters, questions, sections } from "../../data";
import { navigate } from "../../lib/useHashRoute";
import type { ProgressApi } from "./progress";

const statusLabel = { done: "Đã xong", open: "Đang mở", locked: "Đang khóa" } as const;

export const ReviewHome = ({ api }: { api: ProgressApi }) => {
  const doneCount = sections.filter((s) => api.statusOf(s.id) === "done").length;
  const flagged = questions.filter((q) => q.needsReview).length;

  return (
    <div>
      <section className="intro">
        <h1>Ôn tập</h1>
        <p>
          {questions.length} câu trắc nghiệm gom từ 4 đề thi và 2 bộ Quizlet, đã bỏ câu trùng, chia thành{" "}
          {sections.length} section. Trả lời đúng hết mọi câu trong một section thì section kế tiếp mới mở.
        </p>
        <p className="muted">
          Hoàn thành {doneCount}/{sections.length} section.{" "}
          {flagged > 0 && (
            <button className="link" onClick={() => navigate("audit")}>
              {flagged} câu cần bạn kiểm tra đáp án
            </button>
          )}
        </p>
      </section>

      <ol className="track">
        {chapters.map((chapter) => {
          const chapterSections = sections.filter((s) => s.chapterId === chapter.id);
          if (chapterSections.length === 0) return null;
          return (
            <li key={chapter.id} className="track-chapter">
              <p className="track-chapter-title">
                Chương {chapter.id}. {chapter.title}
              </p>
              <ol className="track-stops">
                {chapterSections.map((s) => {
                  const status = api.statusOf(s.id);
                  const run = api.getRun(s.id);
                  return (
                    <li key={s.id} className={`stop stop-${status}`}>
                      <span className="stop-dot" aria-hidden />
                      <button
                        className="stop-btn"
                        disabled={status === "locked"}
                        onClick={() => navigate(`review/${s.id}`)}
                      >
                        <span className="stop-name">Section {s.index + 1}</span>
                        <span className="stop-info">
                          {s.questionIds.length} câu · {statusLabel[status]}
                          {run && status === "open" ? ` · đúng ${run.solved.length}` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>

      <button
        className="link small"
        onClick={() => {
          if (window.confirm("Xoá toàn bộ tiến độ ôn tập?")) api.resetAll();
        }}
      >
        Xoá toàn bộ tiến độ
      </button>
    </div>
  );
};
