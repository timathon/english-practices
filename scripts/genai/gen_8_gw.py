#!/usr/bin/env python3
"""
gen_8_gw.py — Generate a grammar-wizard JSON from a unit markdown file (and optional contents JSON) via Gemini API.

Usage:
    python3 scripts/genai/gen_8_gw.py <path-to-unit.md> [--level "Grade X Semester Y Unit Z"]

Example:
    python3 scripts/genai/gen_8_gw.py data/B-PU1/b-pu1-u1/b-pu1-u1.md --level "Pupil's Book 1 - Unit 1"

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-grammar-wizard.json next to the source file.
"""

import os, sys, json, argparse, re, random, string
from pathlib import Path
from google import genai
from google.genai import types

def generate_id(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

PROMPT_TEMPLATE = """\
You are an expert English curriculum analyst. Generate a Grammar Wizard JSON for the following primary school textbook unit.

RULES:
- Target Question Count: Exactly 2 Challenges of 10 questions each (20 questions total).
- Content Focus: Focus on the grammar points specified for the unit in the contents JSON (if provided) and the usage patterns in the unit's Markdown.
- Questions should test:
  - Purpose: communicative function or goal.
  - Definition/Concepts: Terminology and rules.
  - Formation: How to construct the forms.
  - Usage: Cloze/sentence-level questions checking application of rules.
  - Differentiation: Differentiating the unit's grammar from similar/confused rules.

JSON structure must exactly match this format:
{{
  "level": "{level}",
  "title": "Grammar Wizard",
  "challenges": [
    {{
      "id": "c1",
      "title": "<Short English Title for Challenge 1>",
      "icon": "🧙‍♂️",
      "questions": [
        {{
          "id": "<Unique 8-char alphanumeric string>",
          "type": "multiple-choice",
          "category": "<one of: purpose, definition, formation, usage, differentiation>",
          "prompt": "<Question prompt in Chinese, if completing a sentence use label like '完成句子：' or '选出填空最恰当的一项：'>",
          "options": [
            "Option 1",
            "Option 2",
            "Option 3",
            "Option 4"
          ],
          "answer": <0-3 integer>,
          "explanation": "<Detailed explanation in Chinese>",
          "hint": "<A brief hint in Chinese>"
        }}
      ]
    }},
    {{
      "id": "c2",
      "title": "<Short English Title for Challenge 2>",
      "icon": "⚡",
      "questions": [
        // 10 more questions here...
      ]
    }}
  ]
}}

Output ONLY valid JSON, no markdown fences, no commentary. Ensure exactly 20 questions total.

UNIT TEXTBOOK CONTENTS JSON (Context):
{contents}

UNIT MARKDOWN:
{source}
"""

def main():
    parser = argparse.ArgumentParser(description="Generate grammar-wizard JSON via Gemini API.")
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

    # Try to find contents json in parent's parent directory (e.g. data/B-PU1/b-pu1-contents.json)
    contents_str = "None provided."
    parent_dir = md_path.parent.parent
    contents_file = None
    for f in parent_dir.glob("*-contents.json"):
        contents_file = f
        break
    
    if contents_file and contents_file.exists():
        contents_str = contents_file.read_text(encoding="utf-8")

    api_key = os.environ.get("GOOGLE_API_KEY_FREE")
    if not api_key:
        print("Error: GOOGLE_API_KEY_FREE environment variable not set.", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(level=level, contents=contents_str, source=source)

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

    # Validate and fix some fields if needed
    for challenge in parsed.get("challenges", []):
        for q in challenge.get("questions", []):
            if "id" not in q or len(q["id"]) != 8:
                q["id"] = generate_id()

    stem = md_path.stem  # e.g. "b-pu1-u1"
    out_path = md_path.parent / f"{stem}-grammar-wizard.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total_qs = sum(len(c.get("questions", [])) for c in parsed.get("challenges", []))
    print(f"Done! {total_qs} questions -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
