import { useState } from "react";
import { Drill, type DrillRun } from "../../components/Drill";
import { Icon } from "../../components/Icon";
import { chapters, sections } from "../../data";
import { playComplete } from "../../lib/sound";
import { navigate } from "../../lib/useHashRoute";
import { useStore } from "../../store";

const freshRun = (ids: string[]): DrillRun => ({ queue: [...ids], solved: [], mistakes: 0 });

export const ReviewSession = ({ sectionId }: { sectionId: string }) => {
  const { progress: api, settings } = useStore();
  const section = sections.find((s) => s.id === sectionId);
  // Keyed by sectionId in App, so this initial state is per section.
  const [run, setRun] = useState<DrillRun | null>(() =>
    section ? (api.getRun(section.id) ?? freshRun(section.questionIds)) : null,
  );
  const [finished, setFinished] = useState<DrillRun | null>(null);
  const [epoch, setEpoch] = useState(0); // bumps on restart to remount the drill

  if (!section || !run) return <p className="empty">Không tìm thấy section này.</p>;

  const chapter = chapters.find((c) => c.id === section.chapterId);
  const sectionNo = section.index + 1;
  const nextSection = sections[section.index + 1];

  const back = (
    <button className="back" onClick={() => navigate("review")}>
      <Icon name="back" size={16} /> Bản đồ section
    </button>
  );

  if (finished) {
    return (
      <div className="panel finish">
        <span className="finish-mark" aria-hidden>
          <Icon name="check" size={34} />
        </span>
        <h2>Xong section {sectionNo}</h2>
        <p>
          Bạn đã trả lời đúng cả {section.questionIds.length} câu
          {finished.mistakes > 0 ? `, sai ${finished.mistakes} lượt trước khi đúng.` : " ngay lần đầu."}
        </p>
        <div className="row">
          {nextSection && (
            <button className="btn btn-primary" autoFocus onClick={() => navigate(`review/${nextSection.id}`)}>
              Sang section {sectionNo + 1}
            </button>
          )}
          <button className="btn" onClick={() => navigate("review")}>
            Về bản đồ section
          </button>
        </div>
      </div>
    );
  }

  const restart = () => {
    api.resetSection(section.id);
    setRun(freshRun(section.questionIds));
    setEpoch((e) => e + 1);
  };

  return (
    <>
      <Drill
        key={epoch}
        run={run}
        header={
          <>
            {back}
            <p className="session-title">
              Section {sectionNo}
              <span> · Chương {chapter?.id}. {chapter?.title}</span>
            </p>
          </>
        }
        onChange={(next) => {
          setRun(next);
          api.saveRun(section.id, next);
        }}
        onFinish={(last) => {
          api.completeSection(section.id);
          setFinished(last);
          if (settings.soundOn) playComplete();
        }}
      />
      <button className="link small" onClick={restart}>
        Làm lại section này từ đầu
      </button>
    </>
  );
};
