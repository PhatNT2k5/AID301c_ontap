import questionsJson from "../data/questions.json";
import chaptersJson from "../data/chapters.json";
import markersJson from "../data/video-markers.json";
import type { Chapter, Question, Section } from "./types";

export const questions = questionsJson as Question[];
export const chapters = chaptersJson as Chapter[];

export const questionById = new Map(questions.map((q) => [q.id, q]));

export type VideoMarker = { title: string; start: number };
type MarkerFile = Record<string, { duration: number; markers: VideoMarker[] }>;
// Written by video/pipeline/build.py after each chapter render.
const videoMarkers = markersJson as MarkerFile;
export const markersFor = (chapterId: number): { duration: number; markers: VideoMarker[] } | undefined =>
  videoMarkers[String(chapterId)];

const TARGET_SECTION_SIZE = 10;

// Split each chapter's questions into near-equal chunks of ~10 so no section is tiny.
const buildSections = (): Section[] => {
  const result: Section[] = [];
  for (const chapter of chapters) {
    const ids = questions.filter((q) => q.chapterId === chapter.id).map((q) => q.id);
    if (ids.length === 0) continue;
    const count = Math.max(1, Math.round(ids.length / TARGET_SECTION_SIZE));
    const base = Math.floor(ids.length / count);
    const extra = ids.length % count;
    let cursor = 0;
    for (let i = 0; i < count; i++) {
      const size = base + (i < extra ? 1 : 0);
      result.push({
        id: `s${result.length + 1}`,
        index: result.length,
        chapterId: chapter.id,
        questionIds: ids.slice(cursor, cursor + size),
      });
      cursor += size;
    }
  }
  return result;
};

export const sections = buildSections();

export const reviewReasonLabel = (q: Question): string => {
  if (q.reviewReason) return q.reviewReason;
  switch (q.answerSource) {
    case "ai":
      return "Đáp án do AI giải";
    case "comment":
      return "Đáp án theo bình luận";
    default:
      return "Cần kiểm tra";
  }
};

/* ---------- FPT final exams (kept in original question order) ---------- */

export type ExamPart = { id: string; no: number; from: number; to: number; questionIds: string[] };
export type FptExam = {
  id: string;
  term: string;
  termName: string;
  label: string;
  answerNote: string;
  questionIds: string[];
  parts: ExamPart[];
};

const EXAM_DEFS = [
  { source: "SU26 FE", term: "SU26", termName: "Summer 2026", label: "Đề FE", answerNote: "Đáp án tham khảo đi kèm đề" },
  { source: "SU26 RE", term: "SU26", termName: "Summer 2026", label: "Đề RE (thi lại)", answerNote: "Đáp án tham khảo đi kèm đề" },
  { source: "SP26 FE", term: "SP26", termName: "Spring 2026", label: "Đề FE", answerNote: "Đáp án lấy theo bình luận, nên kiểm tra lại" },
  { source: "FA25 FE", term: "FA25", termName: "Fall 2025", label: "Đề FE", answerNote: "Đáp án do AI giải, nên kiểm tra lại" },
] as const;

const PART_TARGET = 20;

const splitParts = (examId: string, ids: string[]): ExamPart[] => {
  const count = Math.max(1, Math.round(ids.length / PART_TARGET));
  const base = Math.floor(ids.length / count);
  const extra = ids.length % count;
  const parts: ExamPart[] = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0);
    parts.push({
      id: `${examId}-p${i + 1}`,
      no: i + 1,
      from: cursor + 1,
      to: cursor + size,
      questionIds: ids.slice(cursor, cursor + size),
    });
    cursor += size;
  }
  return parts;
};

const numberIn = (q: Question, source: string): number | null => {
  for (const s of q.sources) {
    const m = s.match(/^(.+?)\s*#(\d+)$/);
    if (m && m[1] === source) return Number(m[2]);
  }
  return null;
};

export const fptExams: FptExam[] = EXAM_DEFS.map((def) => {
  const id = def.source.toLowerCase().replace(/\s+/g, "-");
  const questionIds = questions
    .map((q) => ({ q, n: numberIn(q, def.source) }))
    .filter((x): x is { q: Question; n: number } => x.n !== null)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.q.id);
  return { ...def, id, questionIds, parts: splitParts(id, questionIds) };
});
