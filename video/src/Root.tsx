import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import { Composition } from "remotion";
import type { Timeline } from "../shared/types";
import { Chapter } from "./Chapter";

const placeholder: Timeline = {
  chapter: 0,
  title: "",
  fps: 30,
  width: 1280,
  height: 720,
  durationInFrames: 30,
  audio: "audio/silence.wav",
  sections: [],
  scenes: [],
  cues: [],
};

// The real timeline is passed with --props (see pipeline/build.py); size and length come from it.
export const Root = () => (
  <Composition
    id="Chapter"
    component={Chapter}
    defaultProps={placeholder}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={30}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.durationInFrames,
      fps: props.fps,
      width: props.width,
      height: props.height,
    })}
  />
);
