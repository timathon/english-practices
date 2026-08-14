#!/usr/bin/env python3
"""
Audit Runner for English Practices Practice JSON files.
Audits generated JSON files in a unit folder against standard GEMINI.md rules
and writes a markdown audit report to scripts/genai/audit-reports/<unit-name>-audit-report.md.

Usage:
    python3 scripts/genai/audit-scripts/audit_unit.py v2-data/B-PU1/b-pu1-u3
"""

import sys
import os
import json
import re
import math

def audit_vocab_guide(vg, filename):
    issues = []
    vocab = vg.get("unit_vocabulary", [])
    for item in vocab:
        word = item.get("word", "")
        ipa = item.get("ipa", "")
        page = item.get("page_number", "")
        ctx = item.get("context_sentence", "")

        is_phrase = " " in word.strip()
        if not is_phrase and not (ipa.startswith("/") and ipa.endswith("/")):
            issues.append({
                "json_file": filename,
                "rule_section": "1. Vocab Guide Extraction (VGE)",
                "item_id": word,
                "issue_type": "IPA Format",
                "description": f"IPA '{ipa}' is not enclosed in forward slashes /.../."
            })
        
        if "____" in ctx or "___" in ctx:
            issues.append({
                "json_file": filename,
                "rule_section": "1. Vocab Guide Extraction (VGE)",
                "item_id": word,
                "issue_type": "Context Sentence Blank",
                "description": f"Context sentence contains blank placeholder: '{ctx}'"
            })

        if not page:
            issues.append({
                "json_file": filename,
                "rule_section": "1. Vocab Guide Extraction (VGE)",
                "item_id": word,
                "issue_type": "Missing Page Number",
                "description": "Page number is missing or empty."
            })

    return issues

def audit_vocab_master(vm, vg, filename):
    issues = []
    challenges = vm.get("challenges", [])
    all_questions = []
    
    vg_vocab = vg.get("unit_vocabulary", []) if vg else []
    non_proper = [v for v in vg_vocab if not (v["word"][0].isupper() and v["word"] not in ["I"])]
    target_calc = len(non_proper) * 1.5
    expected_target = math.ceil(target_calc / 10.0) * 10
    
    total_vm_q = sum(len(c.get("questions", [])) for c in challenges)
    if total_vm_q < expected_target:
        issues.append({
            "json_file": filename,
            "rule_section": "2. Vocab Master (VM)",
            "item_id": "Question Volume",
            "issue_type": "Volume Deficit",
            "description": f"Generated {total_vm_q} questions; expected target ~{expected_target} based on formula ({len(non_proper)} items * 1.5)."
        })

    seen_ids = set()
    tested_words = set()
    for c in challenges:
        c_qs = c.get("questions", [])
        if len(c_qs) != 10:
            issues.append({
                "json_file": filename,
                "rule_section": "2. Vocab Master (VM)",
                "item_id": c.get("id", "challenge"),
                "issue_type": "Challenge Size",
                "description": f"Challenge {c.get('id')} has {len(c_qs)} questions, expected exactly 10."
            })
        all_questions.extend(c_qs)

    def get_pos(meaning, word):
        if ' ' in word or '...' in word or 'phr.' in meaning:
            return 'phrase'
        if 'adj.' in meaning or 'adv.' in meaning or 'abbr.' in meaning:
            return 'adj'
        if 'vi.' in meaning or 'vt.' in meaning or 'v.' in meaning:
            return 'verb'
        if 'n.' in meaning:
            return 'noun'
        return 'other'

    word_pos_map = {item.get('word', ''): get_pos(item.get('meaning', ''), item.get('word', '')) for item in vg_vocab}

    for q in all_questions:
        qid = q.get("id", "")
        word = q.get("word", "")
        meaning = q.get("meaning", "")
        tested_words.add(word)

        if len(qid) != 8 or not qid.isalnum():
            issues.append({
                "json_file": filename,
                "rule_section": "2. Vocab Master (VM)",
                "item_id": qid or word,
                "issue_type": "ID Format",
                "description": f"Question ID '{qid}' is not an 8-character alphanumeric string."
            })

        if qid in seen_ids:
            issues.append({
                "json_file": filename,
                "rule_section": "2. Vocab Master (VM)",
                "item_id": qid,
                "issue_type": "Duplicate ID",
                "description": f"Duplicate question ID '{qid}' found."
            })
        seen_ids.add(qid)

        qtype = q.get("type")
        opts = q.get("options", [])
        ans = q.get("answer")

        if len(opts) != 6:
            issues.append({
                "json_file": filename,
                "rule_section": "2. Vocab Master (VM)",
                "item_id": qid,
                "issue_type": "Option Count",
                "description": f"Question {qid} has {len(opts)} options, expected 6."
            })


        target_pos = word_pos_map.get(word, get_pos(meaning, word))

        for idx_o, opt in enumerate(opts):
            opt_str = str(opt)
            if opt_str.lower() == 'sex' and word.lower() != 'sex':
                issues.append({
                    "json_file": filename,
                    "rule_section": "2. Vocab Master (VM)",
                    "item_id": qid,
                    "issue_type": "Forbidden Distractor",
                    "description": f"Question {qid} ({word}): option [{idx_o}] contains forbidden distractor 'sex'."
                })

            if qtype in ["Cn2En", "Cloze"]:
                opt_pos = word_pos_map.get(opt_str, "unknown")
                if target_pos != "unknown" and opt_pos != "unknown" and target_pos != opt_pos:
                    issues.append({
                        "json_file": filename,
                        "rule_section": "2. Vocab Master (VM)",
                        "item_id": qid,
                        "issue_type": "Distractor PoS Mismatch",
                        "description": f"Question {qid} ({word} [{target_pos}]): distractor '{opt}' has mismatching PoS [{opt_pos}]."
                    })

        if qtype == "Cloze":
            ctx = q.get("context_sentence", "")
            if ctx and ("____" in ctx or "___" in ctx):
                issues.append({
                    "json_file": filename,
                    "rule_section": "2. Vocab Master (VM)",
                    "item_id": qid,
                    "issue_type": "Context Sentence Blank",
                    "description": f"Context sentence contains blank placeholder: '{ctx}'"
                })

    missing_coverage = set([v["word"] for v in non_proper]) - tested_words
    if missing_coverage:
        issues.append({
            "json_file": filename,
            "rule_section": "2. Vocab Master (VM)",
            "item_id": "Vocabulary Coverage",
            "issue_type": "Missing Item Coverage",
            "description": f"The following {len(missing_coverage)} non-proper vocabulary items were not tested in VM: {list(missing_coverage)}"
        })

    return issues

