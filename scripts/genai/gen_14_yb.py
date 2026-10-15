#!/usr/bin/env python3
"""
gen_14_yb.py — Generate Reading and Expression (阅读与表达) JSON from a markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_14_yb.py <path-to-yb.md> [--high] [--out <path>]

Example:
    python3 scripts/genai/gen_14_yb.py v2-data/A10/a10-yb/a10-yb-1.md
"""

import os, sys, json, argparse, re, random
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

    try:
        return json.loads(candidate, strict=False)
    except Exception:
        pass

    cleaned_commas = re.sub(r',\s*([}\]])', r'\1', candidate)
    try:
        return json.loads(cleaned_commas, strict=False)
    except Exception:
        pass

    cleaned_comments = re.sub(r'//.*?\n', '\n', cleaned_commas)
    return json.loads(cleaned_comments, strict=False)


SYSTEM_PROMPT = """You are an expert English test creator for Chinese Middle School Entrance Examination (中考英语).
Your task is to transform textbook reading-and-expression exercises (阅读与表达) into interactive challenges.

Core Philosophy:
In standard exams, questions are open/short-answer, requiring students to locate evidence, apply grammatical transforms (e.g. 1st to 3rd person pronouns, tense adjustments), and formulate answers.
In our interactive platform, we help students master this skill WITHOUT forcing them to type 30 words manually.
We achieve this through a 4-step guided pedagogical flow:
1. 找关键词 (Pick key question tokens)
2. 定位关键句 (Locate exact source sentence in passage)
3. 人称转换判断 (Decide if 1st->3rd pronoun transform is required)
4. 连词成句 (Build the standard answer using word blocks)

Question Composition Rule (Strictly Enforced):
- Each challenge passage MUST have EXACTLY 4 questions:
  - Questions 1, 2, and 3: 细节理解题 (detail_locate / reason / pronoun_transform)
  - Question 4: 开放性问答题 (open_ended / opinion)
- NO TRANSLATION QUESTIONS (翻译题): Translation is no longer tested in the exam format. If the source material contains a translation task (e.g. "请将画线句翻译成中文"), REPLACE it with a high-quality detail comprehension question (细节理解题) based on the passage text.
- WHY QUESTIONS MUST START WITH "Because": When answering questions starting with "Why..." (reason questions), standard_answer, word_blocks, and multiple-choice options MUST start with "Because" (e.g. "Because Micheal does well in both personal development and schoolwork."), even if the answer key in the source markdown omits "Because".

Passage Paragraph Separation Rule (Strictly Enforced):
- `passage` MUST be a 2D array of strings: `string[][]`.
- Each element of `passage` is an array of sentence strings representing ONE paragraph (e.g. `[["Sent 1.", "Sent 2."], ["Sent 3.", "Sent 4."]]`).
- Preserve exact wording, punctuation, and order so that `target_sentence_index` can accurately point to the global 0-based sentence index across the entire passage.
- Double quotes ("...") and dialogue quotes from source markdown MUST be strictly preserved (e.g. "\"I tried out table tennis...\""), properly escaped. Do not remove or drop quotation marks.
- Parenthesized Chinese vocabulary glosses from the source markdown (e.g. "fermented(发酵的)", "chili peppers(辣椒)", "damp(潮湿的)") MUST be kept in the passage JSON text to support students' reading.

Schema details for each Challenge:
{
  "id": "c1",
  "title": "Passage 1: Short Topic Title",
  "icon": "relevant emoji (e.g. 🌶️, 🎵, 🇨🇭)",
  "article_type": "说明文 / 记叙文 / 议论文",
  "summary": "Brief Chinese summary of the passage",
  "passage": [
    [
      "Paragraph 1 Sentence 1.",
      "Paragraph 1 Sentence 2."
    ],
    [
      "Paragraph 2 Sentence 1.",
      "Paragraph 2 Sentence 2."
    ]
  ],
  "passage_cn": [
    [
      "第1段第1句中文翻译。",
      "第1段第2句中文翻译。"
    ],
    [
      "第2段第1句中文翻译。",
      "第2段第2句中文翻译。"
    ]
  ],
  "questions": [
    {
      "id": "yb_c1_q1",
      "q_index": 1,
      "question_type": "detail_locate / pronoun_transform / open_ended / reason",
      "prompt": "English question prompt (e.g. How long is the history of Hunan dishes?)",
      "prompt_cn": "Chinese translation of the prompt",
      "target_sentence_index": 2,
      "thinking": {
        "keywords": ["key1", "key2"],
        "method": "根据关键信息定位 / 转换人称 / 借助原文信息法 / 句式转换",
        "rule": "Bilingual explanation of the answering step"
      },
      "standard_answer": "More than two thousand years.",
      "word_blocks": ["More", "than", "two", "thousand", "years", "ago", "for", "three"],
      "options": [
        "More than two thousand years.",
        "Since the late 1580s.",
        "About 100 years.",
        "Two thousand years ago."
      ],
      "answer": 0,
      "explanation": "Detailed Chinese explanation with citation from the passage."
    }
  ]
}

Important:
- Parse every passage in the input text.
- Exactly 4 questions per challenge (3 details + 1 open-ended).
- Never generate translation questions.
- Maintain accurate global sentence indexing for `target_sentence_index`.
"""


