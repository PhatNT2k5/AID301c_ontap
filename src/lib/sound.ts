// Sound effects synthesized with the Web Audio API, so no audio files are needed.
let ctx: AudioContext | null = null;
let master: AudioNode | null = null;

const getContext = (): AudioContext | null => {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

// Everything goes through a compressor so the effects can be loud without clipping.
const getOutput = (audio: AudioContext): AudioNode => {
  if (!master) {
    const compressor = audio.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 8;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.15;
    const volume = audio.createGain();
    volume.gain.value = 1.4;
    compressor.connect(volume).connect(audio.destination);
    master = compressor;
  }
  return master;
};

type Tone = {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  /** Pitch the tone glides to by its end. */
  slideTo?: number;
  /** Low-pass cutoff in Hz, to soften harsh waveforms. */
  lowpass?: number;
  /** Attack time in seconds; bells want a very short one. */
  attack?: number;
};

const playTones = (tones: Tone[]): void => {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  const output = getOutput(audio);
  for (const tone of tones) {
    const t0 = now + tone.start;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.slideTo) osc.frequency.exponentialRampToValueAtTime(tone.slideTo, t0 + tone.duration);
    const peak = tone.gain ?? 0.18;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + (tone.attack ?? 0.015));
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.duration);
    let node: AudioNode = osc;
    if (tone.lowpass) {
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = tone.lowpass;
      node = osc.connect(filter);
    }
    node.connect(amp).connect(output);
    osc.start(t0);
    osc.stop(t0 + tone.duration + 0.05);
  }
};

// A bell-like note: fundamental plus a quieter octave and a faint inharmonic shimmer.
const bell = (freq: number, start: number, duration: number, gain = 0.3): Tone[] => [
  { freq, start, duration, gain, attack: 0.003 },
  { freq: freq * 2, start, duration: duration * 0.6, gain: gain * 0.4, attack: 0.003 },
  { freq: freq * 2.76, start, duration: duration * 0.35, gain: gain * 0.15, attack: 0.003 },
];

// High twinkles scattered over the chime's tail, for a "sparkle" finish.
const sparkle = (start: number): Tone[] =>
  [3136, 4186, 3520, 4699, 3951].map((freq, i) => ({
    freq,
    start: start + i * 0.045,
    duration: 0.14,
    gain: 0.07,
    attack: 0.002,
  }));

/** Bright rising "ting-ting-ting!" chime with sparkles for a correct answer. */
export const playCorrect = (): void =>
  playTones([
    ...bell(1046.5, 0, 0.3), // C6
    ...bell(1318.5, 0.07, 0.3), // E6
    ...bell(1568, 0.14, 0.35), // G6
    ...bell(2093, 0.21, 0.8, 0.34), // C7
    ...sparkle(0.24),
  ]);

/** Punchy "buzz-buzz" for a wrong answer: two flat low notes over a soft thud, no pitch glide. */
export const playWrong = (): void =>
  playTones([
    { freq: 110, start: 0, duration: 0.25, gain: 0.35, attack: 0.003 },
    { freq: 233, start: 0, duration: 0.17, type: "square", gain: 0.16, lowpass: 1500 },
    { freq: 116.5, start: 0.18, duration: 0.3, gain: 0.35, attack: 0.003 },
    { freq: 175, start: 0.18, duration: 0.3, type: "square", gain: 0.16, lowpass: 1500 },
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

/** Silences any cat sound that is still playing. */
export const stopCat = (): void => {
  current?.pause();
  current = null;
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
