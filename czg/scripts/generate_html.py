import json
import re
import html
import os

def split_and_generate():
    json_path = "czg/data/cs-m-2022.json"
    out_dir = "czg/static/cs-m-2022"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    metadata = data["metadata"]
    items = data["items"]

    cc_map = {c["code"]: c for c in metadata.get("core_competencies", [])}
    verb_dict = {}
    for cat in metadata.get("action_verb_framework", {}).get("categories", []):
        cat_name = cat.get("category")
        for lvl in cat.get("levels", []):
            base_v = lvl.get("base_verb")
            defn = lvl.get("definition")
            lvl_num = lvl.get("level")
            verb_dict[base_v] = {"category": cat_name, "level": lvl_num, "def": defn}
            for s in lvl.get("synonyms", []):
                verb_dict[s] = {"category": cat_name, "level": lvl_num, "def": defn}

    dom_map = {dm["code"]: dm["name"] for dm in metadata["domains"]}
    top_map = {}
    sub_topic_name_map = {}
    for dm in metadata["domains"]:
        # Schema: domain -> topics -> sub_topics
        for top in dm.get("topics", []):
            top_map[(dm["code"], top["code"])] = top["name"]
            for sub in top.get("sub_topics", []):
                sub_topic_name_map[(dm["code"], top["code"], sub["code"])] = sub["name"]

    # Build 4-level structure: stage -> domain -> topic -> sub_topic -> items
    tree = {"S1": {}, "S2": {}, "S3": {}, "S4": {}}
    items_by_stage = {"S1": [], "S2": [], "S3": [], "S4": []}

    for item in items:
        # id format: cs-m-2022:S4.NA.NS.RN.001
        parts = item["id"].split(":")[1].split(".")
        stg = parts[0]
        dom = parts[1]
        top = parts[2] # topic code like NS, NO, QR
        sub = parts[3] # sub-topic code like RN, AE, GN, T1, P1

        sub_name = sub_topic_name_map.get((dom, top, sub), sub)

        stg_top = tree.setdefault(stg, {}).setdefault(dom, {}).setdefault(top, {})
        if sub not in stg_top:
            stg_top[sub] = {"code": sub, "name": sub_name, "items": []}
        stg_top[sub]["items"].append(item)
        items_by_stage.setdefault(stg, []).append(item)



    stage_info = {
        "S1": {"name": "第一学段", "grades": "1~2年级", "color": "var(--stage-s1)"},
        "S2": {"name": "第二学段", "grades": "3~4年级", "color": "var(--stage-s2)"},
        "S3": {"name": "第三学段", "grades": "5~6年级", "color": "var(--stage-s3)"},
        "S4": {"name": "第四学段", "grades": "7~9年级（初中）", "color": "var(--stage-s4)"}
    }

    def render_header(active_page="index", current_stage=None):
        stage_buttons = []
        for s in ["S1", "S2", "S3", "S4"]:
            is_active = (current_stage == s)
            active_cls = "active" if is_active else ""
            href = f"stage-{s.lower()}.html"
            stage_buttons.append(
                f'<a href="{href}" class="stage-pill {active_cls}" data-stage="{s}">{stage_info[s]["name"]} ({stage_info[s]["grades"]})</a>'
            )
        all_active = "active" if active_page == "index" else ""
        stage_buttons.insert(0, f'<a href="index.html" class="stage-pill {all_active}">首页概览</a>')

        return f"""  <header class="app-header">
    <div class="brand-wrapper">
      <a href="index.html" style="text-decoration:none; display:flex; align-items:center; gap:12px;">
        <div class="brand-logo">∑</div>
        <div class="brand-text">
          <h1>CS-Math 2022</h1>
          <p>义务教育数学课程标准 · 研读导航</p>
        </div>
      </a>
    </div>

    <div class="header-controls">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" class="search-input" placeholder="搜索条目ID、核心素养或要求..." autocomplete="off">
      </div>
      <div class="stage-pills" id="stageFilter">
        {"".join(stage_buttons)}
      </div>
    </div>

    <div class="header-actions">
      <button class="btn-icon" id="themeToggle" title="切换深浅主题">
        <span id="themeIcon">🌓</span> 主题
      </button>
      <button class="btn-icon" id="btnStats" title="查看课标体系图谱">
        📊 统计 ({len(items)} 条)
      </button>
    </div>
  </header>"""

    # 4-level tree navigation: Stage -> Domain -> Topic -> Subtopic
    def render_sidebar(active_page="index", current_stage=None):
        overview_active = "active" if active_page == "index" else ""
        stages_nav_html = []

        for s in ["S1", "S2", "S3", "S4"]:
            is_curr_stage = (current_stage == s)
            stage_active_cls = "active" if is_curr_stage else ""
            stg_url = f"stage-{s.lower()}.html"
            total_stg_items = len(items_by_stage.get(s, []))

            domains_html = []
            stg_tree = tree.get(s, {})

            for dom_code, dom_topics in stg_tree.items():
                dom_name = dom_map.get(dom_code, dom_code)
                dom_anchor = f"{stg_url}#dom-{s}-{dom_code}" if active_page != "stage" or current_stage != s else f"#dom-{s}-{dom_code}"
                dom_total = sum(len(sub_data["items"]) for subs in dom_topics.values() for sub_data in subs.values())

                topics_html = []
                for top_code, sub_dict in dom_topics.items():
                    top_name = top_map.get((dom_code, top_code), top_code)
                    top_anchor = f"{stg_url}#top-{s}-{dom_code}-{top_code}" if active_page != "stage" or current_stage != s else f"#top-{s}-{dom_code}-{top_code}"
                    top_total = sum(len(sub_data["items"]) for sub_data in sub_dict.values())

                    # Check if there are meaningful sub_topics (i.e. not purely generic GN)
                    has_subtopics = any(not sub_data["name"].endswith("通用要求") for sub_data in sub_dict.values())

                    subtopics_html = []
                    if has_subtopics:
                        for sub_code, sub_data in sub_dict.items():
                            sub_name = sub_data["name"]
                            it_list = sub_data["items"]
                            if sub_name.endswith("通用要求"): continue
                            sub_id = f"sub-{s}-{dom_code}-{top_code}-{sub_code}"
                            sub_anchor = f"{stg_url}#{sub_id}" if active_page != "stage" or current_stage != s else f"#{sub_id}"
                            subtopics_html.append(f"""                <li class="nav-subtopic-item">
                  <a href="{sub_anchor}" class="nav-subtopic-link" data-stage="{s}" data-domain="{dom_name}" data-topic="{top_name}" data-subtopic="{sub_name}">
                    <span class="subtopic-text">{sub_name}</span>
                    <span class="subtopic-cnt">{len(it_list)}</span>
                  </a>
                </li>""")

                    sub_list_markup = f"""\n            <ul class="nav-subtopic-list">\n{"".join(subtopics_html)}\n            </ul>""" if has_subtopics else ""
                    arrow_markup = '<span class="topic-arrow">▾</span>' if has_subtopics else ''

                    topics_html.append(f"""              <li class="nav-topic-item">
                <div class="nav-topic-header">
                  <a href="{top_anchor}" class="nav-topic-link" data-stage="{s}" data-domain="{dom_name}" data-topic="{top_name}">
                    <span class="topic-dot"></span>
                    <span class="topic-text">{top_name}</span>
                  </a>
                  <span class="nav-badge topic-cnt">{top_total}</span>
                  {arrow_markup}
                </div>{sub_list_markup}
              </li>""")

                domains_html.append(f"""          <li class="nav-domain-item">
            <div class="nav-domain-header">
              <span class="domain-arrow">▾</span>
              <a href="{dom_anchor}" class="nav-domain-link" data-stage="{s}" data-domain="{dom_name}">
                <span class="domain-tag">{dom_code}</span>
                <span class="domain-text">{dom_name}</span>
              </a>
              <span class="nav-badge domain-cnt">{dom_total}</span>
            </div>
            <ul class="nav-topic-list">
{"".join(topics_html)}
            </ul>
          </li>""")

            stages_nav_html.append(f"""      <!-- Level 1: Stage {s} (Folded by default) -->
      <li class="nav-stage-group" data-stage="{s}">
        <div class="nav-stage-header">
          <a href="{stg_url}" class="nav-stage-link {stage_active_cls}">
            <span class="stage-bullet" style="background:{stage_info[s]['color']};"></span>
            <span class="stage-title">{stage_info[s]['name']} ({stage_info[s]['grades']})</span>
          </a>
          <span class="nav-badge" style="margin-right:6px;">{total_stg_items} 条</span>
          <span class="stage-arrow">▾</span>
        </div>
        <ul class="nav-domain-list">
{"".join(domains_html)}
        </ul>
      </li>""")

        return f"""    <aside class="app-sidebar" id="appSidebar">
      <div class="nav-section-title">课程标准体系导航</div>
      <ul class="nav-tree" style="margin-bottom:12px;">
        <li>
          <a href="index.html" class="nav-item-link {overview_active}">
            <span>四、课程内容总览</span>
            <span class="nav-badge">导言</span>
          </a>
        </li>
      </ul>

      <div class="nav-section-title">分级导航 (学段 · 领域 · 主题 · 子主题)</div>
      <ul class="nav-tree-3level">
{"".join(stages_nav_html)}
      </ul>
    </aside>"""

    def render_item_card(it, s_code, dom_name="", top_name="", sub_name=""):
        item_id = it["id"]
        topic_name = html.escape(it.get("topic", ""))
        content_req = html.escape(it.get("content_requirement", ""))
        acad_req = html.escape(it.get("academic_requirement", ""))
        
        cc_badges = []
        for c_code in it.get("core_competencies", []):
            c_info = cc_map.get(c_code, {})
            c_name = c_info.get("name", c_code)
            cc_badges.append(f'<span class="tag-badge competency" data-code="{c_code}" title="{c_name} ({c_info.get("en", "")})">{c_code} {c_name}</span>')
        
        verb_badges = []
        for v in it.get("action_verbs", []):
            v_info = verb_dict.get(v, {})
            lvl_str = f"L{v_info['level']}" if 'level' in v_info else ""
            verb_badges.append(f'<span class="tag-badge verb" title="{v} - {v_info.get("category", "")} {lvl_str}">{v}</span>')

        examples = it.get("related_examples", [])
        examples_html = ""
        if examples:
            ex_pills = " ".join([f'<span class="tag-badge" style="background:rgba(234,179,8,0.15); color:#fde047; border-color:rgba(234,179,8,0.3);">{html.escape(e)}</span>' for e in examples])
            examples_html = f'<div style="margin-top:8px;">{ex_pills}</div>'

        topic_badge = f'<span class="tag-badge" style="margin-left:8px; font-weight:600; background:rgba(99,102,241,0.12); color:var(--primary); border-color:rgba(99,102,241,0.25);">{topic_name}</span>' if topic_name else ""

        dom_attr = html.escape(dom_name, quote=True)
        top_attr = html.escape(top_name, quote=True)
        sub_attr = html.escape(sub_name, quote=True)

        return f"""        <div class="standard-card" id="{item_id}" data-item-id="{item_id}" data-stage="{s_code}" data-domain="{dom_attr}" data-topic="{top_attr}" data-subtopic="{sub_attr}">
          <div class="card-topbar">
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
              <span class="item-id-pill" onclick="copyId('{item_id}')" title="点击复制标准ID">
                📋 {item_id}
              </span>
              {topic_badge}
            </div>
            <div class="card-tags">
              {"".join(cc_badges)}
              {"".join(verb_badges)}
            </div>
          </div>

          <div class="card-row">
            <div class="card-label">【内容要求】</div>
            <div class="card-text">{content_req}</div>
          </div>

          <div class="academic-box">
            <div class="card-label" style="color:#10b981;">【学业要求】</div>
            <div class="card-text">{acad_req}</div>
            {examples_html}
          </div>
        </div>"""

    # 1. Generate Index Page
    index_content = f"""<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CS-Math 2022 | 义务教育数学课程标准·研读导航</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
{render_header(active_page="index")}

  <div class="app-container">
{render_sidebar(active_page="index")}

    <main class="app-content">
      <h1 class="doc-title">四、课程内容总览</h1>
      <p class="doc-subtitle">
        《义务教育数学课程标准（2022年版）》正文主体结构导航。全书共由四个学习领域组成，划分为四个学段，配备 <strong>多级目录（学段·领域·主题·分项）</strong>，收录 <strong>{len(items)} 个标准细目条目</strong>。
      </p>

      <!-- Stage Entry Cards Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px; margin-bottom:32px;">
        <a href="stage-s1.html" style="text-decoration:none;">
          <div class="standard-card" style="border-top:4px solid var(--stage-s1); cursor:pointer;">
            <h3 style="color:var(--text-bright); font-size:18px; margin-bottom:8px;">第一学段 (1~2年级)</h3>
            <p style="color:var(--text-muted); font-size:13px; line-height:1.6;">数与运算、数量关系、图形的认识与测量、数据分类与主题活动。</p>
            <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center;">
              <span class="nav-badge" style="color:var(--stage-s1);">{len(items_by_stage['S1'])} 个标准条目</span>
              <span style="color:var(--text-accent); font-size:13px; font-weight:600;">进入研读 →</span>
            </div>
          </div>
        </a>

        <a href="stage-s2.html" style="text-decoration:none;">
          <div class="standard-card" style="border-top:4px solid var(--stage-s2); cursor:pointer;">
            <h3 style="color:var(--text-bright); font-size:18px; margin-bottom:8px;">第二学段 (3~4年级)</h3>
            <p style="color:var(--text-muted); font-size:13px; line-height:1.6;">引入小数与分数认识、运算律、图形位置与运动、数据收集整理。</p>
            <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center;">
              <span class="nav-badge" style="color:var(--stage-s2);">{len(items_by_stage['S2'])} 个标准条目</span>
              <span style="color:var(--text-accent); font-size:13px; font-weight:600;">进入研读 →</span>
            </div>
          </div>
        </a>

        <a href="stage-s3.html" style="text-decoration:none;">
          <div class="standard-card" style="border-top:4px solid var(--stage-s3); cursor:pointer;">
            <h3 style="color:var(--text-bright); font-size:18px; margin-bottom:8px;">第三学段 (5~6年级)</h3>
            <p style="color:var(--text-muted); font-size:13px; line-height:1.6;">负数与方程初步、立体图形测量、随机现象可能性、项目学习实践。</p>
            <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center;">
              <span class="nav-badge" style="color:var(--stage-s3);">{len(items_by_stage['S3'])} 个标准条目</span>
              <span style="color:var(--text-accent); font-size:13px; font-weight:600;">进入研读 →</span>
            </div>
          </div>
        </a>

        <a href="stage-s4.html" style="text-decoration:none;">
          <div class="standard-card" style="border-top:4px solid var(--stage-s4); cursor:pointer;">
            <h3 style="color:var(--text-bright); font-size:18px; margin-bottom:8px;">第四学段 (7~9年级·初中)</h3>
            <p style="color:var(--text-muted); font-size:13px; line-height:1.6;">数与式、方程与不等式、函数、图形性质与证明、抽样数据分析、概率。</p>
            <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center;">
              <span class="nav-badge" style="color:var(--stage-s4);">{len(items_by_stage['S4'])} 个标准条目</span>
              <span style="color:var(--text-accent); font-size:13px; font-weight:600;">进入研读 →</span>
            </div>
          </div>
        </a>
      </div>

      <!-- General Principle Accordion -->
      <div class="guidance-box">
        <div class="guidance-header" onclick="this.nextElementSibling.classList.toggle('open')">
          <span>📌 课标表2：各学段各领域的主题设计与递进矩阵</span>
          <span>▼</span>
        </div>
        <div class="guidance-content open">
          <p><strong>数与代数：</strong>小学阶段由“数与运算”和“数量关系”螺旋上升；初中阶段进阶为“数与式”、“方程与不等式”和“函数”。</p>
          <p style="margin-top:8px;"><strong>图形与几何：</strong>小学阶段由“图形的认识与测量”扩展到“图形的位置与运动”；初中阶段进阶为严密演绎证明的“图形的性质”、“图形的变化”与“图形与坐标”。</p>
          <p style="margin-top:8px;"><strong>统计与概率：</strong>小学由“数据分类”到“数据的收集、整理与表达”及“可能性”；初中升华为定量的“抽样与数据分析”与“随机事件的概率”。</p>
          <p style="margin-top:8px;"><strong>综合与实践：</strong>以培养学生综合运用所学知识解决实际问题的能力为目标，原则上不少于总课时的10%。第一至三学段以主题活动为主，第三学段适当开展项目学习，第四学段全面开展跨学科项目式学习。</p>
        </div>
      </div>
    </main>
  </div>

  <div id="toast" class="toast-msg">已复制标准条目 ID</div>
  <div id="detailModal" class="detail-modal" onclick="if(event.target===this)closeModal()">
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title" id="modalTitle">元数据详情</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div id="modalBody" style="font-size:14px; line-height:1.7; color:var(--text-main);"></div>
    </div>
  </div>

  <script src="js/data.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
"""
    with open(f"{out_dir}/index.html", "w", encoding="utf-8") as f:
        f.write(index_content)

    # 2. Generate Each Stage Page with Structured Domain & Topic Anchors
    for s_code in ["S1", "S2", "S3", "S4"]:
        s_meta = stage_info[s_code]
        filename = f"stage-{s_code.lower()}.html"
        stg_tree = tree.get(s_code, {})

        sections_html = []
        for dom_code, dom_topics in stg_tree.items():
            dom_name = dom_map.get(dom_code, dom_code)
            sections_html.append(f"""
        <!-- Domain {dom_code} -->
        <div class="domain-block" id="dom-{s_code}-{dom_code}">
          <h2 class="domain-header" style="border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;">
            <span class="tag-badge" style="font-size:14px; padding:3px 8px; background:rgba(96,165,250,0.15); color:var(--domain-na);">{dom_code}</span>
            {dom_name}
          </h2>
""")
            for top_code, sub_dict in dom_topics.items():
                top_name = top_map.get((dom_code, top_code), top_code)
                top_total = sum(len(sub_data["items"]) for sub_data in sub_dict.values())
                sections_html.append(f"""
          <!-- Topic {top_code} -->
          <div class="topic-block" id="top-{s_code}-{dom_code}-{top_code}" style="margin-top:24px;">
            <h3 class="topic-header" style="display:flex; justify-content:space-between; align-items:center;">
              <span>{top_name}</span>
              <span class="nav-badge">{top_total} 条目</span>
            </h3>
""")

                for sub_code, sub_data in sub_dict.items():
                    sub_name = sub_data["name"]
                    it_list = sub_data["items"]
                    sub_id = f"sub-{s_code}-{dom_code}-{top_code}-{sub_code}"
                    if not sub_name.endswith("通用要求"):
                        sections_html.append(f"""
            <h4 class="subtopic-header" id="{sub_id}" style="color:var(--text-accent); margin:18px 0 10px 4px; display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--text-accent);"></span>
              {sub_name}
            </h4>
""")
                    sub_display = "" if sub_name.endswith("通用要求") else sub_name
                    for it in it_list:
                        sections_html.append(render_item_card(it, s_code, dom_name=dom_name, top_name=top_name, sub_name=sub_display))

                sections_html.append("          </div>\n")
            sections_html.append("        </div>\n")

        page_content = f"""<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{s_meta['name']} ({s_meta['grades']}) | CS-Math 2022 课程标准研读</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
{render_header(active_page="stage", current_stage=s_code)}

  <div class="app-container">
{render_sidebar(active_page="stage", current_stage=s_code)}

    <main class="app-content">
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
        <h1 class="doc-title" style="margin-bottom:0;">
          <span style="display:inline-block; width:14px; height:14px; border-radius:50%; background:{s_meta['color']}; margin-right:8px;"></span>
          {s_meta['name']} ({s_meta['grades']})
        </h1>
        <span class="nav-badge" style="font-size:14px; padding:4px 10px;">{len(items_by_stage[s_code])} 个标准细目条目</span>
      </div>
      <p class="doc-subtitle">
        包含该学段各领域的【内容要求】与【学业要求】，各条目配备唯一标准索引代码 (Standard ID)。左侧导航已支持 <strong>学段 · 领域 · 主题 · 分项</strong> 四级精确检索。
      </p>

      <section class="stage-section-block" data-stage="{s_code}">
{"".join(sections_html)}
      </section>
    </main>
  </div>

  <div id="toast" class="toast-msg">已复制标准条目 ID</div>
  <div id="detailModal" class="detail-modal" onclick="if(event.target===this)closeModal()">
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title" id="modalTitle">元数据详情</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div id="modalBody" style="font-size:14px; line-height:1.7; color:var(--text-main);"></div>
    </div>
  </div>

  <script src="js/data.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
"""
        with open(f"{out_dir}/{filename}", "w", encoding="utf-8") as f:
            f.write(page_content)

    print("All pages re-generated with subtopics level successfully.")

if __name__ == "__main__":
    split_and_generate()
