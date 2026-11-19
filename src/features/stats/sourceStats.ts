import { chapters, questions } from "../../data";
import type { Question } from "../../types";

// Fixed order = fixed colour slot: a source keeps its colour on every chart and filter.
export const SOURCES = [
  { id: "SU26 FE", label: "SU26 FE", kind: "Đề FPT" },
  { id: "SU26 RE", label: "SU26 RE", kind: "Đề FPT" },
  { id: "SP26 FE", label: "SP26 FE", kind: "Đề FPT" },
  { id: "FA25 FE", label: "FA25 FE", kind: "Đề FPT" },
  { id: "Quizlet 1", label: "Quizlet 1", kind: "Bộ Quizlet" },
  { id: "Quizlet 2", label: "Quizlet 2", kind: "Bộ Quizlet" },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];

export type SourceSlice = { id: SourceId; label: string; kind: string; slot: number; count: number; share: number };

export type ScopeStats = {
  /** Distinct questions in the scope. */
  questions: number;
  /** Source appearances: a question found in 3 sources counts 3 times. */
  appearances: number;
  /** Questions that appear in two or more different sources. */
  repeated: number;
  slices: SourceSlice[];
};

// "SU26 FE #12" -> "SU26 FE"
const sourceOf = (raw: string): string => raw.replace(/\s*#\d+$/, "");

const distinctSources = (q: Question): Set<string> => new Set(q.sources.map(sourceOf));

const statsFor = (list: Question[]): ScopeStats => {
  const counts = new Map<string, number>();
  let repeated = 0;
  for (const q of list) {
    const set = distinctSources(q);
    if (set.size > 1) repeated += 1;
    for (const s of set) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const appearances = SOURCES.reduce((sum, s) => sum + (counts.get(s.id) ?? 0), 0);
  return {
    questions: list.length,
    appearances,
    repeated,
    slices: SOURCES.map((s, slot) => {
      const count = counts.get(s.id) ?? 0;
      return { ...s, slot, count, share: appearances ? count / appearances : 0 };
    }),
  };
};

export const overallStats = statsFor(questions);

export const chapterStats = chapters.map((c) => ({
  chapter: c,
  stats: statsFor(questions.filter((q) => q.chapterId === c.id)),
}));
