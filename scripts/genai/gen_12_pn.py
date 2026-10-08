#!/usr/bin/env python3
"""
gen_12_pn.py — Generate a phonics-ninja JSON from a unit markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_12_pn.py <path-to-unit.md> [--level "Grade X Semester Y - Unit Z"]

Example:
    python3 scripts/genai/gen_12_pn.py v2-data/A7A/a7a-u1/a7a-u1.md

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-phonics-ninja.json next to the source file.
"""

import os, sys, json, argparse, re, random, string
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag

def generate_id(prefix="pn", length=6):
    return prefix + ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

PROMPT_TEMPLATE = """\
You are an expert English phonics and curriculum analyst. Generate a Phonics Ninja JSON for the following textbook unit based on its Pronunciation / Phonics section.

RULES & INSTRUCTIONS:
1. Target Focus:
   - Identify the core phonetic targets from the unit markdown's "Pronunciation" or "Phonics" section.
   - In the top-level "focus" field, provide a clear, beautifully structured Markdown summary containing:
     - A markdown table mapping: 音标, 常见字母/字母组合, 例词辨析.
     - In the "音标" column, ALWAYS append sound classification marks in bold: e.g. `**/eɪ/** (双元音)`, `**/æ/** (梅花音/短元音)`, `**/iː/** (长元音)`, `**/s/** (清辅音)`, `**/z/** (浊辅音)`. (DO NOT wrap the entire cell or bold syntax in code backticks, use `**/sound/** (mark)` directly).
     - In the "常见字母/字母组合" column, ALWAYS wrap letter and syllable/context annotations in full parentheses like: `(` `a_e` `开音节), (` `ai` `组合), (` `ay` `组合)` or `(` `a` `闭音节)` or `(` `s` `清辅音后发/s/)`.
     - A callout quote block (> 💡 **核心特殊词与陷阱词 (Special Exceptions)**) highlighting irregular/trap words (e.g., `have` is /æ/ despite looking like VCe, `give`/`live` are /ɪ/ despite looking like VCe, `bread`/`head` are /e/ despite `ea`).
2. Challenges:
   - Generate 2 to 3 Challenges (e.g., c1: sound contrast group 1, c2: sound contrast group 2, c3: comprehensive discrimination/classification).
   - Each challenge must have 10 high-quality questions (including single-choice discrimination and multi-select sound hunting).
   - Test foundational phonics and syllable structure rules (e.g. open vs closed syllables, VCe magic-e, vowel teams, exception traps). Words do not need to be limited to the unit vocabulary list so students can apply phonics rules broadly.
   - Question types should test:
     - `sound-matching`: Target sound matching (e.g., "下面哪个单词画线部分的发音是 /iː/？", "音标 /æ/ 与下列哪组单词画线部分发音一致？", 4 options).
     - `odd-one-out`: Finding the sound that does not match (e.g., "选出画线部分发音不同的一项：", 4 options).
     - `classification`: Grouping words by common phonetic symbol (e.g., "单词 'let, bed, net' 画线字母的共同发音音标是：", 4 options).
     - `sound-hunter`: Multi-select sound discrimination where students hunt for all words matching the target sound (e.g., "【语音搜寻】找出所有画线部分发 /iː/ 的单词（多选）："). Exactly 8 options (4 correct targets + 4 trap distractors). Type: "multi-select", answer: [0, 1, 2, 3] (indices of correct options).
   - Underline the tested letters in English words using HTML tags: `<u>letter</u>` (e.g., `m<u>ee</u>t`, `sh<u>i</u>p`, `gr<u>a</u>de`).
   - Do NOT include 缩读 / sentence contraction questions (keep it strictly focused on phonics/sound discrimination).
   - Provide concise, accurate Chinese `explanation` and `hint`.

JSON structure must exactly match this format:
{{
  "level": "{level}",
  "title": "Phonics Ninja",
  "focus": "<Markdown summary with table and special trap callouts>",
  "challenges": [
    {{
      "id": "c1",
      "title": "<Challenge Title in Chinese, e.g. 元音辨音：/iː/ 与 /ɪ/>",
      "icon": "🎯",
      "questions": [
        {{
          "id": "<Unique alphanumeric string, e.g. pn1a1>",
          "type": "<multiple-choice | multi-select>",
          "category": "<sound-matching | odd-one-out | classification | sound-hunter>",
          "prompt": "<Question prompt in Chinese>",
          "options": [
            "Option 1",
            "Option 2",
            "Option 3",
            "Option 4"
          ],
          "answer": 0,
          "explanation": "<Clear grammatical/phonetic explanation in Chinese>",
          "hint": "<A helpful hint in Chinese>"
        }}
      ]
    }}
  ]
}}

Output ONLY valid JSON, no markdown fences, no commentary.

UNIT MARKDOWN:
{source}
"""

