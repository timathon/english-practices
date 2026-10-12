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

PROMPT_TEMPLATE_VERB_BE = """\
You are an expert English curriculum designer and assessment specialist.
Generate a Grammar Guard JSON for the given textbook unit.

IMPORTANT CORE DIRECTIVE:
Grammar Guard is strictly about basic/foundational grammar. This category tests VERB BE (am, is, are, be).
Every single question in both challenges MUST test the verb be!

RULES & SPECIFICATION:
1. Challenge & Question Count:
   - Exactly 2 Challenges:
     - c1: title "Verb Be: Basics 1", category "verb_be", icon "🛡️"
     - c2: title "Verb Be: Basics 2", category "verb_be", icon "🛡️"
   - Exactly 10 questions per challenge (20 questions total).

2. Sentence Selection & Linking (`tn_id`):
   - You MUST pick real sentences containing the verb be (am, is, are, be, or contractions like 'm, 's, 're) from the provided TEXT NAVIGATOR SENTENCES list below.
   - For each question, `tn_id` MUST be the exact `tn_id` of the matching sentence from the list.
   - Replace the verb be in the sentence with `"______"` to create `prompt`.

3. Question Fields:
   - `id`: Unique alphanumeric ID across all challenges in the format `gg{stem_clean}q01` to `gg{stem_clean}q20`.
   - `tn_id`: The exact `tn_id` from the provided list.
   - `prompt`: Authentic sentence with `"______"` replacing the verb be.
   - `options`: Exactly 4 options: `["is", "are", "am", "be"]` (shuffled/permuted).
   - `answer`: 0-indexed integer (0-3) indicating the correct option in `options`.
   - `explanation`: Clear grammatical explanation in Chinese.
   - `hint`: Concise Chinese hint guiding the student.

JSON structure:
{{
  "challenges": [
    {{
      "id": "c1",
      "title": "Verb Be: Basics 1",
      "category": "verb_be",
      "icon": "🛡️",
      "questions": [ ... 10 questions ... ]
    }},
    {{
      "id": "c2",
      "title": "Verb Be: Basics 2",
      "category": "verb_be",
      "icon": "🛡️",
      "questions": [ ... 10 questions ... ]
    }}
  ]
}}

TEXT NAVIGATOR SENTENCES:
{tn_sentences_json}

UNIT MARKDOWN CONTEXT:
{source_markdown}
"""

PROMPT_TEMPLATE_YES_NO = """\
You are an expert English primary school curriculum developer.
Generate TWO challenges of "yes_no_question" category for Grammar Guard.
Each challenge must have EXACTLY 10 questions (20 questions total).

GOAL:
Test the student's mastery of transforming authentic textbook statement sentences into Yes/No general questions (一般疑问句).
Target grammatical mechanics:
1. Modal verbs (can -> Can you / Can he / Can she...? + bare infinitive)
2. Simple present auxiliary verbs (do / does -> Do you / Does he / Does she...? + bare infinitive)
3. Be-verb inversion (am / is / are -> Are you / Is he / Is she / Is it / Are they...?)
4. Person / pronoun shifts (I -> you, my -> your, me -> you, we -> you).

RULES & REQUIREMENTS:
1. Every question must correspond to a real statement sentence from the provided TEXT NAVIGATOR SENTENCES list.
2. `tn_id`: MUST be the exact tn_id from the provided list.
3. `prompt`: MUST be exactly:
   "将陈述句转换为一般疑问句：\\n<Statement sentence>"
4. `options`: Exactly 4 options: 1 correct Yes/No question and 3 plausible, high-quality distractor questions.
   - Distractors should test common primary school grammatical pitfalls:
     * Wrong auxiliary: using Do/Are/Does when Can is required, or vice versa.
     * Missing bare infinitive reduction: keeping 3rd person -s after Does.
     * Failed pronoun shift (e.g. "Can I swim?" instead of "Can you swim?").
     * Wrong agreement (e.g. "Does you...", "Do he...").
5. `answer`: 0-indexed integer (0-3) randomized among the options.
6. `explanation`: Clear grammatical explanation in Chinese.
7. `hint`: Concise Chinese clue guiding the student on auxiliary selection or verb form.
8. Challenge structure:
   - Challenge 1: id "c3", title "Yes/No Questions: Basics 1", category "yes_no_question", icon "❓", 10 questions.
   - Challenge 2: id "c4", title "Yes/No Questions: Basics 2", category "yes_no_question", icon "❓", 10 questions.
   - Question IDs: `gg{stem_clean}q21` up to `gg{stem_clean}q40`.

OUTPUT FORMAT:
Output ONLY valid JSON:
{{
  "challenges": [
    {{
      "id": "c3",
      "title": "Yes/No Questions: Basics 1",
      "category": "yes_no_question",
      "icon": "❓",
      "questions": [ ... 10 questions ... ]
    }},
    {{
      "id": "c4",
      "title": "Yes/No Questions: Basics 2",
      "category": "yes_no_question",
      "icon": "❓",
      "questions": [ ... 10 questions ... ]
    }}
  ]
}}

TEXT NAVIGATOR SENTENCES:
{tn_sentences_json}

UNIT MARKDOWN CONTEXT:
{source_markdown}
"""

