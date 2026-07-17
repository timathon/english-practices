#!/usr/bin/env python3
"""
gen_2_vm.py — Generate a vocab-master JSON from a vocab-guide JSON via Gemini API.

Usage:
    python3 scripts/genai/gen_2_vm.py <path-to-vocab-guide.json>

Example:
    python3 scripts/genai/gen_2_vm.py data/B-PU1/b-pu1-u1/b-pu1-u1-vocab-guide.json

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename replaced '-vocab-guide' with '-vocab-master'>.json
"""

import os, sys, json, argparse, math, random, string
from pathlib import Path
from google import genai
from google.genai import types

PROMPT_TEMPLATE = """\
You are an expert English curriculum question designer for primary school students.

Generate a vocab-master JSON from the vocab-guide below.

=== TARGET QUESTION COUNT ===
- Total vocab items: {total_items}
- Proper nouns excluded: {proper_nouns}
- Effective items: {effective_items}
- Target questions: {target_questions} (= effective_items × 1.5, rounded up to nearest 10)
- Challenges: {num_challenges} (each has exactly 10 questions)

=== QUESTION TYPE RULES ===
- Types: "Cloze", "Cn2En", "En2Cn"
- Prioritize verbs: verbs must ideally get all 3 question types (especially Cloze)
- Every non-proper-noun item must appear at least once across all questions
- Distribute types roughly evenly across challenges

=== CLOZE RULES ===
- Replace the target word in context_sentence with "____"
- 6 options (correct + 5 distractors). Distractors must match PoS and be plausible
- Add "(提示: [Chinese meaning])" at end of prompt if context could fit multiple options
- If correct word is inflected in sentence, ALL options must be inflected the same way

=== CN2EN RULES ===
- Prompt is the Chinese meaning
- 6 options (correct English word + 5 distractors). Distractors: similar-looking/sounding English words

=== EN2CN RULES ===
- Prompt is the English word
- 6 options (correct Chinese meaning + 5 distractors). Distractors: Chinese translations of visually/phonetically similar English words
- All options must be Chinese only — no raw English words in options
- No duplicate or near-duplicate meanings among the 6 options

=== DISTRACTOR QUALITY ===
- Same part of speech as target
- Same semantic category where possible (e.g. school objects for school objects)
- For spelling traps: visually/phonetically similar words
- Never use the same word as both correct and distractor

=== PER-QUESTION FIELDS ===
- "id": unique 8-character alphanumeric string
- "word": English word from vocab-guide
- "meaning": Chinese meaning from vocab-guide (without PoS prefix for display)
- "context_sentence": verbatim from vocab-guide (sentences with blanks like "This is your ____." cannot be used as a context sentence)
- "cn": Chinese translation of context_sentence
- "hint": the memorization_hook from vocab-guide (renamed)
- "type": "Cloze" | "Cn2En" | "En2Cn"
- "prompt": the question prompt string
- "options": array of exactly 6 strings (shuffled, correct at randomized index)
- "answer": integer 0–5 (index of correct option in options array)

=== TOP-LEVEL STRUCTURE ===
{{
  "level": "{level}",
  "title": "Vocab Master",
  "stats": {{
    "vocab_guide_items": {total_items},
    "vocab_master_questions": {target_questions}
  }},
  "challenges": [
    {{
      "id": "c1",
      "title": "Challenge title describing theme",
      "icon": "🎯",
      "questions": [ /* exactly 10 question objects */ ]
    }}
  ]
}}

Output ONLY valid JSON, no markdown fences, no commentary.

=== VOCAB GUIDE SOURCE ===
{vocab_guide}
"""


def calc_targets(items: list) -> dict:
    proper_nouns = 0  # caller can override if needed
    effective = len(items) - proper_nouns
    raw = effective * 1.5
    target_q = math.ceil(raw / 10) * 10
    num_challenges = target_q // 10
    return {
        "total_items": len(items),
        "proper_nouns": proper_nouns,
        "effective_items": effective,
        "target_questions": target_q,
        "num_challenges": num_challenges,
    }


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
    parser = argparse.ArgumentParser(description="Generate vocab-master JSON via Gemini API.")
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
    targets = calc_targets(items)

    api_key = os.environ.get("GOOGLE_API_KEY_FREE")
    if not api_key:
        print("Error: GOOGLE_API_KEY_FREE environment variable not set.", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(
        level=level,
        vocab_guide=json.dumps(vg, ensure_ascii=False, indent=2),
        **targets
    )

    print(f"Calling Gemini 3.1 Flash Lite for: {vg_path}", file=sys.stderr)
    print(f"  {targets['total_items']} items → {targets['target_questions']} questions / {targets['num_challenges']} challenges", file=sys.stderr)

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="low"),
            temperature=0.4,
            response_mime_type="application/json"
        )
    )

    parsed = extract_json(response.text)

    stem = vg_path.stem.replace("-vocab-guide", "")
    out_path = vg_path.parent / f"{stem}-vocab-master.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total_q = sum(len(c.get("questions", [])) for c in parsed.get("challenges", []))
    print(f"Done! {len(parsed.get('challenges', []))} challenges, {total_q} questions -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
