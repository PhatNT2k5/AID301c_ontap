// Sound effects synthesized with the Web Audio API, so no audio files are needed.
let ctx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

type Tone = {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

const playTones = (tones: Tone[]): void => {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  for (const tone of tones) {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);
    const peak = tone.gain ?? 0.18;
    amp.gain.setValueAtTime(0.0001, now + tone.start);
    amp.gain.exponentialRampToValueAtTime(peak, now + tone.start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
    osc.connect(amp).connect(audio.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.duration + 0.05);
  }
};

export const playCorrect = (): void =>
  playTones([
    { freq: 880, start: 0, duration: 0.12 },
    { freq: 1318.5, start: 0.08, duration: 0.25 },
  ]);

export const playWrong = (): void =>
  playTones([
    { freq: 196, start: 0, duration: 0.18, type: "sawtooth", gain: 0.08 },
    { freq: 155.6, start: 0.16, duration: 0.3, type: "sawtooth", gain: 0.08 },
  ]);

export const playComplete = (): void =>
  playTones(
    [523.25, 659.25, 783.99, 1046.5, 1318.5].map((freq, i) => ({
      freq,
      start: i * 0.1,
      duration: i === 4 ? 0.6 : 0.2,
      type: "triangle" as OscillatorType,
      gain: 0.16,
    })),
  );

/* ---------- MeoLearn cat sounds ---------- */

// Cat sounds synthesized offline by scripts/synth_cat_sounds.py into public/pet/sounds
// (clean, no recording noise). Each sound may have a few takes.
export type CatSound = "mew" | "meow" | "sadMeow" | "trill" | "hiss" | "purr" | "doubleMew";

const CAT_FILES: Record<CatSound, string[]> = {
  mew: ["happy"],
  doubleMew: ["extra2"],
  meow: ["idle"],
  sadMeow: ["sad"],
  trill: ["curious"],
  hiss: ["hiss"],
  purr: ["purr"],
};

const CAT_VOLUME = 0.55;
let current: HTMLAudioElement | null = null;
const cache = new Map<string, HTMLAudioElement>();

const clip = (name: string): HTMLAudioElement => {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`pet/sounds/${name}.mp3`);
    audio.preload = "auto";
    audio.volume = CAT_VOLUME;
    cache.set(name, audio);
  }
  return audio;
};

/** Plays one take of a cat sound; a new sound cuts off the one still playing. */
export const playCat = (sound: CatSound): void => {
  const takes = CAT_FILES[sound];
  const audio = clip(takes[Math.floor(Math.random() * takes.length)]);
  if (current && current !== audio) current.pause();
  current = audio;
  audio.currentTime = 0;
  // Autoplay rules can block sound before the first click; the pet simply stays quiet then.
  void audio.play().catch(() => undefined);
};