def audit_vocab_master_llm(vm, filename, use_high=False):
    issues = []
    genai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if genai_dir not in sys.path:
        sys.path.insert(0, genai_dir)

    try:
        from config import get_genai_config
        from google import genai
    except Exception as e:
        print(f"⚠️ Could not import genai config: {e}")
        return issues

    try:
        api_key, model_name = get_genai_config(use_high)
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"⚠️ Could not initialize Gemini Client: {e}")
        return issues

    challenges = vm.get("challenges", [])
    all_questions = []
    for c in challenges:
        all_questions.extend(c.get("questions", []))

    if not all_questions:
        return issues

    print(f"🤖 [LLM AUDIT] Starting Gemini Distractor Quality Evaluation on {len(all_questions)} VM questions...")
    print(f"   Model: {model_name} | API Key Env: {'GOOGLE_API_KEY' if use_high else 'GOOGLE_API_KEY_FREE'}")

    batch_size = 60
    total_batches = math.ceil(len(all_questions) / batch_size)

    for i in range(0, len(all_questions), batch_size):
        batch_idx = (i // batch_size) + 1
        batch = all_questions[i:i+batch_size]
        print(f"   [Batch {batch_idx}/{total_batches}] Auditing questions {i+1}..{min(i+batch_size, len(all_questions))} via {model_name}...", end="", flush=True)

        sample = []
        for q in batch:
            sample.append({
                "id": q.get("id"),
                "word": q.get("word"),
                "type": q.get("type"),
                "prompt": q.get("prompt"),
                "options": q.get("options"),
                "answer_text": q.get("options", [])[q.get("answer")] if (q.get("answer") is not None and q.get("answer") < len(q.get("options", []))) else None
            })

        prompt = f"""\
You are an expert English assessment auditor.
Audit the following multiple-choice questions from a primary/middle school English practice unit.

Check each question specifically for:
1. Duplicate Options (CRITICAL): Check if `options` contains any duplicate choices. If duplicates exist, flag it with issue "Duplicate Options" and provide `suggested_options` (6 unique options with proper distractors).
2. En2Cn Option Language Rule (CRITICAL): For type "En2Cn", all options MUST be Chinese translations. If any option in an "En2Cn" question contains English words/letters, flag it!
3. Missing Chinese Hint in Ambiguous Cloze Questions (CRITICAL):
   - Evaluate whether the context sentence ALONE allows a student to uniquely pick the correct target word among the options.
   - Example of AMBIGUOUS context: Prompt "Is Julie ____ than you ?" with options ["slimmer", "taller", "shorter", "thinner", "heavier", "smaller"]. Without a hint like (提示: 苗条的), ANY of these options is logically valid. MUST flag as issue "Missing Hint in Ambiguous Cloze" and provide `suggested_prompt` appending `(提示: [Chinese meaning])` (e.g., "Is Julie ____ than you ? (提示: 苗条的)")!
   - Example of UNAMBIGUOUS context: Prompt "The average annual rainfall here is about 800 ____." with options ["mm", "kg", "g", "km", "L", "m"]. The specific context ("annual rainfall") uniquely determines "mm". Do NOT flag questions like this!
   - Rule: If prompt lacks `(提示: ...)` AND the context alone could logically support 2+ options as valid answers, flag it with issue "Missing Hint in Ambiguous Cloze"!
4. Distractor Quality: Are any options absurdly obvious, irrelevant non-sequiturs, or obvious giveaways?
5. Trap Quality: Do distractors offer plausible visual, phonetic, or semantic traps?

Questions:
{json.dumps(sample, ensure_ascii=False, indent=2)}

Return ONLY a JSON array of issue objects for any question that fails the audit rules.
Each object must have:
- "id": question ID
- "word": target word
- "issue": short issue type (e.g., "Duplicate Options", "En2Cn Distractor Language", "Missing Hint in Ambiguous Cloze", or "Low Quality Distractor")
- "description": concise explanation of why the option or question fails (e.g., "Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)")
- "suggested_prompt": string containing the updated prompt with hint included (REQUIRED for "Missing Hint in Ambiguous Cloze" issues).
- "suggested_options": array of 6 ideal options (REQUIRED for "Duplicate Options", "En2Cn Distractor Language", or "Low Quality Distractor" issues).

Output ONLY raw JSON array, no markdown wrappers. If all questions are good, return [].
"""

        try:
            res = client.models.generate_content(model=model_name, contents=prompt)
            raw_text = res.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            parsed_issues = json.loads(raw_text)
            if isinstance(parsed_issues, list) and len(parsed_issues) > 0:
                print(f" ⚠️ {len(parsed_issues)} issue(s) found")
                for item in parsed_issues:
                    desc = item.get("description", "Issue identified by LLM")
                    sug_p = item.get("suggested_prompt")
                    sug_o = item.get("suggested_options")
                    if sug_p:
                        desc += f"<br>**Suggested Prompt:** `{sug_p}`"
                    if sug_o and isinstance(sug_o, list):
                        sug_str = ", ".join(f"'{opt}'" for opt in sug_o)
                        desc += f"<br>**Suggested Options:** [{sug_str}]"

                    issues.append({
                        "json_file": filename,
                        "rule_section": "2. Vocab Master (VM)",
                        "item_id": item.get("id", "q"),
                        "issue_type": f"LLM: {item.get('issue', 'Distractor Quality')}",
                        "description": desc
                    })
            else:
                print(" ✅ Passed")
        except Exception as e:
            print(f" ⚠️ API Error: {e}")

    print(f"🤖 [LLM AUDIT] Finished. Total LLM distractor issues identified: {len(issues)}")
    return issues

def audit_spelling_hero(sh, vg, filename):
    issues = []
    sp_words = sh.get("spelling_words", [])
    vg_vocab = vg.get("unit_vocabulary", []) if vg else []
    single_words_vg = [v["word"] for v in vg_vocab if " " not in v["word"].strip() and "-" not in v["word"].strip()]

    sh_words_set = set([w.get("word") for w in sp_words])
    missing_sh = set(single_words_vg) - sh_words_set
    if missing_sh:
        issues.append({
            "json_file": filename,
            "rule_section": "3. Spelling Hero (SH)",
            "item_id": "Coverage",
            "issue_type": "Missing Single Words",
            "description": f"Single-word vocabulary items missing from Spelling Hero: {missing_sh}"
        })

    for w in sp_words:
        wid = w.get("id", "")
        wstr = w.get("word", "")
        if len(wid) != 8 or not wid.isalnum():
            issues.append({
                "json_file": filename,
                "rule_section": "3. Spelling Hero (SH)",
                "item_id": wstr,
                "issue_type": "ID Format",
                "description": f"Word ID '{wid}' for '{wstr}' is not an 8-character alphanumeric string."
            })

        chunks = w.get("chunks", [])
        for c_idx, chunk in enumerate(chunks):
            correct = chunk.get("correct")
            opts = chunk.get("options", [])
            if len(opts) != 3:
                issues.append({
                    "json_file": filename,
                    "rule_section": "3. Spelling Hero (SH)",
                    "item_id": f"{wstr}_chunk_{c_idx}",
                    "issue_type": "Option Count",
                    "description": f"Chunk options count is {len(opts)}, expected 3."
                })
            if correct not in opts:
                issues.append({
                    "json_file": filename,
                    "rule_section": "3. Spelling Hero (SH)",
                    "item_id": f"{wstr}_chunk_{c_idx}",
                    "issue_type": "Logic Error",
                    "description": f"Correct chunk '{correct}' is not included in options {opts}."
                })
            if len(set(opts)) != len(opts):
                issues.append({
                    "json_file": filename,
                    "rule_section": "3. Spelling Hero (SH)",
                    "item_id": f"{wstr}_chunk_{c_idx}",
                    "issue_type": "Duplicate Options",
                    "description": f"Chunk options contain duplicates: {opts}"
                })

    return issues

def audit_sentence_architect(sa, filename):
    issues = []
    challenges = sa.get("challenges", [])
    if len(challenges) != 5:
        issues.append({
            "json_file": filename,
            "rule_section": "4. Sentence Architect (SA)",
            "item_id": "Structure",
            "issue_type": "Challenge Count",
            "description": f"Expected 5 challenges, found {len(challenges)}."
        })

    seen_ids = set()
    contractions_map = {
        "he's": ["he", "is"], "she's": ["she", "is"], "it's": ["it", "is"],
        "they're": ["they", "are"], "we're": ["we", "are"], "you're": ["you", "are"],
        "i'm": ["i", "am"], "isn't": ["is", "not"], "aren't": ["are", "not"],
        "haven't": ["have", "not"], "hasn't": ["has", "not"], "don't": ["do", "not"],
        "doesn't": ["does", "not"]
    }

    for c in challenges:
        cdata = c.get("data", [])
        if len(cdata) != 10:
            issues.append({
                "json_file": filename,
                "rule_section": "4. Sentence Architect (SA)",
                "item_id": c.get("id", "challenge"),
                "issue_type": "Item Count",
                "description": f"Challenge {c.get('id')} has {len(cdata)} items, expected 10."
            })

        for item in cdata:
            sid = item.get("id", "")
            en = item.get("en", "")
            noise = item.get("noise", [])
            accept = item.get("accept", [])

            if len(sid) != 8 or not sid.isalnum():
                issues.append({
                    "json_file": filename,
                    "rule_section": "4. Sentence Architect (SA)",
                    "item_id": sid or en,
                    "issue_type": "ID Format",
                    "description": f"Sentence ID '{sid}' is not an 8-character alphanumeric string."
                })
            if sid in seen_ids:
                issues.append({
                    "json_file": filename,
                    "rule_section": "4. Sentence Architect (SA)",
                    "item_id": sid,
                    "issue_type": "Duplicate ID",
                    "description": f"Duplicate sentence ID '{sid}' found."
                })
            seen_ids.add(sid)

            for acc in accept:
                acc_lower = acc.lower()
                for contr, expanded in contractions_map.items():
                    if contr in en.lower() and expanded[0] in acc_lower and expanded[1] in acc_lower and contr not in acc_lower:
                        issues.append({
                            "json_file": filename,
                            "rule_section": "4. Sentence Architect (SA)",
                            "item_id": sid,
                            "issue_type": "Expanded Contraction in Accept",
                            "description": f"Accept variation '{acc}' expands contraction '{contr}' from en '{en}'."
                        })

    return issues

def audit_sentence_architect_llm(sa, filename, use_high=False):
    issues = []
    genai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if genai_dir not in sys.path:
        sys.path.insert(0, genai_dir)

    try:
        from config import get_genai_config
        from google import genai
    except Exception as e:
        print(f"⚠️ Could not import genai config: {e}")
        return issues

    try:
        api_key, model_name = get_genai_config(use_high)
        client = genai.Client(api_key=api_key)
        api_key_env = "GOOGLE_API_KEY" if use_high else "GOOGLE_API_KEY_FREE"
    except Exception as e:
        print(f"⚠️ Could not initialize Gemini Client: {e}")
        return issues

    all_items = []
    for c in sa.get("challenges", []):
        for item in c.get("data", []):
            all_items.append({
                "id": item.get("id"),
                "en": item.get("en"),
                "cn": item.get("cn"),
                "noise": item.get("noise", [])
            })

    if not all_items:
        return []

    print(f"\n🤖 [LLM AUDIT] Starting Gemini SA Noise Quality Evaluation on {len(all_items)} sentences...")
    print(f"   Model: {model_name} | API Key Env: {api_key_env}")

    issues = []
    batch_size = 60
    for i in range(0, len(all_items), batch_size):
        batch_num = (i // batch_size) + 1
        total_batches = (len(all_items) + batch_size - 1) // batch_size
        print(f"   [Batch {batch_num}/{total_batches}] Auditing sentences {i+1}..{min(i+batch_size, len(all_items))} via {model_name}...", end="", flush=True)

        sample = all_items[i:i+batch_size]
        prompt = f"""\
You are an expert English language assessment auditor.
Audit the following Sentence Architect items (sentence building exercise).

Check each sentence specifically for:
1. Exact Noise Word Overlap: A distractor in "noise" MUST NOT appear VERBATIM (case-insensitive exact word match) in the primary English sentence "en".
   - IMPORTANT NOTE: Inflections, singular/plural variations, or tense variations (e.g. singular "failure" when "en" contains plural "failures"; past tense "had" when "en" contains "have"; plural "burgers" when "en" contains "burger") are HIGHLY DESIRABLE GRAMMAR TRAPS. They are NOT overlaps and MUST NOT be flagged as errors!
2. Noise Quality & High-Quality Traps: Distractors in "noise" should be realistic grammatical or semantic traps.
   - Grammatical / Morphological Traps (PREFERRED): Singular/plural variations (e.g. "failure" for "failures"), tense/inflection variations ("had" for "have"), or pronoun variations ("he" for "you").
   - Semantic Traps: Plausible thematic or part-of-speech alternatives.

Sentences:
{json.dumps(sample, ensure_ascii=False, indent=2)}

Return ONLY a JSON array of issue objects for any sentence that has EXACT verbatim noise word overlaps or genuinely poor distractors.
Each object must have:
- "id": sentence ID
- "issue": "Noise Word Overlap" or "Low Quality Noise"
- "description": concise explanation of the noise word issue
- "suggested_noise": array of replacement distractor noise words (matching original count, consisting of high-quality grammatical/semantic traps, strictly NOT present verbatim in "en").

Output ONLY raw JSON array, no markdown wrappers. If all sentences are good, return [].
"""

        try:
            res = client.models.generate_content(model=model_name, contents=prompt)
            raw_text = res.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            try:
                parsed_issues = json.loads(raw_text, strict=False)
            except Exception:
                cleaned = re.sub(r'\\(?![/"\\bfnrtu])', r'\\\\', raw_text)
                parsed_issues = json.loads(cleaned, strict=False)
            if isinstance(parsed_issues, list) and len(parsed_issues) > 0:
                print(f" ⚠️ {len(parsed_issues)} issue(s) found")
                for item in parsed_issues:
                    desc = item.get("description", "Noise word issue identified by LLM")
                    sug = item.get("suggested_noise")
                    if sug and isinstance(sug, list):
                        sug_str = ", ".join(f"'{nw}'" for nw in sug)
                        desc += f"<br>**Suggested Noise:** [{sug_str}]"

                    issues.append({
                        "json_file": filename,
                        "rule_section": "4. Sentence Architect (SA)",
                        "item_id": item.get("id", "s"),
                        "issue_type": f"LLM: {item.get('issue', 'Noise Word Overlap')}",
                        "description": desc
                    })
            else:
                print(" ✅ Passed")
        except Exception as e:
            print(f" ⚠️ API Error: {e}")

    print(f"🤖 [LLM AUDIT] Finished. Total LLM SA noise issues identified: {len(issues)}")
    return issues

def audit_recall_map(rm, unit_path, filename):
    issues = []
    tree = rm.get("tree", {})
    if tree.get("state") != "emoji":
        issues.append({
            "json_file": filename,
            "rule_section": "5. Recall Map (RM)",
            "item_id": "root",
            "issue_type": "Root State",
            "description": f"Root node state is '{tree.get('state')}', expected 'emoji'."
        })

    is_pu1 = "PU1" in unit_path.upper() or "B-PU1" in unit_path.upper()
    if is_pu1:
        children = tree.get("children", [])
        stories_node = next((c for c in children if "story" in c.get("id", "").lower() or "stories" in c.get("id", "").lower()), None)
        if not stories_node:
            issues.append({
                "json_file": filename,
                "rule_section": "5. Recall Map (RM)",
                "item_id": "root",
                "issue_type": "Missing Stories Branch",
                "description": "Root node does not contain a 'Stories' branch."
            })
        else:
            st_children = stories_node.get("children", [])
            st_texts = [sc.get("text", "") for sc in st_children]
            st_ids = [sc.get("id", "") for sc in st_children]
            
            has_ff = any("friendly farm" in t.lower() or "friendly_farm" in i.lower() for t, i in zip(st_texts, st_ids))
            has_lit = any("literature" in t.lower() or "lit" in i.lower() or "how cows got" in t.lower() for t, i in zip(st_texts, st_ids))

            if not has_ff:
                issues.append({
                    "json_file": filename,
                    "rule_section": "5. Recall Map (RM)",
                    "item_id": "stories",
                    "issue_type": "Missing Friendly Farm",
                    "description": "Stories branch missing required PU1 'The Friendly Farm' summary sub-branch."
                })
            if not has_lit:
                issues.append({
                    "json_file": filename,
                    "rule_section": "5. Recall Map (RM)",
                    "item_id": "stories",
                    "issue_type": "Missing Literature",
                    "description": "Stories branch missing required PU1 'Literature' summary sub-branch."
                })

    def check_node(node):
        nid = node.get("id", "")
        emoji = node.get("emoji")
        if not emoji:
            issues.append({
                "json_file": filename,
                "rule_section": "5. Recall Map (RM)",
                "item_id": nid,
                "issue_type": "Missing Emoji",
                "description": f"Node '{nid}' ({node.get('text')}) is missing an emoji."
            })
        for child in node.get("children", []):
            check_node(child)

    check_node(tree)
    return issues

def audit_text_navigator(tn, unit_path, filename):
    issues = []
    sections = tn.get("sections", [])
    sec_names = [s.get("section") for s in sections]
    
    is_pu1 = "PU1" in unit_path.upper() or "B-PU1" in unit_path.upper()
    if is_pu1:
        if "The Friendly Farm" not in sec_names:
            issues.append({
                "json_file": filename,
                "rule_section": "6. Text Navigator (TN)",
                "item_id": "sections",
                "issue_type": "Missing Section",
                "description": "Missing required PU1 section 'The Friendly Farm'."
            })
        if "Literature" not in sec_names:
            issues.append({
                "json_file": filename,
                "rule_section": "6. Text Navigator (TN)",
                "item_id": "sections",
                "issue_type": "Missing Section",
                "description": "Missing required PU1 section 'Literature'."
            })

    for sec in sections:
        sec_name = sec.get("section", "")
        sec_tree = sec.get("tree", {})
        
        def check_tn_node(node, depth):
            nid = node.get("id", "")
            if depth > 4:
                issues.append({
                    "json_file": filename,
                    "rule_section": "6. Text Navigator (TN)",
                    "item_id": f"{sec_name}:{nid}",
                    "issue_type": "Nesting Depth Exceeded",
                    "description": f"Node '{nid}' at depth {depth} exceeds max allowed nesting depth of 4 levels."
                })
            
            text = node.get("text", "")
            speaker = node.get("speaker")
            if speaker and text.startswith(speaker + ":"):
                issues.append({
                    "json_file": filename,
                    "rule_section": "6. Text Navigator (TN)",
                    "item_id": f"{sec_name}:{nid}",
                    "issue_type": "Speaker Prefix in Text",
                    "description": f"Text '{text}' contains redundant speaker prefix '{speaker}:'."
                })

            children = node.get("children", [])
            # Check for flat structure (direct children > 5 where children are all leaf nodes)
            if children and len(children) > 5 and all(len(c.get("children", [])) == 0 for c in children):
                issues.append({
                    "json_file": filename,
                    "rule_section": "6. Text Navigator (TN)",
                    "item_id": f"{sec_name}:{nid}",
                    "issue_type": "Flat Tree Structure",
                    "description": f"Node '{nid}' has {len(children)} direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2)."
                })

            for child in children:
                check_tn_node(child, depth + 1)

        check_tn_node(sec_tree, 0)

    return issues

def audit_writing_map(data, filename):
    issues = []
    if not isinstance(data, dict):
        issues.append({
            "json_file": filename,
            "rule_section": "7. Model Writing Map (MWM)",
            "item_id": "root",
            "issue_type": "Invalid Data Structure",
            "description": "Root JSON must be an object containing 'sections'."
        })
        return issues

    sections = data.get("sections", [])
    if not isinstance(sections, list) or len(sections) == 0:
        issues.append({
            "json_file": filename,
            "rule_section": "7. Model Writing Map (MWM)",
            "item_id": "sections",
            "issue_type": "Missing Sections",
            "description": "Top-level object must contain a non-empty 'sections' array."
        })
        return issues

    sec_names = [s.get("section", "") for s in sections]
    if "Model Essay Basic" not in sec_names:
        issues.append({
            "json_file": filename,
            "rule_section": "7. Model Writing Map (MWM)",
            "item_id": "sections",
            "issue_type": "Missing Section",
            "description": "Missing required section 'Model Essay Basic'."
        })
    if "Model Essay Advanced" not in sec_names:
        issues.append({
            "json_file": filename,
            "rule_section": "7. Model Writing Map (MWM)",
            "item_id": "sections",
            "issue_type": "Missing Section",
            "description": "Missing required section 'Model Essay Advanced'."
        })

    for sec in sections:
        sec_name = sec.get("section", "")
        sec_tree = sec.get("tree", {})
        
        def check_wm_node(node, depth):
            nid = node.get("id", "")
            if depth > 4:
                issues.append({
                    "json_file": filename,
                    "rule_section": "7. Model Writing Map (MWM)",
                    "item_id": f"{sec_name}:{nid}",
                    "issue_type": "Nesting Depth Exceeded",
                    "description": f"Node '{nid}' at depth {depth} exceeds max allowed nesting depth of 4 levels."
                })
            
            text = node.get("text", "")
            speaker = node.get("speaker")
            if speaker and text.startswith(speaker + ":"):
                issues.append({
                    "json_file": filename,
                    "rule_section": "7. Model Writing Map (MWM)",
                    "item_id": f"{sec_name}:{nid}",
                    "issue_type": "Speaker Prefix in Text",
                    "description": f"Text '{text}' contains redundant speaker prefix '{speaker}:'."
                })

            children = node.get("children", [])
            # Check for flat structure (direct children > 5 where children are all leaf nodes)
            if children and len(children) > 5 and all(len(c.get("children", [])) == 0 for c in children):
                issues.append({
                    "json_file": filename,
                    "rule_section": "7. Model Writing Map (MWM)",
                    "item_id": f"{sec_name}:{nid}",
                    "issue_type": "Flat Tree Structure",
                    "description": f"Node '{nid}' has {len(children)} direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2)."
                })

            for child in children:
                check_wm_node(child, depth + 1)

        check_wm_node(sec_tree, 0)

    return issues

def main():
    skip_llm = "--no-llm" in sys.argv or "--skip-llm" in sys.argv
    use_llm = not skip_llm
    use_high = "high" in sys.argv or "--high" in sys.argv
    for flag in ["--llm", "--no-llm", "--skip-llm", "high", "--high"]:
        if flag in sys.argv:
            sys.argv.remove(flag)

    if len(sys.argv) < 2:
        print("Usage: python3 scripts/genai/audit-scripts/audit_unit.py <unit_folder_path> [--no-llm] [--high]")
        sys.exit(1)

    unit_dir = sys.argv[1].rstrip("/")
    if not os.path.isdir(unit_dir):
        print(f"Error: Directory '{unit_dir}' does not exist.")
        sys.exit(1)

    unit_name = os.path.basename(unit_dir)
    print(f"Auditing practice JSONs in: {unit_dir} (LLM Audit: {use_llm})")

    # Dynamically find JSON files matching unit prefix or test split patterns
    def find_json_files(kind_pattern):
        matched = []
        for f in os.listdir(unit_dir):
            if f.endswith(".json"):
                if kind_pattern == "vg" and "-vocab-guide" in f:
                    matched.append(f)
                elif kind_pattern == "vm" and "-vocab-master" in f:
                    matched.append(f)
                elif kind_pattern == "sh" and "-spelling-hero" in f:
                    matched.append(f)
                elif kind_pattern == "sa" and "-sentence-architect" in f:
                    matched.append(f)
                elif kind_pattern == "rm" and "-recall-map" in f:
                    matched.append(f)
                elif kind_pattern == "tn" and "-text-navigator" in f:
                    matched.append(f)
                elif kind_pattern == "wm" and "-writing-map" in f:
                    matched.append(f)
                elif kind_pattern == "gw" and "-grammar-wizard" in f:
                    matched.append(f)
                elif kind_pattern == "pd" and ("-passage-decoder" in f):
                    matched.append(f)
        return matched

    file_groups = {
        "vg": find_json_files("vg"),
        "vm": find_json_files("vm"),
        "sh": find_json_files("sh"),
        "sa": find_json_files("sa"),
        "rm": find_json_files("rm"),
        "tn": find_json_files("tn"),
        "wm": find_json_files("wm"),
        "gw": find_json_files("gw"),
        "pd": find_json_files("pd")
    }

    all_issues = []

    all_issues = []

    for fname in file_groups["vg"]:
        fpath = os.path.join(unit_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            vg_data = json.load(f)
            all_issues.extend(audit_vocab_guide(vg_data, fname))

    for fname in file_groups["vm"]:
        fpath = os.path.join(unit_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            vm_data = json.load(f)
            # Find matching VG if present
            vg_fname = fname.replace("-vocab-master", "-vocab-guide")
            vg_fpath = os.path.join(unit_dir, vg_fname)
            vg_data = None
            if os.path.exists(vg_fpath):
                with open(vg_fpath, "r", encoding="utf-8") as vgf:
                    vg_data = json.load(vgf)
            all_issues.extend(audit_vocab_master(vm_data, vg_data, fname))
            if use_llm:
                all_issues.extend(audit_vocab_master_llm(vm_data, fname, use_high))

    for fname in file_groups["sh"]:
        fpath = os.path.join(unit_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            sh_data = json.load(f)
            vg_fname = fname.replace("-spelling-hero", "-vocab-guide")
            vg_fpath = os.path.join(unit_dir, vg_fname)
            vg_data = None
            if os.path.exists(vg_fpath):
                with open(vg_fpath, "r", encoding="utf-8") as vgf:
                    vg_data = json.load(vgf)
            all_issues.extend(audit_spelling_hero(sh_data, vg_data, fname))

    for fname in file_groups["sa"]:
        fpath = os.path.join(unit_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            sa_data = json.load(f)
            all_issues.extend(audit_sentence_architect(sa_data, fname))
            if use_llm:
                all_issues.extend(audit_sentence_architect_llm(sa_data, fname, use_high))

    for fname in file_groups["rm"]:
        fpath = os.path.join(unit_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            rm_data = json.load(f)
            all_issues.extend(audit_recall_map(rm_data, unit_dir, fname))

    for fname in file_groups["tn"]:
        fpath = os.path.join(unit_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            tn_data = json.load(f)
            all_issues.extend(audit_text_navigator(tn_data, unit_dir, fname))

    for fname in file_groups["wm"]:
        fpath = os.path.join(unit_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            wm_data = json.load(f)
            all_issues.extend(audit_writing_map(wm_data, fname))

    # Deduplicate issues per (json_file, item_id, issue_type) so each issue type gets its own line
    merged_issues = []
    issue_map = {}
    for issue in all_issues:
        norm_type = issue["issue_type"].replace("LLM: ", "")
        key = (issue["json_file"], issue["item_id"], norm_type)
        if key not in issue_map:
            issue_map[key] = issue
            merged_issues.append(issue)
        else:
            existing = issue_map[key]
            if "<br>**Suggested" in issue["description"] and "<br>**Suggested" not in existing["description"]:
                sug_part = issue["description"].split("<br>**Suggested")[1]
                existing["description"] += f"<br>**Suggested{sug_part}"
            elif issue["description"] not in existing["description"]:
                existing["description"] += f" | {issue['description']}"

    all_issues = merged_issues

    # Generate Markdown Report
    output_dir = "scripts/genai/audit-reports"
    os.makedirs(output_dir, exist_ok=True)
    report_path = os.path.join(output_dir, f"{unit_name}-audit-report.md")

    report_lines = [
        f"# Audit Report: Practice JSONs for `{unit_dir}`\n",
        f"**Target Directory:** `{unit_dir}`  ",
        f"**Audit Standard:** Rules specified in `GEMINI.md`  ",
        f"**Total Issues Identified:** {len(all_issues)}\n",
        "---\n",
        "## Summary by File\n"
    ]

    file_status = {}
    all_matched_files = []
    for g_files in file_groups.values():
        all_matched_files.extend(g_files)

    for fname in all_matched_files:
        f_issues = [i for i in all_issues if i["json_file"] == fname]
        file_status[fname] = f"⚠️ {len(f_issues)} issue(s)" if f_issues else "✅ PASS (0 issues)"

    for fname, status in file_status.items():
        report_lines.append(f"- **`{fname}`**: {status}")

    report_lines.append("\n---\n")
    report_lines.append("## Detailed Issues Log\n")

    if not all_issues:
        report_lines.append("🎉 No issues found! All practice JSONs strictly adhere to `GEMINI.md` rules.\n")
    else:
        report_lines.append("| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |")
        report_lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for issue in all_issues:
            status_val = issue.get("status", "Pending")
            report_lines.append(f"| `{issue['json_file']}` | {issue['rule_section']} | `{issue['item_id']}` | {issue['issue_type']} | {issue['description']} | {status_val} |")

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines) + "\n")

    print(f"Audit completed. Found {len(all_issues)} issue(s).")
    print(f"Report saved to: {report_path}")

if __name__ == "__main__":
    main()
