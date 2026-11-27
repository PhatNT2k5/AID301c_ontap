"""Local Vietnamese TTS with F5-TTS (voice cloning from a short reference clip).

Usage:
  .venv/Scripts/python.exe synth.py --ref ref/hynt/ref2.wav --text "xin chào" --out out/test.wav
  .venv/Scripts/python.exe synth.py --ref ref/hynt/ref2.wav --text-file lines.txt --out-dir out/batch

Each reference clip needs its exact transcript next to it (<clip>.txt) or via --ref-text.
Everything (venv, model, HF/torch caches) lives inside this folder; delete it to uninstall.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path
from typing import TYPE_CHECKING

ROOT = Path(__file__).resolve().parent
# Must be set before importing torch / huggingface_hub so nothing lands in the user profile.
os.environ.setdefault("HF_HOME", str(ROOT / "cache" / "hf"))
os.environ.setdefault("TORCH_HOME", str(ROOT / "cache" / "torch"))

MODEL_DIR = ROOT / "models" / "vi-1000h"
CKPT = MODEL_DIR / "model_last.pt"
VOCAB = MODEL_DIR / "vocab.txt"

if TYPE_CHECKING:
    from f5_tts.api import F5TTS


def normalize(text: str) -> str:
    """The checkpoint was trained on lowercase transcripts with punctuation kept."""
    return " ".join(text.lower().split())


def ref_transcript(ref: Path, override: str | None = None) -> str:
    if override:
        return normalize(override)
    txt = ref.with_suffix(".txt")
    if not txt.is_file():
        raise FileNotFoundError(f"missing transcript: pass --ref-text or create {txt}")
    return normalize(txt.read_text(encoding="utf-8"))


def load_model() -> "F5TTS":
    for f in (CKPT, VOCAB):
        if not f.is_file():
            raise FileNotFoundError(f"missing model file: {f}")
    import torch
    from f5_tts.api import F5TTS

    if not torch.cuda.is_available():
        print("warning: CUDA not available, running on CPU (very slow)", file=sys.stderr)
    return F5TTS(model="F5TTS_Base", ckpt_file=str(CKPT), vocab_file=str(VOCAB), hf_cache_dir=os.environ["HF_HOME"])


def synth_one(
    tts: "F5TTS",
    ref: Path,
    ref_text: str,
    text: str,
    out: Path,
    speed: float = 1.0,
    nfe: int = 32,
    cfg: float = 2.0,
    seed: int = 42,
) -> None:
    """Write one clip. Goes through a temp file so an interrupted run never leaves a partial wav."""
    if not ref.is_file():
        raise FileNotFoundError(f"missing reference clip: {ref}")
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.stem + ".part.wav")
    tts.infer(
        ref_file=str(ref),
        ref_text=ref_text,
        gen_text=normalize(text),
        file_wave=str(tmp),
        speed=speed,
        nfe_step=nfe,
        cfg_strength=cfg,
        seed=seed,
        show_info=lambda *_: None,
    )
    os.replace(tmp, out)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--ref", type=Path, required=True, help="reference voice clip (wav, 5-12 s, clean)")
    p.add_argument("--ref-text", help="exact transcript of --ref (default: <ref>.txt next to the wav)")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--text", help="text to speak")
    src.add_argument("--text-file", type=Path, help="one sentence per line; writes 001.wav, 002.wav, ...")
    p.add_argument("--out", type=Path, default=ROOT / "out" / "out.wav")
    p.add_argument("--out-dir", type=Path, default=ROOT / "out" / "batch")
    p.add_argument("--speed", type=float, default=1.0)
    p.add_argument("--nfe", type=int, default=32, help="denoising steps: higher = cleaner but slower")
    p.add_argument("--cfg", type=float, default=2.0, help="guidance strength: higher sticks closer to text/voice")
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


def main() -> int:
    # f5_tts prints Vietnamese text; the default Windows console codepage (cp1252) can't encode it.
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")
    args = parse_args()
    try:
        ref_text = ref_transcript(args.ref, args.ref_text)
        tts = load_model()
    except FileNotFoundError as err:
        print(err, file=sys.stderr)
        return 1

    if args.text is not None:
        jobs = [(args.text, args.out)]
    else:
        lines = [ln for ln in args.text_file.read_text(encoding="utf-8").splitlines() if ln.strip()]
        jobs = [(ln, args.out_dir / f"{i:03d}.wav") for i, ln in enumerate(lines, 1)]

    for text, out in jobs:
        start = time.perf_counter()
        synth_one(tts, args.ref, ref_text, text, out, args.speed, args.nfe, args.cfg, args.seed)
        print(f"{out.name}: {time.perf_counter() - start:.1f}s  {normalize(text)[:60]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
