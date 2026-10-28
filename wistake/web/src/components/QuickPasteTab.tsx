import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardPaste,
  Sparkles,
  X,
  Copy,
  Layers,
  Check
} from "lucide-react";
import { SiblingQuestion, AnalysisResult, QuotaInfo, cleanQuestionStemAndOptions } from "../types";

export const EXAMPLE_PASTE_TEXT = `5. 一本画册 92 页，明明第一天看了 12 页，第二天看了 18 页，第三天应该从（________）页开始看起。
学生错答: 19

5. 两个数相加，第一个加数增加 23，第二个加数减少 19，得数（________）。
* ① 增加 4
* ② 减少 4
* ③ 不变
学生错答: ②`;

export const OCR_EXTRACTION_PROMPT = `请仔细识别图片中的试卷错题，提取出每道错题的原题题干、所有选项（若为选择题）以及学生的错误答案，并严格按照以下格式纯文本返回，不要包含其他多余解释：

1. [原题题干内容...]
* ① [选项1]
* ② [选项2]
* ③ [选项3]
学生错答: [图片中学生填写的错误答案或选项标号]

2. [填空或计算题题干...]
学生错答: [图片中学生填写的错误数值或文字]`;

export interface CandidateItem {
  stem: string;
  options?: string[];
  user_answer: string;
  type: string;
}

export interface BatchAnalysisItem {
  mistake_id: string;
  stem: string;
  options?: string[];
  user_answer: string;
  analysis: AnalysisResult;
}

interface QuickPasteTabProps {
  quota: QuotaInfo;
  pasteText: string;
  setPasteText: (text: string) => void;
  isSplitting: boolean;
  handleSplitQuestions: () => void;
  parsedCandidates: CandidateItem[];
  selectedCandidateIndices: number[];
  toggleCandidateSelection: (index: number) => void;
  selectAllCandidates: () => void;
  selectedGrade: number;
  handleGradeChange: (grade: number) => void;
  isAnalyzing: boolean;
  handleOpenAnalyzeModal: () => void;
  showGradeModal: boolean;
  setShowGradeModal: (show: boolean) => void;
  doConfirmAnalyze: () => void;
  batchAnalyses: BatchAnalysisItem[];
}

