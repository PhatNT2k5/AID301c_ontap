export type AnswerSource = "official" | "quizlet" | "comment" | "ai";

export type Option = {
  key: string;
  text: string;
};

export type Question = {
  id: string;
  question: string;
  code?: string;
  options: Option[];
  answer: string[];
  multi: boolean;
  explanation: string;
  chapterId: number;
  sources: string[];
  answerSource: AnswerSource;
  needsReview: boolean;
  reviewReason?: string;
};

export type SourceLink = {
  label: string;
  url: string;
};

export type Chapter = {
  id: number;
  title: string;
  ibmCourse: string;
  intro: string;
  keyPoints: { heading: string; body: string }[];
  video: string;
  sources: SourceLink[];
};

export type Section = {
  id: string;
  index: number;
  chapterId: number;
  questionIds: string[];
};
