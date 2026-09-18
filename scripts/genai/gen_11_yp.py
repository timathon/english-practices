#!/usr/bin/env python3
"""
gen_11_yp.py — Generate a Passage Cloze (语篇填空) JSON from a markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_11_yp.py <path-to-yp.md> [--grammar-index <path-to-grammar-index.json>] [--level "Grade 10 - 中考专题"] [--out <path>]

Example:
    python3 scripts/genai/gen_11_yp.py v2-data/A10/a10-yp/a10-yp-2.md
    python3 scripts/genai/gen_11_yp.py v2-data/A10/a10-yp/a10-yp-2.md --high

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>.json next to the source markdown file.
"""

import os, sys, json, argparse, re, random, string
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag, parse_paid_flag, get_fallback_api_key, get_fallback_model


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

    # 1. Standard json.loads
    try:
        return json.loads(candidate, strict=False)
    except Exception:
        pass

    # 2. Clean trailing commas
    cleaned_commas = re.sub(r',\s*([}\]])', r'\1', candidate)
    try:
        return json.loads(cleaned_commas, strict=False)
    except Exception:
        pass

    # 3. Clean single-line comments
    cleaned_comments = re.sub(r'//.*$', '', cleaned_commas, flags=re.MULTILINE)
    try:
        return json.loads(cleaned_comments, strict=False)
    except Exception:
        pass

    return json.loads(candidate)


def split_sentences(text: str) -> list[str]:
    """Split paragraph text into individual sentences accurately."""
    # Split on [.!?] that are NOT preceded by digit and period like 1. or 2.
    raw_sents = re.split(r'(?<=[.!?])(?<!\b\d+[.!?])\s+(?=[A-Z"“\d])', text.strip())
    return [s.strip() for s in raw_sents if s.strip()]


