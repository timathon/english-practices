#!/usr/bin/env python3
"""
gen_3_sh.py — Generate a spelling-hero JSON from a vocab-guide JSON via Gemini API.

Usage:
    python3 scripts/genai/gen_3_sh.py <path-to-vocab-guide.json>

Example:
    python3 scripts/genai/gen_3_sh.py data/B-PU1/b-pu1-u1/b-pu1-u1-vocab-guide.json

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename replaced '-vocab-guide' with '-spelling-hero'>.json
"""

import os, sys, json, argparse
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag

PROMPT_TEMPLATE = """\
You are an expert English phonics teacher for primary school students.

Generate a spelling-hero JSON from the vocab-guide below.

=== WORD FILTER ===
- Include ONLY single words (no spaces, no hyphens treated as separate words).
- Skip any item whose "word" field contains a space (e.g. "pencil case", "work together").
- Every qualifying single word MUST be included.

=== WORD TYPE ===
Determine from the "syllable_type" field in the vocab-guide:
- If syllable_type is one of [闭音节, 开音节, 相对开音节, 元音字母组合音节, r控制音节, 辅音+le音节] → type = "single-syllable"
- If syllable_type contains a hyphen (e.g. "pen-cil", "teach-er") → type = "multi-syllable"

=== CHUNKING RULES ===
Single-syllable: split by phonics graphemes (onset, vowel team/nucleus, coda).
  Examples:
  - "bag"  → ["b", "a", "g"]
  - "book" → ["b", "oo", "k"]
  - "desk" → ["d", "e", "sk"]
  - "chair" → ["ch", "air"]
  - "share" → ["sh", "are"]  (VCe or r-controlled, treat -are as one unit)
  - "kind"  → ["k", "i", "nd"]
  - "rule"  → ["r", "u-e"]   (VCe: show silent-e pattern)
  - "pack"  → ["p", "a", "ck"]
  - "wall"  → ["w", "a", "ll"]
  - "board" → ["b", "oar", "d"]

Multi-syllable: split by syllable as shown in syllable_type field.
  Examples:
  - "pencil" (pen-cil) → ["pen", "cil"]
  - "teacher" (teach-er) → ["teach", "er"]
  - "classroom" (class-room) → ["class", "room"]
  - "window" (win-dow) → ["win", "dow"]
  - "ruler" (ru-ler) → ["ru", "ler"]
  - "rubber" (rub-ber) → ["rub", "ber"]
  - "bookcase" (book-case) → ["book", "case"]
  - "crayon" (cray-on) → ["cray", "on"]
  - "cupboard" (cup-board) → ["cup", "board"]
  - "paper" (pa-per) → ["pa", "per"]
  - "playground" (play-ground) → ["play", "ground"]

=== DISTRACTOR RULES ===
For each chunk, provide exactly 2 distractors (3 options total: correct + 2 distractors).
- Distractors must be phonetically or visually similar spelling traps:
  - Onset consonants: use similar-sounding or easily confused consonants/digraphs
  - Vowel nuclei: use phonetically similar vowel spellings (e.g. "oo" vs "u", "oa" vs "or")
  - Codas: use common misspelling endings (e.g. "ck" vs "k", "nd" vs "nt")
  - Syllables: use similarly-spelled syllables from common English words
- Shuffle the 3 options array (correct is NOT always first).
- Do NOT repeat a distractor from another chunk of the same word.

=== PER-WORD FIELDS ===
- "id": unique 8-character alphanumeric string
- "word": English word
- "meaning": Chinese meaning from vocab-guide (strip PoS prefix like "n. ", "v. ", "adj. ")
- "type": "single-syllable" or "multi-syllable"
- "chunks": array of chunk objects, each with:
  - "correct": the correct chunk string
  - "options": array of exactly 3 shuffled strings

=== TOP-LEVEL STRUCTURE ===
{{
  "level": "{level}",
  "title": "Spelling Master",
  "spelling_words": [
    {{
      "id": "...",
      "word": "...",
      "meaning": "...",
      "type": "single-syllable" | "multi-syllable",
      "chunks": [
        {{
          "correct": "...",
          "options": ["...", "...", "..."]
        }}
      ]
    }}
  ]
}}

Output ONLY valid JSON, no markdown fences, no commentary.

=== VOCAB GUIDE SOURCE ===
{vocab_guide}
"""


def extract_json(text: str) -> dict:
    """Extract the first balanced JSON object from a string."""
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in response")
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])
    raise ValueError("Unbalanced JSON in response")


def main():
    use_high = parse_high_flag()

    parser = argparse.ArgumentParser(description="Generate spelling-hero JSON via Gemini API.")
    parser.add_argument("vg_file", help="Path to the vocab-guide JSON (e.g. data/B-PU1/b-pu1-u1/b-pu1-u1-vocab-guide.json)")
    args = parser.parse_args()

    vg_path = Path(args.vg_file)
    if not vg_path.exists():
        print(f"Error: file not found: {vg_path}", file=sys.stderr)
        sys.exit(1)

    with open(vg_path, encoding="utf-8") as f:
        vg = json.load(f)

    level = vg.get("level", "")
    items = vg.get("unit_vocabulary", [])
    single_words = [w for w in items if " " not in w["word"]]

    api_key, model_name = get_genai_config(use_high)

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(
        level=level,
        vocab_guide=json.dumps(vg, ensure_ascii=False, indent=2)
    )

    print(f"Calling {model_name} for: {vg_path}", file=sys.stderr)
    print(f"  {len(single_words)} single words to process (skipping {len(items) - len(single_words)} phrases)", file=sys.stderr)

    import time
    response = None
    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    temperature=0.2,
                    response_mime_type="application/json"
                )
            )
            break
        except Exception as e:
            print(f"Error calling Gemini API (attempt {attempt + 1}/5): {e}", file=sys.stderr)
            if attempt == 4:
                raise e
            time.sleep(2 ** attempt)

    parsed = extract_json(response.text)

    stem = vg_path.stem.replace("-vocab-guide", "")
    out_path = vg_path.parent / f"{stem}-spelling-hero.json"
    parsed["generated_by"] = model_name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    count = len(parsed.get("spelling_words", []))
    print(f"Done! {count} spelling words -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
