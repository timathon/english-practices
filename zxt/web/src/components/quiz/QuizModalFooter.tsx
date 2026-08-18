import React from 'react';
import { PoemQuestion, IdiomQuestion } from '../../services/api';

interface QuizModalFooterProps {
  q: PoemQuestion | IdiomQuestion;
  currentIndex: number;
  currentRoundQuestions: (PoemQuestion | IdiomQuestion)[];
  roundMistakenIds: string[];
  feedback: { isCorrect: boolean; text: string } | null;
  hasSelection: boolean;
  onToggleSelectQuestion?: (qId: string) => void;
  onConfirmPublish?: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAdvanceNext: () => void;
  onVerify: () => void;
}

export const QuizModalFooter: React.FC<QuizModalFooterProps> = ({
  q: _q,
  currentIndex,
  currentRoundQuestions,
  roundMistakenIds,
  feedback,
  hasSelection,
  onToggleSelectQuestion,
  onConfirmPublish,
  onClose,
  onPrev,
  onNext,
  onAdvanceNext,
  onVerify,
}) => {
  const isPreviewMode = !!(onToggleSelectQuestion || onConfirmPublish);
  const isNextDisabled = currentIndex === currentRoundQuestions.length - 1 || (!isPreviewMode && feedback === null);
  const isSubmitDisabled = feedback !== null || !hasSelection;

  return (
    <div className="bg-white border-t border-slate-200 flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-30 transition cursor-pointer disabled:cursor-not-allowed"
          >
            ← 上一题
          </button>

          {currentIndex === currentRoundQuestions.length - 1 && feedback !== null ? (
            <button
              onClick={onAdvanceNext}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5 animate-bounce cursor-pointer"
            >
              {roundMistakenIds.length > 0 ? (
                <span>🔄 重练错题 ({roundMistakenIds.length}题) →</span>
              ) : (
                <span>🎉 完成打卡 & 查看成绩 →</span>
              )}
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={isNextDisabled}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1 ${
                !isNextDisabled
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-200 shadow-md cursor-pointer animate-pulse'
                  : 'bg-slate-100 text-slate-400 opacity-40 cursor-not-allowed'
              }`}
              title={isNextDisabled && !isPreviewMode ? '请先提交当前题目的答案' : ''}
            >
              下一题 →
            </button>
          )}
        </div>

        <button
          onClick={onVerify}
          disabled={isSubmitDisabled}
          className={`px-6 py-2.5 font-bold text-xs rounded-xl transition ${
            feedback !== null
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : !hasSelection
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none opacity-60'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-200 cursor-pointer active:scale-95'
          }`}
        >
          {feedback !== null ? '✓ 已检查答案' : '✅ 检查答案'}
        </button>
      </div>

      {onConfirmPublish && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end px-4">
          <button
            onClick={() => {
              onClose();
              onConfirmPublish();
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span>📅 设定作业开始与截止日期</span>
          </button>
        </div>
      )}
    </div>
  );
};
