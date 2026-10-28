export interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  role: "admin" | "student";
  grade: number;
  stage: string;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
}

export interface SiblingQuestion {
  role: "mirror" | "variant" | "stretch";
  type: string;
  stem: string;
  options?: string[];
  answer: { values: string[] };
  difficulty: number;
  generator?: any;
}

export interface AnalysisResult {
  correct_answer: string;
  subject?: string;
  subject_cn?: string;
  chapter: string;
  grade_suggested: number;
  error_type: string;
  root_cause: string;
  avoid_rule: string;
  key_concept: string;
  steps: string[];
  siblings: [SiblingQuestion, SiblingQuestion, SiblingQuestion];
}

export interface MistakeItem {
  id: string;
  subject?: string;
  grade: number;
  chapter: string;
  error_type: string;
  state: string;
  review_count: number;
  days_since_review: number;
  user_answer: string;
  correct_answer: string;
  avoid_rule: string;
  stem: string;
  options?: string[];
  type: string;
  last_reviewed_at?: string | null;
  created_at: string;
}

export function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return "刚刚";
  const date = new Date(dateStr);
  const now = new Date();
  
  // Normalize both dates to local calendar midnight to compute exact calendar day diff
  const dCalendar = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const nowCalendar = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((nowCalendar - dCalendar) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays === 2) return "前天";
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN");
}

export function cleanQuestionStemAndOptions(rawStem?: string, existingOptions?: string[]): {
  stem: string;
  options: string[];
} {
  if (!rawStem) return { stem: "", options: existingOptions || [] };

  // First, check if options block starts with newline or separator
  // Handles:
  //   得数（________）。\n选项：\n① ...\n② ...
  //   得数（________）。 选项: ① ... ② ...
  //   得数（________）。\n* ① ...\n* ② ...
  //   得数（________）。 ① ... ② ...
  let stem = rawStem;
  let options = Array.isArray(existingOptions) && existingOptions.length > 0 ? [...existingOptions] : [];

  // Match where options start (either '选项[:：]' or directly with option bullet like ①, A., (1), （1）, [1])
  const optHeaderRegex = /[\r\n\s。，,；;]*(?:选项[\s:：]*[\r\n\s]*|\n+\s*[\*\-•]?\s*)([①②③④⑤⑥A-Da-d\(（\[][\.\、\s\)）\]0-9].*)$/s;
  const match = stem.match(optHeaderRegex);

  if (match && match.index !== undefined) {
    const rawOptionsBlock = match[1];
    const cleanStemPart = stem.substring(0, match.index).trim();

    // Extract options from the matched block if options wasn't already populated
    if (options.length === 0) {
      const extracted = rawOptionsBlock
        .split(/(?:[\r\n]+\s*[\*\-•]?\s*|\s+(?=[①②③④⑤⑥A-Da-d\(（\[][\.\、\s\)）\]0-9]))/)
        .map((o) => o.trim())
        .filter((o) => /^[①②③④⑤⑥A-Da-d\(（\[][\.\、\s\)）\]0-9]/.test(o));
      if (extracted.length >= 2) {
        options = extracted;
      }
    }
    stem = cleanStemPart;
  }

  // Also clean any trailing '选项：' if left at the end of stem
  stem = stem.replace(/[\r\n\s。，,；;]*选项[\s:：]*$/s, "").trim();

  return { stem, options };
}
