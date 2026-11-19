// Timeline produced by pipeline/build.py from chapters/chN.script.json + measured audio.
// All times are frames at 30 fps; scene beats are relative to the scene start.

export type Pose = "idle" | "curious" | "happy" | "sad" | "angry" | "sleepy";

export type CycleData = {
  center: string;
  centerSub?: { text: string; beat: string }[];
  nodes: { id: string; label: string }[];
};

export type CodeData = {
  lines: { text: string; beat?: string; marks?: { text: string; beat: string }[] }[];
  stages: { id: string; label: string; hint: string }[];
};

export type QuizData = {
  questionId: string;
  question: string;
  options: { key: string; text: string }[];
  answer: string[];
  multi: boolean;
  explain: string;
};

export type IntroData = { chapterNo: number; course: string; stops: { id: string; label: string }[] };

export type StairsData = { steps: { id: string; label: string; caption?: string }[] };

export type MnemonicData = {
  phrase?: string;
  items: { id: string; letter: string; word: string; gloss?: string; highlight?: boolean }[];
};

export type PipelineData = { stages: { id: string; label: string; items: { id: string; text: string }[] }[] };

export type CompareSide = {
  title: string;
  tone: "good" | "bad" | "neutral";
  items: { id: string; text: string }[];
};
export type CompareData = { left: CompareSide; right: CompareSide; verdict?: { id: string; text: string } };

export type MatrixData = {
  rows: number[][];
  triples: { id: string; r: number; c: number }[];
  note?: { id: string; text: string };
};

export type TrapsData = { traps: { id: string; wrong: string; right: string }[] };

export type RecapData = { items: { id: string; text: string }[] };

type SceneBase = {
  from: number;
  duration: number;
  pose: Pose;
  headline?: string;
  section: string;
  beats: Record<string, number>;
};

export type Scene =
  | (SceneBase & { type: "cycle"; data: CycleData })
  | (SceneBase & { type: "code"; data: CodeData })
  | (SceneBase & { type: "quiz"; data: QuizData })
  | (SceneBase & { type: "intro"; data: IntroData })
  | (SceneBase & { type: "stairs"; data: StairsData })
  | (SceneBase & { type: "mnemonic"; data: MnemonicData })
  | (SceneBase & { type: "pipeline"; data: PipelineData })
  | (SceneBase & { type: "compare"; data: CompareData })
  | (SceneBase & { type: "matrix"; data: MatrixData })
  | (SceneBase & { type: "traps"; data: TrapsData })
  | (SceneBase & { type: "recap"; data: RecapData });

export type Cue = { text: string; from: number; to: number };

export type Timeline = {
  chapter: number;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  audio: string; // path inside video/public
  sections: { id: string; title: string; from: number }[];
  scenes: Scene[];
  cues: Cue[];
};
