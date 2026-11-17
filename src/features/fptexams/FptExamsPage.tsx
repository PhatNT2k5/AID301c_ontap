import { useState } from "react";
import { Drill, type DrillRun } from "../../components/Drill";
import { Icon } from "../../components/Icon";
import { fptExams, type ExamPart, type FptExam } from "../../data";
import { playComplete } from "../../lib/sound";
import { navigate } from "../../lib/useHashRoute";
import { useStore } from "../../store";
import { startFixedExam } from "../exam/ExamPage";

type PartStatus = "done" | "doing" | "new";

const usePartStatus = () => {
  const { progress } = useStore();
  return (part: ExamPart): PartStatus =>
    progress.progress.completed.includes(part.id) ? "done" : progress.getRun(part.id) ? "doing" : "new";
};

export const FptExamsPage = ({ examId, partNo }: { examId?: string; partNo?: string }) => {
  const exam = fptExams.find((e) => e.id === examId);
  if (examId && !exam) return <p className="empty">Không tìm thấy đề {examId}.</p>;
  if (!exam) return <ExamList />;
  const part = exam.parts.find((p) => String(p.no) === partNo);
  if (part) return <PartDrill key={part.id} exam={exam} part={part} />;
  return <ExamDetail exam={exam} />;
};

/* ---------- list ---------- */