def main():
    use_high = parse_high_flag()

    parser = argparse.ArgumentParser(description="Generate grammar-guard JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to unit markdown file (e.g. v2-data/A4A/a4a-u4/a4a-u4.md)")
    parser.add_argument("--category", choices=["verb_be", "yes_no_question", "all"], default="all",
                        help="Grammar category: 'verb_be', 'yes_no_question', or 'all' (default: all)")
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

    out_path = md_path.parent / f"{base_name}-grammar-guard.json"
    existing_data = {}
    if out_path.exists():
        try:
            existing_data = json.loads(out_path.read_text(encoding="utf-8"))
        except Exception:
            existing_data = {}

    target_categories = ["verb_be", "yes_no_question"] if args.category == "all" else [args.category]
    challenges_map = {}

    # Index any pre-existing challenges by category
    for c in existing_data.get("challenges", []):
        cat = c.get("category", "verb_be")
        if cat not in target_categories:
            challenges_map.setdefault(cat, []).append(c)

    import time
    for cat in target_categories:
        template = PROMPT_TEMPLATE_VERB_BE if cat == "verb_be" else PROMPT_TEMPLATE_YES_NO
        prompt = template.format(
            level=level,
            storage_suffix=storage_suffix,
            stem_clean=stem_clean,
            tn_sentences_json=json.dumps(tn_sentences, ensure_ascii=False, indent=2),
            source_markdown=source_markdown[:15000]
        )

        print(f"Calling {model_name} for category '{cat}': {md_path}", file=sys.stderr)
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
            res_json = json.loads(text)
        except json.JSONDecodeError as e:
            print(f"JSON decode failed: {e}\nResponse was:\n{text[:500]}...", file=sys.stderr)
            sys.exit(1)

        challenges = res_json.get("challenges", [])
        challenges_map[cat] = challenges

    # Assemble challenges in order: verb_be first (c1, c2), then yes_no_question (c3, c4), etc.
    ordered_challenges = []
    if "verb_be" in challenges_map:
        for idx, c in enumerate(challenges_map["verb_be"]):
            c["id"] = f"c{idx + 1}"
            c["category"] = "verb_be"
            c["icon"] = "🛡️"
            for q_idx, q in enumerate(c.get("questions", [])):
                q["id"] = f"gg{stem_clean}q{q_idx + idx * 10 + 1:02d}"
            ordered_challenges.append(c)

    if "yes_no_question" in challenges_map:
        offset = len(ordered_challenges)
        for idx, c in enumerate(challenges_map["yes_no_question"]):
            c["id"] = f"c{offset + idx + 1}"
            c["category"] = "yes_no_question"
            c["icon"] = "❓"
            for q_idx, q in enumerate(c.get("questions", [])):
                q["id"] = f"gg{stem_clean}q{20 + q_idx + idx * 10 + 1:02d}"
            ordered_challenges.append(c)

    # Any other pre-existing categories
    for cat, clist in challenges_map.items():
        if cat not in ["verb_be", "yes_no_question"]:
            ordered_challenges.extend(clist)

    final_data = {
        "level": existing_data.get("level", level),
        "title": "Grammar Guard",
        "storageSuffix": existing_data.get("storageSuffix", storage_suffix),
        "challenges": ordered_challenges
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)

    total_qs = sum(len(c.get("questions", [])) for c in ordered_challenges)
    print(f"Saved: {out_path} ({total_qs} questions in {len(ordered_challenges)} challenges)", file=sys.stderr)

if __name__ == "__main__":
    main()
