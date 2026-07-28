#!/usr/bin/env python3
"""
gen_poem_jsons.py — Generate separate JSON files for each poem listed in zxt/plan/poems.md
using Gemini API, according to zxt/data/blg/schema-guide.md.

Usage:
    python3 zxt/scripts/gen_poem_jsons.py [--id ID] [--start START] [--end END] [--high] [--force] [--use-existing]

Options:
    --id ID          Process only a single poem ID (1-75)
    --start S --end E Process a range of poem IDs [S, E]
    --high           Use Gemini 3.6 Flash (default: Gemini 3.5 Flash Lite)
    --force          Overwrite existing JSON files in zxt/data/blg/poems/
    --use-existing   If poem is already in poems-75.json, use that instead of calling API

API token and model config loaded from scripts/genai.
Output directory: zxt/data/blg/poems/
Filename format: {id}-{title}.json
"""

import os
import sys
import json
import re
import time
import argparse
from pathlib import Path

# Add repo root and scripts/genai to sys.path
REPO_ROOT = Path(__file__).resolve().parents[2]
GENAI_DIR = REPO_ROOT / "scripts" / "genai"
if str(GENAI_DIR) not in sys.path:
    sys.path.insert(0, str(GENAI_DIR))

from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag

POEMS_MD_PATH = REPO_ROOT / "zxt" / "plan" / "poems.md"
SCHEMA_GUIDE_PATH = REPO_ROOT / "zxt" / "data" / "blg" / "schema-guide.md"
POEMS_75_PATH = REPO_ROOT / "zxt" / "data" / "blg" / "poems-75.json"
OUTPUT_DIR = REPO_ROOT / "zxt" / "data" / "blg" / "poems"

PROMPT_TEMPLATE = """\
You are an expert Classical Chinese Poetry curriculum analyst and exercise designer for 百莲阁 (BaiLianGe).
Generate a complete, fully detailed JSON object for the following poem, strictly adhering to the schema guide below.

POEM INFO:
ID: {id}
Title: 《{title}》
Author Info: {author_info}

SCHEMA GUIDE:
{schema_guide}

REQUIREMENTS:
1. "id": {id} (integer)
2. "title": "{title}"
3. "dynasty": Extract dynasty (e.g. "唐", "宋", "汉", "清", "明", "南朝").
4. "author": Extract author name (e.g. "白居易", "李白", "汉乐府", "卢钺", "范成大").
5. "theme": Theme label with Chinese and English in parentheses, e.g. "童趣 (Childhood Innocence)", "山水田园 (Landscape & Countryside)".
6. "keywords": Array of 3-5 key imagery or thematic words from the poem.
7. "lines": Array of line objects. Each line must have:
   - "text": Exact Chinese characters of the poem line.
   - "pinyin": Full pinyin with standard tone marks (e.g., "xiǎo wá chēng xiǎo tǐng").
   - "cn": Chinese vernacular translation of this line.
   - "en": English translation of this line.
   - "image": "/assets/blg/poems/p{id}_l1.webp" for line 1, "/assets/blg/poems/p{id}_l2.webp" for line 2, etc.
8. "questions": Array of high-quality exercise questions following these exact types and formats:
   a. "LineAssembly" (1 question per line, line_index 0..N-1):
      - id: "q_blg_{id_3d}_1", "q_blg_{id_3d}_2", ...
      - type: "LineAssembly"
      - line_index: 0, 1, ...
      - prompt: "请将字块拼接成《{title}》的第X句诗："
      - answer: exact text of that line
      - distractor_chars: array of 3 plausible distractor Chinese characters not in that line.
   b. "VerseCloze" (3-4 fill-in-the-blank questions):
      - id: "q_blg_{id_3d}_X"
      - type: "VerseCloze"
      - prompt: line with "_____" filling key word or phrase
      - options: 6 choices array (option at index 0 is correct answer)
      - answer: 0
      - explanation: Chinese explanation of the context and meaning.
   c. "PinyinMatch" (2 questions on key character pronunciation/meaning):
      - id: "q_blg_{id_3d}_X"
      - type: "PinyinMatch"
      - prompt: question asking about pronunciation or meaning of a specific character in context
      - options: 4 choices array (index 0 is correct)
      - answer: 0
      - explanation: Chinese explanation.
   d. "TextToCn" (2 questions on translating line to Chinese meaning):
      - id: "q_blg_{id_3d}_X"
      - type: "TextToCn"
      - prompt: "诗句“...”的意思是："
      - options: 4 choices array (index 0 is correct)
      - answer: 0
      - explanation: Chinese explanation.
   e. "CulturalContext" (2 questions on dynasty, author background, theme, or literary significance):
      - id: "q_blg_{id_3d}_X"
      - type: "CulturalContext"
      - prompt: question on author/dynasty/theme
      - options: 4 choices array (index 0 is correct)
      - answer: 0
      - explanation: Chinese explanation.
   f. "ImageOrdering" (1 question sorting images):
      - id: "q_blg_{id_3d}_img_order"
      - type: "ImageOrdering"
      - prompt: "请按诗句顺序排列《{title}》的插图："
      - images: array of image paths ["/assets/blg/poems/p{id}_l1.webp", ...]
   g. "ImageToLine" (1 question per line):
      - id: "q_blg_{id_3d}_img2line_1", "q_blg_{id_3d}_img2line_2", ...
      - type: "ImageToLine"
      - prompt: "观察下面的图片，选择对应的《{title}》诗句："
      - image: "/assets/blg/poems/p{id}_l1.webp", ...
      - options: 4 poem line options (correct line at index answer)
      - answer: correct option index (0-3)
      - explanation: Chinese explanation.

OUTPUT FORMAT:
Output ONLY valid JSON representing the poem object. Do not include markdown code block syntax (like ```json), commentary, or extra text.
"""


