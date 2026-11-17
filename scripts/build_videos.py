"""Build narrated MP4 videos (one per chapter) from data/chapters/ch<N>.json.

Pipeline per slide:
  1. edge-tts (vi-VN neural voice) -> MP3 + sentence timings
  2. Playwright renders one 1280x720 PNG per sentence (slide + burned-in subtitle)
  3. ffmpeg (from imageio-ffmpeg) turns the PNG sequence + MP3 into a clip
Clips are concatenated into public/videos/ch<N>.mp4.

Usage: .venv/Scripts/python scripts/build_videos.py [chapter ids...]
"""

from __future__ import annotations

import asyncio
import html
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from playwright.async_api import Page, async_playwright

ROOT = Path(__file__).resolve().parent.parent
CHAPTER_DIR = ROOT / "data" / "chapters"
OUT_DIR = ROOT / "public" / "videos"
WORK_DIR = ROOT / ".video-build"
VOICE = "vi-VN-HoaiMyNeural"
RATE = "+0%"
TAIL_PAUSE = 0.7  # seconds of silence after each slide
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
TICKS_PER_SECOND = 10_000_000  # edge-tts offsets are in 100ns units


@dataclass
class Sentence:
    text: str
    start: float
    end: float


def run_ffmpeg(args: list[str]) -> None:
    result = subprocess.run([FFMPEG, "-y", "-loglevel", "error", *args], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {' '.join(args)}\n{result.stderr}")


def media_duration(path: Path) -> float:
    result = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True)
    match = re.search(r"Duration: (\d+):(\d+):([\d.]+)", result.stderr)
    if not match:
        raise RuntimeError(f"Cannot read duration of {path}")
    h, m, s = match.groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p for p in parts if p]


async def _stream_audio(text: str, path: Path) -> None:
    with path.open("wb") as audio:
        async for chunk in edge_tts.Communicate(text, VOICE, rate=RATE).stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])


async def tts_to_file(text: str, path: Path, attempts: int = 25) -> None:
    # The edge-tts service randomly returns no audio for some requests; retry with backoff.
    for attempt in range(1, attempts + 1):
        try:
            # The service sometimes keeps the socket open without sending anything; cap each attempt.
            await asyncio.wait_for(_stream_audio(text, path), timeout=45)
            return
        except (
            edge_tts.exceptions.NoAudioReceived,
            edge_tts.exceptions.WebSocketError,
            OSError,
            asyncio.TimeoutError,
        ) as err:
            if attempt == attempts:
                raise RuntimeError(f"TTS failed after {attempts} attempts: {text[:60]}") from err
            await asyncio.sleep(min(3.0 * attempt, 30.0))


async def synthesize(text: str, mp3_path: Path) -> list[Sentence]:
    """Synthesize sentence by sentence (short requests fail less), then join into one MP3.
    Returns each sentence with its start/end time in the joined audio."""
    sentences: list[Sentence] = []
    pieces: list[Path] = []
    cursor = 0.0
    for i, sentence in enumerate(split_sentences(text)):
        piece = mp3_path.with_name(f"{mp3_path.stem}_p{i:02d}.mp3")
        await tts_to_file(sentence, piece)
        length = media_duration(piece)
        sentences.append(Sentence(sentence, cursor, cursor + length))
        pieces.append(piece)
        cursor += length
    list_file = mp3_path.with_suffix(".parts.txt")
    list_file.write_text("\n".join(f"file '{p.name}'" for p in pieces), encoding="utf-8")
    run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", str(mp3_path)])
    return sentences


