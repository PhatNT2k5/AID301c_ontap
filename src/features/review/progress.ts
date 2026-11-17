import { useCallback, useState } from "react";
import { sections } from "../../data";
import { loadJson, removeKey, saveJson } from "../../lib/storage";

export type SectionRun = {
  queue: string[];
  solved: string[];
  mistakes: number;
};

type Progress = {
  completed: string[];
  runs: Record<string, SectionRun>;
};

const KEY = "progress-v1";
const empty: Progress = { completed: [], runs: {} };

export type SectionStatus = "done" | "open" | "locked";

export const useProgress = () => {
  const [progress, setProgress] = useState<Progress>(() => loadJson(KEY, empty));

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      saveJson(KEY, next);
      return next;
    });
  }, []);

  // A section unlocks only after every earlier section is complete.
  const statusOf = (sectionId: string): SectionStatus => {
    if (progress.completed.includes(sectionId)) return "done";
    const idx = sections.findIndex((s) => s.id === sectionId);
    const allBeforeDone = sections.slice(0, idx).every((s) => progress.completed.includes(s.id));
    return allBeforeDone ? "open" : "locked";
  };

  const getRun = (sectionId: string): SectionRun | undefined => progress.runs[sectionId];

  const saveRun = (sectionId: string, run: SectionRun) =>
    update((p) => ({ ...p, runs: { ...p.runs, [sectionId]: run } }));

  const completeSection = (sectionId: string) =>
    update((p) => {
      const { [sectionId]: _done, ...runs } = p.runs;
      return {
        completed: p.completed.includes(sectionId) ? p.completed : [...p.completed, sectionId],
        runs,
      };
    });

  const resetSection = (sectionId: string) =>
    update((p) => {
      const { [sectionId]: _old, ...runs } = p.runs;
      return { ...p, runs };
    });

  const resetAll = () => {
    removeKey(KEY);
    setProgress(empty);
  };

  return { progress, statusOf, getRun, saveRun, completeSection, resetSection, resetAll };
};

export type ProgressApi = ReturnType<typeof useProgress>;
