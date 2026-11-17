import { useCallback, useState } from "react";
import { sections } from "../../data";
import { loadJson, removeKey, saveJson } from "../../lib/storage";
import type { DrillRun } from "../../components/Drill";

export type SectionRun = DrillRun;

type Progress = {
  completed: string[];
  runs: Record<string, SectionRun>;
};

const KEY = "progress-v1";
const empty: Progress = { completed: [], runs: {} };

export type SectionStatus = "done" | "doing" | "new";

export const useProgress = () => {
  const [progress, setProgress] = useState<Progress>(() => loadJson(KEY, empty));

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      saveJson(KEY, next);
      return next;
    });
  }, []);

  // Every section is open; status only reflects what the learner has done.
  const statusOf = (sectionId: string): SectionStatus => {
    if (progress.completed.includes(sectionId)) return "done";
    return progress.runs[sectionId] ? "doing" : "new";
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

  // Suggest resuming an unfinished section first, otherwise the first one not done yet.
  const firstOpen =
    sections.find((s) => statusOf(s.id) === "doing") ?? sections.find((s) => statusOf(s.id) !== "done");

  return { progress, firstOpen, statusOf, getRun, saveRun, completeSection, resetSection, resetAll };
};

export type ProgressApi = ReturnType<typeof useProgress>;
