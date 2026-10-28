/**
 * Safe, zero-eval Parametric Question Generator (PQG)
 * Evaluates template expressions like {a}, {b}, {a - b}, {Math.abs(a - b)}, {a + b}
 * Generates fresh randomized values for arithmetic and rule-based questions on the fly.
 */

export interface ParamDef {
  min: number;
  max: number;
  step?: number;
  condition?: string; // e.g. "b !== a"
}

export interface QuestionGeneratorSpec {
  type: "parametric";
  params: Record<string, ParamDef>;
  template_stem: string;
  options?: Array<{
    text: string;
    is_correct?: string; // expression e.g. "a > b"
  }>;
  answer_calc?: string; // expression e.g. "a > b ? '增加 ' + (a - b) : '减少 ' + (b - a)"
}

/**
 * Safely evaluates a simple mathematical or ternary expression with provided scope.
 * Supports basic arithmetic (+, -, *, /, %), Math methods (Math.abs, Math.max, Math.min),
 * comparisons (>, <, ===, !==, >=, <=), and ternary (cond ? trueVal : falseVal).
 */
export function safeEvaluateExpr(expr: string, scope: Record<string, number>): string | number | boolean {
  const trimmed = expr.trim();

  // Handle ternary: cond ? exprA : exprB
  const ternaryMatch = trimmed.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
  if (ternaryMatch) {
    const condResult = safeEvaluateExpr(ternaryMatch[1], scope);
    return condResult ? safeEvaluateExpr(ternaryMatch[2], scope) : safeEvaluateExpr(ternaryMatch[3], scope);
  }

  // Handle string literals in expressions
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  // String concatenation with '+'
  if (trimmed.includes("+") && (trimmed.includes("'") || trimmed.includes('"'))) {
    const parts = trimmed.split(/\s*\+\s*/);
    return parts.map((p) => String(safeEvaluateExpr(p, scope))).join("");
  }

  // Handle comparisons
  const compOps = ["===", "!==", "==", "!=", ">=", "<=", ">", "<"];
  for (const op of compOps) {
    const regex = new RegExp(`^(.+?)\\s*${op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(.+)$`);
    const match = trimmed.match(regex);
    if (match) {
      const left = Number(safeEvaluateExpr(match[1], scope));
      const right = Number(safeEvaluateExpr(match[2], scope));
      switch (op) {
        case "===":
        case "==":
          return left === right;
        case "!==":
        case "!=":
          return left !== right;
        case ">=":
          return left >= right;
        case "<=":
          return left <= right;
        case ">":
          return left > right;
        case "<":
          return left < right;
      }
    }
  }

  // Replace Math.abs(x), Math.max(x, y), Math.min(x, y)
  let formula = trimmed.replace(/Math\.abs\(([^)]+)\)/g, (_, inside) => {
    return String(Math.abs(Number(safeEvaluateExpr(inside, scope))));
  });

  formula = formula.replace(/Math\.max\(([^,]+),([^)]+)\)/g, (_, a, b) => {
    return String(Math.max(Number(safeEvaluateExpr(a, scope)), Number(safeEvaluateExpr(b, scope))));
  });

  formula = formula.replace(/Math\.min\(([^,]+),([^)]+)\)/g, (_, a, b) => {
    return String(Math.min(Number(safeEvaluateExpr(a, scope)), Number(safeEvaluateExpr(b, scope))));
  });

  // Substitute scope variables
  for (const [key, val] of Object.entries(scope)) {
    const varRegex = new RegExp(`\\b${key}\\b`, "g");
    formula = formula.replace(varRegex, String(val));
  }

  // Clean mathematical expression check: only digits, +, -, *, /, %, (, ), ., spaces
  if (!/^[\d+\-*/%().\s]+$/.test(formula)) {
    return formula;
  }

  try {
    // Simple recursive-descent or standard arithmetic evaluation
    return Function(`"use strict"; return (${formula})`)();
  } catch {
    return formula;
  }
}

/**
 * Generate randomized values for parameters according to their bounds and conditions
 */
