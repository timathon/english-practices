#!/usr/bin/env python3
"""
gen_9_pd.py — Generate a passage-decoder JSON from a unit markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_9_pd.py <path-to-unit.md> [--level "Grade X Semester Y Unit Z"]

Example:
    python3 scripts/genai/gen_9_pd.py data/B-PU1/b-pu1-u1/b-pu1-u1.md --level "Pupil's Book 1 - Unit 1"

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-passage-decoder-s.json next to the source file 
    (or preserves the suffix like -w.json if the source md has -w).
"""

import os, sys, json, argparse, re, random, string
from pathlib import Path
from google import genai
from google.genai import types

def generate_id(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

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

PROMPT_TEMPLATE = """\
You are an expert English curriculum designer. Generate a Passage Decoder JSON for the following primary school textbook unit.

RULES:
- Extraction Scope: Extract every sentence/dialogue line from the reading passages or listening dialogue sections. For textbooks starting with PU1, you MUST include both "The Friendly Farm" and "Literature".
- Dialogue Formatting:
  - If a line is spoken by a character (e.g., `Jack: Hi, Lucy!`), extract the name as `speaker` and set `newline: true` on the first sentence of the turn.
  - Subsequent sentences spoken in the same turn share the `speaker` property but do NOT have `newline: true`.
  - For normal passages, set `newline: true` only on the first sentence starting a new paragraph.
- Vocabulary Highlighting:
  - Include a `highlight` property on each sentence (comma-separated string) containing exactly the matching words/phrases as they appear in the sentence, corresponding to the vocabulary list provided. If no match, omit the field or leave empty.
- Options and Answer:
  - Each sentence must have exactly 3 translation options (`options` array): 1 correct and 2 wrong distractors.
  - The wrong distractors MUST contain subtle traps (e.g., vocabulary swaps, tense errors, negation flips).
  - Avoid Lazy/Obvious Traps: Do NOT generate lazy, unnatural, or grammatically incorrect Chinese traps (e.g., simply prepending "不" to nouns/adjectives/names, or silly typos). Distractors must be realistic, natural Chinese sentences.
  - Parenthetical explanations must NOT be included in the options. Clean strings only.
  - Provide the index of the correct option in `answer` (0, 1, or 2, randomized).

- You MUST ALWAYS include the "answer" field with the correct integer index (0, 1, or 2).
- You MUST ALWAYS include the "speaker" field (use an empty string "" if not a dialogue).
- You MUST ALWAYS include the "highlight" field (use an empty string "" if no vocab matches).

JSON structure must exactly match this format:
{{
  "level": "{level}",
  "title": "Passage Decoder",
  "sections": [
    {{
      "title": "<Section Title, e.g. Reading Passage / Listen and Read>",
      "sentences": [
        {{
          "id": "pd_1l7r8431",
          "en": "Look, Jenny, a family! A family in the café.",
          "options": [
            "看，珍妮，一个朋友！咖啡馆里的一个朋友。",
            "看，珍妮，一个家庭！咖啡馆里的一个家庭。",
            "看，吉姆，一个家庭！咖啡馆里的一个家庭。"
          ],
          "answer": 1,
          "speaker": "Jim",
          "newline": true,
          "highlight": "family, cafe"
        }}
      ]
    }}
  ]
}}

Output ONLY valid JSON, no markdown fences, no commentary.

VOCABULARY LIST (For Highlighting):
{vocab}

UNIT MARKDOWN:
{source}
"""

def main():
    parser = argparse.ArgumentParser(description="Generate passage-decoder JSON via Gemini API.")
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

    # Load vocab-guide if it exists
    vocab_str = "None provided."
    vocab_file = None
    for f in md_path.parent.glob("*-vocab-guide.json"):
        vocab_file = f
        break
    
    if vocab_file and vocab_file.exists():
        try:
            vocab_data = json.loads(vocab_file.read_text(encoding="utf-8"))
            vocab_items = [item["word"] for item in vocab_data.get("unit_vocabulary", []) if "word" in item]
            vocab_str = ", ".join(vocab_items)
        except Exception as e:
            print(f"Warning: could not parse {vocab_file}: {e}", file=sys.stderr)

    api_key = os.environ.get("GOOGLE_API_KEY_FREE")
    if not api_key:
        print("Error: GOOGLE_API_KEY_FREE environment variable not set.", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(level=level, vocab=vocab_str, source=source)

    print(f"Calling Gemini 3.1 Flash Lite for: {md_path}", file=sys.stderr)
    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="minimal"),
            temperature=0.3,
            response_mime_type="application/json"
        )
    )

    parsed = extract_json(response.text)

    # Validate and fix some fields if needed
    for section in parsed.get("sections", []):
        for s in section.get("sentences", []):
            if "id" not in s or not s["id"].startswith("pd_") or len(s["id"]) != 11:
                s["id"] = "pd_" + generate_id(8)
            if "answer" not in s:
                s["answer"] = 0
            if "speaker" not in s:
                s["speaker"] = ""
            if "highlight" not in s:
                s["highlight"] = ""
            if "newline" not in s:
                s["newline"] = False

    # Determine output filename
    stem = md_path.stem
    if "passage-decoder" in stem:
        out_name = f"{stem}.json"
    else:
        out_name = f"{stem}-passage-decoder-s.json"
        
    out_path = md_path.parent / out_name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total_sentences = sum(len(sec.get("sentences", [])) for sec in parsed.get("sections", []))
    print(f"Done! {total_sentences} sentences -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
