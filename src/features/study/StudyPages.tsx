import { useRef } from "react";
import { Icon } from "../../components/Icon";
import { chapters, markersFor, questions, sections } from "../../data";
import { navigate } from "../../lib/useHashRoute";
import { useStore } from "../../store";

export const StudyHome = () => {
  const { notebook, progress } = useStore();
  return (
    <div className="wide">
      <header className="page-head">
        <h1>Học tập</h1>
        <p className="lead">
          FPT không công khai slide hay đề cương AID301c. Nội dung đề bám sát chuỗi khóa{" "}
          <a href="https://www.coursera.org/specializations/ibm-ai-workflow" target="_blank" rel="noreferrer">
            IBM AI Enterprise Workflow
          </a>{" "}
          trên Coursera, nên 6 chương dưới đây đi theo 6 khóa đó. Mỗi chương có video khoảng 5–7 phút, bấm vào từng mục để tua tới đoạn đó.
        </p>
      </header>
      <ol className="chapter-list">
        {chapters.map((c) => {
          const watched = notebook.watched.includes(c.id);
          const list = sections.filter((s) => s.chapterId === c.id);
          const done = list.filter((s) => progress.statusOf(s.id) === "done").length;
          return (
            <li key={c.id}>
              <button className="window chapter-card" onClick={() => navigate(`study/${c.id}`)}>
                <span className="window-bar" aria-hidden>
                  <span>chuong_{c.id}.mp4</span>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="chapter-body">
                  <span className={`chapter-no ${watched ? "chapter-no-done" : ""}`}>
                    {watched ? <Icon name="check" size={22} /> : c.id}
                  </span>
                  <span>
                    <span className="chapter-title">{c.title}</span>
                    <span className="chapter-sub">
                      {c.ibmCourse} · {questions.filter((q) => q.chapterId === c.id).length} câu · ôn xong {done}/
                      {list.length} section
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const ChapterPage = ({ id }: { id: number }) => {
  const { notebook } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const chapter = chapters.find((c) => c.id === id);
  const video = markersFor(id);
  if (!chapter) return <p className="empty">Không có chương {id}.</p>;
  const firstSection = sections.find((s) => s.chapterId === id);
  const prev = chapters.find((c) => c.id === id - 1);
  const next = chapters.find((c) => c.id === id + 1);

  return (
    <article className="chapter">
      <button className="back" onClick={() => navigate("study")}>
        <Icon name="back" size={16} /> Danh sách chương
      </button>
      <header className="page-head">
        <p className="kicker">Chương {chapter.id}</p>
        <h1>{chapter.title}</h1>
        <p className="muted">Tương ứng: {chapter.ibmCourse}</p>
      </header>

      <div className="window video-window">
        <div className="window-bar" aria-hidden>
          <span>chuong_{chapter.id}.mp4</span>
          <i />
          <i />
          <i />
        </div>
        <video
          ref={videoRef}
          className="video"
          controls
          preload="metadata"
          src={chapter.video}
          onEnded={() => notebook.markWatched(id)}
        >
          Trình duyệt không phát được video. Mở trực tiếp file {chapter.video}.
        </video>
      </div>

      {video && video.markers.length > 0 && (
        <nav className="markers" aria-label="Các đoạn trong video">
          {video.markers.map((m) => (
            <button
              key={m.title}
              className="marker"
              onClick={() => {
                const el = videoRef.current;
                if (!el) return;
                el.currentTime = m.start;
                void el.play().catch(() => undefined); // autoplay may be blocked; seeking still works
              }}
            >
              <span className="marker-time">{formatTime(m.start)}</span>
              {m.title}
            </button>
          ))}
          <span className="marker-total">Tổng {formatTime(video.duration)}</span>
        </nav>
      )}

      <p className="lead">{chapter.intro}</p>

      <div className="keypoints">
        {chapter.keyPoints.map((kp) => (
          <section key={kp.heading} className="keypoint">
            <h2>{kp.heading}</h2>
            {kp.body.split("\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>
        ))}
      </div>

      <section className="sources">
        <h2>Nguồn</h2>
        <ul>
          {chapter.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Ngoài ra còn dựa trên các câu hỏi trong đề thi FA25, SP26, SU26 FE, SU26 RE và 2 bộ Quizlet AID301c.
        </p>
      </section>

      <div className="row">
        {firstSection && (
          <button className="btn btn-primary" onClick={() => navigate(`review/${firstSection.id}`)}>
            Ôn câu hỏi chương này
          </button>
        )}
        {prev && (
          <button className="btn" onClick={() => navigate(`study/${prev.id}`)}>
            Chương {prev.id}
          </button>
        )}
        {next && (
          <button className="btn" onClick={() => navigate(`study/${next.id}`)}>
            Chương {next.id}
          </button>
        )}
      </div>
    </article>
  );
};
