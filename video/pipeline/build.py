"""Chapter video pipeline: script -> narration audio -> timeline -> Remotion render -> mp4.

Usage (from web/video, via `npm run build:ch -- N` or `npm run demo`):
  python pipeline/build.py build N      full chapter  -> web/public/videos/chN.{mp4,vtt,markers.json}
  python pipeline/build.py demo         ch1 demo      -> web/video/out/ch1-demo.mp4

Steps:
  1. load chapters/chN.script.json, expand quiz scenes from web/data/questions.json, validate
  2. apply shared/pronunciation.json to Vietnamese sentences, report terms missing from it
  3. edge-tts per sentence, cached in cache/ by hash(voice + rate + spoken text)
  4. place sentences on a timeline (scene length = its audio), resolve beats to frames
  5. mix one WAV, write the timeline JSON, render with Remotion
  6. add chapter markers + faststart, write .vtt and markers.json, extract sample frames
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
import wave
from dataclasses import dataclass, field
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np

VIDEO = Path(__file__).resolve().parent.parent
WEB = VIDEO.parent
CACHE = VIDEO / "cache"
OUT = VIDEO / "out"
PUBLIC = VIDEO / "public"
DICT_PATH = VIDEO / "shared" / "pronunciation.json"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

FPS = 30
SR = 24_000
VOICE_VI = "vi-VN-HoaiMyNeural"
VOICE_EN = "en-US-AvaNeural"  # exam questions stay in English, so they get an English voice
RATE = "+18%"  # approved: faster delivery so ~1000 words fit 5-7 minutes

LEAD_IN = 0.3  # seconds before the first sentence of a scene
GAP = 0.32  # between sentences
GAP_OPTION = 0.22  # between quiz options
TAIL = 0.45  # after the last sentence of a scene
COUNTDOWN = 3.0
MAX_BEAT_GAP = 4.0
MAX_HEADLINE_WORDS = 8


class BuildError(RuntimeError):
    pass


# ---------------------------------------------------------------- pronunciation


def load_dict() -> list[dict]:
    return json.loads(DICT_PATH.read_text(encoding="utf-8"))


def chapter_terms_path(ch: int) -> Path:
    return VIDEO / "chapters" / f"ch{ch}.terms.json"


def with_chapter_terms(entries: list[dict], ch: int) -> list[dict]:
    """Add the chapter's proposed respellings (chN.terms.json). Scripts for several chapters
    are prepared in parallel, so each proposes terms in its own file instead of editing the
    shared dictionary; `build` merges them in."""
    path = chapter_terms_path(ch)
    if not path.exists():
        return entries
    known = {e["term"].lower() for e in entries}
    extra = [e for e in json.loads(path.read_text(encoding="utf-8")) if e["term"].lower() not in known]
    return entries + [{"term": e["term"], "spoken": e["spoken"], "verified": False} for e in extra]


async def synthesize_all(sentences: list["Sentence"], parallel: int = 2) -> None:
    """TTS with a few requests in flight; the service throttles bursts, retries cover the rest."""
    gate = asyncio.Semaphore(parallel)
    done = 0

    async def one(sentence: "Sentence") -> None:
        nonlocal done
        async with gate:
            await synthesize(sentence)
        done += 1
        print(f"\r  audio {done}/{len(sentences)}", end="", flush=True)

    await asyncio.gather(*(one(s) for s in sentences))
    print()


def save_dict(entries: list[dict]) -> None:
    DICT_PATH.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def term_pattern(term: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![\w-]){re.escape(term)}(?![\w-])", re.IGNORECASE)


def apply_dict(text: str, entries: list[dict]) -> str:
    for e in sorted(entries, key=lambda e: -len(e["term"])):
        text = term_pattern(e["term"]).sub(e["spoken"], text)
    return text


VI_ONSET = r"(ngh|ng|gh|gi|kh|nh|ph|qu|th|tr|ch|b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x)?"
VI_RHYME = r"(oa|oe|uy|ue|ua|uo|ie|ye|ia|ai|ao|au|ay|eo|eu|iu|oi|ui|ưu|ươ|ưa|ơi|ôi|âu|ây|a|ă|â|e|ê|i|o|ô|ơ|u|ư|y)+(ch|nh|ng|c|m|n|p|t|i|y|o|u)?"
VI_SYLLABLE = re.compile(rf"^{VI_ONSET}{VI_RHYME}$")


def strip_tones(word: str) -> str:
    # Remove tone marks only; keep ă â ê ô ơ ư đ which carry vowel identity.
    out = []
    for ch in unicodedata.normalize("NFD", word.lower()):
        if unicodedata.category(ch) == "Mn" and ch not in ("̆", "̂", "̛"):
            continue
        out.append(ch)
    return unicodedata.normalize("NFC", "".join(out))


def is_foreign(token: str) -> bool:
    if token.isdigit() or len(token) == 1:  # single letters are read fine as letters
        return False
    if token.isdigit():
        return False
    if re.search(r"[0-9_./()]", token) or (len(token) > 1 and token.isupper()):
        return True
    if not re.fullmatch(r"[A-Za-z][A-Za-z'-]*", token):
        return False  # has Vietnamese letters, or punctuation
    return not VI_SYLLABLE.match(strip_tones(token))


def scan_terms(sentences: list[str], entries: list[dict]) -> list[str]:
    """English words, acronyms and code names not covered by the dictionary. Consecutive
    foreign tokens are grouped into one phrase ("Data Preparation")."""
    known = [term_pattern(e["term"]) for e in sorted(entries, key=lambda e: -len(e["term"]))]  # longest first, like apply_dict
    found: list[str] = []
    for sentence in sentences:
        covered = sentence
        for pat in known:
            covered = pat.sub(" ", covered)
        phrase: list[str] = []
        for raw in re.split(r"[\s,;:!?\"“”()]+", covered) + [""]:
            token = raw.strip(".")
            if token and is_foreign(token):
                phrase.append(token)
                continue
            if phrase:
                term = " ".join(phrase)
                if term not in found:
                    found.append(term)
                phrase = []
    return found


# ---------------------------------------------------------------- script model


@dataclass
class Sentence:
    text: str  # shown in subtitles
    spoken: str  # sent to TTS
    voice: str
    gap_after: float = GAP
    start: float = 0.0
    duration: float = 0.0
    wav: Path | None = None


@dataclass
class SceneBuild:
    raw: dict
    section: str
    sentences: list[Sentence] = field(default_factory=list)
    countdown_after: int | None = None  # sentence index followed by the 3 s countdown
    start: float = 0.0
    end: float = 0.0


def load_questions() -> dict[str, dict]:
    data = json.loads((WEB / "data" / "questions.json").read_text(encoding="utf-8"))
    return {q["id"]: q for q in data}


def expand_quiz(scene: dict, chapter: int, questions: dict[str, dict]) -> dict:
    q = questions.get(scene["questionId"])
    if q is None:
        raise BuildError(f"quiz {scene['questionId']}: not in questions.json")
    if q["chapterId"] != chapter or q["needsReview"]:
        raise BuildError(f"quiz {q['id']}: must be chapter {chapter} and needsReview=false")
    explain = scene.get("explain") or re.split(r"(?<=[.!?])\s", q["explanation"].strip())[0]
    n = len(q["answer"])
    intro = f"Câu hỏi nhanh, chọn {n} đáp án." if n > 1 else "Câu hỏi nhanh."
    keys = ", ".join(q["answer"])
    narration = [
        {"text": intro, "voice": "vi"},
        {"text": q["question"], "voice": "en", "beat": "question"},
        *[
            {"text": f"{o['key']}. {o['text']}", "voice": "en", "beat": f"opt_{o['key']}", "gap": GAP_OPTION}
            for o in q["options"]
        ],
        {"text": f"Đáp án đúng là {keys}.", "voice": "vi", "beat": "reveal"},
        {"text": explain, "voice": "vi", "beat": "explain"},
    ]
    return {
        **scene,
        "headline": None,
        "data": {
            "questionId": q["id"],
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "multi": q["multi"],
            "explain": explain,
        },
        "quizNarration": narration,
        "countdownAfter": 1 + len(q["options"]),  # after the last option
    }


def build_scenes(script: dict, entries: list[dict]) -> list[SceneBuild]:
    questions = load_questions()
    scenes: list[SceneBuild] = []
    for section in script["sections"]:
        for raw in section["scenes"]:
            if raw["type"] == "quiz":
                raw = expand_quiz(raw, script["chapter"], questions)
            sb = SceneBuild(raw=raw, section=section["title"])
            if raw["type"] == "quiz":
                for item in raw["quizNarration"]:
                    voice = VOICE_VI if item["voice"] == "vi" else VOICE_EN
                    spoken = apply_dict(item["text"], entries) if voice == VOICE_VI else item["text"]
                    sb.sentences.append(Sentence(item["text"], spoken, voice, item.get("gap", GAP)))
                sb.countdown_after = raw["countdownAfter"]
            else:
                for text in raw["narration"]:
                    sb.sentences.append(Sentence(text, apply_dict(text, entries), VOICE_VI))
            headline = raw.get("headline")
            if headline and len(headline.split()) > MAX_HEADLINE_WORDS:
                raise BuildError(f"headline over {MAX_HEADLINE_WORDS} words: {headline}")
            scenes.append(sb)
    return scenes


# ---------------------------------------------------------------- audio


def run(args: list[str], cwd: Path | None = None) -> str:
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise BuildError(f"command failed: {' '.join(map(str, args))}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
    return r.stdout


async def tts(text: str, voice: str, mp3: Path, attempts: int = 25) -> None:
    for attempt in range(1, attempts + 1):
        try:

            async def stream() -> None:
                with mp3.open("wb") as fh:
                    async for chunk in edge_tts.Communicate(text, voice, rate=RATE).stream():
                        if chunk["type"] == "audio":
                            fh.write(chunk["data"])

            await asyncio.wait_for(stream(), timeout=45)
            if mp3.stat().st_size > 0:
                return
        except (edge_tts.exceptions.NoAudioReceived, edge_tts.exceptions.WebSocketError, OSError, asyncio.TimeoutError):
            pass
        await asyncio.sleep(min(3.0 * attempt, 30.0))
    raise BuildError(f"TTS failed after {attempts} attempts: {text[:70]}")


def cache_key(voice: str, spoken: str) -> str:
    return hashlib.sha1(f"{voice}|{RATE}|{spoken}".encode("utf-8")).hexdigest()[:16]


async def synthesize(sentence: Sentence, attempts: int = 25) -> None:
    key = cache_key(sentence.voice, sentence.spoken)
    wav = CACHE / f"{key}.wav"
    if not wav.exists():
        mp3 = CACHE / f"{key}.mp3"
        await tts(sentence.spoken, sentence.voice, mp3, attempts)
        await asyncio.sleep(1.0)  # pace requests; the free service throttles bursts
        run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), str(wav)])
        mp3.unlink(missing_ok=True)
    sentence.wav = wav
    sentence.duration = len(read_clip(wav)) / SR


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


MAX_LEAD_SILENCE = 0.12
MAX_TAIL_SILENCE = 0.45


def read_clip(path: Path) -> np.ndarray:
    """A TTS clip with its padding trimmed: edge-tts adds ~0.2 s before and ~0.7 s (more for
    short lines) after the speech, which would add up to >1.5 s pauses between sentences."""
    pcm = read_wav(path)
    loud = np.nonzero(np.abs(pcm) > 10 ** (-45 / 20))[0]
    if len(loud) == 0:
        return pcm
    a = max(0, loud[0] - int(SR * MAX_LEAD_SILENCE))
    b = min(len(pcm), loud[-1] + int(SR * MAX_TAIL_SILENCE))
    return pcm[a:b]


def tick(freq: float = 880.0, length: float = 0.09) -> np.ndarray:
    t = np.arange(int(SR * length)) / SR
    env = np.exp(-t * 38)
    return (0.22 * np.sin(2 * np.pi * freq * t) * env).astype(np.float32)


# ---------------------------------------------------------------- timeline


def frames(seconds: float) -> int:
    return int(round(seconds * FPS))


def cue_fraction(sentence: Sentence, cue: str | None, entries: list[dict]) -> float:
    if not cue:
        return 0.0
    # Find the cue in the script text, then map its offset into the respelled text by
    # respelling the prefix (works even when the cue is only part of a dictionary term).
    pos = sentence.text.lower().find(cue.lower())
    if pos < 0:
        raise BuildError(f"cue '{cue}' not found in: {sentence.text}")
    prefix = sentence.text[:pos]
    spoken_pos = len(apply_dict(prefix, entries)) if sentence.voice == VOICE_VI else pos
    return min(spoken_pos / max(len(sentence.spoken), 1), 1.0)


def layout(scenes: list[SceneBuild]) -> float:
    t = 0.0
    for sb in scenes:
        sb.start = t
        t += LEAD_IN
        for i, s in enumerate(sb.sentences):
            s.start = t
            t += s.duration + s.gap_after
            if sb.countdown_after is not None and i == sb.countdown_after:
                t += COUNTDOWN
        t += TAIL - GAP
        sb.end = t
    return t


def resolve_beats(sb: SceneBuild, entries: list[dict], errors: list[str]) -> dict[str, int]:
    beats: dict[str, float] = {}
    if sb.raw["type"] == "quiz":
        for item, s in zip(sb.raw["quizNarration"], sb.sentences):
            if "beat" in item:
                beats[item["beat"]] = s.start - sb.start
                if item["beat"] in ("question", "explain"):  # reading bars sweep until the sentence ends
                    beats[f"{item['beat']}_end"] = s.start + s.duration - sb.start
        last_option = sb.sentences[sb.countdown_after]
        beats["count"] = last_option.start + last_option.duration + last_option.gap_after - sb.start
    else:
        for b in sb.raw.get("beats", []):
            s = sb.sentences[b["s"]]
            frac = b["frac"] if "frac" in b else cue_fraction(s, b.get("cue"), entries)
            beats[b["id"]] = s.start - sb.start + frac * s.duration

    ordered = sorted(beats.items(), key=lambda kv: kv[1])
    prev_name, prev_t = "scene start", 0.0
    for name, t in ordered:
        # The exam question is read in full before its options; it may run past the limit. A long
        # option is covered by the reading bar under it, the explanation by its read-along words.
        if t - prev_t > MAX_BEAT_GAP and prev_name not in ("question", "explain") and not prev_name.startswith("opt_"):
            errors.append(
                f"[{sb.section}] {prev_name} -> {name}: {t - prev_t:.1f}s without a new visual beat (max {MAX_BEAT_GAP}s)"
            )
        prev_name, prev_t = name, t
    return {k: frames(v) for k, v in beats.items()}


def mix(scenes: list[SceneBuild], total: float, path: Path) -> None:
    audio = np.zeros(int(SR * (total + 0.5)), dtype=np.float32)
    for sb in scenes:
        for i, s in enumerate(sb.sentences):
            assert s.wav is not None
            pcm = read_clip(s.wav)
            at = int(s.start * SR)
            audio[at : at + len(pcm)] += pcm[: len(audio) - at]
            if sb.countdown_after is not None and i == sb.countdown_after:
                count_start = s.start + s.duration + s.gap_after
                for k in range(3):
                    tk = tick(1046.5 if k == 2 else 880.0)
                    a = int((count_start + k) * SR)
                    audio[a : a + len(tk)] += tk
    pcm16 = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm16.tobytes())


def vtt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    return f"{ms // 3_600_000:02d}:{ms // 60_000 % 60:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}"


# ---------------------------------------------------------------- render + outputs


def render(timeline_rel: str, raw_mp4: Path) -> None:
    npx = "npx.cmd" if sys.platform == "win32" else "npx"
    run([npx, "remotion", "render", "src/index.ts", "Chapter", str(raw_mp4), f"--props={timeline_rel}"], cwd=VIDEO)


def finalize(raw_mp4: Path, final_mp4: Path, chapter_title: str, markers: list[dict], total: float) -> None:
    meta = [";FFMETADATA1", f"title={chapter_title}"]
    for i, m in enumerate(markers):
        end = markers[i + 1]["start"] if i + 1 < len(markers) else total
        meta += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(m['start'] * 1000)}", f"END={int(end * 1000)}", f"title={m['title']}"]
    meta_path = raw_mp4.with_suffix(".ffmeta")
    meta_path.write_text("\n".join(meta) + "\n", encoding="utf-8")
    final_mp4.parent.mkdir(parents=True, exist_ok=True)
    # Re-encode: Remotion's JPEG frames come out as full-range yuvj420p; the spec wants plain
    # yuv420p (TV range), H.264, mono AAC, chapters and faststart.
    run([FFMPEG, "-y", "-loglevel", "error", "-i", str(raw_mp4), "-i", str(meta_path), "-map", "0:v", "-map", "0:a",
         "-map_metadata", "1", "-map_chapters", "1",
         "-vf", "scale=in_range=full:out_range=tv", "-c:v", "libx264", "-preset", "medium", "-crf", "21",
         "-pix_fmt", "yuv420p", "-color_range", "tv", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "128k", "-ac", "1", "-movflags", "+faststart", str(final_mp4)])


def sample_frames(mp4: Path, times: list[tuple[str, float]], folder: Path) -> list[Path]:
    folder.mkdir(parents=True, exist_ok=True)
    out = []
    for name, t in times:
        jpg = folder / f"{name}.jpg"
        run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(mp4), "-frames:v", "1", "-q:v", "3", str(jpg)])
        out.append(jpg)
    return out


def pronunciation_check(entries: list[dict], used_terms: list[str]) -> None:
    pending = [e for e in entries if not e["verified"] and e["term"] in used_terms]
    if not pending:
        return
    pieces = []
    lines = []
    t = 0.0
    loop = asyncio.new_event_loop()
    skipped: list[str] = []
    for e in pending:
        s = Sentence(e["term"], e["spoken"], VOICE_VI)
        try:
            # The service refuses some very short texts on their own (e.g. "ép pi"), even
            # though it reads them fine inside a sentence; this listening aid skips those.
            loop.run_until_complete(synthesize(s, attempts=4))
        except BuildError:
            skipped.append(e["term"])
            continue
        lines.append(f"{vtt_time(t)}  {e['term']}  ->  {e['spoken']}")
        pieces.append(read_clip(s.wav))  # type: ignore[arg-type]
        pieces.append(np.zeros(int(SR * 0.9), dtype=np.float32))
        t += s.duration + 0.9
    loop.close()
    if not pieces:
        print(f"pronunciation-check skipped: no standalone TTS for {skipped}")
        return
    OUT.mkdir(exist_ok=True)
    wav = OUT / "pronunciation-check.wav"
    pcm16 = (np.clip(np.concatenate(pieces), -1, 1) * 32767).astype(np.int16)
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm16.tobytes())
    run([FFMPEG, "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "96k", str(OUT / "pronunciation-check.mp3")])
    wav.unlink()
    if skipped:
        lines.append("(no standalone TTS for: " + ", ".join(skipped) + ")")
    (OUT / "pronunciation-check.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"pronunciation-check.mp3: {len(pending) - len(skipped)} unverified terms, skipped {skipped}")


# ---------------------------------------------------------------- whisper check


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFD", text.lower())
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn").replace("đ", "d")
    t = re.sub(r"\d", lambda m: f" {DIGIT_WORDS[int(m[0])]} ", t)  # Whisper writes "5" for "năm"
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


DIGIT_WORDS = ["khong", "mot", "hai", "ba", "bon", "nam", "sau", "bay", "tam", "chin"]


def similarity(a: str, b: str) -> float:
    import difflib

    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def heard_score(heard: str, sentence: "Sentence") -> float:
    """Whisper writes recognised English terms in English, so a sentence counts as heard right
    when the transcript matches either the script text or the respelled text sent to TTS."""
    return max(similarity(heard, sentence.text), similarity(heard, sentence.spoken))


_whisper = None


def transcribe(wav: Path) -> str:
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel

        print("  loading faster-whisper medium (first run downloads ~1.5 GB)...", flush=True)
        _whisper = WhisperModel("medium", device="cpu", compute_type="int8")
    # Feed 16 kHz samples directly: faster-whisper's own decoder (PyAV) breaks on this install.
    from scipy.signal import resample_poly

    audio = resample_poly(read_wav(wav), 2, 3).astype(np.float32)  # 24 kHz -> 16 kHz
    segments, _ = _whisper.transcribe(audio, language="vi", beam_size=5)
    return " ".join(seg.text.strip() for seg in segments)


def alternatives(entry: dict) -> list[str]:
    """Other spellings to try: the original English and, for short acronyms, the letters
    spelled out. (Running syllables together is not tried: TTS reads those as gibberish.)"""
    term, spoken = entry["term"], entry["spoken"]
    alts = [term]
    if term.isupper() and len(term) <= 6:
        alts.append(" ".join(term))
    tried = set(entry.get("tried", [])) | {spoken}
    return [a for a in alts if a not in tried][:3]


def whisper_check(scenes: list[SceneBuild], entries: list[dict], name: str) -> list[dict]:
    """Transcribe each Vietnamese sentence and compare with the text sent to TTS. A sentence
    under 0.85 that contains unverified dictionary terms gets up to 3 alternative spellings per
    term; the best is kept and saved to the dictionary. What still fails is returned."""
    problems: list[dict] = []
    cache_file = CACHE / "whisper.json"
    heard: dict[str, str] = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}
    loop = asyncio.new_event_loop()

    def hear(sentence: Sentence) -> str:
        key = cache_key(sentence.voice, sentence.spoken)
        if key not in heard:
            loop.run_until_complete(synthesize(sentence))
            heard[key] = transcribe(sentence.wav)  # type: ignore[arg-type]
            cache_file.write_text(json.dumps(heard, ensure_ascii=False, indent=1), encoding="utf-8")
        return heard[key]

    vi = [s for sb in scenes for s in sb.sentences if s.voice == VOICE_VI]
    for i, s in enumerate(vi):
        print(f"\r  whisper {i + 1}/{len(vi)}", end="", flush=True)
        text_heard = hear(s)
        score = heard_score(text_heard, s)
        if score >= 0.85:
            continue
        best = (score, None, s.spoken, text_heard)
        for e in [e for e in entries if not e["verified"] and term_pattern(e["term"]).search(s.text)]:
            for alt in alternatives(e):
                trial_entries = [x for x in entries if x is not e] + [{**e, "spoken": alt}]
                t = Sentence(s.text, apply_dict(s.text, trial_entries), s.voice)
                t_heard = hear(t)
                sc = heard_score(t_heard, t)
                if sc > best[0]:
                    best = (sc, (e, alt), t.spoken, t_heard)
        if best[1] is not None:
            e, alt = best[1]
            e.setdefault("tried", []).append(e["spoken"])
            e["spoken"] = alt
            save_dict(entries)
        if best[0] < 0.85:
            problems.append({"text": s.text, "spoken": best[2], "heard": best[3], "score": round(best[0], 2)})
    loop.close()
    print()
    (OUT / f"{name}-whisper.json").write_text(json.dumps(problems, ensure_ascii=False, indent=1), encoding="utf-8")
    return problems


# ---------------------------------------------------------------- verify


def probe(mp4: Path) -> dict:
    r = subprocess.run([FFMPEG, "-i", str(mp4)], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r)
    video = re.search(r"Video: [^\n]*?, (yuv\w+)[^\n]*?(\d{3,4})x(\d{3,4})[^\n]*?, ([\d.]+) fps", r)
    return {
        "duration": int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3]) if dur else 0.0,
        "pix_fmt": video[1] if video else "?",
        "width": int(video[2]) if video else 0,
        "height": int(video[3]) if video else 0,
        "fps": float(video[4]) if video else 0.0,
        "audio": "Audio:" in r,
        "chapters": len(re.findall(r"Chapter #", r)),
    }


def filter_log(args: list[str]) -> str:
    return subprocess.run(
        [FFMPEG, "-hide_banner", "-nostats", *args, "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    ).stderr


def verify(mp4: Path, markers: list[dict], total: float) -> list[str]:
    errors: list[str] = []
    info = probe(mp4)
    if info["width"] < 1280 or info["height"] < 720:
        errors.append(f"resolution {info['width']}x{info['height']}")
    if abs(info["fps"] - 30) > 0.01:
        errors.append(f"fps {info['fps']}")
    if info["pix_fmt"] != "yuv420p":
        errors.append(f"pixel format {info['pix_fmt']}")
    if not info["audio"]:
        errors.append("no audio stream")
    if not 300 <= info["duration"] <= 420:
        errors.append(f"duration {info['duration'] / 60:.2f} min (want 5-7)")
    # Freeze: watch the teaching area from the headline/question down (a one-line quiz question
    # sits at y~74); the lecturer and its speech bubble below y=490 / right of x=1000 are masked.
    log = filter_log(["-i", str(mp4), "-an", "-vf", "crop=960:460:40:30,freezedetect=n=0.002:d=5"])
    for m in re.finditer(r"freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)", log):
        errors.append(f"frozen {float(m[2]):.1f}s at {float(m[1]):.1f}s")
    log = filter_log(["-i", str(mp4), "-vn", "-af", "silencedetect=n=-45dB:d=1.5"])
    for m in re.finditer(r"silence_start: ([\d.]+)[\s\S]*?silence_duration: ([\d.]+)", log):
        if float(m[1]) < info["duration"] - 1.6:
            errors.append(f"silence {float(m[2]):.1f}s at {float(m[1]):.1f}s")
    if info["chapters"] != len(markers):
        errors.append(f"{info['chapters']} chapters in mp4, {len(markers)} markers")
    if markers and markers[-1]["start"] >= info["duration"]:
        errors.append("last marker after the end")
    if abs(info["duration"] - total) > 0.5:
        errors.append(f"duration {info['duration']:.1f}s vs timeline {total:.1f}s")
    print(
        f"  verify: {info['width']}x{info['height']} {info['fps']:.0f}fps {info['pix_fmt']} "
        f"{info['duration'] / 60:.2f} min, audio={info['audio']}, chapters={info['chapters']}"
    )
    return errors


def publish_markers(chapter: int, markers: list[dict], total: float) -> None:
    path = WEB / "data" / "video-markers.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    data[str(chapter)] = {"duration": round(total, 1), "markers": markers}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def build(script_path: Path, final_mp4: Path, publish: bool) -> None:
    script = json.loads(script_path.read_text(encoding="utf-8"))
    ch = script["chapter"]
    entries = with_chapter_terms(load_dict(), ch)
    if publish and chapter_terms_path(ch).exists():
        save_dict(entries)  # merge the chapter's proposals into the shared dictionary
        chapter_terms_path(ch).unlink()

    scenes = build_scenes(script, entries)
    vi_texts = [s.text for sb in scenes for s in sb.sentences if s.voice == VOICE_VI]
    missing = scan_terms(vi_texts, entries)
    if missing:
        for term in missing:
            entries.append({"term": term, "spoken": term, "verified": False, "needsProposal": True})
        save_dict(entries)
        raise BuildError(
            "terms missing from shared/pronunciation.json (added with needsProposal=true, fill 'spoken' and rerun):\n  "
            + "\n  ".join(missing)
        )
    if any(e.get("needsProposal") for e in entries):
        raise BuildError("pronunciation.json still has entries with needsProposal=true")

    CACHE.mkdir(exist_ok=True)
    all_sentences = [s for sb in scenes for s in sb.sentences]
    asyncio.run(synthesize_all(all_sentences))

    problems: list[dict] = []
    if publish:
        problems = whisper_check(scenes, entries, final_mp4.stem)
        # The check may have changed spellings: re-apply the dictionary and make sure audio exists.
        loop = asyncio.new_event_loop()
        for s in all_sentences:
            if s.voice == VOICE_VI:
                s.spoken = apply_dict(s.text, entries)
            loop.run_until_complete(synthesize(s))
        loop.close()

    total = layout(scenes)
    beat_errors: list[str] = []
    all_beats = [resolve_beats(sb, entries, beat_errors) for sb in scenes]
    if beat_errors:  # report every gap at once instead of one per rebuild
        raise BuildError("".join(f"\n  {e}" for e in beat_errors))
    scene_json = []
    for sb, beats in zip(scenes, all_beats):
        scene_json.append(
            {
                "type": sb.raw["type"],
                "from": frames(sb.start),
                "duration": frames(sb.end) - frames(sb.start),
                "pose": sb.raw.get("pose", "idle"),
                "headline": sb.raw.get("headline"),
                "section": sb.section,
                "beats": beats,
                "data": sb.raw["data"],
            }
        )

    sections, seen = [], set()
    for sb in scenes:
        if sb.section not in seen:
            seen.add(sb.section)
            sections.append({"title": sb.section, "start": round(sb.start, 2)})

    cues = [
        {"text": s.text, "from": frames(s.start), "to": frames(s.start + s.duration + min(s.gap_after, 0.25))}
        for s in all_sentences
    ]
    spoken_words = sum(len(s.text.split()) for s in all_sentences)

    name = final_mp4.stem
    mix(scenes, total, PUBLIC / "audio" / f"{name}.wav")
    shutil.copytree(WEB / "public" / "pet", PUBLIC / "pet", dirs_exist_ok=True)
    timeline = {
        "chapter": ch,
        "title": script["title"],
        "fps": FPS,
        "width": 1280,
        "height": 720,
        "durationInFrames": frames(total),
        "audio": f"audio/{name}.wav",
        "sections": [{"id": str(i), "title": s["title"], "from": frames(s["start"])} for i, s in enumerate(sections)],
        "scenes": scene_json,
        "cues": cues,
    }
    tl_rel = f"public/timeline/{name}.json"
    (VIDEO / tl_rel).parent.mkdir(parents=True, exist_ok=True)
    (VIDEO / tl_rel).write_text(json.dumps(timeline, ensure_ascii=False), encoding="utf-8")

    used_terms = [e["term"] for e in entries if any(term_pattern(e["term"]).search(t) for t in vi_texts)]
    pronunciation_check(entries, used_terms)

    print(f"  render {frames(total)} frames ({total:.1f}s, {len(scene_json)} scenes, {spoken_words} words)")
    OUT.mkdir(exist_ok=True)
    raw_mp4 = OUT / f"{name}.raw.mp4"
    render(tl_rel, raw_mp4)
    finalize(raw_mp4, final_mp4, f"Chương {ch}. {script['title']}", sections, total)

    vtt = ["WEBVTT", ""]
    for i, s in enumerate(all_sentences):
        vtt += [str(i + 1), f"{vtt_time(s.start)} --> {vtt_time(s.start + s.duration)}", s.text, ""]
    final_mp4.with_suffix(".vtt").write_text("\n".join(vtt), encoding="utf-8")
    final_mp4.with_name(f"{name}.markers.json").write_text(
        json.dumps({"duration": round(total, 2), "markers": sections}, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    # One frame per scene at its last beat, plus the quiz reveal.
    picks = []
    for i, (sb, sj) in enumerate(zip(scenes, scene_json)):
        last = max(sj["beats"].values()) if sj["beats"] else 0
        picks.append((f"{name}_{i + 1:02d}_{sj['type']}", (sj["from"] + min(last + 45, sj["duration"] - 3)) / FPS))
        if sj["type"] == "code" and "l6" in sj["beats"]:
            picks.append((f"{name}_{i + 1:02d}_code_mid", (sj["from"] + sj["beats"]["l6"] + 20) / FPS))
        if sj["type"] == "quiz":
            picks.append((f"{name}_{i + 1:02d}_quiz_count", (sj["from"] + sj["beats"]["count"] + 40) / FPS))
    if scene_json and scene_json[0]["type"] == "cycle" and "n3" in scene_json[0]["beats"]:
        picks.append((f"{name}_01_cycle_mid", (scene_json[0]["from"] + scene_json[0]["beats"]["n3"] + 10) / FPS))
    frames_dir = OUT / "frames"
    sample_frames(final_mp4, sorted(picks, key=lambda p: p[1]), frames_dir)
    print(f"  words read: {spoken_words}, scenes: {len(scene_json)}, sections: {len(sections)}")
    if publish:
        publish_markers(ch, sections, total)
        errors = verify(final_mp4, sections, total)
        for e in errors:
            print(f"  VERIFY FAIL: {e}")
        for prob in problems:
            print(f"  WHISPER {prob['score']}: {prob['text']}  | heard: {prob['heard']}")
        report = {"duration": round(total, 1), "words": spoken_words, "scenes": len(scene_json), "verify": errors, "whisper": problems}
        (OUT / f"{name}-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"done: {final_mp4} ({total:.1f}s) frames in {frames_dir}")


def prep(ch: int) -> None:
    """Fast check of a chapter script without touching shared files: unknown terms, TTS
    (cached), beat gaps and estimated duration. No Whisper, no render."""
    script = json.loads((VIDEO / "chapters" / f"ch{ch}.script.json").read_text(encoding="utf-8"))
    entries = with_chapter_terms(load_dict(), ch)
    scenes = build_scenes(script, entries)
    missing = scan_terms([s.text for sb in scenes for s in sb.sentences if s.voice == VOICE_VI], entries)
    if missing:
        raise BuildError(
            f"terms without a respelling (add them to chapters/ch{ch}.terms.json as "
            '[{"term": ..., "spoken": ...}]):\n  ' + "\n  ".join(missing)
        )
    CACHE.mkdir(exist_ok=True)
    sentences = [s for sb in scenes for s in sb.sentences]
    asyncio.run(synthesize_all(sentences))
    total = layout(scenes)
    errors: list[str] = []
    for sb in scenes:
        resolve_beats(sb, entries, errors)
    if not 300 <= total <= 420:
        errors.append(f"duration {total / 60:.2f} min (want 5-7)")
    words = sum(len(s.text.split()) for s in sentences)
    print(f"prep ch{ch}: {total:.1f}s ({total / 60:.2f} min), {len(scenes)} scenes, {words} words")
    if errors:
        raise BuildError("".join(f"\n  {e}" for e in errors))
    print("prep OK")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    cmd = sys.argv[1] if len(sys.argv) > 1 else "demo"
    try:
        if cmd == "demo":
            build(VIDEO / "chapters" / "ch1.demo.script.json", OUT / "ch1-demo.mp4", publish=False)
        elif cmd == "build":  # one or more chapters, one after another in this process
            for n in [int(a) for a in sys.argv[2:]]:
                build(VIDEO / "chapters" / f"ch{n}.script.json", WEB / "public" / "videos" / f"ch{n}.mp4", publish=True)
        elif cmd == "prep":
            prep(int(sys.argv[2]))
        else:
            raise BuildError(f"unknown command {cmd}")
    except BuildError as err:
        print(f"\nBUILD FAILED: {err}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
