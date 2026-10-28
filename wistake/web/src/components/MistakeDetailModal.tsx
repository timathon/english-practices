import React, { useState, useEffect } from "react";
import { BrainCircuit, CheckCircle2, X, Layers, BookOpen, ChevronDown, ChevronRight, Dices } from "lucide-react";
import { cleanQuestionStemAndOptions } from "../types";
import { apiRequest } from "../api";
import { instantiateQuestion } from "../lib/paramGenerator";

interface MistakeDetailModalProps {
  detail: any;
  onClose: () => void;
  onFlipStatus: (id: string, isFlipped: boolean) => void;
  onPracticeSuccess?: () => void;
}

export const MistakeDetailModal: React.FC<MistakeDetailModalProps> = ({
  detail,
  onClose,
  onFlipStatus,
  onPracticeSuccess
}) => {
  const [activePracticeIndices, setActivePracticeIndices] = useState<number[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceFeedbacks, setPracticeFeedbacks] = useState<Record<number, { isCorrect: boolean; msg: string }>>({});
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<number, string[]>>({});
  const [generatedInstancesMap, setGeneratedInstancesMap] = useState<Record<number, { stem: string; options?: string[]; answerValues: string[] }>>({});
  const [isOriginalOpen, setIsOriginalOpen] = useState<boolean>(true);
  const [isPracticeOpen, setIsPracticeOpen] = useState<boolean>(false);

  // Reset all practice state whenever a new mistake is viewed or closed
  useEffect(() => {
    setActivePracticeIndices([]);
    setPracticeAnswers({});
    setPracticeFeedbacks({});
    setShuffledOptionsMap({});
    setIsOriginalOpen(true);
    setIsPracticeOpen(false);

    // Initialize parametric questions
    const sibs = (detail?.questions || []).filter((q: any) => q.role !== "original");
    const initialGenerated: Record<number, { stem: string; options?: string[]; answerValues: string[] }> = {};
    sibs.forEach((sib: any, idx: number) => {
      if (sib.generator && sib.generator.type === "parametric") {
        try {
          initialGenerated[idx] = instantiateQuestion(sib.generator);
        } catch (err) {
          console.warn("Failed to instantiate question for sib", idx, err);
        }
      }
    });
    setGeneratedInstancesMap(initialGenerated);
  }, [detail?.mistake?.id]);

  const handleRerollQuestion = (sIdx: number, generatorSpec: any) => {
    const inst = instantiateQuestion(generatorSpec);
    setGeneratedInstancesMap((prev) => ({ ...prev, [sIdx]: inst }));
    setPracticeAnswers((prev) => {
      const copy = { ...prev };
      delete copy[sIdx];
      return copy;
    });
    setPracticeFeedbacks((prev) => {
      const copy = { ...prev };
      delete copy[sIdx];
      return copy;
    });
    if (inst.options && inst.options.length > 0) {
      const shuffled = [...inst.options].sort(() => Math.random() - 0.5);
      setShuffledOptionsMap((prev) => ({ ...prev, [sIdx]: shuffled }));
    }
  };

  if (!detail) return null;

  const origQ = detail.questions?.find((q: any) => q.role === "original") || detail.questions?.[0];
  const ans = detail.analysis;

  const originalParsed = cleanQuestionStemAndOptions(origQ?.stem, origQ?.options);

  const checkPractice = (question: any, sIdx: number, chosenAnswer?: string) => {
    const finalAnswer = (chosenAnswer !== undefined ? chosenAnswer : practiceAnswers[sIdx] || "").trim();
    if (!finalAnswer) return;

    const cleanUser = finalAnswer.toLowerCase();
    const generated = generatedInstancesMap[sIdx];
    // question.answer might be an object { values: [...] } or a plain string
    const correctVals: string[] = generated?.answerValues && generated.answerValues.length > 0
      ? generated.answerValues
      : Array.isArray(question.answer?.values)
      ? question.answer.values
      : typeof question.answer === "string"
      ? [question.answer]
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

    setPracticeFeedbacks((prev) => ({
      ...prev,
      [sIdx]: {
        isCorrect,
        msg: isCorrect
          ? "🎉 太棒了，完全正确！悟道成功！"
          : "❌ 答案不太对哦，请再仔细算一算！"
      }
    }));

    // Record attempt to update last_reviewed_at and review_count in DB
    if (detail.mistake?.id) {
      apiRequest("/api/attempts", {
        method: "POST",
        body: JSON.stringify({
          mistake_id: detail.mistake.id,
          question_id: question.id,
          response: finalAnswer,
          is_correct: isCorrect
        })
      })
        .then(() => {
          if (detail.mistake) {
            detail.mistake.last_reviewed_at = new Date().toISOString();
            detail.mistake.review_count = (detail.mistake.review_count || 0) + 1;
          }
          if (onPracticeSuccess) {
            onPracticeSuccess();
          }
        })
        .catch((err) => {
          console.error("Failed to record practice attempt:", err);
        });
    }
  };

  return (
    <div className="mobile-full-viewport-modal-wrapper" style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.75)",
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
          maxWidth: "800px",
          maxHeight: "90vh",
          background: "#0d1321",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Fixed Modal Header */}
        <div
          className="modal-header-compact"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-color)",
            padding: "1.2rem 1.5rem",
            background: "rgba(13, 19, 33, 0.95)",
            backdropFilter: "blur(8px)",
            flexShrink: 0,
            flexWrap: "wrap",
            gap: "0.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <BrainCircuit size={22} color="#60a5fa" />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
              错题深度悟道档案
            </h3>
            <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", borderRadius: "4px" }}>
              {detail.mistake?.chapter} · {detail.mistake?.grade}年级
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => onFlipStatus(detail.mistake?.id, detail.mistake?.state === "flipped")}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: detail.mistake?.state === "flipped" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                color: detail.mistake?.state === "flipped" ? "#34d399" : "var(--text-secondary)",
                border: `1px solid ${detail.mistake?.state === "flipped" ? "#10b981" : "var(--border-color)"}`
              }}
            >
              <CheckCircle2 size={16} />
              {detail.mistake?.state === "flipped" ? "已悟道 (点击取消)" : "标记为已悟道 (M→W)"}
            </button>

            <button
              onClick={onClose}
              style={{ background: "transparent", color: "var(--text-muted)", padding: "0.3rem" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

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
          {/* 原题及解析 Enclosure */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: "12px",
              padding: "1.2rem",
              display: "flex",
              flexDirection: "column",
              gap: isOriginalOpen ? "1.2rem" : "0"
            }}
          >
            <div
              onClick={() => setIsOriginalOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <h4
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#60a5fa",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  margin: 0
                }}
              >
                <BookOpen size={18} />
                原题及解析
              </h4>
              <div style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                {isOriginalOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>

            {isOriginalOpen && (
              <>
                {/* Original Question & Answers */}
                <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", padding: "1.2rem", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.6rem", lineHeight: 1.6 }}>
                    {originalParsed.stem}
                  </div>

                  {originalParsed.options && originalParsed.options.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                      {originalParsed.options.map((opt: string, optIdx: number) => (
                        <span key={optIdx} style={{ background: "rgba(255, 255, 255, 0.05)", padding: "0.2rem 0.6rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#f87171" }}>
                      <span>❌ 学生错答:</span>
                      <strong>{ans?.user_answer || "（无）"}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#34d399" }}>
                      <span>✅ 标准正解:</span>
                      <strong>{ans?.correct_answer}</strong>
                    </div>
                  </div>
                </div>

                {/* Root Cause & Wistake Rule */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                  <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "10px", padding: "1.2rem" }}>
                    <h4 style={{ color: "#f87171", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                      🔍 错因透视
                    </h4>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#fecaca", margin: 0 }}>
                      {ans?.root_cause}
                    </p>
                  </div>

                  <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "1.2rem" }}>
                    <h4 style={{ color: "#34d399", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                      💡 Wistake 悟道点（避坑法则）
                    </h4>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#a7f3d0", margin: 0 }}>
                      {ans?.avoid_rule}
                    </p>
                  </div>
                </div>

                {/* Analysis Steps */}
                {ans?.steps && ans.steps.length > 0 && (
                  <div style={{ padding: "1.2rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#93c5fd" }}>
                      🪜 严谨解析步骤
                    </h4>
                    <ol style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                      {ans.steps.map((st: string, sidx: number) => (
                        <li key={sidx} style={{ lineHeight: 1.6 }}>{st}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sibling questions practice */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px solid rgba(52, 211, 153, 0.25)",
              borderRadius: "12px",
              padding: "1.2rem",
              display: "flex",
              flexDirection: "column",
              gap: isPracticeOpen ? "1rem" : "0"
            }}
          >
            <div
              onClick={() => setIsPracticeOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#34d399", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={18} />
                变式练习与复习巩固（3道挑战题）
              </h4>
              <div style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                {isPracticeOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>

            {isPracticeOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "0.5rem" }}>
                {detail.questions
                  ?.filter((q: any) => q.role !== "original")
                  .map((sib: any, sIdx: number) => {
                const generated = generatedInstancesMap[sIdx];
                const effectiveStem = generated?.stem || sib.stem;
                const effectiveOptions = generated?.options || sib.options;

                const isPracticing = activePracticeIndices.includes(sIdx);
                const currentAnswer = practiceAnswers[sIdx] || "";
                const currentFeedback = practiceFeedbacks[sIdx];

                const { stem: cleanStem, options: rawOptions } = cleanQuestionStemAndOptions(effectiveStem, effectiveOptions);
                const hasOptions = rawOptions.length > 0;
                const displayOptions = shuffledOptionsMap[sIdx] || rawOptions;
                const isParametric = sib.generator && sib.generator.type === "parametric";

                return (
                  <div
                    key={sib.id || sIdx}
                    style={{
                      background: isPracticing ? "rgba(59, 130, 246, 0.08)" : "rgba(15, 23, 42, 0.3)",
                      border: `1px solid ${isPracticing ? "rgba(59, 130, 246, 0.3)" : "var(--border-color)"}`,
                      borderRadius: "8px",
                      padding: "1rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255, 255, 255, 0.06)", color: "var(--text-secondary)" }}>
                          {sib.role === "mirror" ? "① 镜像孪生题" : sib.role === "variant" ? "② 变式拓展题" : "③ 挑战拔高题"}
                        </span>
                        {isParametric && (
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
                            // Shuffle options on click for MCQ questions
                            if (rawOptions.length > 0) {
                              const shuffled = [...rawOptions].sort(() => Math.random() - 0.5);
                              setShuffledOptionsMap((prev) => ({ ...prev, [sIdx]: shuffled }));
                            }
                          }}
                          style={{
                            fontSize: "0.85rem",
                            padding: "0.3rem 0.8rem",
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#60a5fa",
                            borderRadius: "6px"
                          }}
                        >
                          在线重练
                        </button>
                      )}
                    </div>

                    {/* Question text only without inline options */}
                    <div style={{ fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "0.75rem", fontWeight: 500 }}>
                      {cleanStem}
                    </div>

                    {/* Interactive practice area: only shown after clicking '在线重练' */}
                    {isPracticing && (
                      <div style={{ marginTop: "0.5rem" }}>
                        {hasOptions ? (
                          /* Options list: rendered as clickable selection buttons */
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            {displayOptions.map((opt: string, oIdx: number) => {
                              const isSelected = currentAnswer === opt;
                              const hasChecked = !!currentFeedback;
                              const isCorrect = currentFeedback?.isCorrect;

                              // Compute border, background, and text color based on checked status
                              let border = "1px solid rgba(255, 255, 255, 0.1)";
                              let background = "rgba(255, 255, 255, 0.03)";
                              let color = "var(--text-primary)";

                              if (isSelected) {
                                if (hasChecked) {
                                  if (isCorrect) {
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
                                    disabled={currentFeedback?.isCorrect}
                                    onClick={() => {
                                      if (currentFeedback?.isCorrect) return;
                                      setPracticeAnswers((prev) => ({ ...prev, [sIdx]: opt }));
                                      if (currentFeedback) {
                                        setPracticeFeedbacks((prev) => {
                                          const copy = { ...prev };
                                          delete copy[sIdx];
                                          return copy;
                                        });
                                      }
                                    }}
                                    style={{
                                      textAlign: "left",
                                      padding: "0.6rem 0.9rem",
                                      borderRadius: "6px",
                                      fontSize: "0.9rem",
                                      lineHeight: 1.5,
                                      border,
                                      background,
                                      color,
                                      cursor: currentFeedback?.isCorrect ? "default" : "pointer",
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

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.3rem" }}>
                              <button
                                type="button"
                                onClick={() => checkPractice(sib, sIdx)}
                                disabled={!currentAnswer || currentFeedback?.isCorrect}
                                style={{
                                  padding: "0.45rem 1.2rem",
                                  background: currentFeedback?.isCorrect
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : currentAnswer
                                    ? "#10b981"
                                    : "rgba(255, 255, 255, 0.08)",
                                  color: currentFeedback?.isCorrect
                                    ? "#34d399"
                                    : currentAnswer
                                    ? "#fff"
                                    : "var(--text-muted)",
                                  border: currentFeedback?.isCorrect
                                    ? "1px solid rgba(16, 185, 129, 0.3)"
                                    : "none",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                  borderRadius: "6px",
                                  cursor: !currentAnswer || currentFeedback?.isCorrect ? "not-allowed" : "pointer",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                {currentFeedback?.isCorrect ? "✓ 回答正确" : "提交核对"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Fallback input for open-ended questions without options */
                          <div style={{ marginTop: "0.75rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input
                                type="text"
                                placeholder="输入你的答案..."
                                value={currentAnswer}
                                disabled={currentFeedback?.isCorrect}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPracticeAnswers((prev) => ({ ...prev, [sIdx]: val }));
                                }}
                                style={{ flex: 1 }}
                              />
                              <button
                                onClick={() => checkPractice(sib, sIdx)}
                                disabled={!currentAnswer.trim() || currentFeedback?.isCorrect}
                                style={{
                                  padding: "0.5rem 1.2rem",
                                  background: currentFeedback?.isCorrect
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : currentAnswer.trim()
                                    ? "#10b981"
                                    : "rgba(255, 255, 255, 0.08)",
                                  color: currentFeedback?.isCorrect
                                    ? "#34d399"
                                    : currentAnswer.trim()
                                    ? "#fff"
                                    : "var(--text-muted)",
                                  border: currentFeedback?.isCorrect
                                    ? "1px solid rgba(16, 185, 129, 0.3)"
                                    : "none",
                                  fontWeight: 600,
                                  borderRadius: "8px",
                                  cursor: !currentAnswer.trim() || currentFeedback?.isCorrect ? "not-allowed" : "pointer"
                                }}
                              >
                                {currentFeedback?.isCorrect ? "✓ 回答正确" : "提交核对"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Instant Feedback */}
                    {isPracticing && currentFeedback && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.8rem",
                          borderRadius: "8px",
                          background: currentFeedback.isCorrect ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: currentFeedback.isCorrect ? "#6ee7b7" : "#fca5a5",
                          fontSize: "0.9rem",
                          lineHeight: 1.5
                        }}
                      >
                        {currentFeedback.msg}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
