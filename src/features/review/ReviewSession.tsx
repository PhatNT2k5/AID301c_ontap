import { useState } from "react";
import { Drill, type DrillRun } from "../../components/Drill";
import { Icon } from "../../components/Icon";
import { chapters, sections } from "../../data";
import { playCelebrate } from "../../lib/sound";
import { navigate } from "../../lib/useHashRoute";
import { useStore } from "../../store";
import { AutoNextControl } from "./AutoNextControl";
import { SectionRecap } from "./SectionRecap";

const freshRun = (ids: string[]): DrillRun => ({ queue: [...ids], solved: [], mistakes: 0 });

type View = "drill" | "recap";

export const ReviewSession = ({ sectionId }: { sectionId: string }) => {
  const { progress: api, settings } = useStore();
  const section = sections.find((s) => s.id === sectionId);
  // Keyed by sectionId in App, so this initial state is per section.
  const savedRun = section ? api.getRun(section.id) : undefined;
  const [run, setRun] = useState<DrillRun | null>(() => (section ? (savedRun ?? freshRun(section.questionIds)) : null));
  // A finished section with nothing in progress opens on its review instead of a new drill.
  const [view, setView] = useState<View>(() =>
    section && !savedRun && api.statusOf(section.id) === "done" ? "recap" : "drill",
  );
  const [justFinished, setJustFinished] = useState(false);
  const [epoch, setEpoch] = useState(0); // bumps on restart to remount the drill

  if (!section || !run) return <p className="empty">Không tìm thấy section này.</p>;

  const chapter = chapters.find((c) => c.id === section.chapterId);
  const sectionNo = section.index + 1;
  const nextSection = sections[section.index + 1];

  const restart = () => {
    api.resetSection(section.id);
    setRun(freshRun(section.questionIds));
    setEpoch((e) => e + 1);
    setJustFinished(false);
    setView("drill");
  };

  if (view === "recap") {
    return (
      <SectionRecap
        title={`Xong section ${sectionNo}`}
        questionIds={section.questionIds}
        result={api.getResult(section.id)}
        justFinished={justFinished}
        actions={
          <>
            {nextSection && (
              <button className="btn btn-primary" autoFocus onClick={() => navigate(`review/${nextSection.id}`)}>
                Sang section {sectionNo + 1}
              </button>
            )}
            <button className="btn" onClick={restart}>
              Làm lại section này
            </button>
            <button className="btn" onClick={() => navigate("review")}>
              Về bản đồ section
            </button>
          </>
        }
      />
    );
  }

  return (
    <>
      <Drill
        key={epoch}
        run={run}
        autoNextMs={settings.autoNextOn ? settings.autoNextDelay * 1000 : undefined}
        header={
          <>
            <button className="back" onClick={() => navigate("review")}>
              <Icon name="back" size={16} /> Bản đồ section
            </button>
            <p className="session-title">
              Section {sectionNo}
              <span> · Chương {chapter?.id}. {chapter?.title}</span>
            </p>
            <AutoNextControl />
          </>
        }
        onChange={(next) => {
          setRun(next);
          api.saveRun(section.id, next);
        }}
        onFinish={(last) => {
          api.completeSection(section.id, last);
          setJustFinished(true);
          setView("recap");
          window.scrollTo({ top: 0 });
          if (settings.soundOn) playCelebrate();
        }}
      />
      <button className="link small" onClick={restart}>
        Làm lại section này từ đầu
      </button>
    </>
  );
};
