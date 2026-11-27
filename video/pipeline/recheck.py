"""Re-test only the sentences Whisper flagged in out/chN-whisper.json, with the current
dictionary and TTS settings. Much faster than a full build when iterating on respellings.

Usage: python pipeline/recheck.py [N ...]   (default: chapters 1-6)
"""

from __future__ import annotations

import asyncio
import json
import sys

import build as b


def recheck(chapters: list[int]) -> int:
    entries = b.load_dict()
    loop = asyncio.new_event_loop()
    failures = 0
    for ch in chapters:
        report = b.OUT / f"ch{ch}-whisper.json"
        if not report.exists():
            continue
        for item in json.loads(report.read_text(encoding="utf-8")):
            s = b.Sentence(item["text"], b.apply_dict(item["text"], b.with_chapter_terms(entries, ch)), b.VOICE_VI)
            loop.run_until_complete(b.synthesize(s))
            heard = b.transcribe(s.wav)  # type: ignore[arg-type]
            score = b.heard_score(heard, s)
            failures += score < 0.85
            mark = "ok  " if score >= 0.85 else "FAIL"
            print(f"{mark} ch{ch} {score:.2f} | {s.text} | sent: {b.f5_text(s.spoken)} | heard: {heard}", flush=True)
    loop.close()
    return failures


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    chapters = [int(a) for a in sys.argv[1:]] or list(range(1, 7))
    n = recheck(chapters)
    print(f"{n} still below 0.85")
    sys.exit(1 if n else 0)
