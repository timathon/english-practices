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

        if not (ipa.startswith("/") and ipa.endswith("/")):
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

    for q in all_questions:
        qid = q.get("id", "")
        word = q.get("word", "")
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

        if len(set(opts)) != len(opts):
            issues.append({
                "json_file": filename,
                "rule_section": "2. Vocab Master (VM)",
                "item_id": qid,
                "issue_type": "Duplicate Options",
                "description": f"Question {qid} contains duplicate options: {opts}"
            })

        if qtype == "En2Cn":
            for idx_o, opt in enumerate(opts):
                if re.search(r'[a-zA-Z]', str(opt)):
                    issues.append({
                        "json_file": filename,
                        "rule_section": "2. Vocab Master (VM)",
                        "item_id": qid,
                        "issue_type": "En2Cn Distractor Language",
                        "description": f"En2Cn option [{idx_o}] contains raw English text: '{opt}'"
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
            "item_id": "Coverage",
            "issue_type": "Missing Vocab Coverage",
            "description": f"Vocabulary items not tested in VM: {missing_coverage}"
        })

    return issues

def audit_spelling_hero(sh, vg, filename):
    issues = []
    sp_words = sh.get("spelling_words", [])
    vg_vocab = vg.get("unit_vocabulary", []) if vg else []
    single_words_vg = [v["word"] for v in vg_vocab if " " not in v["word"].strip()]

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

            en_words = [w.lower() for w in re.findall(r"\b\w+['’]?\w*\b", en)]
            for nw in noise:
                if nw.lower() in en_words:
                    issues.append({
                        "json_file": filename,
                        "rule_section": "4. Sentence Architect (SA)",
                        "item_id": sid,
                        "issue_type": "Noise Word Overlap",
                        "description": f"Noise word '{nw}' is already present in primary English sentence '{en}'."
                    })

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

            for child in node.get("children", []):
                check_tn_node(child, depth + 1)

        check_tn_node(sec_tree, 0)

    return issues

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/genai/audit-scripts/audit_unit.py <unit_folder_path>")
        sys.exit(1)

    unit_dir = sys.argv[1].rstrip("/")
    if not os.path.isdir(unit_dir):
        print(f"Error: Directory '{unit_dir}' does not exist.")
        sys.exit(1)

    unit_name = os.path.basename(unit_dir)
    print(f"Auditing practice JSONs in: {unit_dir}")

    files = {
        "vg": f"{unit_name}-vocab-guide.json",
        "vm": f"{unit_name}-vocab-master.json",
        "sh": f"{unit_name}-spelling-hero.json",
        "sa": f"{unit_name}-sentence-architect.json",
        "rm": f"{unit_name}-recall-map.json",
        "tn": f"{unit_name}-text-navigator.json",
        "gw": f"{unit_name}-grammar-wizard.json",
        "pd": f"{unit_name}-passage-decoder-s.json"
    }

    data = {}
    for k, fname in files.items():
        fpath = os.path.join(unit_dir, fname)
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                data[k] = json.load(f)
        else:
            data[k] = None

    all_issues = []

    if data["vg"]:
        all_issues.extend(audit_vocab_guide(data["vg"], files["vg"]))
    if data["vm"]:
        all_issues.extend(audit_vocab_master(data["vm"], data["vg"], files["vm"]))
    if data["sh"]:
        all_issues.extend(audit_spelling_hero(data["sh"], data["vg"], files["sh"]))
    if data["sa"]:
        all_issues.extend(audit_sentence_architect(data["sa"], files["sa"]))
    if data["rm"]:
        all_issues.extend(audit_recall_map(data["rm"], unit_dir, files["rm"]))
    if data["tn"]:
        all_issues.extend(audit_text_navigator(data["tn"], unit_dir, files["tn"]))

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
    for k, fname in files.items():
        if data[k] is None:
            file_status[fname] = "N/A (Not Found)"
        else:
            f_issues = [i for i in all_issues if i["json_file"] == fname]
            file_status[fname] = f"⚠️ {len(f_issues)} issue(s)" if f_issues else "✅ PASS (0 issues)"

    for fname, status in file_status.items():
        report_lines.append(f"- **`{fname}`**: {status}")

    report_lines.append("\n---\n")
    report_lines.append("## Detailed Issues Log\n")

    if not all_issues:
        report_lines.append("🎉 No issues found! All practice JSONs strictly adhere to `GEMINI.md` rules.\n")
    else:
        report_lines.append("| JSON File | Rule Section | Item ID / Target | Issue Type | Description |")
        report_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for issue in all_issues:
            report_lines.append(f"| `{issue['json_file']}` | {issue['rule_section']} | `{issue['item_id']}` | {issue['issue_type']} | {issue['description']} |")

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines) + "\n")

    print(f"Audit completed. Found {len(all_issues)} issue(s).")
    print(f"Report saved to: {report_path}")

if __name__ == "__main__":
    main()
