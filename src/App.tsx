import { Icon, type IconName } from "./components/Icon";
import { Doodles } from "./components/Doodles";
import { Pet } from "./features/pet/Pet";
import { ExamPage } from "./features/exam/ExamPage";
import { FptExamsPage } from "./features/fptexams/FptExamsPage";
import { LookupPage } from "./features/lookup/LookupPage";
import { NotebookPage } from "./features/notebook/NotebookPage";
import { ReviewHome } from "./features/review/ReviewHome";
import { ReviewSession } from "./features/review/ReviewSession";
import { ChapterPage, StudyHome } from "./features/study/StudyPages";
import { navigate, useHashRoute } from "./lib/useHashRoute";
import { useStore, type Theme } from "./store";

const tabs: { path: string; label: string; icon: IconName }[] = [
  { path: "review", label: "Ôn tập", icon: "review" },
  { path: "exams", label: "Đề thi", icon: "paper" },
  { path: "exam", label: "Thi thử", icon: "exam" },
  { path: "notebook", label: "Sổ tay", icon: "notebook" },
  { path: "study", label: "Học tập", icon: "study" },
  { path: "lookup", label: "Tra cứu", icon: "search" },
];

const themeOrder: Theme[] = ["system", "light", "dark"];
const themeIcon: Record<Theme, IconName> = { system: "auto", light: "sun", dark: "moon" };
const themeLabel: Record<Theme, string> = { system: "Theo máy", light: "Sáng", dark: "Tối" };

const Settings = () => {
  const { settings } = useStore();
  const nextTheme = themeOrder[(themeOrder.indexOf(settings.theme) + 1) % themeOrder.length];
  return (
    <div className="settings">
      <button
        className="icon-btn"
        onClick={settings.toggleSound}
        aria-pressed={settings.soundOn}
        title={settings.soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
      >
        <Icon name={settings.soundOn ? "soundOn" : "soundOff"} />
      </button>
      <button
        className="icon-btn"
        onClick={() => settings.setTheme(nextTheme)}
        title={`Giao diện: ${themeLabel[settings.theme]} (bấm để đổi sang ${themeLabel[nextTheme]})`}
      >
        <Icon name={themeIcon[settings.theme]} />
      </button>
      <button
        className="icon-btn"
        onClick={settings.togglePet}
        aria-pressed={settings.petOn}
        title={settings.petOn ? "Ẩn pet" : "Hiện pet"}
      >
        <Icon name="paw" />
      </button>
    </div>
  );
};

export const App = () => {
  const [root = "review", param, sub] = useHashRoute();
  const { notebook } = useStore();
  const mistakes = Object.keys(notebook.mistakes).length;
  const active = root === "audit" ? "lookup" : root;

  const page = (() => {
    switch (root) {
      case "exams":
        return <FptExamsPage key={`${param}-${sub}`} examId={param} partNo={sub} />;
      case "exam":
        return <ExamPage />;
      case "notebook":
        return <NotebookPage key={param ?? "list"} drill={param} />;
      case "study":
        return param ? <ChapterPage key={param} id={Number(param)} /> : <StudyHome />;
      case "lookup":
        return <LookupPage />;
      case "audit":
        return <LookupPage initialFilter="review" />;
      default:
        return param ? <ReviewSession key={param} sectionId={param} /> : <ReviewHome />;
    }
  })();

  return (
    <div className="shell">
      <Doodles />
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("review")}>
          <span className="brand-mark" aria-hidden>
            <Icon name="star" filled size={22} />
          </span>
          <span>
            AID301c
            <small>ôn thi cuối kỳ</small>
          </span>
        </button>
        <nav className="nav" aria-label="Mục chính">
          {tabs.map((t) => (
            <button
              key={t.path}
              className={`nav-item ${active === t.path ? "nav-on" : ""}`}
              aria-current={active === t.path ? "page" : undefined}
              onClick={() => navigate(t.path)}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
              {t.path === "notebook" && mistakes > 0 && <span className="nav-count">{mistakes}</span>}
            </button>
          ))}
        </nav>
        <Settings />
      </aside>
      <main className="main">{page}</main>
      <Pet />
    </div>
  );
};
