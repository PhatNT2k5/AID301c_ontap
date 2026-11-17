import { useState } from "react";
import { AuditPage } from "./features/audit/AuditPage";
import { ReviewHome } from "./features/review/ReviewHome";
import { ReviewSession } from "./features/review/ReviewSession";
import { useProgress } from "./features/review/progress";
import { ChapterPage, StudyHome } from "./features/study/StudyPages";
import { loadJson, saveJson } from "./lib/storage";
import { navigate, useHashRoute } from "./lib/useHashRoute";

const tabs = [
  { path: "review", label: "Ôn tập" },
  { path: "study", label: "Học tập" },
  { path: "audit", label: "Cần kiểm tra" },
] as const;

export const App = () => {
  const [root = "review", param] = useHashRoute();
  const api = useProgress();
  const [soundOn, setSoundOn] = useState<boolean>(() => loadJson("sound", true));

  const toggleSound = () => {
    setSoundOn((on) => {
      saveJson("sound", !on);
      return !on;
    });
  };

  const page = (() => {
    if (root === "study") return param ? <ChapterPage id={Number(param)} /> : <StudyHome />;
    if (root === "audit") return <AuditPage />;
    return param ? <ReviewSession sectionId={param} api={api} soundOn={soundOn} /> : <ReviewHome api={api} />;
  })();

  return (
    <div className="shell">
      <nav className="topbar">
        <span className="brand">AID301c</span>
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.path}
              className={`tab ${root === t.path ? "tab-on" : ""}`}
              aria-current={root === t.path ? "page" : undefined}
              onClick={() => navigate(t.path)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="sound" onClick={toggleSound} aria-pressed={soundOn} title="Bật/tắt âm thanh">
          {soundOn ? "🔊" : "🔇"}
        </button>
      </nav>
      <main className="main">{page}</main>
    </div>
  );
};