def parse_markdown_passages(md_text: str):
    """Split markdown file into distinct passage blocks."""
    # Split by separator or headings like 一, 二, 三, 四
    sections = re.split(r'\n(?=#{1,3}\s*[一二三四五六七八九十]+|\n[一二三四五六七八九十]+\s*\n|\n---\s*\n)', md_text)
    cleaned = []
    for s in sections:
        if ('[答案]' in s or '【答案】' in s or '**[答案]**' in s or '**【答案】**' in s) and '>' in s:
            cleaned.append(s.strip())
    return cleaned


def main():
    parser = argparse.ArgumentParser(description="Generate Reading and Expression (YB) JSON.")
    parser.add_argument("input_file", help="Path to input markdown file (e.g. a10-yb-1.md)")
    parser.add_argument("--high", action="store_true", help="Use high-tier GenAI model")
    parser.add_argument("--out", help="Output path (default: <input-stem>-reading-expression.json)")
    args = parser.parse_args()

    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    passages = parse_markdown_passages(md_content)
    print(f"Detected {len(passages)} passages in {input_path.name}")

    api_key, model_name = get_genai_config(args.high)
    client = genai.Client(api_key=api_key)

    challenges = []
    
    # Process passages (either in batches or per passage)
    for idx, p_text in enumerate(passages, start=1):
        print(f"\nProcessing Passage {idx}/{len(passages)}...")
        user_prompt = f"""Process the following passage, questions, answers, and explanations into a single Challenge object conforming strictly to the schema.
Challenge id should be 'c{idx}'.

Text content:
{p_text}
"""
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    {"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\n" + user_prompt}]}
                ],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json"
                )
            )
            chal_obj = extract_json(response.text)
            # Ensure challenge ID
            chal_obj["id"] = f"c{idx}"
            # Make sure questions have IDs
            for q_idx, q in enumerate(chal_obj.get("questions", []), start=1):
                if not q.get("id"):
                    q["id"] = f"yb_c{idx}_q{q_idx}"
            challenges.append(chal_obj)
            print(f"Successfully generated Challenge {idx}: {chal_obj.get('title', '')} with {len(chal_obj.get('questions', []))} questions")
        except Exception as e:
            print(f"Error processing Passage {idx}: {e}")
            raise e

    output_data = {
        "level": "Grade 10 - 中考阅读与表达",
        "title": "阅读与表达·专项突破 1",
        "practiceType": "reading-expression",
        "storageSuffix": f"_{input_path.stem.replace('-', '_')}",
        "challenges": challenges
    }

    out_path = Path(args.out) if args.out else input_path.parent / f"{input_path.stem}-reading-expression.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\nAll done! Output written to {out_path} ({len(challenges)} challenges total).")


if __name__ == "__main__":
    main()
