import { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { Frame } from "../shared/Frame";
import { Lecturer } from "../shared/Lecturer";
import { CodeTyping } from "../shared/scenes/CodeTyping";
import { Cycle } from "../shared/scenes/Cycle";
import { Compare } from "../shared/scenes/Compare";
import { Intro } from "../shared/scenes/Intro";
import { Matrix } from "../shared/scenes/Matrix";
import { Mnemonic } from "../shared/scenes/Mnemonic";
import { Pipeline } from "../shared/scenes/Pipeline";
import { Quiz } from "../shared/scenes/Quiz";
import { Stairs } from "../shared/scenes/Stairs";
import { Recap, Traps } from "../shared/scenes/Traps";
import type { Pose, Scene, Timeline } from "../shared/types";

const SceneBody = ({ scene }: { scene: Scene }) => {
  switch (scene.type) {
    case "cycle":
      return <Cycle data={scene.data} beats={scene.beats} />;
    case "code":
      return <CodeTyping data={scene.data} beats={scene.beats} />;
    case "quiz":
      return <Quiz data={scene.data} beats={scene.beats} />;
    case "intro":
      return <Intro data={scene.data} beats={scene.beats} />;
    case "stairs":
      return <Stairs data={scene.data} beats={scene.beats} />;
    case "mnemonic":
      return <Mnemonic data={scene.data} beats={scene.beats} />;
    case "pipeline":
      return <Pipeline data={scene.data} beats={scene.beats} />;
    case "compare":
      return <Compare data={scene.data} beats={scene.beats} />;
    case "matrix":
      return <Matrix data={scene.data} beats={scene.beats} />;
    case "traps":
      return <Traps data={scene.data} beats={scene.beats} />;
    case "recap":
      return <Recap data={scene.data} beats={scene.beats} />;
  }
};

/** Holds rendering until web fonts are ready so no frame is drawn with a fallback face. */
const useFontsReady = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

/** Pose of the scene on screen; a quiz turns happy once its answer is revealed. */
const poseAt = (scenes: Scene[], frame: number): Pose => {
  const scene = scenes.find((s) => frame >= s.from && frame < s.from + s.duration) ?? scenes[scenes.length - 1];
  if (!scene) return "idle";
  const reveal = scene.type === "quiz" ? scene.beats.reveal : undefined;
  return reveal !== undefined && frame - scene.from >= reveal ? "happy" : scene.pose;
};

/** From the question on, everything said in a quiz is already on screen (question, options,
 * answer, explanation), and with five or six options the bubble would cover the last row. */
const bubbleShown = (scenes: Scene[], frame: number): boolean => {
  const scene = scenes.find((s) => frame >= s.from && frame < s.from + s.duration);
  if (!scene || scene.type !== "quiz") return true;
  const local = frame - scene.from;
  const start = scene.beats.question;
  return start === undefined || local < start;
};

export const Chapter = (timeline: Timeline) => {
  useFontsReady();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Audio src={staticFile(timeline.audio)} />
      {timeline.scenes.map((scene, i) => (
        <Sequence key={i} from={scene.from} durationInFrames={scene.duration}>
          <Frame section={scene.section} headline={scene.headline}>
            <SceneBody scene={scene} />
          </Frame>
        </Sequence>
      ))}
      <Lecturer pose={poseAt(timeline.scenes, frame)} cues={timeline.cues} bubble={bubbleShown(timeline.scenes, frame)} />
    </AbsoluteFill>
  );
};
