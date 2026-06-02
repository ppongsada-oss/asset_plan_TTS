"""
session_indexer.py
Scans .sessions/session_*.json and builds knowledge/index_sessions.json.

Each entry stores:
  - path          : relative path to the session file
  - tasks         : associated_tasks[] from the session
  - status        : completed | in_progress | blocked
  - date          : inferred from session_id (session_NNN_YYYY-MM-DD) or file mtime
  - keywords      : extracted from summary_context + files_changed + tasks
  - summary       : first 200 chars of summary_context (excerpt for fast lookup)
  - files_changed : list of changed files (if present)

Usage:
    python scripts/session_indexer.py
"""

import json
import os
import re
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/Volumes/BriteBrain/Projects/Asset Plan")
SESSIONS_DIR = PROJECT_ROOT / ".sessions"
INDEX_PATH   = PROJECT_ROOT / "knowledge/index_sessions.json"

NOISE = {
    "the", "a", "an", "and", "or", "to", "in", "of", "for", "is", "was",
    "with", "all", "from", "this", "that", "by", "at", "on", "it", "its",
    "as", "be", "are", "were", "has", "have", "been", "not", "no", "new",
    "added", "updated", "completed", "session", "file", "files",
}

WORD_RE = re.compile(r"[a-zA-Z0-9_\-\.]+")
CAMEL_RE = re.compile(r"(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")


def tokenize_text(text: str) -> set[str]:
    tokens = set()
    for word in WORD_RE.findall(text):
        # Split camelCase
        parts = CAMEL_RE.split(word)
        for p in parts:
            p = p.lower().strip("._-")
            if len(p) > 2 and p not in NOISE:
                tokens.add(p)
    return tokens


def extract_keywords(session: dict, session_id: str) -> list[str]:
    tokens = set()

    # From session_id slug
    slug_parts = session_id.replace("session_", "").split("_")
    for p in slug_parts:
        if len(p) > 2 and not p.isdigit() and p not in NOISE:
            tokens.add(p.lower())

    # From summary_context
    tokens.update(tokenize_text(session.get("summary_context", "")))

    # From files_changed
    for f in session.get("files_changed", []):
        tokens.update(tokenize_text(f))

    # From History actions (may be list of dicts or list of strings)
    for h in session.get("History", []):
        if isinstance(h, dict):
            tokens.update(tokenize_text(h.get("action", "")))
        elif isinstance(h, str):
            tokens.update(tokenize_text(h))

    # Always include task IDs as keywords (e.g. "t-055", "t055")
    for t in session.get("associated_tasks", []):
        tokens.add(t.lower())
        tokens.add(t.lower().replace("-", ""))

    return sorted(tokens)


def infer_date(session_id: str, file_path: Path) -> str:
    # Try to extract date from path mtime
    try:
        mtime = file_path.stat().st_mtime
        return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
    except Exception:
        return "unknown"


def scan_sessions() -> dict[str, dict]:
    result = {}
    for path in sorted(SESSIONS_DIR.glob("session_*.json")):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue

        session_id = data.get("session_id", path.stem)
        rel_path   = str(path.relative_to(PROJECT_ROOT))

        # Build 200-char excerpt from summary_context
        summary_full = data.get("summary_context", "")
        excerpt = summary_full[:200].rstrip() + ("…" if len(summary_full) > 200 else "")

        result[session_id] = {
            "path":          rel_path,
            "tasks":         data.get("associated_tasks", []),
            "status":        data.get("status", "unknown"),
            "date":          infer_date(session_id, path),
            "keywords":      extract_keywords(data, session_id),
            "summary":       excerpt,
            "files_changed": data.get("files_changed", []),
        }

    return result


def build_index(sessions: dict[str, dict]) -> None:
    existing = {}
    if INDEX_PATH.exists():
        try:
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                existing = json.load(f).get("sessions", {})
        except Exception:
            pass

    # Merge: always overwrite with fresh scan (sessions are immutable once closed)
    merged = {**existing, **sessions}

    index = {"sessions": merged}
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)


def main():
    print("Scanning .sessions/session_*.json ...")
    sessions = scan_sessions()
    print(f"  Found {len(sessions)} session(s).")
    build_index(sessions)
    print(f"  knowledge/index_sessions.json updated.")
    print("\nSample (last 3):")
    for sid, info in list(sessions.items())[-3:]:
        print(f"  {sid}")
        print(f"    tasks: {info['tasks']}  status: {info['status']}")
        print(f"    keywords: {info['keywords'][:8]}")
        print(f"    summary: {info['summary'][:80]}…")


if __name__ == "__main__":
    main()
