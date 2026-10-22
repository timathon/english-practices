/**
 * Curriculum Standards Taxonomy & Core Competency Dictionary
 * Sourced directly from cs-m-2022.json metadata.
 */

// Core Competencies Mapping (code -> Chinese name)
export const CORE_COMPETENCY_NAMES: Record<string, string> = {
  NS: "数感",
  QS: "量感",
  SA: "符号意识",
  SC: "空间观念",
  GI: "几何直观",
  RA: "推理意识",
  CA: "运算能力",
  MA: "模型意识",
  DA: "数据意识",
  AA: "应用意识",
  IA: "创新意识",
  AC: "抽象能力",
  RC: "推理能力",
  MC: "模型观念",
  DC: "数据观念"
};

// Domain > Topic > Sub-topic Mapping (key: "DOMAIN.TOPIC.SUBTOPIC" -> Chinese breadcrumb)
export const TAXONOMY_TREE_MAP: Record<string, { domain: string; topic: string; subTopic: string; path: string }> = {
  // 1. 数与代数 (NA)
  "NA.NO.GN": { domain: "数与代数", topic: "数与运算", subTopic: "数与运算通用要求", path: "数与代数 > 数与运算 > 通用" },
  "NA.QR.GN": { domain: "数与代数", topic: "数量关系", subTopic: "数量关系通用要求", path: "数与代数 > 数量关系 > 通用" },
  "NA.NS.RN": { domain: "数与代数", topic: "数与式", subTopic: "有理数", path: "数与代数 > 数与式 > 有理数" },
  "NA.NS.RE": { domain: "数与代数", topic: "数与式", subTopic: "实数", path: "数与代数 > 数与式 > 实数" },
  "NA.NS.AE": { domain: "数与代数", topic: "数与式", subTopic: "代数式", path: "数与代数 > 数与式 > 代数式" },
  "NA.EE.EQ": { domain: "数与代数", topic: "方程与不等式", subTopic: "方程与方程组", path: "数与代数 > 方程与不等式 > 方程" },
  "NA.EE.IN": { domain: "数与代数", topic: "方程与不等式", subTopic: "不等式与不等式组", path: "数与代数 > 方程与不等式 > 不等式" },
  "NA.FN.CF": { domain: "数与代数", topic: "函数", subTopic: "函数的概念", path: "数与代数 > 函数 > 函数概念" },
  "NA.FN.LF": { domain: "数与代数", topic: "函数", subTopic: "一次函数", path: "数与代数 > 函数 > 一次函数" },
  "NA.FN.QF": { domain: "数与代数", topic: "函数", subTopic: "二次函数", path: "数与代数 > 函数 > 二次函数" },
  "NA.FN.IF": { domain: "数与代数", topic: "函数", subTopic: "反比例函数", path: "数与代数 > 函数 > 反比例函数" },

  // 2. 图形与几何 (SG)
  "SG.GM.GN": { domain: "图形与几何", topic: "图形的认识与测量", subTopic: "图形的认识与测量通用要求", path: "图形与几何 > 图形认识 > 通用" },
  "SG.PM.GN": { domain: "图形与几何", topic: "图形的位置与运动", subTopic: "图形的位置与运动通用要求", path: "图形与几何 > 图形运动 > 通用" },
  "SG.GP.PA": { domain: "图形与几何", topic: "图形的性质", subTopic: "点、线、面、角", path: "图形与几何 > 图形性质 > 点线面角" },
  "SG.GP.PLA": { domain: "图形与几何", topic: "图形的性质", subTopic: "点、线、面、角", path: "图形与几何 > 图形性质 > 点线面角" },
  "SG.GP.IP": { domain: "图形与几何", topic: "图形的性质", subTopic: "相交线与平行线", path: "图形与几何 > 图形性质 > 相交线与平行线" },
  "SG.GP.TR": { domain: "图形与几何", topic: "图形的性质", subTopic: "三角形", path: "图形与几何 > 图形性质 > 三角形" },
  "SG.GP.QU": { domain: "图形与几何", topic: "图形的性质", subTopic: "四边形", path: "图形与几何 > 图形性质 > 四边形" },
  "SG.GP.QUA": { domain: "图形与几何", topic: "图形的性质", subTopic: "四边形", path: "图形与几何 > 图形性质 > 四边形" },
  "SG.GP.CI": { domain: "图形与几何", topic: "图形的性质", subTopic: "圆", path: "图形与几何 > 图形性质 > 圆" },
  "SG.GP.CIR": { domain: "图形与几何", topic: "图形的性质", subTopic: "圆", path: "图形与几何 > 图形性质 > 圆" },
  "SG.GP.DP": { domain: "图形与几何", topic: "图形的性质", subTopic: "定义、命题、定理", path: "图形与几何 > 图形性质 > 命题与定理" },
  "SG.GT.AX": { domain: "图形与几何", topic: "图形的变化", subTopic: "图形的轴对称", path: "图形与几何 > 图形变化 > 轴对称" },
  "SG.GT.RO": { domain: "图形与几何", topic: "图形的变化", subTopic: "图形的旋转", path: "图形与几何 > 图形变化 > 旋转" },
  "SG.GT.TR": { domain: "图形与几何", topic: "图形的变化", subTopic: "图形的平移", path: "图形与几何 > 图形变化 > 平移" },
  "SG.GT.SI": { domain: "图形与几何", topic: "图形的变化", subTopic: "图形的相似", path: "图形与几何 > 图形变化 > 相似" },
  "SG.GT.PJ": { domain: "图形与几何", topic: "图形的变化", subTopic: "图形的投影", path: "图形与几何 > 图形变化 > 投影" },
  "SG.GT.PRJ": { domain: "图形与几何", topic: "图形的变化", subTopic: "图形的投影", path: "图形与几何 > 图形变化 > 投影" },
  "SG.GC.CO": { domain: "图形与几何", topic: "图形与坐标", subTopic: "平面直角坐标系", path: "图形与几何 > 图形与坐标 > 坐标系" },

  // 3. 统计与概率 (SP)
  "SP.DA.GN": { domain: "统计与概率", topic: "数据的收集、整理与表达", subTopic: "通用要求", path: "统计与概率 > 数据收集 > 通用" },
  "SP.PB.GN": { domain: "统计与概率", topic: "随机现象发生的可能性", subTopic: "通用要求", path: "统计与概率 > 随机现象 > 通用" },
  "SP.SA.GN": { domain: "统计与概率", topic: "抽样与数据分析", subTopic: "抽样与数据分析通用要求", path: "统计与概率 > 抽样分析 > 通用" },
  "SP.SA.SDA": { domain: "统计与概率", topic: "抽样与数据分析", subTopic: "抽样与数据分析通用要求", path: "统计与概率 > 抽样分析 > 通用" },
  "SP.PR.GN": { domain: "统计与概率", topic: "随机事件的概率", subTopic: "随机事件的概率通用要求", path: "统计与概率 > 概率 > 通用" },

  // 4. 综合与实践 (PR)
  "PR.TH.T1": { domain: "综合与实践", topic: "主题活动", subTopic: "主题活动1", path: "综合与实践 > 主题活动" },
  "PR.PJ.P1": { domain: "综合与实践", topic: "项目学习", subTopic: "项目学习1", path: "综合与实践 > 项目学习" },
  "PR.PJ.P2": { domain: "综合与实践", topic: "项目学习", subTopic: "项目学习2", path: "综合与实践 > 项目学习" },
  "PR.PJ.P3": { domain: "综合与实践", topic: "项目学习", subTopic: "项目学习3", path: "综合与实践 > 项目学习" },
  "PR.PJ.PL": { domain: "综合与实践", topic: "项目学习", subTopic: "项目学习", path: "综合与实践 > 项目学习" }
};

