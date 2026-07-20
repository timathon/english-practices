#!/usr/bin/env python3
"""
gen_10_test.py — Generate a test JSON from a unit markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_10_test.py <path-to-test.md> [--level "Grade X Semester Y Unit Z"]

Example:
    python3 scripts/genai/gen_10_test.py data/A8A/a8a-u1/a8a-u1-test.md --level "Grade 8 Semester 1 - Unit 1"

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>.json next to the source file.
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
You are an expert English curriculum designer and test generator. Generate a Test Sheet JSON by parsing the following test markdown.

RULES:
1. Parse the provided test markdown into a structured JSON file.
2. Structure:
   - `level`: The Grade/Semester info (e.g. "Grade 8 Semester 1").
   - `title`: The display title of the test (e.g. "Unit 1 自测卷").
   - `sections`: Array of section objects.
3. Passage & Mapping Integrity:
   - **Passage Integrity:** You MUST include the **entire full passage/article/dialogue** verbatim (every single sentence, name prefix, signature, etc.) exactly as it appears in the source markdown. Do NOT summarize, omit, clean up, or truncate any paragraphs, sentences, headers, list items, quotes, or signatures (e.g. keep "--Jenny", "--Lisa", etc.).
   - **Instruction Mapping Rule:** Always map sections with instructions such as "阅读短文，从所给的选项中选出可以填入空白处的最佳选项，其中有一个多余的选项。", "阅读短文，从方框内所给的选项中选出可以填入空白处的最佳选项，其中有一个多余的选项。", or "从文后的七个选项中选择五个还原到文章中" (typically known as "阅读还原") to the `"cloze-passage-wordbank"` type. Do NOT use `"dialogue-completion"` for non-dialogue reading passage completion exercises.
   - **任务型阅读 Conversion Rule:** Always map the section "任务型阅读" (Task-based Reading, which traditionally has open-ended or short-answer questions based on a passage) to the `"multiple-choice"` type under a `"reading-comprehension"` section (instead of short-answer), and generate 4 plausible multiple-choice options (`options` array) with one correct answer index (0-3) for each question using AI.
   - **Visual Diagram Conversion Rule:** If there is any `[*VISUAL: ...*]` diagram description (like a bar chart or graph) inside a passage, convert it into a beautiful, styled, responsive HTML/CSS diagram/chart (with proper bars, colors, labels, legends, etc. using inline CSS layout styles) wrapped in `[HTML: <chart-html>]`. The design must be extremely clean, polished, use modern color palettes, and be readable on light background themes.
   - `id`: Unique string ID identifying the section (e.g. "s1", "s2", "s3").
   - `title`: Short, clean, and concise display title (e.g. "一、完形填空", "二、阅读理解").
   - `instruction`: Instruction text in Chinese.
   - `type`: The question type in this section, which must be one of:
     - "cloze-passage" (Passage with inline blanks where each blank has its own independent options)
     - "cloze-passage-wordbank" (Passage with inline blanks filled from a shared option/word pool)
     - "reading-comprehension" (Reading passages with multiple-choice or short-answer questions)
     - "multiple-choice" (Traditional multiple-choice or phonetic choice)
     - "fill-in-the-blank-wordbank" (Fill-in-the-blank from a shared word bank)
     - "fill-in-the-blank-firstletter" (Fill-in-the-blank using a first-letter clue)
     - "definition-matching" (Matching definitions to a word list)
     - "dialogue-completion" (Completing dialogue with candidate sentences)
     - "true-false" (True or False questions)
   - `passage`: (Required for `cloze-passage`, `cloze-passage-wordbank`, `reading-comprehension`, `true-false` if applicable) Full text string with blanks represented by "[1]", "[2]", etc.
   - `wordbank`: (Required for `fill-in-the-blank-wordbank`, `cloze-passage-wordbank`, `definition-matching`) Array of strings representing candidate words or sentences.
   - `dialogue`: (Required for `dialogue-completion`) Array of turn objects: `{{ "speaker": string, "text": string }}` where blanks are indicated by placeholders like "[1]".
   - `options`: (Required for `dialogue-completion` at section level) Array of candidate sentences.
   - `questions`: Array of question items.

4. Question item fields:
   - `id`: A unique 8-character alphanumeric string.
   - **Mandatory for EVERY question item in all sections:**
     - `translation`: Chinese translation of the sentence, question prompt, or the context.
     - `explanation`: Detailed grammatical or contextual explanation in Chinese explaining why the answer is correct.
   - For `cloze-passage`, `cloze-passage-wordbank`, `dialogue-completion`:
     - `blankIndex`: 1-based integer corresponding to the blank `[1]`, `[2]`, etc.
   - For `reading-comprehension`:
     - `type`: Must be specified for each question item under `reading-comprehension` (either `"multiple-choice"` or `"short-answer"`).
   - For `multiple-choice` or `reading-comprehension` (multiple-choice):
     - `prompt`: The question sentence. For phonetic/pronunciation questions requiring visual comparison of specific letters in words, wrap those target letters/groups inside HTML underline tags: `<u>letters</u>` (e.g. `Let's <u>g</u>o to the zoo and see the <u>g</u>iraffes.`). Convert markdown bold markers (e.g. `**l**ove`) in phonetic questions to HTML underline tags (e.g. `<u>l</u>ove`).
     - `options`: Array of strings.
     - `answer`: 0-indexed integer of the correct option.
   - For `reading-comprehension` (short-answer):
     - `prompt`: The question prompt.
     - `answer`: A sample answer string.
   - For `fill-in-the-blank-wordbank` / `definition-matching` / `cloze-passage-wordbank` / `dialogue-completion`:
     - `answer`: Correct word/sentence string matching an item in `wordbank` or `options`.
   - For `fill-in-the-blank-firstletter`:
     - `prompt`: Question sentence. Use "______" for the blank.
     - `answer`: Correct word string.
   - For `true-false`:
     - `prompt`: The statement.
     - `answer`: Boolean (`true` or `false`).

Output ONLY valid JSON, no markdown fences, no commentary.

LEVEL LABEL: {level}
{conversion_instruction}
TEST MARKDOWN:
{source}
"""