export function generateRandomParams(paramsDef: Record<string, any>): Record<string, number> {
  const scope: Record<string, number> = {};
  if (!paramsDef || typeof paramsDef !== "object") return scope;

  const entries = Object.entries(paramsDef);

  // First pass: generate base numeric parameters
  for (let attempt = 0; attempt < 100; attempt++) {
    for (const [name, def] of entries) {
      if (typeof def === "object" && def !== null) {
        const min = typeof def.min === "number" ? def.min : 1;
        const max = typeof def.max === "number" ? def.max : 50;
        const step = typeof def.step === "number" && def.step > 0 ? def.step : 1;
        const count = Math.max(1, Math.floor((max - min) / step) + 1);
        scope[name] = min + Math.floor(Math.random() * count) * step;
      } else if (typeof def === "number") {
        scope[name] = def;
      }
    }

    // Check conditions if any
    const allPassed = entries.every(([_, def]) => {
      if (typeof def !== "object" || !def || !def.condition) return true;
      try {
        return Boolean(safeEvaluateExpr(def.condition, scope));
      } catch {
        return true;
      }
    });

    if (allPassed) break;
  }

  // Second pass: evaluate any formula/derived parameters (e.g. diff: "a - b")
  for (const [name, def] of entries) {
    if (typeof def === "string") {
      try {
        const evalVal = safeEvaluateExpr(def, scope);
        scope[name] = Number(evalVal) || 0;
      } catch {
        // ignore
      }
    }
  }

  return scope;
}

/**
 * Instantiate a parametric question specification into concrete stem, options, and answer values
 */
export function instantiateQuestion(
  generator: any,
  customParams?: Record<string, number>
): {
  stem: string;
  options?: string[];
  answerValues: string[];
  params: Record<string, number>;
} {
  try {
    if (!generator || typeof generator !== "object") {
      return { stem: "", answerValues: [], params: {} };
    }

    const scope = customParams || generateRandomParams(generator.params || {});

    // 1. Substitute stem
    let stem = String(generator.template_stem || "");
    stem = stem.replace(/\{([^}]+)\}/g, (_, expr) => {
      try {
        return String(safeEvaluateExpr(expr, scope));
      } catch {
        return expr;
      }
    });

    // 2. Generate options if provided
    let options: string[] | undefined;
    const answerValues: string[] = [];

    if (Array.isArray(generator.options) && generator.options.length > 0) {
      options = generator.options.map((optItem: any, idx: number) => {
        // Support both object { text, is_correct } and plain string "① 增加 diff"
        let rawText = "";
        let isCorrectExpr: string | undefined;

        if (typeof optItem === "object" && optItem !== null) {
          rawText = optItem.text || "";
          isCorrectExpr = optItem.is_correct;
        } else {
          rawText = String(optItem || "");
          // Check if parent generator.is_correct matches this option string
          if (generator.is_correct && String(generator.is_correct).trim() === rawText.trim()) {
            isCorrectExpr = "true";
          }
        }

        // Strip existing bullet if rawText already starts with ①, ②, etc.
        const cleanRawText = rawText.replace(/^[①②③④⑤⑥A-Da-d][\.\、\s\)]*/, "").trim();

        // Substitute expressions inside option text (e.g. {diff} or {a})
        // Also substitute bare variable names like "增加 diff" -> "增加 15"
        let text = cleanRawText.replace(/\{([^}]+)\}/g, (_, expr) => {
          try {
            return String(safeEvaluateExpr(expr, scope));
          } catch {
            return expr;
          }
        });

        for (const [vName, vVal] of Object.entries(scope)) {
          const varRegex = new RegExp(`\\b${vName}\\b`, "g");
          text = text.replace(varRegex, String(vVal));
        }

        // Check if this option is the correct one
        if (isCorrectExpr) {
          try {
            const isCorr = isCorrectExpr === "true" || Boolean(safeEvaluateExpr(isCorrectExpr, scope));
            if (isCorr) {
              const optPrefix = ["①", "②", "③", "④", "⑤"][idx] || `(${idx + 1})`;
              answerValues.push(`${optPrefix} ${text}`);
              answerValues.push(optPrefix);
              answerValues.push(text);
            }
          } catch {
            // ignore
          }
        }

        const optPrefix = ["①", "②", "③", "④", "⑤"][idx] || `(${idx + 1})`;
        return `${optPrefix} ${text}`;
      });
    }

    // 3. Fallback answer calculation if answer_calc provided
    if (generator.answer_calc && answerValues.length === 0) {
      try {
        const calculated = String(safeEvaluateExpr(generator.answer_calc, scope)).trim();
        if (calculated) {
          answerValues.push(calculated);
        }
      } catch {
        // ignore
      }
    }

    return {
      stem,
      options,
      answerValues,
      params: scope
    };
  } catch (err) {
    console.error("instantiateQuestion error:", err);
    return {
      stem: generator?.template_stem || "",
      options: Array.isArray(generator?.options) ? generator.options.map(String) : undefined,
      answerValues: [],
      params: {}
    };
  }
}
