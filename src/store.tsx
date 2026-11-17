import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useProgress, type ProgressApi } from "./features/review/progress";
import { loadJson, removeKey, saveJson } from "./lib/storage";

export type Theme = "system" | "light" | "dark";

export type ExamRecord = {
  at: number;
  total: number;
  correct: number;
  seconds: number;
};

type Notebook = {
  mistakes: Record<string, number>; // question id -> times answered wrong (cleared when re-learned)
  starred: string[];
  watched: number[]; // chapter ids whose video was played to the end
  exams: ExamRecord[];
};

const NOTEBOOK_KEY = "notebook-v1";
const emptyNotebook: Notebook = { mistakes: {}, starred: [], watched: [], exams: [] };

const usePersisted = <T,>(key: string, fallback: T) => {
  const [value, setValue] = useState<T>(() => loadJson(key, fallback));
  const update = useCallback(
    (fn: (prev: T) => T) =>
      setValue((prev) => {
        const next = fn(prev);
        saveJson(key, next);
        return next;
      }),
    [key],
  );
  return [value, update] as const;
};

const useNotebook = () => {
  const [book, update] = usePersisted<Notebook>(NOTEBOOK_KEY, emptyNotebook);
  // Older saves may miss fields added later.
  const nb: Notebook = { ...emptyNotebook, ...book };

  return {
    mistakes: nb.mistakes,
    starred: nb.starred,
    watched: nb.watched,
    exams: nb.exams,
    recordWrong: (id: string) =>
      update((p) => ({ ...emptyNotebook, ...p, mistakes: { ...p.mistakes, [id]: (p.mistakes?.[id] ?? 0) + 1 } })),
    clearMistake: (id: string) =>
      update((p) => {
        const { [id]: _gone, ...mistakes } = p.mistakes ?? {};
        return { ...emptyNotebook, ...p, mistakes };
      }),
    toggleStar: (id: string) =>
      update((p) => {
        const starred = p.starred ?? [];
        return { ...emptyNotebook, ...p, starred: starred.includes(id) ? starred.filter((x) => x !== id) : [...starred, id] };
      }),
    markWatched: (chapterId: number) =>
      update((p) => {
        const watched = p.watched ?? [];
        return watched.includes(chapterId) ? p : { ...emptyNotebook, ...p, watched: [...watched, chapterId] };
      }),
    addExam: (record: ExamRecord) =>
      update((p) => ({ ...emptyNotebook, ...p, exams: [record, ...(p.exams ?? [])].slice(0, 20) })),
    resetNotebook: () => {
      removeKey(NOTEBOOK_KEY);
      update(() => emptyNotebook);
    },
  };
};

const useSettings = () => {
  const [soundOn, setSound] = usePersisted<boolean>("sound", true);
  const [theme, setThemeValue] = usePersisted<Theme>("theme", "system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  return {
    soundOn,
    toggleSound: () => setSound((on) => !on),
    theme,
    setTheme: (t: Theme) => setThemeValue(() => t),
  };
};

type Store = {
  progress: ProgressApi;
  notebook: ReturnType<typeof useNotebook>;
  settings: ReturnType<typeof useSettings>;
};

const StoreContext = createContext<Store | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const store: Store = { progress: useProgress(), notebook: useNotebook(), settings: useSettings() };
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export const useStore = (): Store => {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
};
