#!/usr/bin/env python3
"""
gen_5_rm.py — Generate a recall-map JSON from a unit markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_5_rm.py <path-to-unit.md> [--level "Pupil's Book 1"] [--part "Unit 1"]

Example:
    python3 scripts/genai/gen_5_rm.py data/B-PU1/b-pu1-u1/b-pu1-u1.md \
        --level "Pupil's Book 1" \
        --part "Unit 1"

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-recall-map.json next to the source file.
"""

import os, sys, json, argparse
from pathlib import Path
from google import genai
from google.genai import types

PROMPT_TEMPLATE = """\
You are an expert English curriculum designer. Generate a recall-map JSON for the following primary school textbook unit markdown.

=== STRUCTURE REQUIREMENTS ===
- Top level fields: "level" (e.g. "Pupil's Book 1"), "part" (e.g. "Unit 1"), and "tree" (the root node).
- Root node id must be "root", with "state": "emoji".
- ALL other nodes must have "state": "hidden".
- Every node must have a relevant "emoji".
- Every node must have a unique "id" (logical strings like "root", "stories", "v_nouns").

=== CORE BRANCHES (Children of root) ===
The root must have EXACTLY THREE main children:
1. "Stories"
2. "Vocabulary"
3. "Grammar Focus"

=== STORIES BRANCH RULES ===
- Break down the reading passages/texts into short "Memory Keys" (1-5 words per node).
- For PU1 textbooks, this branch MUST include summary branches for "The Friendly Farm" (comic strip) and "Literature" (e.g. "The First Day" play script), plus any other reading sections.
- Create sub-nodes under each story to summarize the plot points in English.

=== VOCABULARY BRANCH RULES ===
- Group into three sub-branches: "Verbs (Actions)", "Nouns (Things)", and "Phrases (Expressions)".
- Node text for vocabulary items MUST be bilingual in the format: "word (中文意思)" e.g. "jump (跳)", "classroom (教室)".

=== GRAMMAR FOCUS BRANCH RULES ===
- Extract patterns from "Language practice" or "Grammar Focus" sections.
- Provide simple explanations and practice examples as child nodes in English.

Output ONLY valid JSON, no markdown fences, no commentary.

=== JSON SKELETON ===
{{
  "level": "{level}",
  "part": "{part}",
  "tree": {{
    "id": "root",
    "text": "Unit title or core theme",
    "emoji": "🌟",
    "state": "emoji",
    "children": [
      {{
        "id": "stories",
        "text": "Stories",
        "emoji": "📖",
        "state": "hidden",
        "children": [
          {{
            "id": "story1",
            "text": "The Friendly Farm",
            "emoji": "🚜",
            "state": "hidden",
            "children": [
               /* 1-5 word memory keys */
            ]
          }}
        ]
      }},
      {{
        "id": "vocab",
        "text": "Vocabulary",
        "emoji": "📚",
        "state": "hidden",
        "children": [
          {{
             "id": "v_nouns",
             "text": "Nouns (Things)",
             "emoji": "📦",
             "state": "hidden",
             "children": [
               {{ "id": "v_n1", "text": "classroom (教室)", "emoji": "🏫", "state": "hidden" }}
             ]
          }}
        ]
      }}
    ]
  }}
}}

=== SOURCE MARKDOWN ===
{source}
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
    parser = argparse.ArgumentParser(description="Generate recall-map JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to the unit markdown file")
    parser.add_argument("--level", default="Pupil's Book 1", help='Level label')
    parser.add_argument("--part", default="Unit 1", help='Part label')
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    source = md_path.read_text(encoding="utf-8")
    
    api_key = os.environ.get("GOOGLE_API_KEY_FREE")
    if not api_key:
        print("Error: GOOGLE_API_KEY_FREE environment variable not set.", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(level=args.level, part=args.part, source=source)

    print(f"Calling Gemini 3.1 Flash Lite for: {md_path}", file=sys.stderr)

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="low"),
            temperature=0.3,
            response_mime_type="application/json"
        )
    )

    parsed = extract_json(response.text)

    stem = md_path.stem
    out_path = md_path.parent / f"{stem}-recall-map.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    print(f"Done! Saved recall-map to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
