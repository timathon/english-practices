import React from 'react';
import { PoemQuestion, IdiomQuestion } from '../../services/api';

interface QuizCompletionViewProps {
  poemTitle: string;
  questions: (PoemQuestion | IdiomQuestion)[];
  firstAttemptResults: Record<string, boolean>;
  userAnswerDetails: Record<string, any>;
  remediationCount: number;
  isSubmitted: boolean;
  onConfirmPublish?: () => void;
  onClose: (result?: { score: number; completed: boolean; details?: any[] }) => void;
  setIsSubmitted: (val: boolean) => void;
}

export const QuizCompletionView: React.FC<QuizCompletionViewProps> = ({
  poemTitle,
  questions,
  firstAttemptResults,
  userAnswerDetails,
  remediationCount,
  isSubmitted,
  onConfirmPublish,
  onClose,
  setIsSubmitted,
}) => {
  const totalOriginalCount = questions.length;
  const firstAttemptCorrectCount = Object.values(firstAttemptResults).filter(Boolean).length;
  const score = totalOriginalCount > 0
    ? Math.round((firstAttemptCorrectCount / totalOriginalCount) * 100)
    : 100;

  return (
    <div className="p-8 space-y-6 text-center my-auto flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 min-h-[420px]">
      <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-300 rounded-full flex items-center justify-center text-4xl shadow-md">
        🎉
      </div>

      <div className="space-y-1">
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-full text-xs">
          答题测试打卡成功
        </span>
        <h2 className="text-3xl font-black font-serif text-slate-800">
          恭喜完成《{poemTitle}》试题测试！
        </h2>
        <p className="text-xs text-slate-500">
          {remediationCount > 0
            ? `经过 ${remediationCount} 轮错题重练，所有试题均已修补订正完毕！`
            : '太棒了！所有题目一次性全部回答正确！'}
        </p>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-xl w-full max-w-sm flex flex-col items-center gap-1.5 border border-emerald-400">
        <div className="text-xs font-semibold opacity-90 uppercase tracking-widest">首次尝试答题得分</div>
        <div className="text-5xl font-black font-mono tracking-tight">{score} <span className="text-xl">分</span></div>
        <div className="flex gap-1 text-amber-300 text-xl pt-0.5">
          {score === 100 ? '🌟🌟🌟' : score >= 80 ? '🌟🌟' : '🌟'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-xs">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="text-slate-400 font-medium">总试题数</div>
          <div className="text-base font-bold text-slate-800 font-mono mt-0.5">{totalOriginalCount} 道</div>
        </div>
        <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
          <div className="text-emerald-700 font-medium">首次正确</div>
          <div className="text-base font-bold text-emerald-800 font-mono mt-0.5">{firstAttemptCorrectCount} 道</div>
        </div>
        <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
          <div className="text-amber-800 font-medium">重练修补</div>
          <div className="text-base font-bold text-amber-900 font-mono mt-0.5">{totalOriginalCount - firstAttemptCorrectCount} 道</div>
        </div>
      </div>

      {onConfirmPublish ? (
        <div className="flex flex-col gap-2.5 w-full max-w-sm pt-2">
          <button
            onClick={() => onClose()}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
          >
            ← 返回修改挑题
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirmPublish();
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📅 设定作业开始与截止日期</span>
          </button>
        </div>
      ) : (
        <button
          disabled={isSubmitted}
          onClick={() => {
            if (isSubmitted) return;
            setIsSubmitted(true);
            onClose({ score, completed: true, details: Object.values(userAnswerDetails) });
          }}
          className="w-full max-w-sm py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 mt-2"
        >
          <span>{isSubmitted ? '⏳ 正在退出...' : '✅ 完成并退出'}</span>
        </button>
      )}
    </div>
  );
};
