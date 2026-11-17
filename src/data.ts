import questionsJson from "../data/questions.json";
import chaptersJson from "../data/chapters.json";
import type { Chapter, Question, Section } from "./types";

export const questions = questionsJson as Question[];
export const chapters = chaptersJson as Chapter[];

export const questionById = new Map(questions.map((q) => [q.id, q]));

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
