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
from config import get_genai_config, parse_high_flag

PROMPT_TEMPLATE = """\
You are an expert English curriculum designer. Generate a text-navigator JSON for the following primary school textbook unit markdown.

=== STRUCTURE REQUIREMENTS ===
- Top level fields: "level" (e.g. "{level}"), "part" (e.g. "{part}"), and "sections" (array).
- "sections" array: One object for each required section. Each object has a "section" string and a "tree" object (the hierarchical mindmap).
{section_instructions}
- CRITICAL: You must include the entire full article/passage/dialogue verbatim as it appears in the source, without summarizing, omitting, or truncating paragraphs or sentences.

=== TREE RULES ===
- Each "tree" is a hierarchical mindmap (root node ID "root").
- Hierarchy should reflect the logical flow. Do not put all sentences in a flat list. Group sentences logically by creating thematic sub-heading nodes (Level 1 and Level 2) first, then placing sentences as child nodes. Max nesting depth is 4 levels.
- "id": Unique, logical string IDs (e.g., "root", "p1", "p1_1"). Must be unique within each tree.
- "text": Exact verbatim text from the passage. Each leaf node should generally contain only one sentence. If a speaker is specified, omit the speaker name/prefix (e.g. "Emma:") from the "text" field.
- "speaker": (Optional) The name of the speaker if the sentence is a dialogue (e.g., "Rocky", "Emma"). If the text includes narrative speech verbs (e.g. 'I say', 'she says', 'says Mum'), keep the full narrative text intact and do NOT use the "speaker" field.
- "cn": Chinese translation of the sentence (do not include the speaker name prefix here either).
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
                "speaker": "Rocky",
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
                "speaker": "Mary",
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
    use_high = parse_high_flag()

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
    
    api_key, model_name = get_genai_config(use_high)

    path_upper = str(md_path).upper()
    level_upper = args.level.upper() if args.level else ""

    if "PU1" in path_upper or "PU1" in level_upper:
        section_instructions = '- Sections to include: "The Friendly Farm" and "Literature" (the comic strip and playscript sections).'
    elif any(x in path_upper or x in level_upper for x in ["A3A", "A3B", "A4A", "A4B", "A5A", "A5B", "A6A", "A6B"]):
        section_instructions = (
            '- Sections to include: "Get Ready - Activity 1", "Start Up", "Speed Up", "Fuel Up - Activity 1", '
            'and "Fuel Up - Activity [X]" (where [X] is the exact activity number, e.g., "Fuel Up - Activity 3", '
            'which has to be listening practice with a script in the appendix of the unit markdown). '
            'CRITICAL: You must include BOTH "Fuel Up - Activity 1" and the listening practice "Fuel Up - Activity [X]" '
            'if both are present in the source text.'
        )
    elif any(x in path_upper or x in level_upper for x in ["A7A", "A7B", "A8A", "A8B", "A9"]):
        section_instructions = (
            '- Sections to include: "Section A, 1b and 1c" (or "Section A, 1b, 1c, and 1d" etc., only if the first section of the listening scripts in the appendix is long and meaningful enough to include; otherwise skip this section), '
            '"Section A Activity 2a", "Section B Activity 1b", "Section B Activity 2a".'
        )
    elif "SA" in path_upper or "SB" in path_upper or md_path.name.upper().startswith("S"):
        section_instructions = (
            '- Sections to include: The main reading passage (e.g., "The Night the Earth Didn\'t Sleep" or "Explore the Chinese writing system") '
            'AND the Reading for Writing activity 1 passage (e.g., "THE STORY OF AN EYEWITNESS" or "Write a blog about English study").'
        )
    else:
        section_instructions = '- Sections to include: any sections containing long English articles/passages/dialogues. DO NOT include "The Friendly Farm" or "Literature" sections.'

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(
        level=args.level, 
        part=args.part, 
        section_instructions=section_instructions, 
        source=source
    )

    print(f"Calling {model_name} for: {md_path}", file=sys.stderr)

    import time
    response = None
    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    temperature=0.3,
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

    stem = md_path.stem
    out_path = md_path.parent / f"{stem}-text-navigator.json"
    parsed["generated_by"] = model_name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total_sections = len(parsed.get('sections', []))
    print(f"Done! Saved {total_sections} sections to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
