#!/usr/bin/env python3
"""
gen_9_pd.py — Generate a passage-decoder JSON from a unit markdown file or test markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_9_pd.py <path-to-unit.md-or-test.md> [--tn <path-to-text-navigator.json>] [--level "Grade X Semester Y Unit Z"] [--out <path>]

Example:
    python3 scripts/genai/gen_9_pd.py v2-data/A8A/a8a-u4/a8a-u4-test.md
    python3 scripts/genai/gen_9_pd.py v2-data/A8A/a8a-u4/a8a-u4.md

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    For unit md: Saves <same-dir>/<basename>-passage-decoder-s.json
    For test md: Saves <same-dir>/<unit>-passage-decoder-w.json
"""

import os, sys, json, argparse, re, random, string
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag, get_fallback_api_key, get_fallback_model


def generate_id(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def extract_json(text: str) -> dict:
    """Extract the first balanced JSON object from a string with fallback repair logic."""
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in response")
    depth = 0
    end_idx = -1
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end_idx = i
                break
    if end_idx == -1:
        raise ValueError("Unbalanced JSON in response")

    candidate = text[start:end_idx + 1]

    try:
        return json.loads(candidate, strict=False)
    except Exception:
        pass

    cleaned_commas = re.sub(r',\s*([}\]])', r'\1', candidate)
    try:
        return json.loads(cleaned_commas, strict=False)
    except Exception:
        pass

    return json.loads(candidate)


PROMPT_TEMPLATE = """\
You are an expert English curriculum designer. Generate a Passage Decoder JSON for the following English learning material.

CRITICAL RULES:
- Extraction Scope: Extract every single sentence/dialogue line from the reading passages or listening dialogue sections.
  - If the input is a Test markdown file (e.g. *-test.md), extract the full texts from ALL reading sections (such as 完形填空, 阅读理解 A, 阅读理解 B, 语法填空, 任务型阅读). For sentences with blanks or missing words, fill in the correct target word so that the decoded English sentence (`en`) is complete, natural, and grammatically correct. Do NOT include the multiple choice questions/stems/options at the end of each passage as sentences.
  - For normal textbook units, extract from textbook reading passages / listening scripts.
- "speaker": (Optional) The name of the speaker if the sentence is a dialogue (e.g., "Rocky", "Emma", "Sam"). If the text includes narrative speech verbs (e.g. 'I say', 'she says', 'says Mum'), keep the full narrative text intact and do NOT use the "speaker" field.
- Dialogue & Paragraph Formatting:
  - If a line is spoken by a character (e.g., `Jack: Hi, Lucy!`), extract the name as `speaker` and set `newline: true` on the first sentence of the turn.
  - Subsequent sentences spoken in the same turn share the `speaker` property but do NOT have `newline: true`.
  - For normal passages, set `newline: true` only on the first sentence starting a new paragraph.
- Vocabulary Highlighting:
  - Include a `highlight` property on each sentence (comma-separated string) containing exactly the matching words/phrases as they appear in the sentence, corresponding to the vocabulary list provided. If no match, omit the field or leave empty.
- Main Verb & Sentence Structure:
  - `verb`: The main finite verb / predicate of the main clause (e.g., "is", "can be written", "makes", "have", "first appeared", "stands for").
  - `verb_range`: A 2-element integer array [start, end] representing the exact 0-based character slice of `verb` in `en` (e.g. [82, 84]). Verify start and end index against `en` string so en[start:end] == verb.
  - `pattern`: The core sentence pattern (e.g. "SVO", "SVC", "SVOC", "SVOO", "SV", "SV (被动)", "SVC (表语从句)", "SVO (宾语从句)", "SVOA", "There be").
- Translation Options and Answer:
  - Each sentence must have exactly 3 translation options (`options` array): 1 correct and 2 wrong distractors.
  - The wrong distractors MUST contain subtle traps (e.g., vocabulary swaps, tense errors, negation flips).
  - Avoid Lazy/Obvious Traps: Do NOT generate lazy, unnatural, or grammatically incorrect Chinese traps (e.g., simply prepending "不" to nouns/adjectives/names, or silly typos). Distractors must be realistic, natural Chinese sentences.
  - Parenthetical explanations must NOT be included in the options. Clean strings only.
  - Provide the index of the correct option in `answer` (0, 1, or 2, randomized).

- You MUST ALWAYS include the "answer" field with the correct integer index (0, 1, or 2).
- You MUST ALWAYS include the "speaker" field (use an empty string "" if not a dialogue).
- You MUST ALWAYS include the "highlight" field (use an empty string "" if no vocab matches).
- You MUST ALWAYS include "verb", "verb_range", and "pattern" fields.

JSON structure must exactly match this format:
{{
  "level": "{level}",
  "title": "Passage Decoder",
  "sections": [
    {{
      "title": "<Section Title, e.g. 完形填空: Plum Blossom / Passage A: Juncao Technology>",
      "sentences": [
        {{
          "id": "pd_1l7r8431",
          "en": "Every country has different kinds of flowers.",
          "options": [
            "每个国家都有不同种类的花。",
            "每个城市都有相同种类的花。",
            "很多国家都有极少数种类的花。"
          ],
          "answer": 0,
          "speaker": "",
          "newline": true,
          "highlight": "country, different",
          "verb": "has",
          "verb_range": [14, 17],
          "pattern": "SVO"
        }}
      ]
    }}
  ]
}}

Output ONLY valid JSON, no markdown fences, no commentary.

VOCABULARY LIST (For Highlighting):
{vocab}

TEXT NAVIGATOR SOURCE (If available):
{text_navigator}

SOURCE MARKDOWN CONTENT:
{source}
"""


def main():
    use_high = parse_high_flag()

    parser = argparse.ArgumentParser(description="Generate passage-decoder JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to the unit markdown file or test markdown file")
    parser.add_argument("--tn", default="", help='Path to text-navigator JSON file')
    parser.add_argument("--out", "-o", default="", help='Custom output JSON path')
    parser.add_argument("--level", default="", help='Level label, e.g. "Grade 8 Semester 1 - Unit 4"')
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
            vocab_list = [v.get("word", "") for v in vocab_data.get("unit_vocabulary", []) if v.get("word")]
            vocab_str = ", ".join(vocab_list)
        except Exception as e:
            print(f"Warning: could not read {vocab_file}: {e}", file=sys.stderr)

    # Load text-navigator if provided or exists
    tn_str = "None provided."
    tn_file = Path(args.tn) if args.tn else None
    if not tn_file or not tn_file.exists():
        for f in md_path.parent.glob("*-text-navigator.json"):
            tn_file = f
            break

    if tn_file and tn_file.exists():
        try:
            tn_str = tn_file.read_text(encoding="utf-8")
        except Exception as e:
            print(f"Warning: could not read {tn_file}: {e}", file=sys.stderr)

    key_val, model_name = get_genai_config(use_high)

    client = genai.Client(api_key=key_val)
    prompt = PROMPT_TEMPLATE.format(level=level, vocab=vocab_str, text_navigator=tn_str, source=source)

    print(f"Calling {model_name} for: {md_path}", file=sys.stderr)
    import time
    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=16384,
                    response_mime_type="application/json"
                )
            )
            break
        except Exception as e:
            alt_model = get_fallback_model(model_name)
            alt_key = get_fallback_api_key(key_val)
            retry_model = alt_model or model_name
            retry_key = alt_key or key_val
            print(f"Primary model {model_name} failed ({e}). Retrying with Model: {retry_model}...", file=sys.stderr)
            try:
                client = genai.Client(api_key=retry_key)
                response = client.models.generate_content(
                    model=retry_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=16384,
                        response_mime_type="application/json"
                    )
                )
                break
            except Exception as e2:
                print(f"Error calling Gemini API on retry: {e2}", file=sys.stderr)
                if attempt == 2:
                    raise e2
                time.sleep(2 ** attempt)

    parsed = extract_json(response.text)

    # Validate and fix some fields if needed
    for section in parsed.get("sections", []):
        for s in section.get("sentences", []):
            if "en" in s and s["en"]:
                s["en"] = re.sub(r'\s*\([\u4e00-\u9fa5\uff0c\uff1b\uff1a\s]+\)', '', s["en"]).strip()
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

            # Validate / fix verb_range indices against en text
            en_text = s.get("en", "")
            verb = s.get("verb", "")
            verb_range = s.get("verb_range")
            if verb and (not isinstance(verb_range, list) or len(verb_range) != 2 or en_text[verb_range[0]:verb_range[1]] != verb):
                # Recalculate verb_range if possible
                idx = en_text.find(verb)
                if idx != -1:
                    s["verb_range"] = [idx, idx + len(verb)]

    # Determine output filename
    if args.out:
        out_path = Path(args.out)
    else:
        stem = md_path.stem
        if "passage-decoder" in stem:
            out_name = f"{stem}.json"
        elif stem.endswith("-test"):
            prefix = stem[:-5]
            out_name = f"{prefix}-passage-decoder-w.json"
        elif stem.endswith("-w"):
            out_name = f"{stem}-passage-decoder.json"
        else:
            out_name = f"{stem}-passage-decoder-s.json"
        out_path = md_path.parent / out_name

    parsed["generated_by"] = model_name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total_sentences = sum(len(sec.get("sentences", [])) for sec in parsed.get("sections", []))
    print(f"Done! {total_sentences} sentences -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
