#!/usr/bin/env python3
"""
gen_7_wm.py — Generate a model writing map (*-writing-map.json) from a *-writing-task.md (and optional unit .md) via Gemini API.

Usage:
    python3 scripts/genai/gen_7_wm.py <path-to-writing-task.md> [--level "Grade 8 Semester 1"] [--part "Unit 8"] [high]

Example:
    python3 scripts/genai/gen_7_wm.py v2-data/A8A/a8a-u8/a8a-u8-writing-task.md

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<unit_stem>-writing-map.json next to the source file.
"""

import os, sys, json, argparse
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag

PROMPT_TEMPLATE = """\
You are an expert English writing curriculum designer. Generate a Model Writing Map (MWM) JSON based on the following writing task prompt (and unit context).

=== WRITING TASK PROMPT ===
{writing_task_content}

{unit_md_context}

=== REQUIREMENTS ===
- Output a single JSON object containing "level" (e.g. "{level}"), "part" (e.g. "{part}"), and "sections" (array of exactly 2 items).
- The two sections MUST be:
  1. section: "Model Essay Basic"
  2. section: "Model Essay Advanced"

=== CONTENT STRATEGY ===
- Model Essay Basic: Write a clear, well-structured model essay answering the writing task prompt using simple, direct sentences (SVO). Focus on clarity, accuracy, and fundamental vocabulary.
- Model Essay Advanced: Write an enhanced version of the essay for the same prompt. Use compound/complex sentences (relative clauses, subordinate conjunctions like 'because', 'although', 'if') and cohesive transitions (e.g., 'For example', 'As a result', 'In addition').

=== TREE RULES & SCHEMA ===
- Each section contains a "tree" object (hierarchical mindmap, root node ID "root").
- Structure: Build a structured 3-level tree hierarchy (root -> Level 1 Major Essay Parts e.g. Beginning/Body/Ending or Paragraphs -> Level 2 Sub-headings/Focus -> Level 3 Verbatim Sentences).
- DO NOT put all sentences in a flat list directly under the root or under a single parent node. Never allow any non-root parent node to have more than 5 direct leaf children without creating thematic sub-heading nodes (Level 1 and Level 2) first.
- Max nesting depth is 4 levels.
- "id": Unique, logical string IDs (e.g., "root", "p1", "p1_sub1", "p1_1"). Must be unique within each tree.
- "text": Exact English sentence. Leaf nodes should contain ONLY ONE sentence.
- "cn": Chinese translation of the sentence.
- "notes": Brief explanations of difficult vocabulary, expressions, or grammar points.
- "statement": A simple true/false statement in Chinese about the sentence's grammar or vocabulary.
- "answer": Boolean true or false for the statement.
- "explanation": Concise Chinese explanation for the true/false statement.
- "emoji": One highly relevant emoji mnemonic per node.
- "keywords": Comma-separated string of 2-5 trigger words acting as hints (e.g., "invitation, drama show"). Not needed for root.
- "highlight": MANDATORY for sentences containing glue words, conjunctions, discourse markers, or transition phrases (e.g., "if, when, because, however, for example, as a result, in addition, on behalf of, but, so, and, first, also"). Provide a comma-separated string of exact target glue words present in the sentence. Use "..." for split patterns (e.g., "if...then"). If no glue word/transition exists, set to "".
- "children": Recursive array of child nodes (empty array [] for leaf nodes).

Output ONLY valid JSON, no markdown fences, no commentary.

=== JSON SKELETON ===
{{
  "level": "{level}",
  "part": "{part}",
  "sections": [
    {{
      "section": "Model Essay Basic",
      "tree": {{
        "id": "root",
        "text": "Model Essay Basic",
        "emoji": "📝",
        "children": [
          {{
            "id": "b_intro",
            "text": "Beginning & Invitation",
            "cn": "开头与邀请",
            "emoji": "✉️",
            "children": [
              {{
                "id": "b_1",
                "text": "Dear Mr. Smith, I am glad to invite you to our English drama show.",
                "cn": "亲爱的史密斯先生，我很高兴邀请您参加我们的英语戏剧展示活动。",
                "notes": "invite sb to sth = 邀请某人参加某事",
                "statement": "这句话是一封邀请函的开篇语。",
                "answer": true,
                "explanation": "开篇直接表达邀请意图，符合邀请函格式。",
                "emoji": "📩",
                "keywords": "invite, drama show",
                "children": []
              }}
            ]
          }}
        ]
      }}
    }},
    {{
      "section": "Model Essay Advanced",
      "tree": {{
        "id": "root",
        "text": "Model Essay Advanced",
        "emoji": "🌟",
        "children": [
          {{
            "id": "a_intro",
            "text": "Opening & Formal Invitation",
            "cn": "开篇与正式邀请",
            "emoji": "📜",
            "children": [
              {{
                "id": "a_1",
                "text": "Dear Mr. Smith, on behalf of our school, I am writing to cordially invite you to our upcoming English drama show.",
                "cn": "亲爱的史密斯先生，我代表学校写信正式邀请您参加即将举行的英语戏剧展示活动。",
                "notes": "on behalf of = 代表; cordially = 热诚地",
                "statement": "这句话使用了高级表达 'on behalf of' 来表示代表学校。",
                "answer": true,
                "explanation": "on behalf of 是较为正式高级的介词短语。",
                "emoji": "🎓",
                "keywords": "on behalf of, cordially invite",
                "children": []
              }}
            ]
          }}
        ]
      }}
    }}
  ]
}}
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

    parser = argparse.ArgumentParser(description="Generate model writing map (*-writing-map.json) via Gemini API.")
    parser.add_argument("writing_task_file", help="Path to the *-writing-task.md file")
    parser.add_argument("--level", default="", help='Level label')
    parser.add_argument("--part", default="", help='Part label')
    args = parser.parse_args()

    wt_path = Path(args.writing_task_file)
    if not wt_path.exists():
        print(f"Error: file not found: {wt_path}", file=sys.stderr)
        sys.exit(1)

    wt_content = wt_path.read_text(encoding="utf-8")

    # Try to find corresponding main unit markdown file for context
    unit_stem = wt_path.stem.replace("-writing-task", "")
    unit_md_file = wt_path.with_name(f"{unit_stem}.md")
    unit_md_context = ""
    if unit_md_file.exists():
        unit_md_context = f"=== UNIT CONTEXT (FROM {unit_md_file.name}) ===\n{unit_md_file.read_text(encoding='utf-8')[:3000]}"

    level = args.level
    part = args.part

    if not level or not part:
        # Infer level and part from filename or path if possible
        folder_name = wt_path.parent.name.upper() # e.g. A8A-U8
        if "A" in folder_name and "-U" in folder_name:
            parts = folder_name.split("-U")
            grade = parts[0]
            unit = parts[1]
            if not level:
                level = f"Grade {grade}"
            if not part:
                part = f"Unit {unit}"
        else:
            if not level:
                level = "Grade 8 Semester 1"
            if not part:
                part = "Unit 8"

    api_key, model_name = get_genai_config(use_high)

    prompt = PROMPT_TEMPLATE.format(
        writing_task_content=wt_content,
        unit_md_context=unit_md_context,
        level=level,
        part=part
    )

    print(f"Calling {model_name} for: {wt_path}")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=8192
        )
    )

    try:
        data = extract_json(response.text)
    except Exception as e:
        print(f"Error parsing Gemini response as JSON: {e}", file=sys.stderr)
        print("Raw response:", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)

    out_file = wt_path.with_name(f"{unit_stem}-writing-map.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    sec_count = len(data.get("sections", []))
    print(f"Done! Saved {sec_count} writing map sections -> {out_file}")

if __name__ == "__main__":
    main()