def extract_level_from_filename_or_md(md_path: Path, md_text: str) -> str:
    # Try header
    m = re.search(r"#\s*(Grade\s*\d+\s*Semester\s*\d+\s*[-–]\s*Unit\s*\d+)", md_text, re.I)
    if m:
        return m.group(1).strip()
    
    stem = md_path.stem.upper() # e.g. A7A-U1
    m2 = re.match(r"([A-Z])(\d+)([A-Z])-U(\d+)", stem)
    if m2:
        series, grade, sem, unit = m2.groups()
        sem_num = "1" if sem == "A" else "2"
        return f"Grade {grade} Semester {sem_num} - Unit {unit}"
    return "Phonics Practice"

def main():
    use_high = parse_high_flag()
    from config import parse_paid_flag
    use_paid = parse_paid_flag()

    parser = argparse.ArgumentParser(description="Generate phonics-ninja JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to the unit markdown file (e.g. v2-data/A7A/a7a-u1/a7a-u1.md)")
    parser.add_argument("--level", default="", help='Level label, e.g. "Grade 7 Semester 1 - Unit 1"')
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    source = md_path.read_text(encoding="utf-8")
    level = args.level or extract_level_from_filename_or_md(md_path, source)

    key_val, model_name = get_genai_config(use_high=use_high, force_paid=use_paid)
    client = genai.Client(api_key=key_val)

    prompt = PROMPT_TEMPLATE.format(
        level=level,
        source=source
    )

    print(f"Generating Phonics Ninja for {md_path.name} using {model_name}...")
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )

    raw_text = response.text.strip()
    # Clean potential markdown fences
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\n", "", raw_text)
        raw_text = re.sub(r"\n```$", "", raw_text)

    try:
        data = json.loads(raw_text)
    except Exception as e:
        print(f"Error: Failed to parse JSON response: {e}\nRaw output:\n{raw_text}", file=sys.stderr)
        sys.exit(1)

    # Validate IDs
    used_ids = set()
    for c_idx, ch in enumerate(data.get("challenges", [])):
        if not ch.get("id"):
            ch["id"] = f"c{c_idx + 1}"
        for q_idx, q in enumerate(ch.get("questions", [])):
            if not q.get("id") or q.get("id") in used_ids:
                q["id"] = generate_id(f"pn{c_idx+1}_{q_idx+1}_")
    # Validate and sanitize focus
    focus = data.get("focus", "")
    if focus:
        lines = focus.split("\n")
        new_lines = []
        for line in lines:
            if line.strip().startswith("|") and not line.strip().startswith("| :---"):
                parts = line.split("|")
                if len(parts) >= 3:
                    # Strip any accidental backticks around bold marks in column 1
                    parts[1] = re.sub(r"`\*\*([^*`]+)\*\*([^`]*)`", r"**\1**\2", parts[1])
                    parts[1] = re.sub(r"`\*\*([^*`]+)\*\*`", r"**\1**", parts[1])
                    parts[1] = parts[1].replace("`", "")
                    line = "|".join(parts)
            new_lines.append(line)
        data["focus"] = "\n".join(new_lines)

    # Output file
    out_stem = md_path.stem
    # If file was e.g. a7a-u1.md -> a7a-u1-phonics-ninja.json
    out_path = md_path.parent / f"{out_stem}-phonics-ninja.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Generated Phonics Ninja saved to: {out_path}")

if __name__ == "__main__":
    main()
