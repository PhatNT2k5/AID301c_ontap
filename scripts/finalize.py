"""Combine merged questions with annotations (chapter, explanation, AI check) and chapter content.

Inputs:  data/merged.json, data/annot/batch*.json, data/chapters/ch1..6.json
Outputs: data/questions.json, data/chapters.json (both consumed by the web app)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CHAPTER_IDS = range(1, 7)

REASON_DISAGREE = "AI không đồng ý với đáp án nguồn"
REASON_CONFLICT = "Các nguồn cho đáp án khác nhau"
REASON_AI = "Đáp án do AI giải"
REASON_COMMENT = "Đáp án theo bình luận"
REASON_LOW = "AI chưa chắc chắn"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def pick_answer(q: dict, a: dict) -> tuple[list[str], str]:
    """Return (answer, answerSource). Source answers win, except when the AI disagrees and
    another source backs the AI's answer (then the majority view is shown)."""
    if not q["answer"]:
        return sorted(a["aiAnswer"]), "ai"
    ai = sorted(a["aiAnswer"])
    if ai != sorted(q["answer"]):
        backing = [s for s in q.get("sourceAnswers", []) if sorted(s["answer"]) == ai]
        if backing:
            return ai, backing[0]["type"]
    return sorted(q["answer"]), q["answerSource"]


def review_reason(q: dict, a: dict, answer_source: str) -> str | None:
    disagree = bool(q["answer"]) and sorted(a["aiAnswer"]) != sorted(q["answer"])
    if disagree:
        return REASON_DISAGREE
    if q.get("conflict"):
        return REASON_CONFLICT
    if answer_source == "ai":
        return REASON_AI
    if answer_source == "comment":
        return REASON_COMMENT
    if a.get("confidence") == "low":
        return REASON_LOW
    return None


def build_questions() -> list[dict]:
    merged = load(DATA / "merged.json")
    annotations = {}
    for path in sorted((DATA / "annot").glob("batch*.json")):
        for a in load(path):
            annotations[a["id"]] = a
    missing = [q["id"] for q in merged if q["id"] not in annotations]
    if missing:
        sys.exit(f"Missing annotations for: {missing}")

    out = []
    for q in merged:
        a = annotations[q["id"]]
        answer, answer_source = pick_answer(q, a)
        reason = review_reason(q, a, answer_source)
        explanation = a["explanation"].strip()
        if a.get("reviewNote") and reason:
            explanation += f"\n\nGhi chú kiểm tra: {a['reviewNote'].strip()}"
        keys = {o["key"] for o in q["options"]}
        if not set(answer) <= keys:
            sys.exit(f"{q['id']}: answer {answer} not in options")
        out.append(
            {
                "id": q["id"],
                "question": q["question"],
                **({"code": q["code"]} if q.get("code") else {}),
                "options": q["options"],
                "answer": answer,
                "multi": len(answer) > 1,
                "explanation": explanation,
                "chapterId": a["chapterId"],
                "sources": q["sources"],
                "answerSource": answer_source,
                "needsReview": reason is not None,
                **({"reviewReason": reason} if reason else {}),
            }
        )
    # Exam questions before Quizlet-only ones inside each chapter (exams reflect the real test best).
    out.sort(key=lambda q: (q["chapterId"], q["id"].startswith("qz")))
    return out


def build_chapters() -> list[dict]:
    chapters = []
    for cid in CHAPTER_IDS:
        ch = load(DATA / "chapters" / f"ch{cid}.json")
        chapters.append(
            {
                "id": cid,
                "title": ch["title"],
                "ibmCourse": ch["ibmCourse"],
                "intro": ch["intro"],
                "keyPoints": ch["keyPoints"],
                "video": f"videos/ch{cid}.mp4",
                "sources": ch["sources"],
            }
        )
    return chapters


def main() -> None:
    questions = build_questions()
    (DATA / "questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=1), encoding="utf-8")
    flagged = [q for q in questions if q["needsReview"]]
    by_chapter = {c: sum(q["chapterId"] == c for q in questions) for c in CHAPTER_IDS}
    reasons: dict[str, int] = {}
    for q in flagged:
        reasons[q["reviewReason"]] = reasons.get(q["reviewReason"], 0) + 1
    print(f"questions={len(questions)} per chapter={by_chapter}")
    print(f"needsReview={len(flagged)} {reasons}")

    if all((DATA / "chapters" / f"ch{c}.json").exists() for c in CHAPTER_IDS):
        (DATA / "chapters.json").write_text(json.dumps(build_chapters(), ensure_ascii=False, indent=1), encoding="utf-8")
        print("chapters.json written")
    else:
        print("chapters.json skipped (chapter files not ready)")


if __name__ == "__main__":
    main()
