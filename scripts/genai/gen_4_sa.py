#!/usr/bin/env python3
"""
gen_4_sa.py — Generate a sentence-architect JSON from a unit markdown file via Gemini API.

Usage:
    python3 scripts/genai/gen_4_sa.py <path-to-unit.md> [--level "..."] [--title "Unit Title"] [--suffix "_pu1_u1"]

Example:
    python3 scripts/genai/gen_4_sa.py data/B-PU1/b-pu1-u1/b-pu1-u1.md \
        --level "Pupil's Book 1 - Unit 1" \
        --title "Our new school" \
        --suffix "_bpu1_u1"

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<basename>-sentence-architect.json next to the source file.
"""

import os, sys, json, argparse
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag

PROMPT_TEMPLATE = """\
You are an expert English curriculum designer for primary school students.

Generate a sentence-architect JSON from the following textbook unit markdown.

=== STRUCTURE REQUIREMENTS ===
- Exactly 5 challenges, each with exactly 10 sentences = 50 sentences total.
- Each challenge has: "id" (c1–c5), "title" (descriptive theme), "icon" (relevant emoji), "data" (array of 10 items).
- Items go in the "data" array (NOT "questions").
- Use British English spelling throughout (colour, favourite, etc.).
- Preserve exact wording, contractions, and punctuation from the source text.

=== TOP-LEVEL FIELDS ===
- "title": The unit title (from the "## 1 Our new school" style heading in the markdown)
- "level": "{level}"
- "primaryColor": A hex colour (blues, greens, or purples — NO red or reddish tones)
- "primaryColorDark": A darker shade of primaryColor
- "storageSuffix": "{suffix}"
- "passcode": 5-letter string — first letter of each of the 5 challenge titles, uppercase
- "ipaDict": object with British IPA (no slashes) for key/difficult words in the sentences (10–30 words)
- "challenges": array of 5 challenge objects

=== PER-SENTENCE FIELDS ===
- "id": unique 8-character alphanumeric string (random, not sequential)
- "en": the full English sentence verbatim from the text
- "cn": Chinese translation of the sentence. IMPORTANT: For simple past-tense statements (e.g. using didn't, couldn't, was, were, had) that lack an explicit time clause (like "yesterday" or "when..."), prefix with parenthetical past context like "（当时）" (e.g. "（当时）她没有钥匙。") to clearly distinguish past tense from present tense.
- "hint": concise bilingual grammar clue (e.g. "Where's = Where is | 疑问句结构")
- "noise": 2–5 distractor words NOT present in the sentence. Scale with sentence length:
    - Short sentences (≤5 words): 2 noise words
    - Medium sentences (6–9 words): 3–4 noise words
    - Long sentences (10+ words): 4–5 noise words
  CRITICAL NOISE RULES (STRICT DIVERSITY REQUIRED):
  1. AT MOST 1 auxiliary verb distractor (e.g. is/are/was/were/do/does/did/has/have/had/can/could) per sentence! NEVER use multiple auxiliary verbs in the noise array.
  2. The remaining noise words MUST target non-auxiliary elements across the sentence:
     - Preposition traps (e.g., for "into" use "onto", "out", "at", "to", "on")
     - Noun traps (e.g., for "house" use "room", "home", "building", "flat")
     - Main verb traps (e.g., for "get" use "got", "reach", "enter")
     - Adjective / Adverb / Pronoun / Conjunction traps (e.g., "fast", "slow", "my", "your", "before", "after")
  3. The noise array MUST contain distractors targeting at least 2 or 3 DIFFERENT parts of speech across the sentence.
  4. Noise words MUST NOT appear in "en".
- "accept": array of alternative valid orderings using the exact same words. 
    - Include natural adverb-position variants (e.g. "Together we work" vs "We work together").
    - Do NOT include expansions of contractions.
    - Leave as [] if no valid alternative exists.

=== CHALLENGE SOURCING ===
Draw sentences from across the whole unit markdown, covering:
- c1: Vocabulary introduction dialogues / classroom object sentences
- c2: Story / comic strip dialogue sentences (The Friendly Farm)
- c3: Grammar practice sentences (prepositions, Where...?, What's this?)
- c4: Cross-curricular / literature sentences (Be kind, The First Day play)
- c5: Song lyrics, review sentences, mission sentences

Use diverse sentence types: statements, questions, short answers, exclamations.
Avoid repeating the exact same sentence across challenges.

Output ONLY valid JSON, no markdown fences, no commentary.

=== JSON SKELETON ===
{{
  "title": "...",
  "level": "{level}",
  "primaryColor": "#...",
  "primaryColorDark": "#...",
  "storageSuffix": "{suffix}",
  "passcode": "XXXXX",
  "ipaDict": {{
    "word": "IPA without slashes"
  }},
  "challenges": [
    {{
      "id": "c1",
      "title": "...",
      "icon": "...",
      "data": [
        {{
          "id": "xxxxxxxx",
          "en": "...",
          "cn": "...",
          "hint": "...",
          "noise": ["...", "..."],
          "accept": []
        }}
      ]
    }}
  ]
}}

=== SOURCE MARKDOWN ===
{source}
"""


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
    use_high = parse_high_flag()

    parser = argparse.ArgumentParser(description="Generate sentence-architect JSON via Gemini API.")
    parser.add_argument("md_file", help="Path to the unit markdown file")
    parser.add_argument("--level", default="", help='Level label, e.g. "Pupil\'s Book 1 - Unit 1"')
    parser.add_argument("--title", default="", help='Unit title, e.g. "Our new school"')
    parser.add_argument("--suffix", default="", help='Storage suffix, e.g. "_bpu1_u1"')
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        print(f"Error: file not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    source = md_path.read_text(encoding="utf-8")
    level = args.level or md_path.stem.replace("-", " ").title()
    suffix = args.suffix or f"_{md_path.stem.replace('-', '_')}"

    api_key, model_name = get_genai_config(use_high)

    client = genai.Client(api_key=api_key)
    prompt = PROMPT_TEMPLATE.format(level=level, suffix=suffix, source=source)

    print(f"Calling {model_name} for: {md_path}", file=sys.stderr)
    print(f"  level='{level}'  suffix='{suffix}'", file=sys.stderr)

    import time
    response = None
    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    temperature=0.3,
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

    # Post-processing noise word validation & deduplication
    import re, random, string
    all_fallback_noise = ["are", "is", "were", "was", "be", "been", "have", "has", "had", "do", "does", "did", "can", "could", "will", "would", "shall", "should", "may", "might", "must", "with", "from", "for", "about", "under", "over", "into", "onto", "behind", "near", "next"]
    existing_ids = set()

    for c in parsed.get("challenges", []):
        for item in c.get("data", []):
            sid = str(item.get("id", ""))
            if len(sid) != 8 or not sid.isalnum() or sid in existing_ids:
                new_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
                while new_id in existing_ids:
                    new_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
                item["id"] = new_id
                existing_ids.add(new_id)
            else:
                existing_ids.add(sid)

            en_words = set(w.lower() for w in re.findall(r"\b\w+['’]?\w*\b", item.get("en", "")))
            clean_noise = []
            for nw in item.get("noise", []):
                if nw.lower() not in en_words and nw.lower() not in [cn.lower() for cn in clean_noise]:
                    clean_noise.append(nw)
            
            # Replenish if noise list shrank
            needed = max(2, len(item.get("noise", [])))
            for fb in all_fallback_noise:
                if len(clean_noise) >= needed:
                    break
                if fb.lower() not in en_words and fb.lower() not in [cn.lower() for cn in clean_noise]:
                    clean_noise.append(fb)
            
            item["noise"] = clean_noise

    stem = md_path.stem
    out_path = md_path.parent / f"{stem}-sentence-architect.json"
    parsed["generated_by"] = model_name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    total = sum(len(c.get("data", [])) for c in parsed.get("challenges", []))
    print(f"Done! {len(parsed.get('challenges', []))} challenges, {total} sentences -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