def slide_html(chapter: dict, slide: dict, index: int, total: int, caption: str) -> str:
    esc = html.escape
    bullets = "".join(f"<li>{esc(b)}</li>" for b in slide.get("bullets", []))
    code = f"<pre>{esc(slide['code'])}</pre>" if slide.get("code") else ""
    is_title = index == 0
    body = (
        f"<div class='title-slide'><p class='kicker'>Chương {chapter['id']}</p><h1>{esc(slide['title'])}</h1>"
        f"<ul>{bullets}</ul></div>"
        if is_title
        else f"<h2>{esc(slide['title'])}</h2><div class='content'><ul>{bullets}</ul>{code}</div>"
    )
    return f"""<!doctype html><html><head><meta charset='utf-8'><style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ width: 1280px; height: 720px; overflow: hidden; background: #eef2f0; color: #17262b;
           font-family: 'Be Vietnam Pro', 'Segoe UI', sans-serif; position: relative; }}
    .bar {{ position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: #2f4bd8; }}
    .frame {{ position: absolute; left: 80px; right: 80px; top: 56px; bottom: 150px; }}
    .meta {{ position: absolute; top: 22px; left: 80px; right: 80px; display: flex; justify-content: space-between;
            font-size: 18px; color: #5b6d70; }}
    h2 {{ font-size: 44px; font-weight: 600; letter-spacing: -0.02em; margin: 24px 0 26px; }}
    .content {{ display: flex; gap: 40px; align-items: flex-start; }}
    ul {{ list-style: none; flex: 1; }}
    li {{ font-size: 29px; line-height: 1.35; padding-left: 34px; position: relative; margin-bottom: 18px; }}
    li::before {{ content: ''; position: absolute; left: 0; top: 14px; width: 14px; height: 14px; border-radius: 50%;
                 border: 3px solid #2f4bd8; }}
    pre {{ flex: 1; background: #17262b; color: #e4ecea; border-radius: 12px; padding: 20px 24px; font-size: 20px;
          line-height: 1.5; font-family: 'JetBrains Mono', Consolas, monospace; white-space: pre-wrap; }}
    .title-slide {{ padding-top: 60px; }}
    .kicker {{ font-size: 26px; color: #2f4bd8; font-weight: 600; margin-bottom: 12px; }}
    h1 {{ font-size: 60px; line-height: 1.15; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 36px; max-width: 1000px; }}
    .caption {{ position: absolute; left: 80px; right: 80px; bottom: 28px; min-height: 96px; display: flex;
               align-items: center; justify-content: center; text-align: center; background: rgba(23,38,43,0.92);
               color: #fff; font-size: 25px; line-height: 1.4; padding: 12px 28px; border-radius: 12px; }}
    </style></head><body><div class='bar'></div>
    <div class='meta'><span>AID301c · {esc(chapter['title'])}</span><span>{index + 1}/{total}</span></div>
    <div class='frame'>{body}</div>
    <div class='caption'>{esc(caption)}</div></body></html>"""


async def render_png(page: Page, markup: str, path: Path) -> None:
    await page.set_content(markup)
    await page.screenshot(path=str(path))


async def build_slide_clip(page: Page, chapter: dict, slide: dict, index: int, total: int, work: Path) -> Path:
    clip = work / f"s{index:02d}.mp4"
    if clip.exists() and clip.stat().st_size > 0:
        return clip  # reuse clips from an interrupted run
    mp3 = work / f"s{index:02d}.mp3"
    sentences = await synthesize(slide["narration"], mp3)
    audio_len = media_duration(mp3)
    total_len = audio_len + TAIL_PAUSE

    # One frame per sentence; each frame stays until the next sentence starts.
    concat_lines = []
    for i, sentence in enumerate(sentences):
        png = work / f"s{index:02d}_{i:02d}.png"
        await render_png(page, slide_html(chapter, slide, index, total, sentence.text), png)
        start = 0.0 if i == 0 else sentence.start
        end = sentences[i + 1].start if i + 1 < len(sentences) else total_len
        concat_lines.append(f"file '{png.name}'\nduration {max(end - start, 0.05):.3f}")
    concat_lines.append(f"file '{png.name}'")  # concat demuxer needs the last file repeated
    list_file = work / f"s{index:02d}.txt"
    list_file.write_text("\n".join(concat_lines), encoding="utf-8")

    clip = work / f"s{index:02d}.mp4"
    run_ffmpeg([
        "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-i", str(mp3),
        "-af", f"apad=pad_dur={TAIL_PAUSE}",
        "-vf", "fps=12,format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage", "-crf", "26",
        "-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-ac", "1",
        "-t", f"{total_len:.3f}",
        str(clip),
    ])
    return clip


async def build_chapter(page: Page, chapter_id: int) -> None:
    chapter = json.loads((CHAPTER_DIR / f"ch{chapter_id}.json").read_text(encoding="utf-8"))
    work = WORK_DIR / f"ch{chapter_id}"
    work.mkdir(parents=True, exist_ok=True)
    slides = chapter["slides"]
    clips = []
    for i, slide in enumerate(slides):
        print(f"  ch{chapter_id} slide {i + 1}/{len(slides)}", flush=True)
        clips.append(await build_slide_clip(page, chapter, slide, i, len(slides), work))

    list_file = work / "clips.txt"
    list_file.write_text("\n".join(f"file '{c.name}'" for c in clips), encoding="utf-8")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"ch{chapter_id}.mp4"
    run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", "-movflags", "+faststart", str(out)])
    print(f"ch{chapter_id}: {media_duration(out) / 60:.1f} min -> {out}")


async def main(chapter_ids: list[int]) -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        try:
            for cid in chapter_ids:
                await build_chapter(page, cid)
        finally:
            await browser.close()


if __name__ == "__main__":
    ids = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4, 5, 6]
    asyncio.run(main(ids))
