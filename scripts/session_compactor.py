import sys
import json
import os

TOKEN_THRESHOLD = 1200
HISTORY_TO_KEEP = 5

def calculate_tokens(text):
    return len(str(text)) // 4

def evaluate_session(filepath):
    if not os.path.exists(filepath):
        print(f"Error: Session file {filepath} not found.")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Session file {filepath} is not valid JSON.")
            return
    
    history = data.get("History", [])
    history_text = json.dumps(history)
    tokens = calculate_tokens(history_text)
    
    print(f"--- Session Evaluation: {filepath} ---")
    print(f"Current History Tokens: ~{tokens}")
    print(f"Threshold: {TOKEN_THRESHOLD}")
    
    if tokens > TOKEN_THRESHOLD:
        excess = tokens - TOKEN_THRESHOLD
        print(f"STATUS: EXCEEDS_LIMIT (+{excess} tokens)")
        print(f"-> ACTION REQUIRED: Agent must compact older history logs.")
        print(f"-> INSTRUCTION: Keep the last {HISTORY_TO_KEEP} items. Summarize the older items into the 'summary_context' field within the JSON.")
    else:
        print("STATUS: OK")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/session_compactor.py <path_to_session_json>")
    else:
        evaluate_session(sys.argv[1])
