"""Merge raw question files from all exams/Quizlet sets and remove duplicates.

Input:  data/raw/*.json  (one file per source, schema documented in README)
Output: data/merged.json (unique questions, answers mapped onto canonical option keys)

Duplicates = near-identical question text AND near-identical option set (option order may differ
between exams, so answers are matched by option text, not by letter).
"""

from __future__ import annotations

import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_FILE = ROOT / "data" / "merged.json"

SOURCE_FILES = ["su26fe", "su26re", "sp26", "fa25", "quizlet2", "quizlet1"]
PRIORITY = {"official": 3, "quizlet": 2, "comment": 1, None: 0}
QUESTION_THRESHOLD = 0.9
OPTIONS_THRESHOLD = 0.85


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def options_signature(q: dict) -> str:
    return "|".join(sorted(norm(o["text"]) for o in q["options"]))


def similar(a: str, b: str) -> float:
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def answer_texts(q: dict) -> set[str]:
    by_key = {o["key"]: norm(o["text"]) for o in q["options"]}
    return {by_key[k] for k in (q.get("answer") or []) if k in by_key}


def map_answer(texts: set[str], canonical: dict) -> list[str]:
    """Map normalized answer texts onto the canonical question's option keys (fuzzy)."""
    keys = []
    for t in texts:
        best = max(canonical["options"], key=lambda o: similar(t, norm(o["text"])))
        keys.append(best["key"])
    return sorted(set(keys))


def load_all() -> list[dict]:
    items: list[dict] = []
    for name in SOURCE_FILES:
        path = RAW_DIR / f"{name}.json"
        if not path.exists():
            sys.exit(f"Missing raw file: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        for q in data:
            if len(q.get("options") or []) < 2:
                print(f"skip (no options): {q['id']}", file=sys.stderr)
                continue
            q["_qn"] = norm(q["question"] + (q.get("code") or ""))
            q["_on"] = options_signature(q)
            items.append(q)
    return items


# Pairs found by manual review that the fuzzy rule misses (canonical id first):
# reworded stems, a missing data table, or an exam variant with fewer options.
MANUAL_MERGES = [
    ("su26fe-42", "qz2-031"),
    ("su26re-26", "qz2-039"),
    ("fa25-17", "qz1-002"),
]


def apply_manual_merges(groups: list[list[dict]]) -> list[list[dict]]:
    def find(qid: str) -> list[dict]:
        return next(g for g in groups if any(q["id"] == qid for q in g))

    for keep_id, drop_id in MANUAL_MERGES:
        keep, drop = find(keep_id), find(drop_id)
        if keep is drop:
            continue
        canonical = next(q for q in keep if q["id"] == keep_id)
        keep.remove(canonical)
        keep[:0] = [canonical]
        keep.extend(drop)
        groups.remove(drop)
    return groups


def merge(items: list[dict]) -> list[dict]:
    # Highest-priority sources first, so each group's canonical entry is the most trustworthy one.
    items.sort(key=lambda q: -PRIORITY[q.get("answerSource")])
    groups: list[list[dict]] = []
    for q in items:
        for group in groups:
            head = group[0]
            if similar(q["_qn"], head["_qn"]) >= QUESTION_THRESHOLD and similar(q["_on"], head["_on"]) >= OPTIONS_THRESHOLD:
                group.append(q)
                break
        else:
            groups.append([q])

    groups = apply_manual_merges(groups)

    merged = []
    for group in groups:
        head = group[0]
        answers = []  # (source label, answerSource, mapped keys)
        for q in sorted(group, key=lambda q: -PRIORITY[q.get("answerSource")]):
            if q.get("answer"):
                answers.append((q["source"], q["answerSource"], map_answer(answer_texts(q), head)))
        best = answers[0] if answers else None
        distinct = {tuple(a[2]) for a in answers}
        merged.append(
            {
                "id": head["id"],
                "question": head["question"],
                **({"code": head["code"]} if head.get("code") else {}),
                "options": head["options"],
                "multi": bool(head.get("multi")) or (best is not None and len(best[2]) > 1),
                "answer": best[2] if best else None,
                "answerSource": best[1] if best else None,
                "sources": sorted({f"{q['source']} #{q['number']}" for q in group}),
                "sourceAnswers": [{"source": a[0], "type": a[1], "answer": a[2]} for a in answers],
                "conflict": len(distinct) > 1,
                **({"notes": "; ".join(q["notes"] for q in group if q.get("notes"))} if any(q.get("notes") for q in group) else {}),
            }
        )
    return merged


def main() -> None:
    items = load_all()
    merged = merge(items)
    # Stable, readable order: exams first then Quizlet, by original numbering.
    OUT_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
    conflicts = sum(m["conflict"] for m in merged)
    no_answer = sum(m["answer"] is None for m in merged)
    print(f"raw={len(items)} unique={len(merged)} conflicts={conflicts} no_answer={no_answer}")


if __name__ == "__main__":
    main()
