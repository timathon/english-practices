import React, { useState, useEffect } from "react";
import { PlayCircle, X, Layers, CheckCircle, ChevronLeft, ChevronRight, AlertCircle, Dices } from "lucide-react";
import { cleanQuestionStemAndOptions } from "../types";
import { apiRequest } from "../api";
import { instantiateQuestion } from "../lib/paramGenerator";

interface BatchPracticeItem {
  mistake: any;
  questions: any[];
  analysis: any;
}

interface BatchReviewModalProps {
  queue: BatchPracticeItem[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export const BatchReviewModal: React.FC<BatchReviewModalProps> = ({
  queue,
  currentIndex,
  onPrev,
  onNext,
  onClose
}) => {
  const currentItem = queue[currentIndex];
  const isLast = currentIndex === queue.length - 1;

  // Session-wide cache keyed by mistakeId: { answers, feedbacks, isSubmitted, shuffledOptions, generatedInstances }
  const [sessionMistakeState, setSessionMistakeState] = useState<
    Record<
      string,
      {
        answers: Record<number, string>;
        feedbacks: Record<number, { isCorrect: boolean; msg: string; expected: string }>;
        isSubmitted: boolean;
        shuffledOptionsMap: Record<number, string[]>;
        generatedInstancesMap: Record<number, { stem: string; options?: string[]; answerValues: string[] }>;
      }
    >
  >({});

  const mistakeKey = currentItem?.mistake?.id || `idx_${currentIndex}`;
  const currentState = sessionMistakeState[mistakeKey] || {
    answers: {},
    feedbacks: {},
    isSubmitted: false,
    shuffledOptionsMap: {},
    generatedInstancesMap: {}
  };

  const { answers, feedbacks, isSubmitted, shuffledOptionsMap, generatedInstancesMap } = currentState;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Initialize questions (including parametric generation and option shuffling)
  useEffect(() => {
    if (!currentItem?.mistake?.id) return;
    const key = currentItem.mistake.id;
    setSessionMistakeState((prev) => {
      if (prev[key]) return prev; // already initialized, keep answers and state
      const sibs = (currentItem.questions || []).filter((q: any) => q.role !== "original");
      const newShuffled: Record<number, string[]> = {};
      const newGenerated: Record<number, { stem: string; options?: string[]; answerValues: string[] }> = {};

      sibs.forEach((sib: any, idx: number) => {
        if (sib.generator && sib.generator.type === "parametric") {
          const inst = instantiateQuestion(sib.generator);
          newGenerated[idx] = inst;
          if (inst.options && inst.options.length > 0) {
            newShuffled[idx] = [...inst.options].sort(() => Math.random() - 0.5);
          }
        } else {
          const { options } = cleanQuestionStemAndOptions(sib.stem, sib.options);
          if (options && options.length > 0) {
            newShuffled[idx] = [...options].sort(() => Math.random() - 0.5);
          }
        }
      });

      return {
        ...prev,
        [key]: {
          answers: {},
          feedbacks: {},
          isSubmitted: false,
          shuffledOptionsMap: newShuffled,
          generatedInstancesMap: newGenerated
        }
      };
    });
  }, [currentIndex, currentItem?.mistake?.id]);

  // Reroll single parametric question
  const handleRerollQuestion = (sIdx: number, generatorSpec: any) => {
    if (isSubmitted) return;
    const inst = instantiateQuestion(generatorSpec);
    const newShuffled = inst.options ? [...inst.options].sort(() => Math.random() - 0.5) : undefined;

    setSessionMistakeState((prev) => {
      const existing = prev[mistakeKey] || {
        answers: {},
        feedbacks: {},
        isSubmitted: false,
        shuffledOptionsMap: {},
        generatedInstancesMap: {}
      };
      const updatedAnswers = { ...existing.answers };
      delete updatedAnswers[sIdx];

      return {
        ...prev,
        [mistakeKey]: {
          ...existing,
          answers: updatedAnswers,
          generatedInstancesMap: {
            ...existing.generatedInstancesMap,
            [sIdx]: inst
          },
          shuffledOptionsMap: newShuffled ? {
            ...existing.shuffledOptionsMap,
            [sIdx]: newShuffled
          } : existing.shuffledOptionsMap
        }
      };
    });
  };

  if (!currentItem) return null;

  const origQ = currentItem.questions?.find((q: any) => q.role === "original") || currentItem.questions?.[0];
  const siblings = currentItem.questions?.filter((q: any) => q.role !== "original") || [];
  const ans = currentItem.analysis;
  const originalParsed = cleanQuestionStemAndOptions(origQ?.stem, origQ?.options);

  // Check whether all questions have answers filled
  const allAnswered = siblings.length > 0 && siblings.every((_, idx) => !!answers[idx]?.trim());

  const handleUpdateAnswer = (sIdx: number, val: string) => {
    if (isSubmitted) return;
    setSessionMistakeState((prev) => {
      const existing = prev[mistakeKey] || {
        answers: {},
        feedbacks: {},
        isSubmitted: false,
        shuffledOptionsMap: {}
      };
      return {
        ...prev,
        [mistakeKey]: {
          ...existing,
          answers: { ...existing.answers, [sIdx]: val }
        }
      };
    });
  };

  const handleCheckAll = async () => {
    if (!allAnswered || isSubmitted || isSubmitting) return;
    setIsSubmitting(true);

    const newFeedbacks: Record<number, { isCorrect: boolean; msg: string; expected: string }> = {};

    siblings.forEach((sib: any, idx: number) => {
      const userAns = (answers[idx] || "").trim();
      const cleanUser = userAns.toLowerCase();

      const generated = generatedInstancesMap[idx];
      const correctVals: string[] = generated?.answerValues && generated.answerValues.length > 0
        ? generated.answerValues
        : Array.isArray(sib.answer?.values)
        ? sib.answer.values
        : typeof sib.answer === "string"
        ? [sib.answer]
        : [];

      const isCorrect = correctVals.some((v) => {
        const c = v.trim().toLowerCase();
        return (
          c === cleanUser ||
          c.includes(cleanUser) ||
          cleanUser.includes(c) ||
          (cleanUser.length === 1 && c.startsWith(cleanUser))
        );
      });

      const displayExpected = correctVals.length > 0 ? correctVals[0] : sib.answer || "正确答案";

      newFeedbacks[idx] = {
        isCorrect,
        expected: displayExpected,
        msg: isCorrect
          ? "🎉 回答正确！此题已攻克！"
          : `❌ 答案不太对哦。正确答案是【${displayExpected}】。`
      };

      // Record attempt in database
      if (currentItem.mistake?.id) {
        apiRequest("/api/attempts", {
          method: "POST",
          body: JSON.stringify({
            mistake_id: currentItem.mistake.id,
            question_id: sib.id,
            response: userAns,
            is_correct: isCorrect
          })
        }).catch((err) => {
          console.error("Failed to record attempt in batch:", err);
        });
      }
    });

    setSessionMistakeState((prev) => {
      const existing = prev[mistakeKey] || {
        answers: {},
        feedbacks: {},
        isSubmitted: false,
        shuffledOptionsMap: {}
      };
      return {
        ...prev,
        [mistakeKey]: {
          ...existing,
          feedbacks: newFeedbacks,
          isSubmitted: true
        }
      };
    });
    setIsSubmitting(false);
  };

  return (
    <div className="mobile-full-viewport-modal-wrapper" style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.85)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: "1rem"
    }}>
      <div
        className="glass-panel animate-fade-in responsive-modal-inner mobile-full-viewport-modal-inner"
        style={{
          width: "100%",
          maxWidth: "840px",
          maxHeight: "90vh",
          background: "#0d1321",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Fixed Header */}
        <div
          className="modal-header-compact"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-color)",
            padding: "1rem 1.25rem",
            background: "rgba(13, 19, 33, 0.95)",
            backdropFilter: "blur(8px)",
            flexShrink: 0,
            gap: "0.5rem"
          }}
        >
          {/* Left Title & Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlayCircle size={20} color="#10b981" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, whiteSpace: "nowrap" }}>
              批量刷题
            </h3>
            {/* Desktop progress pill */}
            <span
              className="batch-header-desktop"
              style={{
                fontSize: "0.8rem",
                padding: "0.15rem 0.55rem",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
                borderRadius: "9999px",
                fontWeight: 600,
                whiteSpace: "nowrap"
              }}
            >
              进度: {currentIndex + 1} / {queue.length}
            </span>
            {/* Mobile minimal progress tag */}
            <span
              className="batch-header-mobile"
              style={{
                fontSize: "0.75rem",
                padding: "0.1rem 0.45rem",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
                borderRadius: "9999px",
                fontWeight: 700,
                whiteSpace: "nowrap"
              }}
            >
              {currentIndex + 1}/{queue.length}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {/* Desktop Navigation Buttons */}
            <div className="batch-header-desktop" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={onPrev}
                disabled={currentIndex === 0}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: currentIndex === 0 ? "var(--text-muted)" : "#fff",
                  border: "none",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer"
                }}
              >
                ← 上一题
              </button>

              <button
                onClick={onNext}
                disabled={isLast}
                style={{
                  padding: "0.35rem 0.9rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: isLast ? "rgba(255, 255, 255, 0.08)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: isLast ? "var(--text-muted)" : "#fff",
                  border: "none",
                  cursor: isLast ? "not-allowed" : "pointer"
                }}
              >
                下一题 →
              </button>
            </div>

            {/* Mobile Minimal Navigation Icon Buttons */}
            <div className="batch-header-mobile" style={{ alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={onPrev}
                disabled={currentIndex === 0}
                title="上一题"
                style={{
                  padding: "0.4rem 0.8rem",
                  minWidth: "44px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: currentIndex === 0 ? "var(--text-muted)" : "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronLeft size={19} />
              </button>

              <button
                onClick={onNext}
                disabled={isLast}
                title="下一题"
                style={{
                  padding: "0.4rem 0.85rem",
                  minWidth: "44px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: isLast ? "rgba(255, 255, 255, 0.08)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: isLast ? "var(--text-muted)" : "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isLast ? "not-allowed" : "pointer"
                }}
              >
                <ChevronRight size={19} />
              </button>
            </div>

            <button
              onClick={() => setShowExitConfirm(true)}
              title="退出刷题"
              style={{ background: "transparent", color: "var(--text-muted)", padding: "0.35rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 120,
              padding: "1rem"
            }}
          >
            <div
              className="glass-panel animate-fade-in"
              style={{
                width: "100%",
                maxWidth: "360px",
                padding: "1.5rem",
                background: "#111827",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <AlertCircle size={22} color="#f87171" />
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                  确定要退出批量刷题吗？
                </h4>
              </div>

              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                当前题目的练习进度与未提交的答案可能会丢失。已核对提交的错题记录将保持更新。
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  确认退出
                </button>

                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  style={{
                    padding: "0.45rem 1.1rem",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)"
                  }}
                >
                  继续刷题
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div
          className="modal-inner-padding"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}
        >
          {/* Original Mistake Context */}
        <div style={{ background: "rgba(15, 23, 42, 0.5)", borderRadius: "10px", padding: "1.2rem", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.8rem", color: "#60a5fa", marginBottom: "0.4rem", fontWeight: 600 }}>
            原错题回顾 · {currentItem.mistake?.chapter}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem", lineHeight: 1.6 }}>
            {originalParsed.stem}
          </div>
          {originalParsed.options && originalParsed.options.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "0.4rem 0 0.75rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {originalParsed.options.map((opt: string, optIdx: number) => (
                <span key={optIdx} style={{ background: "rgba(255, 255, 255, 0.05)", padding: "0.2rem 0.6rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                  {opt}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: "0.85rem", color: "#34d399", background: "rgba(16, 185, 129, 0.08)", padding: "0.5rem 0.8rem", borderRadius: "6px" }}>
            💡 悟道法则：{ans?.avoid_rule || "审清题意，注意推理"}
          </div>
        </div>

        {/* Siblings Practice: Answer all 3 simultaneously */}
        <div>
          <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#34d399", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={18} />
            实战通关挑战（3道变式练习）
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {siblings.map((sib: any, sIdx: number) => {
              const generated = generatedInstancesMap[sIdx];
              const effectiveStem = generated?.stem || sib.stem;
              const effectiveOptions = generated?.options || sib.options;

              const { stem: cleanStem, options: rawOptions } = cleanQuestionStemAndOptions(effectiveStem, effectiveOptions);
              const displayOptions = shuffledOptionsMap[sIdx] || rawOptions;
              const hasOptions = displayOptions.length > 0;
              const currentAns = answers[sIdx] || "";
              const feedback = feedbacks[sIdx];
              const isParametric = sib.generator && sib.generator.type === "parametric";

              return (
                <div
                  key={sib.id || sIdx}
                  style={{
                    background: "rgba(15, 23, 42, 0.35)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "1.1rem"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255, 255, 255, 0.06)", color: "var(--text-secondary)" }}>
                        {sib.role === "mirror" ? "① 镜像孪生题" : sib.role === "variant" ? "② 变式拓展题" : "③ 挑战拔高题"}
                      </span>
                      {isParametric && !isSubmitted && (
                        <button
                          type="button"
                          onClick={() => handleRerollQuestion(sIdx, sib.generator)}
                          title="换一组随机数值重新练习"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.15rem 0.45rem",
                            fontSize: "0.75rem",
                            borderRadius: "4px",
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#60a5fa",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            cursor: "pointer"
                          }}
                        >
                          <Dices size={13} />
                          <span>换组数据</span>
                        </button>
                      )}
                    </div>
                    {feedback && (
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: feedback.isCorrect ? "#34d399" : "#f87171" }}>
                        {feedback.isCorrect ? "✓ 回答正确" : "❌ 答案错误"}
                      </span>
                    )}
                  </div>

                  {/* Clean Question Text */}
                  <div style={{ fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "0.8rem", fontWeight: 500 }}>
                    {cleanStem}
                  </div>

                  {/* Options: Clickable selection buttons */}
                  {hasOptions ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      {displayOptions.map((opt: string, oIdx: number) => {
                        const isSelected = currentAns === opt;

                        let border = "1px solid rgba(255, 255, 255, 0.1)";
                        let background = "rgba(255, 255, 255, 0.03)";
                        let color = "var(--text-primary)";

                        if (isSelected) {
                          if (isSubmitted && feedback) {
                            if (feedback.isCorrect) {
                              border = "1px solid #10b981";
                              background = "rgba(16, 185, 129, 0.2)";
                              color = "#34d399";
                            } else {
                              border = "1px solid #ef4444";
                              background = "rgba(239, 68, 68, 0.2)";
                              color = "#f87171";
                            }
                          } else {
                            border = "1px solid #3b82f6";
                            background = "rgba(59, 130, 246, 0.2)";
                            color = "#93c5fd";
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => handleUpdateAnswer(sIdx, opt)}
                            style={{
                              textAlign: "left",
                              padding: "0.6rem 0.9rem",
                              borderRadius: "6px",
                              fontSize: "0.9rem",
                              lineHeight: 1.5,
                              border,
                              background,
                              color,
                              cursor: isSubmitted ? "default" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Fallback input for open-ended */
                    <div style={{ marginTop: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="输入你的答案..."
                        value={currentAns}
                        disabled={isSubmitted}
                        onChange={(e) => handleUpdateAnswer(sIdx, e.target.value)}
                        style={{
                          width: "100%",
                          borderColor: isSubmitted && feedback
                            ? (feedback.isCorrect ? "#10b981" : "#ef4444")
                            : undefined
                        }}
                      />
                    </div>
                  )}

                  {/* If submitted and incorrect, show standard answer */}
                  {isSubmitted && feedback && !feedback.isCorrect && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "6px",
                        background: "rgba(239, 68, 68, 0.12)",
                        color: "#fca5a5",
                        fontSize: "0.85rem",
                        lineHeight: 1.5
                      }}
                    >
                      ❌ 你的回答未通过。标准正解是：<strong style={{ color: "#34d399" }}>{feedback.expected}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Single Check Button */}
          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleCheckAll}
              disabled={!allAnswered || isSubmitted || isSubmitting}
              style={{
                padding: "0.6rem 1.8rem",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 700,
                background: isSubmitted
                  ? "rgba(16, 185, 129, 0.15)"
                  : allAnswered
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "rgba(255, 255, 255, 0.08)",
                color: isSubmitted
                  ? "#34d399"
                  : allAnswered
                  ? "#fff"
                  : "var(--text-muted)",
                border: isSubmitted
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : "none",
                cursor: !allAnswered || isSubmitted || isSubmitting ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle size={17} />
                  已完成核对
                </>
              ) : isSubmitting ? (
                "正在核对..."
              ) : allAnswered ? (
                "提交核对 (全部3题)"
              ) : (
                `请先完成全部 3 道题目 (已答 ${Object.values(answers).filter(Boolean).length}/3)`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
