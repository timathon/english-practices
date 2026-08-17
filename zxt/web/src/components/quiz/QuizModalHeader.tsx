import React from 'react';
import { PoemQuestion, IdiomQuestion } from '../../services/api';

interface QuizModalHeaderProps {
  poemTitle: string;
  q: PoemQuestion | IdiomQuestion | undefined;
  isCompleted: boolean;
  remediationCount: number;
  currentIndex: number;
  currentRoundQuestions: (PoemQuestion | IdiomQuestion)[];
  isQuestionSelected?: boolean;
  onToggleSelectQuestion?: (qId: string) => void;
  onConfirmPublish?: () => void;
  onClose: () => void;
  submittedQuestionStates: Record<string, any>;
  firstAttemptResults: Record<string, boolean>;
  feedback: { isCorrect: boolean; text: string } | null;
  onSelectIndex: (idx: number) => void;
}

export const QuizModalHeader: React.FC<QuizModalHeaderProps> = ({
  poemTitle,
  q,
  isCompleted,
  remediationCount,
  currentIndex,
  currentRoundQuestions,
  isQuestionSelected,
  onToggleSelectQuestion,
  onConfirmPublish,
  onClose,
  submittedQuestionStates,
  firstAttemptResults,
  feedback,
  onSelectIndex,
}) => {
  return (
    <div className={`px-6 py-4 flex flex-col gap-2.5 text-white transition-colors ${
      isQuestionSelected
        ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'
        : 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-b border-amber-600/40'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {onToggleSelectQuestion && (
            <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold rounded-full">
              👁 学生答题预览
            </span>
          )}
          <h3 className="font-serif font-bold text-base text-indigo-100">《{poemTitle}》</h3>

          {onToggleSelectQuestion && q && (
            <label
              onClick={e => e.stopPropagation()}
              className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition select-none ${
                isQuestionSelected
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-amber-500/30 border-amber-400/80 text-amber-200 hover:bg-amber-500/40 animate-pulse'
              }`}
            >
              <input
                type="checkbox"
                checked={isQuestionSelected}
                onChange={() => onToggleSelectQuestion(q.id)}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>{isQuestionSelected ? '✓ 已选为此作业题目' : '✕ 未勾选此题 (点击加入作业)'}</span>
            </label>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isCompleted && (
            <span className="text-xs text-indigo-300 font-mono flex items-center gap-2">
              {remediationCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded-full text-[10px] font-bold">
                  错题重练 第{remediationCount}轮
                </span>
              )}
              <span>题目 {currentIndex + 1} / {currentRoundQuestions.length}</span>
            </span>
          )}
          <button
            onClick={() => onClose()}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition"
            title={onConfirmPublish ? '返回修改挑题' : '关闭预览'}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Segmented Progress Bar displaying question states */}
      {!isCompleted && currentRoundQuestions.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1">
          {currentRoundQuestions.map((qItem, idx) => {
            const isActive = idx === currentIndex;
            const submittedState = submittedQuestionStates[qItem.id];
            const firstAttempt = firstAttemptResults[qItem.id];

            let bgStyle = 'bg-slate-700/60 border-slate-600/40';

            if (submittedState) {
              if (submittedState.feedback.isCorrect) {
                if (firstAttempt === false) {
                  bgStyle = 'bg-amber-500 border-amber-400 shadow-amber-500/50';
                } else {
                  bgStyle = 'bg-emerald-500 border-emerald-400 shadow-emerald-500/50';
                }
              } else {
                bgStyle = 'bg-rose-500 border-rose-400 shadow-rose-500/50';
              }
            }

            const isPreviewMode = !!(onToggleSelectQuestion || onConfirmPublish);
            const isNavigable = isPreviewMode || idx <= currentIndex || feedback !== null || submittedState !== undefined;

            return (
              <div
                key={qItem.id || idx}
                onClick={() => {
                  if (isNavigable) {
                    onSelectIndex(idx);
                  }
                }}
                className={`flex-1 h-2.5 rounded-full border transition-all duration-300 relative ${bgStyle} ${
                  isActive ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-y-125 z-10' : ''
                } ${
                  isNavigable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-40'
                }`}
                title={`第 ${idx + 1} 题 ${submittedState ? (submittedState.feedback.isCorrect ? (firstAttempt === false ? '(已重练订正)' : '(回答正确)') : '(回答错误)') : '(待作答)'}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
