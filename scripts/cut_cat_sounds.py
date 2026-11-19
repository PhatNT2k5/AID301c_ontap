"""Trim and convert the MeoLearn cat recordings into small mp3 clips.

Sources (all Wikimedia Commons, CC0 or public domain, no attribution required):
  happy   File:Maullido de gata hembra joven.ogg            (CC0)
  idle    File:Maullido de gata hembra.ogg                  (CC0)
  curious File:2015-11-24.νιαούρισμα.Νιάου.noise reduced.flac (CC0)
  sad     File:Meow of a pleading cat.oga                   (public domain)
  extra1  File:Socks Clinton meow.wav                       (public domain, skipped: noisy)
  extra2  File:Meow of a Siamese cat - freemaster2.wav      (CC0)
  purr    File:Purring cat.oga                              (public domain)
  hiss    File:Cat hissing - Zabuhailo.wav                  (CC0)

Usage: .venv/Scripts/python scripts/cut_cat_sounds.py <folder with the downloaded files>
Each file must be named <key>.<ext> (e.g. happy.ogg). Output: public/pet/sounds/<key>.mp3
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

OUT = Path(__file__).resolve().parent.parent / "public" / "pet" / "sounds"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Window (start, end) in seconds kept from each recording, picked from its loudness profile:
# one clean meow each; the purr and hiss are cut to their strongest part.
WINDOWS: dict[str, tuple[float, float]] = {
    "happy": (0.0, 1.15),
    "idle": (0.0, 1.0),
    "curious": (0.15, 1.0),
    "sad": (0.22, 1.6),
    "extra2": (0.15, 1.05),
    "purr": (0.5, 2.7),
    "hiss": (0.8, 2.25),
}
FADE = 0.12


def convert(src: Path) -> Path | None:
    key = src.stem
    if key not in WINDOWS:
        return None  # e.g. extra1: too much background noise, not used
    start, end = WINDOWS[key]
    filters = [f"atrim={start}:{end}", "asetpts=PTS-STARTPTS"]
    if key != "purr":
        filters.append("highpass=f=150")  # drop handling noise and rumble under the meow
    filters += [
        "loudnorm=I=-18:TP=-2:LRA=11",
        f"afade=t=in:d=0.02",
        # Fade the real end (reverse, fade in, reverse).
        f"areverse,afade=t=in:d={FADE},areverse",
    ]
    dst = OUT / f"{key}.mp3"
    result = subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-i", str(src), "-af", ",".join(filters), "-ac", "1", "-ar", "44100", "-b:a", "64k", str(dst)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed for {src.name}: {result.stderr.strip()}")
    return dst


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    folder = Path(sys.argv[1])
    sources = sorted(p for p in folder.iterdir() if p.is_file())
    if not sources:
        sys.exit(f"no files in {folder}")
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sources:
        dst = convert(src)
        if dst is None:
            print(f"{src.name:>14} skipped")
            continue
        print(f"{src.name:>14} -> {dst.relative_to(OUT.parent.parent.parent)} ({dst.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
