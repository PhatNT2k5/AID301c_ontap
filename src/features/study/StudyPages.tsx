import { chapters, questions, sections } from "../../data";
import { navigate } from "../../lib/useHashRoute";

export const StudyHome = () => (
  <div>
    <section className="intro">
      <h1>Học tập</h1>
      <p>
        FPT không công khai slide hay đề cương AID301c. Nội dung đề thi bám sát chuỗi khóa{" "}
        <a href="https://www.coursera.org/specializations/ibm-ai-workflow" target="_blank" rel="noreferrer">
          IBM AI Enterprise Workflow
        </a>{" "}
        trên Coursera, nên 6 chương dưới đây đi theo 6 khóa của chuỗi đó. Mỗi chương có video thuyết minh khoảng 5
        phút, tóm tắt ý chính và nguồn tham khảo.
      </p>
    </section>
    <ol className="chapter-list">
      {chapters.map((c) => (
        <li key={c.id}>
          <button className="chapter-row" onClick={() => navigate(`study/${c.id}`)}>
            <span className="chapter-no">{c.id}</span>
            <span>
              <span className="chapter-title">{c.title}</span>
              <span className="muted small block">
                {c.ibmCourse} · {questions.filter((q) => q.chapterId === c.id).length} câu ôn tập
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  </div>
);

export const ChapterPage = ({ id }: { id: number }) => {
  const chapter = chapters.find((c) => c.id === id);
  if (!chapter) return <p className="empty">Không có chương {id}.</p>;
  const firstSection = sections.find((s) => s.chapterId === id);
  const prev = chapters.find((c) => c.id === id - 1);
  const next = chapters.find((c) => c.id === id + 1);

  return (
    <article className="chapter">
      <button className="link" onClick={() => navigate("study")}>← Danh sách chương</button>
      <h1>
        Chương {chapter.id}. {chapter.title}
      </h1>
      <p className="muted">Tương ứng: {chapter.ibmCourse}</p>

      <video className="video" controls preload="metadata" src={chapter.video}>
        Trình duyệt không phát được video. Mở trực tiếp file {chapter.video}.
      </video>

      <p className="lead">{chapter.intro}</p>

      {chapter.keyPoints.map((kp) => (
        <section key={kp.heading} className="keypoint">
          <h2>{kp.heading}</h2>
          {kp.body.split("\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </section>
      ))}

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
          <button className="btn btn-primary" onClick={() => navigate("review")}>
            Ôn tập câu hỏi chương này
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
