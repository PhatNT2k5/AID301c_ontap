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

// A meow is a buzzy source (sawtooth) whose pitch rises then falls, shaped by two band-pass
// "mouth" filters that move from an "ee" to an "ow" vowel as the mouth opens.
type Meow = {
  /** Pitch contour in Hz: start, peak, end. */
  pitch: [number, number, number];
  duration: number;
  start?: number;
  gain?: number;
};

const meow = (audio: AudioContext, m: Meow): void => {
  const t0 = audio.currentTime + (m.start ?? 0);
  const t1 = t0 + m.duration;
  const peakAt = t0 + m.duration * 0.35;

  const osc = audio.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(m.pitch[0], t0);
  osc.frequency.linearRampToValueAtTime(m.pitch[1], peakAt);
  osc.frequency.exponentialRampToValueAtTime(m.pitch[2], t1);

  // Slight vibrato so it does not sound like a synth note.
  const vib = audio.createOscillator();
  const vibDepth = audio.createGain();
  vib.frequency.value = 7;
  vibDepth.gain.value = m.pitch[1] * 0.015;
  vib.connect(vibDepth).connect(osc.frequency);

  const formant = (from: number, to: number, q: number): BiquadFilterNode => {
    const f = audio.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(to, t1);
    return f;
  };
  const f1 = formant(400, 800, 6); // jaw opening
  const f2 = formant(2600, 1100, 8); // "ee" -> "ow"

  const amp = audio.createGain();
  const peak = m.gain ?? 0.5;
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.04);
  amp.gain.setValueAtTime(peak, t1 - m.duration * 0.3);
  amp.gain.exponentialRampToValueAtTime(0.0001, t1);

  osc.connect(f1).connect(amp);
  osc.connect(f2).connect(amp);
  amp.connect(audio.destination);
  osc.start(t0);
  vib.start(t0);
  osc.stop(t1 + 0.05);
  vib.stop(t1 + 0.05);
};

/** Filtered noise: a hiss, or (low-passed and pulsed) a purr. */
const noise = (audio: AudioContext, kind: "hiss" | "purr", duration: number): void => {
  const t0 = audio.currentTime;
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource();
  src.buffer = buffer;

  const filter = audio.createBiquadFilter();
  const amp = audio.createGain();
  if (kind === "hiss") {
    filter.type = "highpass";
    filter.frequency.value = 2500;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(0.22, t0 + 0.06);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(amp).connect(audio.destination);
  } else {
    filter.type = "lowpass";
    filter.frequency.value = 180;
    // ~25 pulses a second, like a purring throat.
    const pulse = audio.createOscillator();
    const pulseDepth = audio.createGain();
    pulse.frequency.value = 25;
    pulseDepth.gain.value = 0.35;
    const level = audio.createGain();
    level.gain.setValueAtTime(0.0001, t0);
    level.gain.exponentialRampToValueAtTime(0.45, t0 + 0.3);
    level.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    amp.gain.value = 0.4;
    pulse.connect(pulseDepth).connect(amp.gain);
    src.connect(filter).connect(amp).connect(level).connect(audio.destination);
    pulse.start(t0);
    pulse.stop(t0 + duration);
  }
  src.start(t0);
  src.stop(t0 + duration);
};

export type CatSound = "mew" | "meow" | "sadMeow" | "trill" | "hiss" | "purr" | "doubleMew";

export const playCat = (sound: CatSound): void => {
  const audio = getContext();
  if (!audio) return;
  switch (sound) {
    case "mew": // short and bright: happy
      meow(audio, { pitch: [700, 1050, 820], duration: 0.32 });
      break;
    case "doubleMew": // excited: combo, finished a section
      meow(audio, { pitch: [700, 1050, 850], duration: 0.26 });
      meow(audio, { pitch: [760, 1150, 900], duration: 0.3, start: 0.3 });
      break;
    case "meow": // plain greeting
      meow(audio, { pitch: [520, 820, 560], duration: 0.6 });
      break;
    case "sadMeow": // long and falling
      meow(audio, { pitch: [640, 700, 380], duration: 0.85, gain: 0.4 });
      break;
    case "trill": // "mrrp?": quick rising chirp
      meow(audio, { pitch: [420, 560, 900], duration: 0.22, gain: 0.4 });
      break;
    case "hiss":
      noise(audio, "hiss", 0.7);
      break;
    case "purr":
      noise(audio, "purr", 1.6);
      break;
  }
};