PROMPT_TEMPLATE = """\
You are an expert English test creator and exam curriculum specialist. Generate a Passage Cloze (语篇填空) JSON dataset from the provided markdown document.

CRITICAL FORMAT & SCHEMA REQUIREMENTS:

1. Root Structure:
{{
  "level": "{level}",
  "title": "{title}",
  "storageSuffix": "{storage_suffix}",
  "primaryColor": "#0284c7",
  "primaryColorDark": "#0369a1",
  "sections": [ ... ]
}}

2. Section Objects:
Each passage in the input (whether 【典例1】, 【典例2】 or Passage 1, Passage 2, etc.) MUST be a separate section object:
{{
  "id": "sec_1", // unique string (e.g. sec_example_1, sec_example_2, sec_1, sec_2)
  "title": "Passage 1 - Descriptive Title",
  "icon": "🎓", // relevant emoji
  "raw_text": [
    // Array of discrete individual sentences representing the ENTIRE full passage with blanks.
    // Example:
    "How time flies!",
    "Now we are in the 1. ________ (nine) grade."
  ],
  "filled_text": [
    // Array of complete, pure English sentences with correct answers inserted (1-to-1 matching raw_text).
    // CRITICAL: Strip out any Chinese parenthetical glosses/annotations (e.g. "(节气)" -> "", "(助力器)" -> "").
    // Example:
    "The traditional Chinese calendar divides the year into 24 solar terms.",
    "Now we are in the ninth grade."
  ],
  "filled_text_cn": [
    // Array of accurate Chinese translations matching filled_text 1-to-1 (exact same length and index mapping).
    // Sub-headings should also be translated (e.g. "# 关于健康的建议").
    "时间过得真快！",
    "现在我们上九年级了。"
  ],
  "questions": [ ... ]
}}

3. Three Passage Text Arrays Rule:
- `raw_text`: Array of strings with blanks (e.g., `1. ________ (use)`).
- `filled_text`: Array of strings with blanks filled in with correct answers.
- `filled_text_cn`: Array of Chinese translated strings for `filled_text`.
- All 3 arrays MUST have the exact same length (`len(raw_text) == len(filled_text) == len(filled_text_cn)`).
- You must include EVERY sentence and sub-heading from the passage without omitting, summarizing, or stripping subheadings.
- Blanks in `raw_text` must follow the standard blank format: `1. ________ (base_word)` or `1. ________` (without base word).

4. Questions Array (Exactly 10 questions per section):
Each question object MUST strictly contain:
{{
  "id": "unique_string_id", // e.g. "yp2_ex1_1", "yp2_p1_1"
  "blank_num": 1, // integer matching the blank number in text (1-10 or 11-20, 71-80, etc.)
  "prompt_type": "given" | "none", // "given" if base word is provided in parentheses; "none" if pure grammar/structure blank
  "base_word": "have" | null, // string if prompt_type == "given", else null
  "grammar_category": "verb" | "noun" | "adj_adv" | "numeral" | "pronoun" | "article" | "conjunction" | "preposition",
  "grammar_point_id": "verb_tense", // strictly match the Grammar Index taxonomy (e.g., verb_tense, verb_voice, verb_infinitive, verb_gerund, verb_derivation, noun_plural, noun_possessive, noun_derivation, comparison_degree, adj_to_adv, numeral_ordinal, pronoun_case, pronoun_possessive, pronoun_reflexive, article_indefinite, article_definite, conj_coordinating, conj_subordinating, clause_connective, prep_collocation)
  "grammar_point_name": "一般过去时", // concise Chinese label for the grammar point (e.g. "一般过去时的被动语态", "形容词比较级", "不定式作目的状语")
  "options": [
    "correct_answer",
    "distractor_1",
    "distractor_2",
    "distractor_3"
  ], // exactly 4 high-quality options matching the grammatical context
  "answer": 0, // index of the correct option in options array (0 to 3, must match answer text)
  "explanation": "Detailed step-by-step Chinese explanation of why this answer is correct based on context and grammar cues.",
  "rule_summary": "Concise 1-sentence grammar rule mnemonic (e.g., '一般过去时表示过去发生的动作；buy过去式为bought。')",
  "sentence_index": 1 // 0-based integer index of the sentence in raw_text that contains this blank
}}

5. Sentence Index Alignment:
- `sentence_index` MUST accurately point to the exact element index in `raw_text` where this `blank_num` appears.

6. Distractor Quality:
- Distractors must be realistic traps testing common student misconceptions (such as tense confusion, part of speech conversion, singular vs plural, comparative vs superlative, prep confusion).

Reference Grammar Index Taxonomy:
{grammar_index_context}

Source Markdown Content:
```markdown
{markdown_content}
```

Respond with ONLY the valid JSON object.
"""


