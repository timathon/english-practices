import json
import re

def clean_txt(s):
    if not s:
        return ""
    s = re.sub(r'<sup>.*?</sup>', '', s)
    s = re.sub(r'[\(（][例][0-9A-Za-z、，与及\s]+[\)）]', '', s)
    s = re.sub(r'\$', '', s)
    s = s.replace('²²', '²').replace('±', '+')
    s = re.sub(r'[^\w]', '', s)
    return s

def main():
    print("Step 1: Loading source files...")
    with open('czg/data/m7a.json', 'r', encoding='utf-8') as f:
        m7a = json.load(f)
    
    with open('czg/data/cs-m-2022.json', 'r', encoding='utf-8') as f:
        cs = json.load(f)
    cs_by_id = {it['id']: it for it in cs.get('items', [])}
    
    with open('czg/data/cs-m-2022-mapping.json', 'r', encoding='utf-8') as f:
        cs_mapping = json.load(f)
    cs_to_cms = cs_mapping['id_mapping']['cs_to_cms']
    cms_to_cs = cs_mapping['id_mapping']['cms_to_cs']

    with open('czg/temp/cn-math-taxonomy/data/topics.json', 'r', encoding='utf-8') as f:
        all_topics = json.load(f)
    topics_by_id = {t['id']: t for t in all_topics}

    with open('czg/temp/cn-math-taxonomy/data/dependencies.json', 'r', encoding='utf-8') as f:
        all_deps = json.load(f)

    with open('czg/temp/cn-math-taxonomy/data/questions.json', 'r', encoding='utf-8') as f:
        all_questions = json.load(f)
    
    # Group questions by topicId
    questions_by_topic = {}
    for q in all_questions:
        tid = q.get('topicId')
        questions_by_topic.setdefault(tid, []).append(q)

    # Manual alias mapping for specific m7a cs_m_id variants to real cs-m-2022.json IDs
    cs_alias_map = {
        'cs-m-2022:S4.NA.NS.AE.014': 'cs-m-2022:S4.NA.NS.AE.001',
        'cs-m-2022:S4.NA.NS.AE.015': 'cs-m-2022:S4.NA.NS.AE.002',
        'cs-m-2022:S4.NA.NS.AE.016': 'cs-m-2022:S4.NA.NS.AE.003',
        'cs-m-2022:S4.NA.NS.AE.017': 'cs-m-2022:S4.NA.NS.AE.004',
        'cs-m-2022:S4.NA.NS.AE.018': 'cs-m-2022:S4.NA.NS.AE.005',
        'cs-m-2022:S4.NA.NS.AE.022': 'cs-m-2022:S4.NA.NS.AE.009',
        'cs-m-2022:S4.NA.NS.RN.012': 'cs-m-2022:S4.NA.NS.RE.005',
        'cs-m-2022:S4.SG.GP.PLA.001': 'cs-m-2022:S4.SG.GP.PA.001',
        'cs-m-2022:S4.SG.GP.PLA.002': 'cs-m-2022:S4.SG.GP.PA.002',
        'cs-m-2022:S4.SG.GP.PLA.003': 'cs-m-2022:S4.SG.GP.PA.003',
        'cs-m-2022:S4.SG.GP.PLA.004': 'cs-m-2022:S4.SG.GP.PA.004',
        'cs-m-2022:S4.SG.GP.PLA.005': 'cs-m-2022:S4.SG.GP.PA.005',
        'cs-m-2022:S4.SG.GP.PLA.006': 'cs-m-2022:S4.SG.GP.PA.006',
        'cs-m-2022:S4.SG.GP.PLA.007': 'cs-m-2022:S4.SG.GP.PA.007',
        'cs-m-2022:S4.SG.GP.QUA.039': 'cs-m-2022:S4.SG.GP.QU.001',
        'cs-m-2022:S4.SG.GP.CIR.045': 'cs-m-2022:S4.SG.GP.CI.001',
        'cs-m-2022:S4.SG.GP.CIR.053': 'cs-m-2022:S4.SG.GP.CI.007',
        'cs-m-2022:S4.SG.GT.PRJ.022': 'cs-m-2022:S4.SG.GT.PJ.001',
        'cs-m-2022:S4.SG.GT.PRJ.023': 'cs-m-2022:S4.SG.GT.PJ.002',
        'cs-m-2022:S4.SG.GT.PRJ.024': 'cs-m-2022:S4.SG.GT.PJ.003',
        'cs-m-2022:S4.SG.GT.PRJ.025': 'cs-m-2022:S4.SG.GT.PJ.004',
        'cs-m-2022:S4.SP.SA.SDA.001': 'cs-m-2022:S4.SP.SA.GN.001',
        'cs-m-2022:S4.SP.SA.SDA.002': 'cs-m-2022:S4.SP.SA.GN.002',
        'cs-m-2022:S4.SP.SA.SDA.003': 'cs-m-2022:S4.SP.SA.GN.003',
        'cs-m-2022:S4.SP.SA.SDA.007': 'cs-m-2022:S4.SP.SA.GN.007',
        'cs-m-2022:S4.SP.SA.SDA.010': 'cs-m-2022:S4.SP.SA.GN.010',
        'cs-m-2022:S4.PR.PJ.PL.001': 'cs-m-2022:S4.PR.PJ.P1.001',
        'cs-m-2022:S4.PR.PJ.PL.002': 'cs-m-2022:S4.PR.PJ.P2.001',
        'cs-m-2022:S4.PR.PJ.PL.003': 'cs-m-2022:S4.PR.PJ.P3.001',
    }

    # Index topics by standard ID
    topics_by_std = {}
    for t in all_topics:
        for s in t.get('standards', []):
            sid = s.get('id')
            topics_by_std.setdefault(sid, []).append(t['id'])

    print("Step 2: Processing M7A chapters and sections...")
    enriched_chapters = []
    used_topic_ids = set()

    for ch in m7a.get('chapters', []):
        ch_copy = {
            "chapter_number": ch.get("chapter_number"),
            "title": ch.get("title"),
            "page_range": ch.get("page_range"),
            "sections": []
        }
        for sec in ch.get('sections', []):
            sec_copy = {
                "section_number": sec.get("section_number"),
                "title": sec.get("title"),
                "page_range": sec.get("page_range"),
                "key_concepts": sec.get("key_concepts", []),
                "standards": [],
                "topics": []
            }
            sec_topic_ids = set()
            for m in sec.get('cs_m_mappings', []):
                raw_cid = m.get('cs_m_id')
                std_id = cs_alias_map.get(raw_cid, raw_cid)
                cs_item = cs_by_id.get(std_id, {})
                cms_id = cs_to_cms.get(std_id)
                
                std_entry = {
                    "cs_id": std_id,
                    "cms_id": cms_id,
                    "relevance_degree": m.get("relevance_degree", "Direct"),
                    "mapped_aspects": m.get("mapped_aspects", []),
                    "content_requirement": cs_item.get("content_requirement", ""),
                    "academic_requirement": cs_item.get("academic_requirement", ""),
                    "core_competencies": cs_item.get("core_competencies", m.get("core_competencies", []))
                }
                sec_copy["standards"].append(std_entry)

                # Link topics
                if cms_id and cms_id in topics_by_std:
                    for tid in topics_by_std[cms_id]:
                        sec_topic_ids.add(tid)
                        used_topic_ids.add(tid)
                
            sec_copy["topic_ids"] = sorted(list(sec_topic_ids))
            ch_copy["sections"].append(sec_copy)
        enriched_chapters.append(ch_copy)

    print(f"Direct topics associated with M7A sections: {len(used_topic_ids)}")

    # Step 3: Expand with prerequisite closure
    print("Step 3: Calculating prerequisite closure...")
    prereq_graph = {}
    for d in all_deps:
        prereq_graph.setdefault(d['topicId'], []).append(d['prerequisiteId'])

    closure = set(used_topic_ids)
    added = True
    while added:
        added = False
        for tid in list(closure):
            for pid in prereq_graph.get(tid, []):
                if pid not in closure and pid in topics_by_id:
                    closure.add(pid)
                    added = True

    print(f"Total topics in closure (target + prerequisites): {len(closure)}")

    # Step 4: Extract trimmed dependencies
    trimmed_deps = [
        d for d in all_deps 
        if d['topicId'] in closure and d['prerequisiteId'] in closure
    ]
    print(f"Total trimmed dependencies: {len(trimmed_deps)}")

    # Step 5: Extract trimmed topics and questions
    trimmed_topics = []
    trimmed_questions = []
    for tid in sorted(closure):
        t = topics_by_id[tid]
        trimmed_topics.append({
            "id": t['id'],
            "name": t['name'],
            "domain": t.get('domain', ''),
            "grade": t.get('grade'),
            "semester": t.get('semester', ''),
            "chapter": t.get('chapter', ''),
            "type": t.get('type', 'conceptual'),
            "description": t.get('description', ''),
            "mastery_criteria": t.get('mastery_criteria', []),
            "diagnostic_question": t.get('diagnostic_question'),
            "standards": t.get('standards', [])
        })
        for q in questions_by_topic.get(tid, []):
            trimmed_questions.append({
                "id": q['id'],
                "topicId": q['topicId'],
                "difficulty": q.get('difficulty', 'standard'),
                "type": q.get('type', 'multiple'),
                "prompt": q.get('prompt', ''),
                "figure": q.get('figure'),  # SVG geometry figure
                "choices": q.get('choices'),
                "answer": q.get('answer', ''),
                "explanation": q.get('explanation', ''),
                "verify": q.get('verify')
            })

    print(f"Total questions bundled: {len(trimmed_questions)}")

    bundle = {
        "metadata": {
            "textbook_id": m7a['metadata']['textbook_id'],
            "textbook_name": m7a['metadata']['textbook_name'],
            "publisher": m7a['metadata']['publisher'],
            "edition": m7a['metadata']['edition'],
            "version": "1.0.0",
            "stats": {
                "total_chapters": len(enriched_chapters),
                "total_sections": sum(len(ch['sections']) for ch in enriched_chapters),
                "total_topics": len(trimmed_topics),
                "total_dependencies": len(trimmed_deps),
                "total_questions": len(trimmed_questions)
            }
        },
        "chapters": enriched_chapters,
        "topics": trimmed_topics,
        "dependencies": trimmed_deps,
        "questions": trimmed_questions
    }

    import os
    os.makedirs('czg/data', exist_ok=True)
    with open('czg/data/m7a-bundle.json', 'w', encoding='utf-8') as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)

    print("Success! Created czg/data/m7a-bundle.json")
    print(f"Stats: {bundle['metadata']['stats']}")

if __name__ == '__main__':
    main()
