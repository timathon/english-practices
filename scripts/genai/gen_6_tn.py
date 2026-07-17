#!/usr/bin/env python3
"""
gen_6_tn.py — Generate a text-navigator JSON from a unit markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_6_tn.py <path-to-unit.md> [--level "Pupil's Book 1"] [--part "Unit 1"]

Example:
    python3 scripts/genai/gen_6_tn.py data/B-PU1/b-pu1-u1/b-pu1-u1.md \
        --level "Pupil's Book 1" \
        --part "Unit 1"

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-text-navigator.json next to the source file.
"""

import os, sys, json, argparse
from pathlib import Path
from google import genai
from google.genai import types

PROMPT_TEMPLATE = """\
You are an expert English curriculum designer. Generate a text-navigator JSON for the following primary school textbook unit markdown.

=== STRUCTURE REQUIREMENTS ===
- Top level fields: "level" (e.g. "{level}"), "part" (e.g. "{part}"), and "sections" (array).
- "sections" array: One object for each required section. Each object has a "section" string and a "tree" object (the hierarchical mindmap).
- Sections to include for PU1 textbooks: "The Friendly Farm" and "Literature".
- Sections to include for non-PU1 textbooks: any sections with long english articles/passages/dialogues
- CRITICAL: You must include the entire full article/passage/dialogue verbatim as it appears in the source, without summarizing, omitting, or truncating paragraphs or sentences.

=== TREE RULES ===
- Each "tree" is a hierarchical mindmap (root node ID "root").
- Hierarchy should reflect the logical flow. Do not put all sentences in a flat list. Group sentences logically by creating thematic sub-heading nodes (Level 1 and Level 2) first, then placing sentences as child nodes. Max nesting depth is 4 levels.
- "id": Unique, logical string IDs (e.g., "root", "p1", "p1_1"). Must be unique within each tree.
- "text": Exact verbatim text from the passage. Each leaf node should generally contain only one sentence.
- "cn": Chinese translation of the sentence.
- "notes": Brief explanations of difficult vocabulary, expressions, or grammar points.
- "statement": A simple true/false statement in Chinese about the sentence's grammar or vocabulary.
- "answer": Boolean true or false for the statement.
- "explanation": Concise Chinese explanation for the true/false statement.
- "emoji": One highly relevant emoji mnemonic per node.
- "keywords": Comma-separated string of 2-5 trigger words acting as hints (e.g., "huge, storm"). Not needed for root.
- "highlight": (Optional) Comma-separated string of glue words or transition phrases to highlight.
- "children": Recursive array of child nodes (empty array [] for leaf nodes).

Output ONLY valid JSON, no markdown fences, no commentary.

=== JSON SKELETON ===
{{
  "level": "{level}",
  "part": "{part}",
  "sections": [
    {{
      "section": "The Friendly Farm",
      "tree": {{
        "id": "root",
        "text": "The Friendly Farm",
        "emoji": "🚜",
        "children": [
          {{
            "id": "panel1",
            "text": "Panel 1: The New Teacher",
            "cn": "图1：新老师",
            "emoji": "🎒",
            "children": [
              {{
                "id": "p1_1",
                "text": "Look at the bag!",
                "cn": "看那个包！",
                "notes": "Look at... = 看……",
                "statement": "这句话是一个祈使句。",
                "answer": true,
                "explanation": "Look at 动词原形开头，是祈使句。",
                "emoji": "👀",
                "keywords": "look, bag",
                "highlight": "Look at",
                "children": []
              }},
              {{
                "id": "p1_2",
                "text": "Yes, I'm the teacher!",
                "cn": "是的，我是老师！",
                "notes": "I'm = I am 的缩写",
                "statement": "句中的 I'm 指的是别人。",
                "answer": false,
                "explanation": "I'm 是 I am 的缩写，意思是“我是”。",
                "emoji": "👩‍🏫",
                "keywords": "yes, teacher",
                "children": []
              }}
            ]
          }}
        ]
      }}
    }}
  ]
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
    parser = argparse.ArgumentParser(description="Generate text-navigator JSON via Gemini API.")
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
    out_path = md_path.parent / f"{stem}-text-navigator.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total_sections = len(parsed.get('sections', []))
    print(f"Done! Saved {total_sections} sections to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