def main():
    use_3_5 = "model=3.5" in sys.argv
    if use_3_5:
        sys.argv.remove("model=3.5")

    parser = argparse.ArgumentParser(description="Generate test JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to the test markdown file (e.g. data/A8A/a8a-u1/a8a-u1-test.md)")
    parser.add_argument("--level", default="", help='Level label, e.g. "Grade 8 Semester 1"')
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    source = md_path.read_text(encoding="utf-8")
    source_file = md_path.name
    level = args.level or source_file.replace("-", " ").replace(".md", "").title()

    is_a7a_a9 = bool(re.search(r'\b(a7a|a7b|a8a|a8b|a9)\b', str(md_path).lower()) or re.search(r'^(a7a|a7b|a8a|a8b|a9)', md_path.name.lower()))
    
    conversion_instruction = ""
    if is_a7a_a9:
        conversion_instruction = (
            "\n**CRITICAL:** For this unit (A7A/A7B/A8A/A8B/A9), the section '短文填空' "
            "(which asks to fill in the blanks with correct forms of bracketed words) "
            "MUST be converted into the 'cloze-passage' type (multiple-choice format with distractors). "
            "In the `passage` text, keep the bracketed word hint in place next to the blank placeholder "
            "(e.g., 'It's a [20] (wonder) place.'). "
            "For each blank, generate 4 options representing different forms or spellings of the word "
            "(e.g. ['wonderful', 'wonderfully', 'wonder', 'wonders']), with the correct form as the answer "
            "(0-indexed integer)."
        )

    if use_3_5:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            print("Error: GOOGLE_API_KEY environment variable not set.", file=sys.stderr)
            sys.exit(1)
        model_name = "gemini-3.5-flash"
    else:
        api_key = os.environ.get("GOOGLE_API_KEY_FREE")
        if not api_key:
            print("Error: GOOGLE_API_KEY_FREE environment variable not set.", file=sys.stderr)
            sys.exit(1)
        model_name = "gemini-3.1-flash-lite"

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(level=level, conversion_instruction=conversion_instruction, source=source)

    print(f"Calling {model_name} for: {md_path}", file=sys.stderr)
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

    parsed = extract_json(response.text)

    # Post-process to ensure all sections and questions have valid structure/IDs
    for i, section in enumerate(parsed.get("sections", []), 1):
        if "id" not in section or not section["id"]:
            section["id"] = f"s{i}"
        
        # Keep section titles clean and concise
        if "title" in section:
            section["title"] = section["title"].strip()

        for q in section.get("questions", []):
            if "id" not in q or len(q["id"]) != 8:
                q["id"] = generate_id(8)

    # Determine output path
    stem = md_path.stem
    if stem.endswith("-test"):
        out_name = f"{stem}.json"
    else:
        out_name = f"{stem}-test.json"

    out_path = md_path.parent / out_name
    parsed["generated_by"] = model_name
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total_questions = sum(len(sec.get("questions", [])) for sec in parsed.get("sections", []))
    print(f"Done! {total_questions} questions -> {out_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
