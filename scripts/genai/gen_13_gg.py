#!/usr/bin/env python3
"""
gen_13_gg.py — Generate a grammar-guard JSON from a unit's text-navigator JSON and unit markdown via Gemini API.

Usage:
    python3 scripts/genai/gen_13_gg.py <path-to-unit.md> [--category "verb_be"] [--level "Grade X Semester Y - Unit Z"]

Example:
    python3 scripts/genai/gen_13_gg.py v2-data/A4A/a4a-u4/a4a-u4.md
    python3 scripts/genai/gen_13_gg.py v2-data/A4A/a4a-u4/a4a-u4.md --category verb_be

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-grammar-guard.json next to the source file.
"""

import os, sys, json, argparse, re, random, string
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag

def extract_tn_sentences(tn_json_path: Path):
    """Recursively extract all sentence leaves with their node id, text, and cn from text-navigator.json."""
    if not tn_json_path.exists():
        return []
    try:
        data = json.loads(tn_json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Warning: Failed to parse {tn_json_path}: {e}", file=sys.stderr)
        return []

    results = []

    def traverse(node):
        if not node or not isinstance(node, dict):
            return
        node_id = node.get("id")
        text = node.get("text", "")
        cn = node.get("cn", "")

        # If it has meaningful English text and isn't just a root/section title
        if node_id and text and node_id != "root":
            # Exclude activity headings like 'Unit 4 ... Listen and sing'
            if not text.lower().startswith("unit ") and not text.lower().startswith("activity "):
                results.append({
                    "tn_id": node_id,
                    "text": text,
                    "cn": cn
                })

        children = node.get("children", [])
        if isinstance(children, list):
            for child in children:
                traverse(child)

    sections = data.get("sections")
    if isinstance(sections, list):
        for sec in sections:
            if sec.get("tree"):
                traverse(sec.get("tree"))
    elif data.get("tree"):
        traverse(data.get("tree"))

    return results

PROMPT_TEMPLATE = """\
You are an expert English curriculum designer and assessment specialist.
Generate a Grammar Guard JSON for the given textbook unit.

IMPORTANT CORE DIRECTIVE:
Grammar Guard is NOT about the unit's grammar focus. It is strictly about basic/foundational grammar, and right now we are ONLY testing the VERB BE (am, is, are, be).
Every single question in both challenges MUST test the verb be! Do NOT include questions on modal verbs (can/can't), requests (may/can), prepositions, directions, or other grammar points.

RULES & SPECIFICATION:
1. Challenge & Question Count:
   - Exactly 2 Challenges:
     - c1: title "Verb Be: Basics 1", category "verb_be", icon "🛡️"
     - c2: title "Verb Be: Basics 2", category "verb_be", icon "🛡️"
   - Exactly 10 questions per challenge (20 questions total).

2. Sentence Selection & Linking (`tn_id`):
   - You MUST pick real sentences containing the verb be (am, is, are, be, or contractions like 'm, 's, 're) from the provided TEXT NAVIGATOR SENTENCES list below.
   - For each question, `tn_id` MUST be the exact `tn_id` of the matching sentence from the list.
   - Replace the verb be in the sentence with `"______"` to create `prompt`:
     - e.g. "Flowers are all around." -> "Flowers ______ all around."
     - e.g. "It's so hot in the sun." -> "It ______ so hot in the sun."
     - e.g. "I'm ten now." -> "I ______ ten now."
     - e.g. "What's your name?" -> "What ______ your name?"
     - e.g. "This is my room." -> "This ______ my room."
     - e.g. "There are books on the desk." -> "There ______ books on the desk."
   - If the text navigator has fewer than 20 distinct sentences with verb be, select available ones across different activities and vary the subjects, pronouns, or question forms, but ALWAYS ensure tn_id points to an authentic sentence from the text navigator.

3. Question Fields:
   - `id`: Unique alphanumeric ID across all challenges in the format `gg{{unit_code}}q01` to `gg{{unit_code}}q20` (e.g., `gg{stem_clean}q01`, `gg{stem_clean}q02`, ...). EVERY question must have a unique ID!
   - `tn_id`: The exact `tn_id` from the provided list.
   - `prompt`: Authentic sentence with `"______"` replacing the verb be.
   - `options`: Exactly 4 options: `["is", "are", "am", "be"]` (shuffled/permuted).
   - `answer`: 0-indexed integer (0, 1, 2, or 3) indicating the correct option in `options`. The position of the correct answer must be randomized!
   - `explanation`: Clear grammatical explanation in Chinese explaining why that form of be is correct based on the subject (person: I -> am; singular / he / she / it / uncountable / singular noun -> is; plural / you / we / they / plural noun -> are; there be concord).
   - `hint`: A helpful Chinese hint guiding the student (e.g. "第一人称单数 I 搭配 am。", "主语是复数名词。", "代词 it 属于第三人称单数。").

JSON structure must strictly match:
{{
  "level": "{level}",
  "title": "Grammar Guard",
  "storageSuffix": "{storage_suffix}",
  "challenges": [
    {{
      "id": "c1",
      "title": "Verb Be: Basics 1",
      "category": "verb_be",
      "icon": "🛡️",
      "questions": [
        {{
          "id": "gg{stem_clean}q01",
          "tn_id": "<exact_tn_id>",
          "prompt": "Flowers ______ all around.",
          "options": ["are", "is", "am", "be"],
          "answer": 0,
          "explanation": "主语 Flowers 是复数名词，一般现在时系动词用 are。",
          "hint": "注意主语 Flowers 是复数形式。"
        }}
      ]
    }},
    {{
      "id": "c2",
      "title": "Verb Be: Basics 2",
      "category": "verb_be",
      "icon": "🛡️",
      "questions": [
        {{
          "id": "gg{stem_clean}q11",
          "tn_id": "<exact_tn_id>",
          "prompt": "The tree ______ ten, too.",
          "options": ["is", "are", "am", "be"],
          "answer": 0,
          "explanation": "主语 The tree 是第三人称单数名词，系动词用 is。",
          "hint": "The tree 是单数名词。"
        }}
      ]
    }}
  ]
}}

TEXT NAVIGATOR SENTENCES (Available for tn_id):
{tn_sentences_json}

UNIT MARKDOWN CONTEXT:
{source_markdown}
"""

def main():
    use_high = parse_high_flag()

    parser = argparse.ArgumentParser(description="Generate grammar-guard JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to unit markdown file (e.g. v2-data/A4A/a4a-u4/a4a-u4.md)")
    parser.add_argument("--category", default="verb_be", help="Grammar target category (default: verb_be)")
    parser.add_argument("--level", default="", help='Level label, e.g. "Grade 4 Semester 1 - Unit 4"')
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    stem = md_path.stem
    m = re.match(r"^([a-zA-Z0-9]+-[uU]\d+)", stem)
    base_name = m.group(1).lower() if m else stem.lower()

    # Look for corresponding text-navigator JSON
    tn_path = md_path.parent / f"{base_name}-text-navigator.json"
    if not tn_path.exists():
        # Fallback search in parent directory
        for p in md_path.parent.glob("*-text-navigator.json"):
            tn_path = p
            break

    tn_sentences = extract_tn_sentences(tn_path)
    if not tn_sentences:
        print(f"Warning: No sentences found from {tn_path}. Proceeding with markdown context only.", file=sys.stderr)

    source_markdown = md_path.read_text(encoding="utf-8")
    level = args.level or base_name.replace("-", " ").title()
    storage_suffix = f"_{base_name.replace('-', '_')}_gg"
    stem_clean = re.sub(r"[^a-zA-Z0-9]", "", base_name)

    api_key, model_name = get_genai_config(use_high)
    client = genai.Client(api_key=api_key)

    prompt = PROMPT_TEMPLATE.format(
        level=level,
        category=args.category,
        storage_suffix=storage_suffix,
        stem_clean=stem_clean,
        tn_sentences_json=json.dumps(tn_sentences, ensure_ascii=False, indent=2),
        source_markdown=source_markdown[:15000]
    )

    print(f"Calling {model_name} for Grammar Guard: {md_path}", file=sys.stderr)
    import time
    response = None
    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="minimal"),
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

    text = response.text.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"JSON decode failed: {e}\nResponse was:\n{text[:500]}...", file=sys.stderr)
        sys.exit(1)

    # Ensure unique IDs across all questions
    seen_ids = set()
    q_counter = 1
    for c in data.get("challenges", []):
        for q in c.get("questions", []):
            qid = q.get("id")
            if not qid or qid in seen_ids:
                q["id"] = f"gg{stem_clean}q{q_counter:02d}"
            seen_ids.add(q["id"])
            q_counter += 1

    out_path = md_path.parent / f"{base_name}-grammar-guard.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    total_qs = sum(len(c.get("questions", [])) for c in data.get("challenges", []))
    print(f"Saved: {out_path} ({total_qs} questions in {len(data.get('challenges', []))} challenges)", file=sys.stderr)

if __name__ == "__main__":
    main()
