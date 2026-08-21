#!/usr/bin/env python3
"""
annotate_pd_verbs.py — Annotate existing passage-decoder JSONs with verb, verb_range, and pattern.

Usage:
    python3 scripts/genai/annotate_pd_verbs.py <path-to-passage-decoder.json> [--high]
"""

import os, sys, json, argparse, time, re
from pathlib import Path

# Add scripts/genai to sys.path
sys.path.insert(0, str(Path(__file__).parent))
from config import get_genai_config, parse_high_flag
from google import genai
from google.genai import types

PROMPT_TEMPLATE = """\
You are an expert English linguist and teacher.
Analyze the following list of English sentences from a reading passage and determine for each sentence:
1. "verb": The main finite verb or predicate phrase of the main clause (e.g. "is", "was", "went", "can be written", "makes", "have had", "look").
2. "verb_range": A 2-element integer array [start, end] representing the 0-indexed character slice within the EXACT "en" string such that en[start:end] equals the "verb".
3. "pattern": The core sentence structure pattern (e.g., "SVO", "SVC", "SVOC", "SVOO", "SV", "SV (被动)", "SVC (表语从句)", "SVO (宾语从句)", "SVOA", "SVA", "SV (祈使句)", "SVO (祈使句)").

CRITICAL:
- Accurately calculate [start, end] so that sentence["en"][start:end] matches sentence["verb"].
- If there are quotation marks, markdown formatting (like *italics* or **bold**), calculate indices on the verbatim "en" string provided.

Sentences to analyze:
{sentences_json}

Return ONLY a JSON array of objects with the fields "id", "verb", "verb_range", "pattern", matching the input IDs in the exact same order.
Example format:
[
  {{
    "id": "pd_xxx",
    "verb": "is",
    "verb_range": [82, 84],
    "pattern": "SVC (表语从句)"
  }}
]
"""

def extract_json_array(text: str) -> list:
    start = text.find("[")
    if start == -1:
        raise ValueError("No JSON array found in response")
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])
    raise ValueError("Unbalanced JSON array in response")

def process_file(file_path: Path, client: genai.Client, model_name: str):
    print(f"\nProcessing {file_path}...")
    data = json.loads(file_path.read_text(encoding="utf-8"))
    
    sections = data.get("sections", [])
    total_updated = 0

    for sec_idx, section in enumerate(sections):
        sentences = section.get("sentences", [])
        if not sentences:
            continue
        
        # Batch items to analyze (e.g. 20-30 per call)
        batch_size = 25
        for b_start in range(0, len(sentences), batch_size):
            batch = sentences[b_start:b_start + batch_size]
            items_to_send = [{"id": s.get("id"), "en": s.get("en")} for s in batch]
            
            prompt = PROMPT_TEMPLATE.format(sentences_json=json.dumps(items_to_send, ensure_ascii=False, indent=2))
            
            res_json = None
            for attempt in range(5):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            thinking_config=types.ThinkingConfig(thinking_level="minimal"),
                            temperature=0.1,
                            response_mime_type="application/json"
                        )
                    )
                    res_json = extract_json_array(response.text)
                    break
                except Exception as e:
                    print(f"  Attempt {attempt+1}/5 failed for section {sec_idx+1} batch {b_start}: {e}", file=sys.stderr)
                    time.sleep(2 ** attempt)
            
            if not res_json:
                print(f"  ERROR: Failed to get analysis for batch in {file_path}", file=sys.stderr)
                continue
            
            # Map results by ID
            res_map = {item["id"]: item for item in res_json if "id" in item}
            
            for s in batch:
                s_id = s.get("id")
                if s_id in res_map:
                    analysis = res_map[s_id]
                    verb = analysis.get("verb", "")
                    verb_range = analysis.get("verb_range")
                    pattern = analysis.get("pattern", "")
                    
                    en_text = s.get("en", "")
                    
                    # Verify / fix verb_range
                    if verb:
                        if not isinstance(verb_range, list) or len(verb_range) != 2 or en_text[verb_range[0]:verb_range[1]] != verb:
                            # Fallback exact find
                            idx = en_text.find(verb)
                            if idx != -1:
                                verb_range = [idx, idx + len(verb)]
                    
                    s["verb"] = verb
                    s["verb_range"] = verb_range
                    s["pattern"] = pattern
                    total_updated += 1

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Successfully updated {total_updated} sentences in {file_path}")

def main():
    use_high = parse_high_flag()
    parser = argparse.ArgumentParser(description="Annotate passage decoder JSONs with verb analysis.")
    parser.add_argument("files", nargs="+", help="JSON files to process")
    args = parser.parse_args()

    api_key, model_name = get_genai_config(use_high)
    client = genai.Client(api_key=api_key)

    for f_str in args.files:
        p = Path(f_str)
        if not p.exists():
            print(f"File not found: {p}", file=sys.stderr)
            continue
        process_file(p, client, model_name)

if __name__ == "__main__":
    main()