def main():
    parser = argparse.ArgumentParser(description="Generate Passage Cloze (语篇填空) JSON from Markdown")
    parser.add_argument("input_md", help="Path to input markdown file (e.g. v2-data/A10/a10-yp/a10-yp-2.md)")
    parser.add_argument("--grammar-index", help="Path to grammar index JSON file", default=None)
    parser.add_argument("--level", help="Level string", default="Grade 10 - 中考专题")
    parser.add_argument("--title", help="Title string", default=None)
    parser.add_argument("--out", help="Output JSON path", default=None)
    parser.add_argument("--high", action="store_true", help="Use high capability model")
    parser.add_argument("--paid", action="store_true", help="Use paid API key")

    args = parser.parse_args()

    use_high = parse_high_flag() or args.high
    force_paid = parse_paid_flag() or args.paid

    input_path = Path(args.input_md)
    if not input_path.exists():
        print(f"Error: Input markdown file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    # Determine default paths
    stem = input_path.stem
    out_path = Path(args.out) if args.out else input_path.parent / f"{stem}.json"

    # Find grammar index if not provided
    grammar_index_path = args.grammar_index
    if not grammar_index_path:
        candidate_idx = input_path.parent / "a10-yp-grammar-index.json"
        if candidate_idx.exists():
            grammar_index_path = candidate_idx

    grammar_context = ""
    if grammar_index_path and Path(grammar_index_path).exists():
        try:
            with open(grammar_index_path, "r", encoding="utf-8") as f:
                idx_data = json.load(f)
                points_list = []
                for cat in idx_data.get("categories", []):
                    for pt in cat.get("points", []):
                        points_list.append(f"- {cat['id']} -> {pt['id']} ({pt['name']}): {pt['rule']}")
                grammar_context = "\n".join(points_list)
        except Exception as e:
            print(f"Warning: Could not read grammar index: {e}", file=sys.stderr)

    # Extract title from filename if not given
    title = args.title
    if not title:
        m = re.search(r'yp-(\d+)', stem)
        if m:
            title = f"语篇填空 {m.group(1)}"
        else:
            title = "语篇填空"

    storage_suffix = f"_{stem.replace('-', '_')}"

    with open(input_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    prompt = PROMPT_TEMPLATE.format(
        level=args.level,
        title=title,
        storage_suffix=storage_suffix,
        grammar_index_context=grammar_context,
        markdown_content=md_content
    )

    api_key, model_name = get_genai_config(use_high=use_high, force_paid=force_paid)
    client = genai.Client(api_key=api_key)

    print(f"Generating Passage Cloze JSON for {input_path} using {model_name}...")

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )
        )
        raw_text = response.text
    except Exception as e:
        print(f"Error during generation: {e}", file=sys.stderr)
        fallback_key = get_fallback_api_key(api_key)
        if fallback_key:
            print("Retrying with fallback API key...", file=sys.stderr)
            client = genai.Client(api_key=fallback_key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            raw_text = response.text
        else:
            raise

    data = extract_json(raw_text)

    # Verify and fix sentence_index and raw_text structures
    for sec in data.get("sections", []):
        sec_id = sec.get("id", "unknown")
        raw_text = sec.get("raw_text", [])
        if isinstance(raw_text, str):
            # If AI returned paragraphs as a single string, split into sentences
            paras = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
            all_sents = []
            for p in paras:
                if p.startswith("#"):
                    all_sents.append(p)
                else:
                    all_sents.extend(split_sentences(p))
            sec["raw_text"] = all_sents
            raw_text = all_sents

        # Ensure filled_text is generated if not provided
        filled_text = sec.get("filled_text")
        if not filled_text or len(filled_text) != len(raw_text):
            ans_map = {}
            for q in sec.get("questions", []):
                b_num = q.get("blank_num")
                ans_idx = q.get("answer", 0)
                options = q.get("options", [])
                if b_num is not None and 0 <= ans_idx < len(options):
                    ans_map[b_num] = options[ans_idx]

            filled = []
            for s in raw_text:
                if s.startswith("#"):
                    filled.append(s)
                else:
                    # Replace blank with answer
                    s_filled = re.sub(r'(\d+)\.\s*_+(?:\s*\([^)]+\))?', lambda m: ans_map.get(int(m.group(1)), m.group(0)), s)
                    # Strip Chinese vocabulary annotations like (节气), (助力器), (溺水)
                    s_clean = re.sub(r'\s*\([\u4e00-\u9fa5\s/，、；]+\)', '', s_filled)
                    filled.append(s_clean.strip())
            sec["filled_text"] = filled
            filled_text = filled

        filled_text_cn = sec.get("filled_text_cn") or sec.get("raw_text_cn", [])
        sec["filled_text_cn"] = filled_text_cn
        if "raw_text_cn" in sec:
            del sec["raw_text_cn"]

        if not isinstance(filled_text_cn, list) or len(filled_text_cn) != len(raw_text):
            print(f"Warning: Section {sec_id} filled_text_cn length ({len(filled_text_cn) if isinstance(filled_text_cn, list) else 0}) does not match raw_text ({len(raw_text)})", file=sys.stderr)

        # Verify sentence_index for each question
        for q in sec.get("questions", []):
            b_num = q.get("blank_num")
            target_idx = None
            for idx, s in enumerate(raw_text):
                if f"{b_num}. _" in s or re.search(rf"\b{b_num}\.\s*_+", s):
                    target_idx = idx
                    break
            if target_idx is not None:
                q["sentence_index"] = target_idx

    # Write output JSON
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Successfully generated {out_path} ({len(data.get('sections', []))} sections, {sum(len(s.get('questions', [])) for s in data.get('sections', []))} questions)")


if __name__ == "__main__":
    main()
