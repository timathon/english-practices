import React, { useState } from "react";
import { DiagSession, Question, Topic } from "../engine/types";
import { DiagGraph, nextQuestionItem, recordAnswer, summarizeSession } from "../engine/DiagEngine";
import { MathText } from "./MathText";
import { GeometryFigure } from "./GeometryFigure";
import { X, Check, ArrowRight, HelpCircle, AlertCircle, Sparkles } from "lucide-react";

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  graph: DiagGraph;
  initialSession: DiagSession;
  topicsById: Record<string, Topic>;
  onFinish: (summary: ReturnType<typeof summarizeSession>, session: DiagSession) => void;
}

export const DiagnosisModal: React.FC<DiagnosisModalProps> = ({
  isOpen,
  onClose,
  graph,
  initialSession,
  topicsById,
  onFinish
}) => {
  const [session, setSession] = useState<DiagSession>(initialSession);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [inputAnswer, setInputAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  // Sync state whenever a new session is launched from a section
  React.useEffect(() => {
    setSession(initialSession);
    setSelectedChoice(null);
    setInputAnswer("");
    setIsAnswered(false);
    setFeedback(null);
  }, [initialSession]);

  if (!isOpen) return null;

  const currentItem = nextQuestionItem(graph, session);

  if (!currentItem) {
    const summary = summarizeSession(graph, session);
    return (
      <div className="modal-overlay">
        <div className="diag-modal-card summary-card">
          <div className="summary-header">
            <Sparkles className="icon-sparkle" size={28} />
            <h2>自适应诊断测评完成</h2>
            <p>已根据答题表现精准定位掌握情况与潜在先修根因</p>
          </div>

          <div className="summary-stats-grid">
            <div className="stat-box stat-mastered">
              <span className="stat-number">{summary.mastered.length}</span>
              <span className="stat-name">完全掌握知识点</span>
            </div>
            <div className="stat-box stat-shaky">
              <span className="stat-number">{summary.shaky.length}</span>
              <span className="stat-name">不稳固点</span>
            </div>
            <div className="stat-box stat-weak">
              <span className="stat-number">{summary.weak.length}</span>
              <span className="stat-name">薄弱知识点</span>
            </div>
          </div>

          {summary.rootCauses.length > 0 && (
            <div className="root-cause-alert">
              <h4>🎯 薄弱根因定位</h4>
              <p>系统沿先修图链条追溯到以下基础知识点存在薄弱：</p>
              <ul>
                {summary.rootCauses.map((cid) => (
                  <li key={cid}>
                    <strong>{topicsById[cid]?.name || cid}</strong>
                    {topicsById[cid]?.chapter && ` (${topicsById[cid].chapter})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-done" onClick={() => onFinish(summary, session)}>
              查看完整学习路径报告并同步保存
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { topicId, question, attempt } = currentItem;
  const topic = topicsById[topicId];

  const handleConfirm = () => {
    const ans = (selectedChoice !== null ? selectedChoice : inputAnswer).trim();
    if (!ans) return;

    // Check correctness
    const isCorrect = ans.toLowerCase() === question.answer.trim().toLowerCase();
    const verdict = isCorrect ? "correct" : "wrong";
    setFeedback(verdict);
    setIsAnswered(true);

    const updated = recordAnswer(graph, session, topicId, question.id, verdict, ans);
    setSession(updated);
  };

  const handleNext = () => {
    setSelectedChoice(null);
    setInputAnswer("");
    setIsAnswered(false);
    setFeedback(null);
  };

  return (
    <div className="modal-overlay">
      <div className="diag-modal-card">
        {/* Header */}
        <div className="diag-header">
          <div className="diag-topic-info">
            <span className="badge-tag">正在考查</span>
            <span className="topic-title">{topic?.name || topicId}</span>
            {attempt > 1 && <span className="attempt-badge">二次同级/先修检测</span>}
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="diag-body">
          <div className="q-prompt">
            <MathText text={question.prompt} as="div" className="prompt-text" />
          </div>

          {/* Geometry SVG Diagram if available */}
          {question.figure && (
            <div className="q-figure-container">
              <GeometryFigure svgContent={question.figure} />
            </div>
          )}

            {/* Choices or Input */}
            <div className="q-interaction">
              {question.choices && question.choices.length > 0 ? (
                <div className="choices-grid">
                  {question.choices.map((choiceItem: any, idx: number) => {
                    const choiceText = typeof choiceItem === "string" ? choiceItem : (choiceItem?.text || "");
                    const choiceKey = typeof choiceItem === "object" && choiceItem?.key ? choiceItem.key : String.fromCharCode(65 + idx);
                    const isSelected = selectedChoice === choiceKey || selectedChoice === choiceText;
                    const isCorrectAnswer = isAnswered && (
                      choiceKey.toLowerCase() === question.answer.trim().toLowerCase() ||
                      choiceText.trim().toLowerCase() === question.answer.trim().toLowerCase()
                    );
                    return (
                      <button
                        key={idx}
                        className={`choice-btn ${isSelected ? "selected" : ""} ${isCorrectAnswer ? "correct-answer" : ""}`}
                        onClick={() => !isAnswered && setSelectedChoice(choiceKey)}
                        disabled={isAnswered}
                      >
                        <span className="choice-label">{choiceKey}</span>
                        <MathText text={choiceText} className="choice-text" />
                      </button>
                    );
                  })}
                </div>
              ) : (
              <div className="text-input-wrap">
                <input
                  type="text"
                  placeholder="请输入您的计算答案..."
                  value={inputAnswer}
                  onChange={(e) => setInputAnswer(e.target.value)}
                  disabled={isAnswered}
                  onKeyDown={(e) => e.key === "Enter" && !isAnswered && handleConfirm()}
                />
              </div>
            )}
          </div>

          {/* Feedback & Explanation */}
          {isAnswered && (
            <div className={`answer-feedback feedback-${feedback}`}>
              <div className="feedback-status">
                {feedback === "correct" ? (
                  <>
                    <Check size={18} /> <span>回答正确！知识掌握牢固</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} />{" "}
                    <span>回答有误，正确答案为: <strong>{question.answer}</strong></span>
                  </>
                )}
              </div>
              {question.explanation && (
                <div className="feedback-explanation">
                  <span className="exp-label">解析：</span>
                  <MathText text={question.explanation} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="diag-footer">
          <span className="progress-info">
            已测评 {session.answers.length} / 上限 {session.limit} 题
          </span>

          {!isAnswered ? (
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={selectedChoice === null && !inputAnswer.trim()}
            >
              提交答案
            </button>
          ) : (
            <button className="btn-primary" onClick={handleNext}>
              <span>下一题</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
