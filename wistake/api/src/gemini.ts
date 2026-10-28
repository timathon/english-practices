export interface SiblingQuestion {
  role: "mirror" | "variant" | "stretch";
  type: "numeric" | "mcq" | "cloze";
  stem: string;
  options?: string[];
  answer: {
    values: string[];
    accept?: string[];
  };
  difficulty: number;
  generator?: any;
}

export interface AnalysisResult {
  correct_answer: string;
  is_user_answer_correct: boolean;
  subject: string; // e.g. "math" | "english" | "chinese" | "physics" | "chemistry"
  subject_cn: string; // e.g. "数学" | "英语" | "语文" | "物理" | "化学"
  chapter: string;
  grade_suggested: number;
  error_type: "concept" | "calculation" | "misread" | "formula" | "sign" | "unit" | "method";
  root_cause: string;
  avoid_rule: string;
  key_concept: string;
  steps: string[];
  siblings: [SiblingQuestion, SiblingQuestion, SiblingQuestion];
}

export interface SeparatedQuestion {
  raw_index?: string;
  stem: string;
  options?: string[];
  user_answer: string;
  type: "numeric" | "mcq" | "cloze";
}

/**
 * Call Gemini 3.1 Flash Lite to accurately separate multiple questions from raw text
 */
export async function splitQuestionsWithGemini31(params: {
  rawText: string;
  apiKey: string;
}): Promise<SeparatedQuestion[]> {
  const { rawText, apiKey } = params;

  const prompt = `你是一位高效的试题结构化解析专家。请将用户粘贴的一段包含一道或多道错题的文本拆分成独立的题目对象数组。

【原始文本】
${rawText}

【拆分与提取规则】
1. 识别并拆分出其中包含的所有错题。
2. 对于每道题目：
   - stem: 提取纯净题干（去除题号如 '5.' 或 '1、'）。
   - options: 若是选择题，提取选项字符串数组（如 ["① 增加 4", "② 减少 4", "③ 不变"]）；若不是选择题，设为 null。
   - user_answer: 提取学生的错答（通常出现在 '学生错答:'、'错答:'、'学生答案:'、'我的答案:'、'answer:' 之后的内容，如 '19' 或 '②'）。若确实无错答，设为空字符串 ""。
   - type: 选择题为 'mcq'，数值计算/填空题为 'numeric'，常规文字填空为 'cloze'。
3. 请以严格 JSON 格式返回一个包含题目的数组对象：{"questions": [...]}，不要输出多余文本。`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini 3.1 split error (${res.status}): ${errText}`);
  }

  const json: any = await res.json();
  const resText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) return [];

  try {
    const parsed = JSON.parse(resText);
    const list = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    return list.map((item: any, idx: number) => ({
      raw_index: String(idx + 1),
      stem: item.stem || item.question || "",
      options: Array.isArray(item.options) && item.options.length > 0 ? item.options : undefined,
      user_answer: item.user_answer || item.student_answer || item.answer || "",
      type: (item.options && item.options.length > 0) ? "mcq" : (item.type || "numeric")
    }));
  } catch {
    return [];
  }
}

/**
 * Call Gemini 3.5 Flash Lite with structured JSON response
 */
export async function analyzeMathMistake(params: {
  stem: string;
  user_answer: string;
  options?: string[];
  grade?: number;
  apiKey: string;
}): Promise<AnalysisResult> {
  const { stem, user_answer, options: origOptions, grade = 3, apiKey } = params;

  const stage = grade <= 6 ? "小学" : "初中";
  const isOriginalMcq = !!(origOptions && origOptions.length > 0);

  const prompt = `你是一位专业的中小学名师。学生做错了一道题目，请识别其所属学科、对该错题进行深度剖析，并生成 3 道同一学科考点的递进变式练习题。

【学生信息】
学段：${stage}（${grade}年级）

【错题内容】
题干：${stem}
${isOriginalMcq ? `题型：选择题 (mcq)\n选项：\n${origOptions!.join("\n")}` : "题型：填空/计算题 (fill-in-blank / numeric)"}
学生错答：${user_answer}

【剖析要求】
1. subject: 识别该题目的所属学科英文标识，如 'math' (数学), 'english' (英语), 'chinese' (语文), 'physics' (物理), 'chemistry' (化学) 等。
2. subject_cn: 识别该题目的学科中文名，如 "数学", "英语", "语文", "物理" 等。
3. correct_answer: 解出此题的绝对标准答案。若题干有选项，对应写出正确选项标号和内容（如 "① 增加 4"），若是数值或单词则给出精准答案。
4. is_user_answer_correct: 如果学生的答案实际上完全正确，置为 true；否则 false（绝大多数应为 false）。
5. chapter: 归纳本题所属的学科章节知识板块（例如："100以内的加减法"、"时态与主谓一致"、"文言文虚词"等）。
6. grade_suggested: 最符合这道题难度的年级（1-9）。
7. error_type: 错误主因类别，从以下选择之一：'concept' (概念不清), 'calculation' (计算失误), 'misread' (审题不严/漏看条件), 'formula' (公式记错), 'sign' (正负号错误), 'unit' (单位错误), 'method' (解题方法不当)。
8. root_cause: 针对学生具体的错误答案进行一针见血的归因（例如："学生算出19是因为只看了第二天看的18页加1，完全忽略了第一天已经看的12页"）。
9. avoid_rule: 提炼一句学生容易背诵牢记的避坑口诀/检验法则（"Wistake 悟道点"）。
10. key_concept: 本题考察的核心概念/公式定义/语法规则解析。
11. steps: 严谨简明的解题步骤数组。
12. siblings: 必须生成且仅生成恰好 3 道针对同一学科知识点/考点的练习题数组（梯子式递进）。
    【重要：题型一致性法则】
    - 原题是填空题/计算题（无选项）时，生成的 3 道变式题必须同样是填空/计算题：type 必须为 'numeric'，options 必须为 null 或空数组，严禁生成选项或做成选择题！
    - 原题是选择题（有选项）时，生成的 3 道变式题必须是选择题：type 必须为 'mcq'，options 必须为 3-4 个选项的字符串数组。

    每个练习题对象必须包含以下字段：
    - role: 必须固定为 'mirror'（第1道镜像题）或 'variant'（第2道变式题）或 'stretch'（第3道拔高题）。
    - stem: 题目纯题干内容（绝对严禁在 stem 题干文字末尾或行内出现任何选项字符如 '①'、'②'、'A.'、'B.' 或 '选项:' 等！若原题无选项，题干中保留填空括号如（________）或直接问句）。
    - type: 原题无选项时必须为 'numeric'，原题有选项时必须为 'mcq'。
    - options: 原题无选项时必须为 null；原题有选项时为选项数组（如 ["① 增加 5", "② 减少 5", "③ 不变"]）。
    - answer: 对象格式 {"values": ["正确答案"]}（填空题填写标准答案数值/文本如 {"values": ["31"]}；选择题填写正确选项标号和内容如 {"values": ["① 增加 5", "①"]}）。
    - difficulty: 难度数值（1: 基础, 2: 提高, 3: 拓展）。
    - explanation: 解题思路解析。
    - generator:（可选，当题目是包含可随机数值的计算/数字应用题时推荐提供）参数化动态生成模板对象，使得每次刷题可以随机变换数值：
      若是填空题，generator 无 options，只需提供 answer_calc 表达式：
      {
        "type": "parametric",
        "params": {
          "total": { "min": 60, "max": 100 },
          "d1": { "min": 10, "max": 20 },
          "d2": { "min": 15, "max": 25 }
        },
        "template_stem": "一本故事书 {total} 页，小明第一天看了 {d1} 页，第二天看了 {d2} 页，第三天应该从（________）页开始看起。",
        "answer_calc": "d1 + d2 + 1"
      }
      若是选择题，generator 包含 options 数组与 is_correct 条件。

请严格返回符合 JSON 结构的文本，不要包含任何 markdown 标记以外的杂质。`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

  const reqBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json: any = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Empty response from Gemini API");
  }

  const parsed = JSON.parse(rawText) as any;

  // Robust normalization for siblings: handle cases where LLM returns question instead of stem, or type instead of role
  if (Array.isArray(parsed.siblings)) {
    parsed.siblings = parsed.siblings.map((sib: any, idx: number) => {
      const role = sib.role || (sib.type === "mirror" || sib.type === "variant" || sib.type === "stretch" ? sib.type : (idx === 0 ? "mirror" : idx === 1 ? "variant" : "stretch"));
      let stem = (sib.stem || sib.question || "").trim();
      let options = Array.isArray(sib.options) && sib.options.length > 0 ? [...sib.options] : undefined;

      // If stem accidentally contains inline or trailing options (e.g. "选项: ① ...", "① 增加 4 ② 减少 4", "A. ... B. ...")
      // Extract options if none exist and clean stem
      if (!options || options.length === 0) {
        const optMatch = stem.match(/[\s。，,；;]*(?:选项[\s:：]+)?([①②③④⑤⑥A-Da-d][\.\、\s\)].*)$/);
        if (optMatch) {
          const rawOpts = optMatch[1];
          const extracted = rawOpts.split(/(?=[①②③④⑤⑥A-Da-d][\.\、\s\)])/).map((o: string) => o.trim()).filter(Boolean);
          if (extracted.length >= 2) {
            options = extracted;
            stem = stem.slice(0, optMatch.index).trim();
          }
        }
      } else {
        // Strip any residual options line/trailing text from stem
        stem = stem.replace(/[\s。，,；;]*(?:选项[\s:：]+)?(?:[①②③④⑤⑥A-Da-d][\.\、\s\)].*)$/i, "").trim();
      }

      // Enforce question type parity: if original question was not MCQ (no options), sibling must be fill-in-blank (numeric)
      if (!isOriginalMcq) {
        options = undefined;
        if (sib.generator && sib.generator.options) {
          delete sib.generator.options;
        }
      }

      const type = (isOriginalMcq && options && options.length > 0) ? "mcq" : "numeric";
      return {
        ...sib,
        role,
        stem,
        options,
        type
      };
    });
  }

  return parsed as AnalysisResult;
}
