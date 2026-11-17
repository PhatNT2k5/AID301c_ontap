import { useState } from "react";
import { Drill, type DrillRun } from "../../components/Drill";
import { Icon } from "../../components/Icon";
import { QuestionCompact } from "../lookup/LookupPage";
import { questionById } from "../../data";
import { playComplete } from "../../lib/sound";
import { shuffle } from "../../lib/text";
import { navigate } from "../../lib/useHashRoute";
import { useStore } from "../../store";

type Tab = "mistakes" | "starred";

export const NotebookPage = ({ drill }: { drill?: string }) => {
  if (drill === "mistakes" || drill === "starred") return <NotebookDrill kind={drill} />;
  return <NotebookList />;
};

const NotebookList = () => {
  const { notebook } = useStore();
  const [tab, setTab] = useState<Tab>("mistakes");
  const mistakeIds = Object.entries(notebook.mistakes)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => questionById.has(id));
  const starredIds = notebook.starred.filter((id) => questionById.has(id));
  const ids = tab === "mistakes" ? mistakeIds : starredIds;

  return (
    <div>
      <header className="page-head">
        <h1>Sổ tay</h1>
        <p className="lead">
          Câu bạn từng làm sai (trong section hoặc thi thử) tự vào đây. Luyện lại đúng một lần thì câu đó rời sổ. Bấm
          ngôi sao ở bất kỳ câu nào để giữ lại xem sau.
        </p>
      </header>

      <div className="list-head">
        <div className="seg">
          <button className={tab === "mistakes" ? "seg-on" : ""} onClick={() => setTab("mistakes")}>
            Câu sai ({mistakeIds.length})
          </button>
          <button className={tab === "starred" ? "seg-on" : ""} onClick={() => setTab("starred")}>
            Đánh dấu ({starredIds.length})
          </button>
        </div>
        {ids.length > 0 && (
          <button className="btn btn-primary" onClick={() => navigate(`notebook/${tab}`)}>
            Luyện {ids.length} câu
          </button>
        )}
      </div>

      {ids.length === 0 ? (
        <div className="panel center empty-state">
          <Icon name={tab === "mistakes" ? "check" : "star"} size={28} />
          <p>
            {tab === "mistakes"
              ? "Chưa có câu sai nào. Làm section hoặc thi thử, câu nào sai sẽ hiện ở đây."
              : "Chưa đánh dấu câu nào. Bấm ngôi sao trên thẻ câu hỏi để thêm."}
          </p>
        </div>
      ) : (
        <ol className="card-list">
          {ids.map((id) => {
            const q = questionById.get(id);
            if (!q) return null;
            return (
              <li key={id}>
                <QuestionCompact
                  question={q}
                  note={tab === "mistakes" ? `Sai ${notebook.mistakes[id]} lần` : undefined}
                />
              </li>
            );
          })}
        </ol>
      )}

      {(mistakeIds.length > 0 || starredIds.length > 0) && (
        <button
          className="link small danger"
          onClick={() => {
            if (window.confirm("Xoá toàn bộ sổ tay (câu sai, đánh dấu, lịch sử thi thử)?")) notebook.resetNotebook();
          }}
        >
          Xoá sổ tay
        </button>
      )}
    </div>
  );
};

const NotebookDrill = ({ kind }: { kind: Tab }) => {
  const { notebook, settings } = useStore();
  const [run, setRun] = useState<DrillRun>(() => {
    const ids = kind === "mistakes" ? Object.keys(notebook.mistakes) : notebook.starred;
    return { queue: shuffle(ids.filter((id) => questionById.has(id))), solved: [], mistakes: 0 };
  });
  const [done, setDone] = useState<DrillRun | null>(null);
  const label = kind === "mistakes" ? "câu sai" : "câu đánh dấu";

  if (done || run.queue.length === 0) {
    return (
      <div className="panel finish">
        <span className="finish-mark" aria-hidden>
          <Icon name="check" size={34} />
        </span>
        <h2>Xong lượt luyện {label}</h2>
        {done && (
          <p>
            Đúng cả {done.solved.length} câu{done.mistakes > 0 ? `, sai ${done.mistakes} lượt trước khi đúng.` : "."}
          </p>
        )}
        <div className="row">
          <button className="btn btn-primary" autoFocus onClick={() => navigate("notebook")}>
            Về sổ tay
          </button>
        </div>
      </div>
    );
  }

  return (
    <Drill
      run={run}
      header={
        <>
          <button className="back" onClick={() => navigate("notebook")}>
            <Icon name="back" size={16} /> Sổ tay
          </button>
          <p className="session-title">Luyện {label}</p>
        </>
      }
      onChange={setRun}
      onCorrect={(id) => {
        if (kind === "mistakes") notebook.clearMistake(id);
      }}
      onFinish={(last) => {
        setDone(last);
        if (settings.soundOn) playComplete();
      }}
    />
  );
};
