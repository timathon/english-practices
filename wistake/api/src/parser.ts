export interface RawQuestionDraft {
  raw_index?: string;
  stem: string;
  options?: string[];
  user_answer: string;
  type: "numeric" | "mcq" | "cloze";
}

/**
 * Parses loosely formatted text into draft questions.
 * Handles patterns such as:
 *   5. 一本画册 92 页...
 *   answer: 19
 *
 *   5. 两个数相加...
 *   * ① 增加 4
 *   * ② 减少 4
 *   * ③ 不变
 *   ansewr: ②
 */
export function parseQuickPaste(text: string): RawQuestionDraft[] {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const drafts: RawQuestionDraft[] = [];

  let currentStemLines: string[] = [];
  let currentOptions: string[] = [];
  let currentUserAnswer: string | null = null;
  let currentRawIndex: string | undefined = undefined;

  function commitCurrent() {
    if (currentStemLines.length === 0 && !currentUserAnswer) return;

    let stem = currentStemLines.join(" ").trim();
    // Strip leading question numbers like "5." or "1、"
    const numMatch = stem.match(/^(\d+)[\.、\s]+(.*)$/);
    if (numMatch) {
      currentRawIndex = numMatch[1];
      stem = numMatch[2].trim();
    }

    const type = currentOptions.length > 0 ? "mcq" : "numeric";

    drafts.push({
      raw_index: currentRawIndex,
      stem,
      options: currentOptions.length > 0 ? [...currentOptions] : undefined,
      user_answer: currentUserAnswer || "",
      type
    });

    currentStemLines = [];
    currentOptions = [];
    currentUserAnswer = null;
    currentRawIndex = undefined;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detect answer line (tolerating 学生错答, 错答, 学生答案, answer, ansewr, 答案, 我的答案, etc.)
    const ansMatch = line.match(/^(?:学生错答|错答|学生答案|我的答案|ans(?:wer|ewr)|答案)[\s:：]+(.+)$/i);
    if (ansMatch) {
      currentUserAnswer = ansMatch[1].trim();
      // After encountering an answer, we can commit this question item
      commitCurrent();
      continue;
    }

    // Detect options like "* ① 增加 4", "A. 增加 4", "1. 增加 4" (when in options context)
    const optMatch = line.match(/^[\*\-•]?\s*([①②③④⑤⑥A-Da-d][\.\、\s\)]\s*.*)$/);
    if (optMatch) {
      currentOptions.push(optMatch[1].trim());
      continue;
    }

    // Check if line starts a new numbered item (e.g. "5. " or "6、") while we already had content
    if (/^\d+[\.、\s]/.test(line) && (currentStemLines.length > 0 || currentUserAnswer !== null)) {
      commitCurrent();
    }

    currentStemLines.push(line);
  }

  // Commit trailing question if any
  commitCurrent();

  return drafts;
}