/**
 * Helper to resolve standard CS ID into Chinese domain > topic > subtopic breadcrumb
 * e.g. "cs-m-2022:S4.NA.NS.RN.004" -> "数与代数 > 数与式 > 有理数"
 */
export function getStandardTaxonomyPath(csId: string): string | null {
  if (!csId) return null;
  const clean = csId.replace(/^cs-m-2022:/, "");
  const parts = clean.split(".");
  if (parts.length >= 4) {
    // parts[1] = Domain (e.g. NA), parts[2] = Topic (e.g. NS), parts[3] = SubTopic (e.g. RN)
    const key = `${parts[1]}.${parts[2]}.${parts[3]}`;
    if (TAXONOMY_TREE_MAP[key]) {
      return TAXONOMY_TREE_MAP[key].path;
    }
  }
  return null;
}

/**
 * Helper to get the sub-topic name from standard CS ID
 * e.g. "cs-m-2022:S4.NA.NS.RN.001" -> "有理数"
 */
export function getStandardSubTopic(csId: string): string | null {
  if (!csId) return null;
  const clean = csId.replace(/^cs-m-2022:/, "");
  const parts = clean.split(".");
  if (parts.length >= 4) {
    const key = `${parts[1]}.${parts[2]}.${parts[3]}`;
    if (TAXONOMY_TREE_MAP[key]) {
      return TAXONOMY_TREE_MAP[key].subTopic;
    }
  }
  return null;
}

/**
 * Helper to get Chinese full name of core competency code
 * e.g. "CA" -> "运算能力", "RC" -> "推理能力"
 */
export function getCoreCompetencyName(code: string): string {
  return CORE_COMPETENCY_NAMES[code] || code;
}
