import os
import re
from pathlib import Path

PROJECT_ROOT = Path("/Volumes/BriteBrain/Projects/Asset Plan")
INDEX_PATH = PROJECT_ROOT / "Index.md"

def scan_files():
    files = []
    for root, _, filenames in os.walk(PROJECT_ROOT):
        if any(ignored in root for ignored in [".git", "__pycache__", ".agents", "scripts"]):
            continue
        for filename in filenames:
            rel_path = Path(root).relative_to(PROJECT_ROOT) / filename
            files.append(rel_path)
    return files

def find_backlinks(target_file, all_files):
    backlinks = []
    target_name = target_file.name
    for file in all_files:
        if file == target_file:
            continue
        
        full_path = PROJECT_ROOT / file
        if not full_path.is_file():
            continue
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if str(target_file) in content or target_name in content:
                    backlinks.append(str(file))
        except:
            pass
    return backlinks

def update_index():
    all_files = scan_files()
    
    # Simple registry generation
    registry_lines = []
    for file in all_files:
        backlinks = find_backlinks(file, all_files)
        backlink_str = ", ".join(backlinks) if backlinks else "-"
        registry_lines.append(f"| [{file}](file://{PROJECT_ROOT/file}) | Code/Component | {backlink_str} |")

    # Update Index.md logic (Placeholder for now, just printing)
    print("Files found:", all_files)
    # In a real scenario, this would overwrite the Registry section of Index.md

if __name__ == "__main__":
    update_index()
