"""Live progress view for a chapter build: `python pipeline/status.py N` (refreshes every 2 s).

Reads only files the pipeline writes (audio cache, whisper cache, render outputs), so it can
watch a build that is already running.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import build as b  # noqa: E402


def bar(done: int, total: int, width: int = 28) -> str:
    total = max(total, 1)
    filled = int(width * min(done, total) / total)
    return f"[{'#' * filled}{'.' * (width - filled)}] {done}/{total}"


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    script = json.loads((b.VIDEO / "chapters" / f"ch{n}.script.json").read_text(encoding="utf-8"))
    raw = b.OUT / f"ch{n}.raw.mp4"
    final = b.WEB / "public" / "videos" / f"ch{n}.mp4"
    report = b.OUT / f"ch{n}-report.json"
    started = time.time()
    while True:
        entries = b.load_dict()
        scenes = b.build_scenes(script, entries)
        sentences = [s for sb in scenes for s in sb.sentences]
        vi = [s for s in sentences if s.voice == b.VOICE_VI]
        audio_done = sum((b.CACHE / f"{b.cache_key(s.voice, s.spoken)}.wav").exists() for s in sentences)
        heard = json.loads((b.CACHE / "whisper.json").read_text(encoding="utf-8")) if (b.CACHE / "whisper.json").exists() else {}
        whisper_done = sum(b.cache_key(s.voice, s.spoken) in heard for s in vi)
        # pronunciation-check.mp3 needs one TTS clip per unverified term (edge-tts is slow here).
        terms = [e for e in entries if not e["verified"]]
        terms_done = sum((b.CACHE / f"{b.cache_key(b.VOICE_VI, e['spoken'])}.wav").exists() for e in terms)
        rendering =raw.exists() and time.time() - raw.stat().st_mtime < 5

        lines = [
            f"Chương {n}: {script['title']}",
            "",
            f"1. Giọng đọc (edge-tts)   {bar(audio_done, len(sentences))}",
            f"2. Kiểm tra Whisper       {bar(whisper_done, len(vi))}",
            f"3. Đọc thử thuật ngữ      {bar(terms_done, len(terms))}",
            f"4. Render (Remotion)      {'đang chạy...' if rendering else ('xong' if raw.exists() else 'chưa')}",
        ]
        if report.exists() and report.stat().st_mtime > started - 3600:
            r = json.loads(report.read_text(encoding="utf-8"))
            lines += [
                "",
                f"XONG: {r['duration'] / 60:.2f} phút, {r['scenes']} cảnh, {r['words']} từ",
                f"Verify: {'OK' if not r['verify'] else '; '.join(r['verify'])}",
                f"Whisper còn lỗi: {len(r['whisper'])} câu",
            ]
        elif final.exists() and final.stat().st_mtime > started:
            lines += ["", "Đang verify..."]
        print("\033[2J\033[H" + "\n".join(lines), flush=True)
        if report.exists() and report.stat().st_mtime > started:
            break
        time.sleep(2)


if __name__ == "__main__":
    main()