export const QuickPasteTab: React.FC<QuickPasteTabProps> = ({
  quota,
  pasteText,
  setPasteText,
  isSplitting,
  handleSplitQuestions,
  parsedCandidates,
  selectedCandidateIndices,
  toggleCandidateSelection,
  selectAllCandidates,
  selectedGrade,
  handleGradeChange,
  isAnalyzing,
  handleOpenAnalyzeModal,
  showGradeModal,
  setShowGradeModal,
  doConfirmAnalyze,
  batchAnalyses
}) => {
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [showOcrPromptModal, setShowOcrPromptModal] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);
  const [copiedOcrPrompt, setCopiedOcrPrompt] = useState(false);
  const [activePracticeIndices, setActivePracticeIndices] = useState<number[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceFeedbacks, setPracticeFeedbacks] = useState<Record<number, { isCorrect: boolean; msg: string }>>({});

  const handleCopyExample = () => {
    navigator.clipboard.writeText(EXAMPLE_PASTE_TEXT);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  const handleCopyOcrPrompt = () => {
    navigator.clipboard.writeText(OCR_EXTRACTION_PROMPT);
    setCopiedOcrPrompt(true);
    setTimeout(() => setCopiedOcrPrompt(false), 2000);
  };

  const checkPractice = (sibling: SiblingQuestion, sIdx: number, chosenAnswer?: string) => {
    const finalAnswer = (chosenAnswer !== undefined ? chosenAnswer : practiceAnswers[sIdx] || "").trim();
    if (!finalAnswer) return;

    const cleanUser = finalAnswer.toLowerCase();
    const correctVals = (sibling.answer?.values || []).map((v) => v.trim().toLowerCase());
    const isCorrect = correctVals.some(
      (v) =>
        v === cleanUser ||
        v.includes(cleanUser) ||
        cleanUser.includes(v) ||
        (cleanUser.length === 1 && v.startsWith(cleanUser))
    );

    const displayExpected = (sibling.answer?.values || []).join(" 或 ") || "正确答案";

    setPracticeFeedbacks((prev) => ({
      ...prev,
      [sIdx]: {
        isCorrect,
        msg: isCorrect
          ? "🎉 太棒了！准确突破此题，解题模型掌握得非常扎实！"
          : `💡 遗憾做错了，标准答案是：${displayExpected}。再反思一下题意哦！`
      }
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Input card */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
            <ClipboardPaste size={18} color="#3b82f6" />
            错题快速粘贴 (Quick Paste)
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              支持直接把题目和“学生错答”粘入
            </span>
            <button
              type="button"
              onClick={() => setShowExampleModal(true)}
              style={{
                padding: "0.25rem 0.65rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                borderRadius: "6px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
              title="查看支持的错题粘贴格式示例"
            >
              <span>📖 示例</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOcrPromptModal(true)}
              style={{
                padding: "0.25rem 0.65rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                borderRadius: "6px",
                background: "rgba(168, 85, 247, 0.15)",
                color: "#c084fc",
                border: "1px solid rgba(168, 85, 247, 0.35)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
              title="拍照发给 AI 助手时使用的专属识别提示词"
            >
              <span>💬 提示词示例 (Prompt)</span>
            </button>
          </div>
        </div>

        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={7}
          style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: "0.95rem", lineHeight: 1.6 }}
          placeholder="在此粘贴题目与错答（如：学生错答: 19）..."
        />

        {/* Modal: Paste Format Example (rendered directly into document.body via Portal) */}
        {showExampleModal && createPortal(
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem"
          }}>
            <div
              className="glass-panel animate-fade-in"
              style={{
                width: "100%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "1.75rem",
                background: "#111827",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                borderRadius: "12px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#f8fafc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>📖 错题粘贴格式示例</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowExampleModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                可以直接把平时作业、测验题或错题集的文本贴入，题目序号、选项列表以及学生的错误回答（<code style={{ color: "#60a5fa" }}>学生错答: ...</code>）均会被智能提取：
              </p>

              <pre style={{
                background: "#0a0f1d",
                border: "1px solid var(--border-color)",
                padding: "1rem",
                borderRadius: "8px",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                color: "#93c5fd",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                margin: 0
              }}>
                {EXAMPLE_PASTE_TEXT}
              </pre>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={handleCopyExample}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    background: copiedExample ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.15)",
                    color: copiedExample ? "#34d399" : "#60a5fa",
                    border: copiedExample ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(59, 130, 246, 0.35)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  {copiedExample ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedExample ? "已复制" : "复制示例内容"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowExampleModal(false)}
                  style={{
                    padding: "0.55rem 1.3rem",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    color: "#fff",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal: OCR Chatbot Prompt (rendered directly into document.body via Portal) */}
        {showOcrPromptModal && createPortal(
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem"
          }}>
            <div
              className="glass-panel animate-fade-in"
              style={{
                width: "100%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "1.75rem",
                background: "#111827",
                border: "1px solid rgba(168, 85, 247, 0.45)",
                borderRadius: "12px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#f8fafc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>💬 AI 助手提示词 (Prompt)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowOcrPromptModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                错题照片发给 AI 助手时，可搭配复制发送以下提示词，即可直接拿到标准的“原题 + 学生错答”文本：
              </p>

              <pre style={{
                background: "#0a0f1d",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                padding: "1rem",
                borderRadius: "8px",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                color: "#d8b4fe",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                margin: 0
              }}>
                {OCR_EXTRACTION_PROMPT}
              </pre>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={handleCopyOcrPrompt}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    background: copiedOcrPrompt ? "rgba(16, 185, 129, 0.2)" : "rgba(168, 85, 247, 0.18)",
                    color: copiedOcrPrompt ? "#34d399" : "#c084fc",
                    border: copiedOcrPrompt ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(168, 85, 247, 0.4)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  {copiedOcrPrompt ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedOcrPrompt ? "已复制" : "一键复制提示词"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOcrPromptModal(false)}
                  style={{
                    padding: "0.55rem 1.3rem",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, #a855f7, #7e22ce)",
                    color: "#fff",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Action row under paste textarea */}
        <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            onClick={handleSplitQuestions}
            disabled={isSplitting || isAnalyzing}
            style={{
              padding: "0.7rem 1.4rem",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              fontWeight: 600,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <Sparkles size={16} />
            {isSplitting ? "正在识别题目列表中..." : "一键识别题目列表"}
          </button>
        </div>

        {/* Parsed Candidates Selection Table */}
        {parsedCandidates.length > 0 && (
          <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  📋 识别出 {parsedCandidates.length} 道错题（请勾选待剖析题目）：
                </span>
                <button
                  onClick={selectAllCandidates}
                  style={{ background: "transparent", color: "#60a5fa", fontSize: "0.85rem", textDecoration: "underline" }}
                >
                  {selectedCandidateIndices.length === parsedCandidates.length ? "取消全选" : "全选"}
                </button>
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                已选 <strong style={{ color: "#10b981" }}>{selectedCandidateIndices.length}</strong> 题 ·
                预计耗费 <strong>{selectedCandidateIndices.length}</strong> / {quota.remaining} 今日额度
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.2rem" }}>
              {parsedCandidates.map((cand, cIdx) => {
                const isSelected = selectedCandidateIndices.includes(cIdx);
                return (
                  <div
                    key={cIdx}
                    onClick={() => toggleCandidateSelection(cIdx)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      padding: "0.9rem",
                      borderRadius: "8px",
                      background: isSelected ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${isSelected ? "rgba(59, 130, 246, 0.4)" : "var(--border-color)"}`,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ marginTop: "0.25rem", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1, fontSize: "0.9rem", lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                        <span style={{ color: "#60a5fa", marginRight: "0.5rem" }}>第 {cIdx + 1} 题:</span>
                        {cand.stem}
                      </div>
                      {cand.options && cand.options.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "0.4rem 0 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {cand.options.map((opt: string, optIdx: number) => (
                            <span key={optIdx} style={{ background: "rgba(255, 255, 255, 0.05)", padding: "0.15rem 0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: "0.85rem", color: "#f87171" }}>
                        学生错答: <strong>{cand.user_answer || "（未检测到显式错答）"}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mobile-toolbar-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignSelf: "center", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  适用学段年级 <span style={{ color: "#ef4444" }}>*</span>:
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => handleGradeChange(parseInt(e.target.value, 10))}
                  style={{ fontWeight: 600, color: "#60a5fa" }}
                >
                  <optgroup label="小学部 (Primary)">
                    <option value={1}>小学一年级 (Grade 1)</option>
                    <option value={2}>小学二年级 (Grade 2)</option>
                    <option value={3}>小学三年级 (Grade 3)</option>
                    <option value={4}>小学四年级 (Grade 4)</option>
                    <option value={5}>小学五年级 (Grade 5)</option>
                    <option value={6}>小学六年级 (Grade 6)</option>
                  </optgroup>
                  <optgroup label="初中部 (Junior High)">
                    <option value={7}>七年级 / 初一 (Grade 7)</option>
                    <option value={8}>八年级 / 初二 (Grade 8)</option>
                    <option value={9}>九年级 / 初三 (Grade 9)</option>
                  </optgroup>
                </select>
              </div>

              <button
                onClick={handleOpenAnalyzeModal}
                disabled={isAnalyzing || selectedCandidateIndices.length === 0}
                style={{
                  padding: "0.75rem 1.6rem",
                  background: selectedCandidateIndices.length === 0 ? "rgba(255, 255, 255, 0.1)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#fff",
                  fontWeight: 600,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "auto"
                }}
              >
                <Sparkles size={16} />
                {isAnalyzing
                  ? "正在深度剖析错题中..."
                  : `开始深度悟道剖析 (选中的 ${selectedCandidateIndices.length} 道)`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grade Confirmation Modal */}
      {showGradeModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem"
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "440px", padding: "1.75rem", background: "#111827", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🎯 确认年级
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.2rem" }}>
              将对选中的 <strong>{selectedCandidateIndices.length}</strong> 道错题进行深度剖析。题目难度和变式题将按此年级定级：
            </p>

            <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.25)", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                选择或调整目标年级：
              </div>
              <select
                value={selectedGrade}
                onChange={(e) => handleGradeChange(parseInt(e.target.value, 10))}
                style={{ width: "100%", fontWeight: 600, fontSize: "1rem", color: "#60a5fa" }}
              >
                <optgroup label="小学部 (Primary)">
                  <option value={1}>小学一年级 (Grade 1)</option>
                  <option value={2}>小学二年级 (Grade 2)</option>
                  <option value={3}>小学三年级 (Grade 3)</option>
                  <option value={4}>小学四年级 (Grade 4)</option>
                  <option value={5}>小学五年级 (Grade 5)</option>
                  <option value={6}>小学六年级 (Grade 6)</option>
                </optgroup>
                <optgroup label="初中部 (Junior High)">
                  <option value={7}>七年级 / 初一 (Grade 7)</option>
                  <option value={8}>八年级 / 初二 (Grade 8)</option>
                  <option value={9}>九年级 / 初三 (Grade 9)</option>
                </optgroup>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setShowGradeModal(false)}
                style={{
                  padding: "0.6rem 1.1rem",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--text-secondary)",
                  fontWeight: 500
                }}
              >
                取消
              </button>
              <button
                onClick={doConfirmAnalyze}
                style={{
                  padding: "0.6rem 1.3rem",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#fff",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <Sparkles size={16} />
                确认并开始分析 ({selectedCandidateIndices.length}题)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results Cards */}
      {batchAnalyses.map((item, bIdx) => (
        <div key={bIdx} className="glass-panel animate-fade-in" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Tag Banner */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", borderRadius: "4px", fontWeight: 600 }}>
                学科: {item.analysis.subject_cn || item.analysis.subject || "数学"}
              </span>
              <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", borderRadius: "4px" }}>
                章节: {item.analysis.chapter}
              </span>
              <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderRadius: "4px" }}>
                主因归类: {item.analysis.error_type}
              </span>
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              建议定级: <strong>{item.analysis.grade_suggested} 年级</strong>
            </div>
          </div>

          {/* Question & Answers Comparison */}
          <div style={{ background: "rgba(15, 23, 42, 0.4)", borderRadius: "10px", padding: "1.2rem", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.75rem", lineHeight: 1.6 }}>
              {item.stem}
            </div>
            {item.options && item.options.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                {item.options.map((opt: string, optIdx: number) => (
                  <span key={optIdx} style={{ background: "rgba(255, 255, 255, 0.05)", padding: "0.2rem 0.6rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                    {opt}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#f87171" }}>
                <span>❌ 学生错答:</span>
                <strong>{item.user_answer}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#34d399" }}>
                <span>✅ 标准正解:</span>
                <strong>{item.analysis.correct_answer}</strong>
              </div>
            </div>
          </div>

          {/* Root Cause & Wistake Rule */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "10px", padding: "1.2rem" }}>
              <h4 style={{ color: "#f87171", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                🔍 为什么会做错？（错因透视）
              </h4>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#fecaca" }}>
                {item.analysis.root_cause}
              </p>
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "1.2rem" }}>
              <h4 style={{ color: "#34d399", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                💡 Wistake 悟道点（避坑法则）
              </h4>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#a7f3d0" }}>
                {item.analysis.avoid_rule}
              </p>
            </div>
          </div>

          {/* Stepper Steps */}
          {item.analysis.steps && item.analysis.steps.length > 0 && (
            <div style={{ padding: "1.2rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#93c5fd" }}>
                🪜 严谨解析步骤
              </h4>
              <ol style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                {item.analysis.steps.map((st: string, sidx: number) => (
                  <li key={sidx} style={{ lineHeight: 1.6 }}>{st}</li>
                ))}
              </ol>
            </div>
          )}

          {/* 3 Sibling Targeted Practice Set */}
          <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#34d399", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={18} />
              同考点变式练习（3道递进巩固题）
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {item.analysis.siblings.map((sib: any, sIdx: number) => {
                const isPracticing = activePracticeIndices.includes(sIdx);
                const currentAnswer = practiceAnswers[sIdx] || "";
                const currentFeedback = practiceFeedbacks[sIdx];
                return (
                  <div
                    key={sIdx}
                    style={{
                      background: isPracticing ? "rgba(59, 130, 246, 0.08)" : "rgba(15, 23, 42, 0.3)",
                      border: `1px solid ${isPracticing ? "rgba(59, 130, 246, 0.3)" : "var(--border-color)"}`,
                      borderRadius: "10px",
                      padding: "1.2rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255, 255, 255, 0.06)", color: "var(--text-secondary)" }}>
                        {sib.role === "mirror" || sib.type === "mirror" || sIdx === 0
                          ? "① 镜像孪生题"
                          : sib.role === "variant" || sib.type === "variant" || sIdx === 1
                          ? "② 变式拓展题"
                          : "③ 挑战拔高题"}
                      </span>
                      {!isPracticing && (
                        <button
                          onClick={() => {
                            setActivePracticeIndices((prev) => [...prev, sIdx]);
                            setPracticeAnswers((prev) => ({ ...prev, [sIdx]: "" }));
                            setPracticeFeedbacks((prev) => {
                              const copy = { ...prev };
                              delete copy[sIdx];
                              return copy;
                            });
                          }}
                          style={{
                            fontSize: "0.85rem",
                            padding: "0.3rem 0.8rem",
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#60a5fa",
                            borderRadius: "6px"
                          }}
                        >
                          在线挑战
                        </button>
                      )}
                    </div>

                  {(() => {
                    const { stem: cleanStem, options } = cleanQuestionStemAndOptions(sib.stem || sib.question, sib.options);
                    return (
                      <>
                        {/* Clean Question Text without inline options */}
                        <div style={{ fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "0.75rem", fontWeight: 500 }}>
                          {cleanStem}
                        </div>

                        {/* Options: Clickable selection */}
                        {options.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            {options.map((opt: string, oIdx: number) => {
                              const isSelected = isPracticing && currentAnswer === opt;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => {
                                    if (!isPracticing) {
                                      setActivePracticeIndices((prev) => [...prev, sIdx]);
                                    }
                                    setPracticeAnswers((prev) => ({ ...prev, [sIdx]: opt }));
                                    checkPractice(sib, sIdx, opt);
                                  }}
                                  style={{
                                    textAlign: "left",
                                    padding: "0.6rem 0.9rem",
                                    borderRadius: "6px",
                                    fontSize: "0.9rem",
                                    lineHeight: 1.5,
                                    border: isSelected
                                      ? "1px solid #3b82f6"
                                      : "1px solid rgba(255, 255, 255, 0.1)",
                                    background: isSelected
                                      ? "rgba(59, 130, 246, 0.2)"
                                      : "rgba(255, 255, 255, 0.03)",
                                    color: isSelected ? "#93c5fd" : "var(--text-primary)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  <span>{opt}</span>
                                  {isSelected && <Check size={16} color="#60a5fa" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : isPracticing ? (
                          <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input
                                type="text"
                                placeholder="输入你的答案..."
                                value={currentAnswer}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPracticeAnswers((prev) => ({ ...prev, [sIdx]: val }));
                                }}
                                style={{ flex: 1 }}
                              />
                              <button
                                onClick={() => checkPractice(sib, sIdx)}
                                style={{
                                  padding: "0.5rem 1.2rem",
                                  background: "#10b981",
                                  color: "#fff",
                                  fontWeight: 600,
                                  borderRadius: "8px"
                                }}
                              >
                                提交核对
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {currentFeedback && isPracticing && (
                          <div
                            style={{
                              marginTop: "0.75rem",
                              padding: "0.8rem",
                              borderRadius: "8px",
                              background: currentFeedback.isCorrect ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: currentFeedback.isCorrect ? "#6ee7b7" : "#fca5a5",
                              fontSize: "0.9rem"
                            }}
                          >
                            {currentFeedback.msg}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
