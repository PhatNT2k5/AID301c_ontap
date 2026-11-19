"""Synthesize MeoLearn's cat sounds offline (no recordings, no background noise).

Meows use a source-filter voice model: a glottal pulse train (additive harmonics with a
natural spectral tilt, pitch jitter and vibrato) plus breath noise, passed through three
time-varying formant resonators that move through an "m-i-a-o" mouth shape scaled for a
cat's short vocal tract. The purr is a ~25 Hz train of low noise bursts that alternates
inhale/exhale; the hiss is shaped noise with a spit burst and flutter.

Usage: .venv/Scripts/python scripts/synth_cat_sounds.py [out_dir]   (default public/pet/sounds)
"""

from __future__ import annotations

import subprocess
import sys
import wave
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
RNG = np.random.default_rng(7)  # fixed seed: the same files every run
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "public" / "pet" / "sounds"


def contour(points: list[tuple[float, float]], n: int) -> np.ndarray:
    """Smooth curve through (time fraction, value) points, sampled n times."""
    xs, ys = zip(*points)
    t = np.linspace(0, 1, n)
    curve = np.interp(t, xs, ys)
    # Light smoothing so corners in the breakpoints do not click.
    k = max(1, n // 200)
    return np.convolve(np.pad(curve, k, mode="edge"), np.ones(2 * k + 1) / (2 * k + 1), mode="valid")


def glottal_source(f0: np.ndarray, tilt: float = 1.05) -> np.ndarray:
    """Band-limited pulse train: harmonics up to 9 kHz with amplitude 1/k^tilt."""
    phase = 2 * np.pi * np.cumsum(f0) / SR
    out = np.zeros_like(f0)
    top = int(9000 / f0.min())
    for k in range(1, top + 1):
        alive = (k * f0 < 9000).astype(float)  # drop a harmonic once it would alias
        out += alive * np.sin(k * phase + RNG.uniform(0, 2 * np.pi)) / k**tilt
    return out / np.abs(out).max()


def resonate(x: np.ndarray, freq: np.ndarray, bw: float) -> np.ndarray:
    """Two-pole resonator whose centre frequency follows `freq` sample by sample."""
    r = np.exp(-np.pi * bw / SR)
    a1 = -2 * r * np.cos(2 * np.pi * freq / SR)
    a2 = r * r
    gain = 1 - r
    y = np.zeros_like(x)
    y1 = y2 = 0.0
    for i in range(len(x)):  # time-varying, so a plain loop (clips are short)
        v = gain * x[i] - a1[i] * y1 - a2 * y2
        y[i] = v
        y2, y1 = y1, v
    return y


def band(x: np.ndarray, lo: float | None, hi: float | None, order: int = 4) -> np.ndarray:
    if lo and hi:
        sos = butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    elif lo:
        sos = butter(order, lo, btype="highpass", fs=SR, output="sos")
    else:
        sos = butter(order, hi, btype="lowpass", fs=SR, output="sos")
    return sosfilt(sos, x)


@dataclass
class Meow:
    duration: float
    pitch: list[tuple[float, float]]  # (time fraction, Hz)
    breath: float = 0.12
    vibrato: float = 0.012
    loud: list[tuple[float, float]] | None = None  # amplitude envelope breakpoints


# Mouth shape over time: "m" (closed) -> "i" -> "a" (open) -> "o/w" (rounding).
F1 = [(0, 650), (0.12, 900), (0.45, 1350), (0.8, 1000), (1, 800)]
F2 = [(0, 1900), (0.12, 2500), (0.45, 2050), (0.8, 1500), (1, 1300)]
F3 = [(0, 3600), (0.3, 4000), (1, 3500)]


def meow(m: Meow) -> np.ndarray:
    n = int(SR * m.duration)
    t = np.arange(n) / SR
    f0 = contour(m.pitch, n)
    jitter = np.cumsum(RNG.normal(0, 1, n))
    jitter = band(jitter - jitter.mean(), None, 18, order=2)
    f0 = f0 * (1 + m.vibrato * np.sin(2 * np.pi * 5.5 * t) + 0.04 * jitter / (np.abs(jitter).max() + 1e-9))
    src = glottal_source(f0)
    breath = band(RNG.normal(0, 1, n), 1500, 7000) * m.breath
    excitation = src + breath

    f1, f2, f3 = (contour(F, n) for F in (F1, F2, F3))
    # Cats put most energy at 1-4 kHz, so the upper formants are weighted up.
    voice = resonate(excitation, f1, 170) * 1.0 + resonate(excitation, f2, 200) * 1.3 + resonate(excitation, f3, 300) * 0.9
    # The "m" onset is nasal: start muffled, open up over the first ~15%.
    muffled = band(voice, None, 900, order=2)
    open_ = contour([(0, 0), (0.15, 1), (1, 1)], n)
    voice = muffled * (1 - open_) + voice * open_

    env = contour(m.loud or [(0, 0), (0.06, 0.8), (0.3, 1), (0.75, 0.85), (1, 0)], n)
    return voice * env


def purr(duration: float = 2.2) -> np.ndarray:
    n = int(SR * duration)
    t = np.arange(n) / SR
    # Exhale ~26 Hz, inhale ~22 Hz, switching about every 0.8 s.
    # Smooth switch between exhale and inhale: an abrupt step would click.
    breath_phase = 0.5 + 0.5 * np.tanh(3 * np.sin(2 * np.pi * t / 1.6))
    rate = 22 + 4 * breath_phase
    phase = np.cumsum(rate) / SR
    pulses = np.clip(np.sin(2 * np.pi * phase), 0, None) ** 6  # sharp bursts, like vocal fold clicks
    noise = band(RNG.normal(0, 1, n), 40, 700)
    rumble = band(pulses * noise, 30, 900) + 0.5 * band(pulses - pulses.mean(), 20, 300)
    level = 0.75 + 0.25 * breath_phase
    env = contour([(0, 0), (0.12, 1), (0.85, 1), (1, 0)], n)
    return rumble * level * env


def hiss(duration: float = 1.3) -> np.ndarray:
    n = int(SR * duration)
    t = np.arange(n) / SR
    noise = RNG.normal(0, 1, n)
    body = band(noise, 2200, 9000) + 0.6 * band(noise, 4500, 7500)
    flutter = 1 + 0.15 * np.sin(2 * np.pi * 13 * t + RNG.uniform(0, 6))
    env = contour([(0, 0), (0.04, 1), (0.6, 0.85), (1, 0)], n)
    spit = band(RNG.normal(0, 1, n), 800, 5000) * np.exp(-t / 0.04) * 1.5  # opening burst
    return body * flutter * env + spit


def trill() -> np.ndarray:
    """Short rising "mrrp": a meow chopped by a ~32 Hz tongue roll in its first half."""
    m = meow(Meow(0.42, [(0, 520), (0.5, 600), (1, 880)], breath=0.08, loud=[(0, 0), (0.08, 0.9), (0.8, 1), (1, 0)]))
    t = np.arange(len(m)) / SR
    roll = 0.55 + 0.45 * np.sin(2 * np.pi * 32 * t)
    mix = np.clip((t / t[-1]) / 0.55, 0, 1)
    return m * (roll * (1 - mix) + mix)


def join(*parts: np.ndarray, gap: float = 0.07) -> np.ndarray:
    silence = np.zeros(int(SR * gap))
    out: list[np.ndarray] = []
    for i, p in enumerate(parts):
        out += [p] if i == 0 else [silence, p]
    return np.concatenate(out)


SOUNDS = {
    # Bright, short, rising: a happy "mew!"
    "happy": lambda: meow(Meow(0.45, [(0, 620), (0.35, 900), (1, 760)], breath=0.08)),
    # Plain friendly "meow" for greetings
    "idle": lambda: meow(Meow(0.8, [(0, 480), (0.35, 700), (1, 520)])),
    "curious": trill,
    # Long, falling, breathy and wavering
    "sad": lambda: meow(
        Meow(1.25, [(0, 560), (0.25, 640), (0.7, 470), (1, 380)], breath=0.13, vibrato=0.03,
             loud=[(0, 0), (0.08, 0.9), (0.4, 1), (0.85, 0.6), (1, 0)])
    ),
    # Excited double mew (combo, finished a section)
    "extra2": lambda: join(
        meow(Meow(0.32, [(0, 680), (0.4, 980), (1, 820)], breath=0.07)),
        meow(Meow(0.38, [(0, 720), (0.4, 1080), (1, 880)], breath=0.07)),
    ),
    "purr": purr,
    "hiss": hiss,
}


def write_mp3(samples: np.ndarray, dst: Path) -> None:
    peak = np.abs(samples).max() or 1.0
    pcm = (samples / peak * 0.89 * 32767).astype(np.int16)
    wav = dst.with_suffix(".wav")
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    result = subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-i", str(wav), "-af", "loudnorm=I=-18:TP=-2:LRA=11", "-ar", "44100", "-b:a", "64k", str(dst)],
        capture_output=True,
        text=True,
    )
    wav.unlink()
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed for {dst.name}: {result.stderr.strip()}")


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out.mkdir(parents=True, exist_ok=True)
    for name, make in SOUNDS.items():
        dst = out / f"{name}.mp3"
        write_mp3(make(), dst)
        print(f"{name:>8} -> {dst} ({dst.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