const ExamList = () => {
  const statusOf = usePartStatus();
  const terms = [...new Set(fptExams.map((e) => e.term))];

  return (
    <div>
      <header className="page-head">
        <h1>Đề thi FE</h1>
        <p className="lead">
          Đề cuối kỳ AID301c các kỳ trước, giữ đúng thứ tự câu như đề gốc. Mỗi đề chia thành các phần khoảng 20 câu để
          luyện, hoặc làm cả đề có hẹn giờ như thi thật.
        </p>
      </header>

      {terms.map((term) => {
        const list = fptExams.filter((e) => e.term === term);
        return (
          <section key={term} className="term">
            <h2 className="term-head">
              <span className="term-tag">{term}</span>
              <span className="term-name">{list[0].termName}</span>
            </h2>
            <ul className="exam-grid">
              {list.map((exam) => {
                const done = exam.parts.filter((p) => statusOf(p) === "done").length;
                const complete = done === exam.parts.length;
                return (
                  <li key={exam.id}>
                    <button
                      className={`window exam-card ${complete ? "exam-card-done" : ""}`}
                      onClick={() => navigate(`exams/${exam.id}`)}
                    >
                      <span className="window-bar" aria-hidden>
                        <span>{exam.id}.pdf</span>
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="exam-card-body">
                        <span className="exam-card-title">
                          {exam.label}
                          {complete && (
                            <span className="exam-done-mark" title="Đã luyện xong mọi phần">
                              <Icon name="check" size={16} />
                            </span>
                          )}
                        </span>
                        <span className="exam-card-sub">
                          {exam.questionIds.length} câu · {done}/{exam.parts.length} phần
                        </span>
                        <span className="meter">
                          <span className="meter-fill" style={{ width: `${(done / exam.parts.length) * 100}%` }} />
                        </span>
                        <span className="exam-card-note">{exam.answerNote}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

/* ---------- detail ---------- */

const partLabel: Record<PartStatus, string> = { done: "Đã xong", doing: "Đang làm", new: "Chưa làm" };

const ExamDetail = ({ exam }: { exam: FptExam }) => {
  const { progress } = useStore();
  const statusOf = usePartStatus();
  const minutes = Math.round((exam.questionIds.length * 72) / 60);

  return (
    <div>
      <button className="back" onClick={() => navigate("exams")}>
        <Icon name="back" size={16} /> Danh sách đề
      </button>
      <header className="page-head">
        <p className="kicker">
          {exam.term} · {exam.termName}
        </p>
        <h1>{exam.label}</h1>
        <p className="muted">
          {exam.questionIds.length} câu · {exam.answerNote}
        </p>
      </header>

      <section className="resume">
        <div>
          <p className="resume-big">Làm cả đề như thi thật</p>
          <p className="muted small">
            {exam.questionIds.length} câu theo thứ tự gốc, hẹn giờ {minutes} phút, nộp bài mới chấm điểm.
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => startFixedExam(exam.questionIds)}>
          Thi cả đề
        </button>
      </section>

      <h2>Luyện theo phần</h2>
      <p className="muted small">
        Sai câu nào thì câu đó quay lại cuối phần, đúng hết mới xong. Câu sai tự vào sổ tay.
      </p>
      <ol className="part-list">
        {exam.parts.map((part) => {
          const status = statusOf(part);
          const run = progress.getRun(part.id);
          return (
            <li key={part.id}>
              <button className={`part-row part-${status}`} onClick={() => navigate(`exams/${exam.id}/${part.no}`)}>
                <span className={`bubble bubble-${status === "done" ? "done" : status === "doing" ? "open" : "open-plain"}`}>
                  {part.no}
                </span>
                <span className="part-text">
                  <strong>Phần {part.no}</strong>
                  <span className="muted small">
                    Câu {part.from}–{part.to} · {part.questionIds.length} câu
                    {run && status === "doing" ? ` · đúng ${run.solved.length}` : ""}
                  </span>
                </span>
                <span className={`part-status status-${status}`}>{partLabel[status]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/* ---------- part drill ---------- */

const freshRun = (ids: string[]): DrillRun => ({ queue: [...ids], solved: [], mistakes: 0 });

const PartDrill = ({ exam, part }: { exam: FptExam; part: ExamPart }) => {
  const { progress, settings } = useStore();
  const [run, setRun] = useState<DrillRun>(() => progress.getRun(part.id) ?? freshRun(part.questionIds));
  const [finished, setFinished] = useState<DrillRun | null>(null);
  const [epoch, setEpoch] = useState(0);
  const nextPart = exam.parts.find((p) => p.no === part.no + 1);

  if (finished) {
    return (
      <div className="panel finish">
        <span className="finish-mark" aria-hidden>
          <Icon name="check" size={34} />
        </span>
        <h2>
          Xong phần {part.no} · {exam.term} {exam.label}
        </h2>
        <p>
          Đúng cả {part.questionIds.length} câu
          {finished.mistakes > 0 ? `, sai ${finished.mistakes} lượt trước khi đúng.` : " ngay lần đầu."}
        </p>
        <div className="row">
          {nextPart ? (
            <button className="btn btn-primary" autoFocus onClick={() => navigate(`exams/${exam.id}/${nextPart.no}`)}>
              Sang phần {nextPart.no}
            </button>
          ) : (
            <button className="btn btn-primary" autoFocus onClick={() => startFixedExam(exam.questionIds)}>
              Thi cả đề
            </button>
          )}
          <button className="btn" onClick={() => navigate(`exams/${exam.id}`)}>
            Về đề {exam.term}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Drill
        key={epoch}
        run={run}
        header={
          <>
            <button className="back" onClick={() => navigate(`exams/${exam.id}`)}>
              <Icon name="back" size={16} /> {exam.term} {exam.label}
            </button>
            <p className="session-title">
              Phần {part.no}
              <span>
                {" "}
                · câu {part.from}–{part.to} trong đề {exam.term}
              </span>
            </p>
          </>
        }
        onChange={(next) => {
          setRun(next);
          progress.saveRun(part.id, next);
        }}
        onFinish={(last) => {
          progress.completeSection(part.id);
          setFinished(last);
          if (settings.soundOn) playComplete();
        }}
      />
      <button
        className="link small"
        onClick={() => {
          progress.resetSection(part.id);
          setRun(freshRun(part.questionIds));
          setEpoch((e) => e + 1);
        }}
      >
        Làm lại phần này từ đầu
      </button>
    </>
  );
};
