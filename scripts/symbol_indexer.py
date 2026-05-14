"""
symbol_indexer.py
Scans TypeScript/TSX source files and records the exact line number of every
exported symbol (component, function, const, type, interface).
Writes results back into knowledge/index_variables.json under a "line" field.

Usage:
    python scripts/symbol_indexer.py
"""

import json
import os
import re
from pathlib import Path

PROJECT_ROOT = Path("/Volumes/BriteBrain/Projects/Asset Plan")
INDEX_PATH = PROJECT_ROOT / "knowledge/index_variables.json"
SRC_ROOT = PROJECT_ROOT / "src"

# Matches: export default function Foo / export function Foo /
#          export const Foo / export type Foo / export interface Foo /
#          export class Foo
EXPORT_RE = re.compile(
    r"^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|var|type|interface|class|enum)\s+([A-Za-z_][A-Za-z0-9_]*)"
)


def scan_symbols() -> dict[str, dict]:
    """Return {SymbolName: {file, line}} for every exported symbol in src/."""
    result: dict[str, dict] = {}
    for root, dirs, files in os.walk(SRC_ROOT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".next", "__pycache__")]
        for filename in files:
            if not filename.endswith((".ts", ".tsx")):
                continue
            full = Path(root) / filename
            rel = str(full.relative_to(PROJECT_ROOT))
            try:
                lines = full.read_text(encoding="utf-8").splitlines()
            except Exception:
                continue
            for lineno, text in enumerate(lines, start=1):
                m = EXPORT_RE.match(text.strip())
                if m:
                    name = m.group(1)
                    if name not in result:
                        result[name] = {"file": rel, "line": lineno}
    return result


def merge_into_index(new_symbols: dict[str, dict]) -> None:
    """Merge scanned line numbers into the existing knowledge/index_variables.json."""
    if INDEX_PATH.exists():
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {"variables": {}}

    variables = index.get("variables", {})

    # Inject / update "line" and "source" for every known symbol
    for name, info in new_symbols.items():
        if name in variables:
            variables[name]["line"] = info["line"]
            variables[name].setdefault("source", info["file"])
        else:
            variables[name] = {
                "type": "Unknown",
                "source": info["file"],
                "line": info["line"],
                "used_in": [],
            }

    # Report symbols in index that were NOT found in scan (may have been deleted)
    missing = [k for k in variables if k not in new_symbols]
    if missing:
        print(f"[WARN] {len(missing)} symbol(s) in index but not found in source: {missing[:5]}")

    index["variables"] = variables
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)


def main():
    print("Scanning exported symbols in src/ ...")
    symbols = scan_symbols()
    print(f"  Found {len(symbols)} exported symbol(s).")
    merge_into_index(symbols)
    print(f"  knowledge/index_variables.json updated with line numbers.")
    print("\nSample (first 5):")
    for name, info in list(symbols.items())[:5]:
        print(f"  {name}: {info['file']}:{info['line']}")


if __name__ == "__main__":
    main()