def parse_poems_md():
    if not POEMS_MD_PATH.exists():
        print(f"Error: {POEMS_MD_PATH} not found.", file=sys.stderr)
        sys.exit(1)

    poems = []
    with open(POEMS_MD_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = re.match(r'(\d+)\.\s*《([^》]+)》(?:（([^）]+)）)?\s*(.*)', line)
            if m:
                id_num = int(m.group(1))
                main_title = m.group(2)
                subtitle = m.group(3)
                author_info = m.group(4).strip()
                title = f"{main_title}（{subtitle}）" if subtitle else main_title
                poems.append({
                    "id": id_num,
                    "title": title,
                    "author_info": author_info,
                    "raw": line
                })
    return poems


def load_existing_poems_map():
    if POEMS_75_PATH.exists():
        try:
            with open(POEMS_75_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {p["id"]: p for p in data if "id" in p}
        except Exception as e:
            print(f"Warning: Failed to parse {POEMS_75_PATH}: {e}", file=sys.stderr)
    return {}


def generate_poem_json(client, model_name, poem, schema_guide):
    prompt = PROMPT_TEMPLATE.format(
        id=poem["id"],
        title=poem["title"],
        author_info=poem["author_info"],
        id_3d=f"{poem['id']:03d}",
        schema_guide=schema_guide
    )

    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json"
                )
            )
            raw_text = response.text.strip()
            # Strip accidental markdown triple backticks if present
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                raw_text = re.sub(r"\n?```$", "", raw_text)
            parsed = json.loads(raw_text)
            return parsed
        except Exception as e:
            print(f"Error calling Gemini API for poem {poem['id']} (attempt {attempt + 1}/5): {e}", file=sys.stderr)
            if attempt == 4:
                raise e
            time.sleep(2 ** attempt)


def main():
    use_high = parse_high_flag()

    parser = argparse.ArgumentParser(description="Generate individual poem JSON files using Gemini API.")
    parser.add_argument("--id", type=int, help="Process a single poem ID (1-75)")
    parser.add_argument("--start", type=int, help="Start poem ID range")
    parser.add_argument("--end", type=int, help="End poem ID range")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files in output directory")
    parser.add_argument("--use-existing", action="store_true", help="Use data from poems-75.json if available")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    poems = parse_poems_md()
    existing_map = load_existing_poems_map() if args.use_existing else {}
    schema_guide = SCHEMA_GUIDE_PATH.read_text(encoding="utf-8") if SCHEMA_GUIDE_PATH.exists() else ""

    # Filter poems based on args
    target_poems = poems
    if args.id is not None:
        target_poems = [p for p in target_poems if p["id"] == args.id]
    elif args.start is not None or args.end is not None:
        start_id = args.start if args.start is not None else 1
        end_id = args.end if args.end is not None else 75
        target_poems = [p for p in target_poems if start_id <= p["id"] <= end_id]

    if not target_poems:
        print("No matching poems found to process.")
        return

    api_key, model_name = get_genai_config(use_high)
    client = genai.Client(api_key=api_key)

    print(f"Processing {len(target_poems)} poem(s) using model: {model_name}...")
    print(f"Output directory: {OUTPUT_DIR}")

    success_count = 0
    for p in target_poems:
        poem_id = p["id"]
        title = p["title"]
        # Standard filename: {id}-{title}.json
        filename = f"{poem_id}-{title}.json"
        out_path = OUTPUT_DIR / filename

        if out_path.exists() and not args.force:
            print(f"Skipping poem #{poem_id} 《{title}》 (already exists: {filename})")
            continue

        print(f"Generating poem #{poem_id} 《{title}》...", end=" ", flush=True)

        if args.use_existing and poem_id in existing_map:
            poem_data = existing_map[poem_id]
            print("(Using existing data from poems-75.json)", end=" ")
        else:
            poem_data = generate_poem_json(client, model_name, p, schema_guide)

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(poem_data, f, ensure_ascii=False, indent=2)

        print(f"Saved -> {filename}")
        success_count += 1

    print(f"\nDone! Successfully processed {success_count} poem JSON file(s).")


if __name__ == "__main__":
    main()
