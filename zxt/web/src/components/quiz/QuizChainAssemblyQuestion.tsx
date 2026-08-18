import React from 'react';
import { IdiomQuestion } from '../../services/api';

interface QuizChainAssemblyQuestionProps {
  q: IdiomQuestion;
  selectedChars: { char: string; poolIndex: number }[];
  scrambledPool: (string | null)[];
  feedback: { isCorrect: boolean; text: string } | null;
  onRemoveSelectedChar: (idx: number, item: { char: string; poolIndex: number }) => void;
  onSelectPoolChar: (char: string, poolIdx: number) => void;
}

export const QuizChainAssemblyQuestion: React.FC<QuizChainAssemblyQuestionProps> = ({
  q,
  selectedChars,
  scrambledPool,
  feedback,
  onRemoveSelectedChar,
  onSelectPoolChar,
}) => {
  if (q.type !== 'ChainAssembly') return null;

  const isSubmitted = feedback !== null;
  const idioms = q.idioms || [];

  // Calculate correct characters for the 6 missing slots:
  const correctSlotChars: string[] = [];
  idioms.forEach(word => {
    correctSlotChars.push(word[1] || '');
    correctSlotChars.push(word[2] || '');
  });

  return (
    <div className="space-y-2.5 sm:space-y-4">
      {/* Idiom Chain Structure with Anchors & Input Slots */}
      <div className={`rounded-2xl p-2 sm:p-3 border-2 transition ${
        feedback
          ? feedback.isCorrect
            ? 'bg-emerald-50/80 border-emerald-300'
            : 'bg-rose-50/80 border-rose-300'
          : 'bg-amber-50/80 border-dashed border-amber-300'
      }`}>
        <div className="text-center mb-1">
          <span className="text-xs text-amber-800/80 font-medium">
            点击字块，完成接龙：
          </span>
        </div>

        {/* Interlocking 3-Idiom Chain Grid (Vertical ➔ Horizontal ➔ Vertical) */}
        {(() => {
          const i0_head = idioms[0]?.[0] || '';
          const i0_tail = idioms[0]?.[3] || (idioms[1]?.[0] || '');
          const i1_tail = idioms[1]?.[3] || (idioms[2]?.[0] || '');
          const i2_tail = idioms[2]?.[3] || '';

          const renderSlot = (slotIdx: number, hintLabel: string) => {
            const placed = selectedChars[slotIdx];
            const isRight = isSubmitted && placed?.char === correctSlotChars[slotIdx];
            if (placed) {
              return (
                <button
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => onRemoveSelectedChar(slotIdx, placed)}
                  className={`w-8 h-8 sm:w-11 sm:h-11 font-bold rounded-lg sm:rounded-xl text-base sm:text-xl font-serif transition transform ${
                    isSubmitted
                      ? isRight
                        ? 'bg-emerald-500 text-white shadow-sm cursor-default'
                        : 'bg-rose-500 text-white shadow-sm cursor-default'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 cursor-pointer'
                  }`}
                  title={`${hintLabel} (点击取消)`}
                >
                  {placed.char}
                </button>
              );
            }
            return (
              <div
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex items-center justify-center text-amber-400 text-xs sm:text-sm font-bold animate-pulse"
                title={hintLabel}
              >
                _
              </div>
            );
          };

          return (
            <div className="flex justify-center">
              <div className="inline-grid grid-cols-4 grid-rows-7 gap-1 p-1.5 sm:p-2.5 bg-white/95 rounded-xl sm:rounded-2xl border border-amber-200/90 shadow-2xs">
                {/* Row 0, Col 0: Idiom 1 Char 1 (Head) */}
                <div className="col-start-1 row-start-1 w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-800 text-white font-serif font-bold text-base sm:text-xl flex items-center justify-center shadow-xs">
                  {i0_head}
                </div>

                {/* Row 1, Col 0: Idiom 1 Char 2 (Slot 0) */}
                <div className="col-start-1 row-start-2">
                  {renderSlot(0, '成语一 第2字')}
                </div>

                {/* Row 2, Col 0: Idiom 1 Char 3 (Slot 1) */}
                <div className="col-start-1 row-start-3">
                  {renderSlot(1, '成语一 第3字')}
                </div>

                {/* Row 3, Col 0: Shared Char (Idiom 1 Char 4 & Idiom 2 Char 1) */}
                <div className="col-start-1 row-start-4 w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-900 ring-2 ring-amber-400 text-amber-300 font-serif font-bold text-base sm:text-xl flex items-center justify-center shadow-xs" title="接龙交汇字">
                  {i0_tail}
                </div>

                {/* Row 3, Col 1: Idiom 2 Char 2 (Slot 2) */}
                <div className="col-start-2 row-start-4">
                  {renderSlot(2, '成语二 第2字')}
                </div>

                {/* Row 3, Col 2: Idiom 2 Char 3 (Slot 3) */}
                <div className="col-start-3 row-start-4">
                  {renderSlot(3, '成语二 第3字')}
                </div>

                {/* Row 3, Col 3: Shared Char (Idiom 2 Char 4 & Idiom 3 Char 1) */}
                <div className="col-start-4 row-start-4 w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-900 ring-2 ring-amber-400 text-amber-300 font-serif font-bold text-base sm:text-xl flex items-center justify-center shadow-xs" title="接龙交汇字">
                  {i1_tail}
                </div>

                {/* Row 4, Col 3: Idiom 3 Char 2 (Slot 4) */}
                <div className="col-start-4 row-start-5">
                  {renderSlot(4, '成语三 第2字')}
                </div>

                {/* Row 5, Col 3: Idiom 3 Char 3 (Slot 5) */}
                <div className="col-start-4 row-start-6">
                  {renderSlot(5, '成语三 第3字')}
                </div>

                {/* Row 6, Col 3: Idiom 3 Char 4 (Tail) */}
                <div className="col-start-4 row-start-7 w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-800 text-white font-serif font-bold text-base sm:text-xl flex items-center justify-center shadow-xs">
                  {i2_tail}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Scrambled Character Tile Pool */}
      <div>
        <div className="flex flex-wrap gap-1.5 justify-center p-0.5">
          {scrambledPool.map((char, poolIdx) => {
            if (char === null) {
              return (
                <div
                  key={poolIdx}
                  className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-dashed border-slate-200 bg-slate-100/50 rounded-xl flex items-center justify-center text-slate-300 text-xs font-mono font-bold"
                >
                  ·
                </div>
              );
            }

            return (
              <button
                key={poolIdx}
                disabled={isSubmitted || selectedChars.length >= 6}
                onClick={() => onSelectPoolChar(char, poolIdx)}
                className={`w-9 h-9 sm:w-11 sm:h-11 border font-serif font-bold rounded-xl text-base sm:text-xl shadow-xs transition transform ${
                  isSubmitted || selectedChars.length >= 6
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                    : 'bg-white hover:bg-amber-50 border-slate-200 hover:border-amber-400 text-slate-800 hover:-translate-y-0.5 active:scale-95 cursor-pointer'
                }`}
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
