import React from 'react';
import { PoemQuestion, IdiomQuestion } from '../../services/api';

interface QuizAssemblyQuestionProps {
  q: PoemQuestion | IdiomQuestion;
  selectedChars: { char: string; poolIndex: number }[];
  scrambledPool: (string | null)[];
  feedback: { isCorrect: boolean; text: string } | null;
  onRemoveSelectedChar: (idx: number, item: { char: string; poolIndex: number }) => void;
  onSelectPoolChar: (char: string, poolIdx: number) => void;
}

export const QuizAssemblyQuestion: React.FC<QuizAssemblyQuestionProps> = ({
  q,
  selectedChars,
  scrambledPool,
  feedback,
  onRemoveSelectedChar,
  onSelectPoolChar,
}) => {
  const isSubmitted = feedback !== null;

  return (
    <div className="space-y-5">
      {/* Assembly Target Slot Area */}
      <div className={`min-h-[64px] rounded-2xl p-3 flex flex-wrap gap-2 justify-center items-center border-2 transition ${
        feedback
          ? feedback.isCorrect
            ? 'bg-emerald-50/80 border-emerald-300'
            : 'bg-rose-50/80 border-rose-300'
          : 'bg-amber-50/80 border-dashed border-amber-300'
      }`}>
        {selectedChars.length === 0 ? (
          <span className="text-xs text-amber-700/70 font-medium">
            {q.type === 'IdiomAssembly' ? '点击下方汉字块组成四字成语' : '点击下方汉字块组成诗句'}
          </span>
        ) : (
          selectedChars.map((item, idx) => {
            const targetChar = ((q as any).answer || '')[idx];
            const isCharRight = isSubmitted && item.char === targetChar;

            return (
              <button
                key={idx}
                disabled={isSubmitted}
                onClick={() => onRemoveSelectedChar(idx, item)}
                className={`w-11 h-11 font-bold rounded-2xl text-xl font-serif transition transform ${
                  isSubmitted
                    ? isCharRight
                      ? 'bg-emerald-500 text-white shadow-sm cursor-default'
                      : 'bg-rose-500 text-white shadow-sm cursor-default'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 cursor-pointer'
                }`}
              >
                {item.char}
              </button>
            );
          })
        )}
      </div>

      {/* Scrambled Character Pool Area */}
      <div className="flex flex-wrap gap-2.5 justify-center p-2">
        {scrambledPool.map((char, poolIdx) => {
          if (char === null) {
            return (
              <div
                key={poolIdx}
                className="w-13 h-13 border-2 border-dashed border-slate-200 bg-slate-100/50 rounded-2xl flex items-center justify-center text-slate-300 text-xs font-mono font-bold"
              >
                ·
              </div>
            );
          }

          return (
            <button
              key={poolIdx}
              disabled={isSubmitted}
              onClick={() => onSelectPoolChar(char, poolIdx)}
              className={`w-13 h-13 border font-serif font-bold rounded-2xl text-2xl shadow-xs transition transform ${
                isSubmitted
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                  : 'bg-white hover:bg-teal-50 border-slate-200 hover:border-teal-400 text-slate-800 hover:-translate-y-0.5 active:scale-95 cursor-pointer'
              }`}
            >
              {char}
            </button>
          );
        })}
      </div>
    </div>
  );
};
