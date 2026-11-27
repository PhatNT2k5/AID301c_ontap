"""Long-running F5-TTS worker for the video pipeline (pipeline/build.py).

Loads the model once, then reads one JSON job per line on stdin and answers one JSON line on
stdout. Exits when stdin closes.

  job:   {"ref": "...wav", "text": "...", "out": "...wav", "speed": 1.0, "nfe": 64, "cfg": 2.0, "seed": 42}
  reply: {"ok": true, "seconds": 1.8}  |  {"ok": false, "error": "..."}

Logs (f5_tts prints a lot) go to stderr; stdout carries only replies.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path


def protocol_stream():
    """Keep the real stdout for replies, point fd 1 at stderr so library prints can't corrupt it."""
    proto = os.fdopen(os.dup(1), "w", encoding="utf-8", buffering=1)
    os.dup2(2, 1)
    sys.stdout = sys.stderr
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.stdin.reconfigure(encoding="utf-8")  # Windows defaults pipes to the ANSI codepage
    return proto


def main() -> int:
    proto = protocol_stream()
    import synth  # after the redirect: importing it sets the HF/torch cache paths

    tts = synth.load_model()
    transcripts: dict[Path, str] = {}
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            job = json.loads(line)
            ref = Path(job["ref"])
            if ref not in transcripts:
                transcripts[ref] = synth.ref_transcript(ref)
            start = time.perf_counter()
            synth.synth_one(
                tts, ref, transcripts[ref], job["text"], Path(job["out"]),
                speed=float(job.get("speed", 1.0)), nfe=int(job.get("nfe", 32)),
                cfg=float(job.get("cfg", 2.0)), seed=int(job.get("seed", 42)),
            )
            reply = {"ok": True, "seconds": round(time.perf_counter() - start, 2)}
        except Exception as err:  # report per job; one bad sentence must not kill the worker
            print(f"job failed: {err!r}", file=sys.stderr)
            reply = {"ok": False, "error": f"{type(err).__name__}: {err}"}
        proto.write(json.dumps(reply, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
