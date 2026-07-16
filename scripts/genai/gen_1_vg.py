#!/usr/bin/env python3
"""
gen_1_vg.py — Generate a vocab-guide JSON from a unit markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_1_vg.py <path-to-unit.md> [--level "Grade X Semester Y Unit Z"]

Example:
    python3 scripts/genai/gen_1_vg.py data/B-PU1/b-pu1-u1/b-pu1-u1.md --level "Pupil's Book 1 - Unit 1"

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-vocab-guide.json next to the source file.
"""

import os, sys, json, argparse
from pathlib import Path
from google import genai
from google.genai import types

PROMPT_TEMPLATE = """\
You are an expert English curriculum analyst. Generate a vocab-guide JSON for the following primary school textbook unit markdown.

RULES:
- level: "{level}"
- source_file: "{source_file}"
- Extract EVERY vocabulary item explicitly listed in "Vocabulary 1" and "Vocabulary 2" bulleted word lists.
- Additionally include up to 10 extra important words/phrases from dialogues and texts. Skip proper nouns.
- For each item:
  - "word": English word or phrase exactly as it appears
  - "meaning": Chinese translation with part-of-speech label (e.g. "n. 教室", "v. 分享", "phrase 一起合作")
  - "page_number": printed page number where word FIRST appears (from "--- PRINTED PAGE X ---" markers)
  - "context_sentence": one exact verbatim sentence from the text containing the word (for phrases, write a short natural English sentence)
  - "ipa": standard British IPA enclosed in forward slashes (e.g. "/ˈpensl/", "/desk/") for single words only; omit for multi-word phrases
  - "comparison": "word vs distractor" string for visually/phonetically similar words
  - "syllable_type": for single-syllable words use one of: 闭音节, 开音节, 相对开音节, 元音字母组合音节, r控制音节, 辅音+le音节. For multi-syllable words use syllable breakdown (e.g. "pen-cil"). For phrases use "phrase".
  - "memorization_hook": creative Chinese mnemonic

Output ONLY valid JSON, no markdown fences, no commentary.

JSON structure:
{{
  "level": "...",
  "source_file": "...",
  "unit_vocabulary": [
    {{
      "word": "...",
      "ipa": "...",
      "meaning": "...",
      "syllable_type": "...",
      "comparison": "...",
      "page_number": "...",
      "context_sentence": "...",
      "memorization_hook": "..."
    }}
  ]
}}

SOURCE MARKDOWN:
{source}
"""


def main():
    parser = argparse.ArgumentParser(description="Generate vocab-guide JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to the unit markdown file (e.g. data/B-PU1/b-pu1-u1/b-pu1-u1.md)")
    parser.add_argument("--level", default="", help='Level label, e.g. "Pupil\'s Book 1 - Unit 1"')
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    source = md_path.read_text(encoding="utf-8")
    source_file = md_path.name
    level = args.level or source_file.replace("-", " ").replace(".md", "").title()

    api_key = os.environ.get("GOOGLE_API_KEY_FREE")
    if not api_key:
        print("Error: GOOGLE_API_KEY_FREE environment variable not set.", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(level=level, source_file=source_file, source=source)

    print(f"Calling Gemini 3.1 Flash Lite for: {md_path}", file=sys.stderr)
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="minimal"),
            temperature=0.2,
            response_mime_type="application/json"
        )
    )

    parsed = json.loads(response.text)

    # Ensure all IPA values have slashes
    for item in parsed.get("unit_vocabulary", []):
        if "ipa" in item:
            ipa = item["ipa"]
            if not ipa.startswith("/"):
                item["ipa"] = f"/{ipa}/"

    stem = md_path.stem  # e.g. "b-pu1-u1"
    out_path = md_path.parent / f"{stem}-vocab-guide.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    count = len(parsed.get("unit_vocabulary", []))
    print(f"Done! {count} vocab items -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
