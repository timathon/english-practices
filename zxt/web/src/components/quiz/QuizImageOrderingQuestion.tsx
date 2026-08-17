import React from 'react';
import { PoemQuestion, IdiomQuestion } from '../../services/api';
import { CachedImage } from '../CachedImage';

interface QuizImageOrderingQuestionProps {
  q: PoemQuestion | IdiomQuestion;
  poemLines: string[];
  bankImages: (string | null)[];
  placedSlots: (string | null)[];
  selectedSource: { type: 'bank' | 'slot'; index: number } | null;
  feedback: { isCorrect: boolean; text: string } | null;
  onBankImageClick: (bIdx: number) => void;
  onSlotClick: (sIdx: number) => void;
  onReturnSlotToBank: (sIdx: number) => void;
}

export const QuizImageOrderingQuestion: React.FC<QuizImageOrderingQuestionProps> = ({
  q,
  poemLines,
  bankImages,
  placedSlots,
  selectedSource,
  feedback,
  onBankImageClick,
  onSlotClick,
  onReturnSlotToBank,
}) => {
  const isSubmitted = feedback !== null;

  return (
    <div className="space-y-5">
      {/* Ordering Instruction Alert */}
      <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition ${
        feedback
          ? feedback.isCorrect
            ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
            : 'bg-rose-100 border border-rose-300 text-rose-900'
          : selectedSource
            ? 'bg-indigo-100 border border-indigo-300 text-indigo-900 animate-pulse'
            : 'bg-slate-100 border border-slate-200 text-slate-600'
      }`}>
        <span>
          {feedback
            ? feedback.isCorrect
              ? '🎉 排序完全正确！已匹配古诗情节发展。'
              : '❌ 顺序有误，下面已标记正确与错误位置。'
            : selectedSource
              ? '👉 已选中图片！请点击下方的【目标位置 (第 1 ~ ' + placedSlots.length + ' 幅)】将图片放入。'
              : '💡 请先点击图片（备选库或已放置图片），再点击目标位置。'}
        </span>
        {!feedback && selectedSource?.type === 'slot' && (
          <button
            onClick={() => onReturnSlotToBank(selectedSource.index)}
            className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold"
          >
            ↩ 放回备选库
          </button>
        )}
      </div>

      {/* Image Bank */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            🖼 备选图片库 (Image Bank)
          </span>
        </div>
        <div className="min-h-[100px] bg-slate-100/70 border-2 border-dashed border-slate-300 rounded-2xl p-3 flex flex-wrap gap-3 items-center justify-center">
          {bankImages.map((img, bIdx) => {
            const isSelected = !feedback && selectedSource?.type === 'bank' && selectedSource.index === bIdx;
            
            if (img === null) {
              return (
                <div
                  key={bIdx}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-200/40 flex flex-col items-center justify-center text-slate-300 gap-1"
                >
                  <span className="text-xs font-mono font-bold">位 {bIdx + 1}</span>
                </div>
              );
            }

            return (
              <div
                key={bIdx}
                onClick={() => {
                  if (!feedback) onBankImageClick(bIdx);
                }}
                className={`relative rounded-xl overflow-hidden border-2 transition transform ${
                  feedback
                    ? 'border-white opacity-80 cursor-default'
                    : isSelected
                      ? 'border-indigo-600 ring-4 ring-indigo-400/50 shadow-xl scale-105 cursor-pointer'
                      : 'border-white hover:border-indigo-300 shadow-xs cursor-pointer active:scale-95'
                }`}
              >
                <CachedImage src={img} alt={`bank-${bIdx}`} className="w-24 h-24 object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      已选中
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Slots */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          🎯 诗句排序位置 (Target Places)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {placedSlots.map((slotImg, sIdx) => {
            const isSelected = !feedback && selectedSource?.type === 'slot' && selectedSource.index === sIdx;
            const targetImg = ((q as any).images || [])[sIdx];
            const lineText = poemLines[sIdx] || `第 ${sIdx + 1} 句`;
            const isSlotCorrect = isSubmitted && slotImg === targetImg;

            return (
              <div
                key={sIdx}
                onClick={() => {
                  if (!feedback) onSlotClick(sIdx);
                }}
                className={`bg-white border-2 rounded-2xl p-2.5 flex flex-col items-center gap-2 transition ${
                  isSubmitted
                    ? isSlotCorrect
                      ? 'border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/20'
                      : 'border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/20'
                    : isSelected
                      ? 'border-indigo-600 ring-4 ring-indigo-400/50 shadow-xl'
                      : slotImg
                        ? 'border-slate-200 hover:border-indigo-300 shadow-xs cursor-pointer'
                        : selectedSource
                          ? 'border-indigo-400 border-dashed bg-indigo-50/40 hover:bg-indigo-100/60 cursor-pointer'
                          : 'border-slate-300 border-dashed bg-slate-50 hover:bg-slate-100/80 cursor-pointer'
                }`}
              >
                <div className="w-full flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                    isSubmitted
                      ? isSlotCorrect
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                      : slotImg
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    <span>第 {sIdx + 1} 幅</span>
                    {isSubmitted && (
                      <span>{isSlotCorrect ? '✓ 正确' : '✕ 错误'}</span>
                    )}
                  </span>
                  {!isSubmitted && slotImg && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReturnSlotToBank(sIdx);
                      }}
                      className="text-slate-400 hover:text-rose-500 text-xs font-bold"
                      title="放回备选库"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {slotImg ? (
                  <CachedImage 
                    src={slotImg} 
                    alt={`slot-${sIdx}`} 
                    className="w-full h-28 object-cover rounded-xl border border-slate-100" 
                  />
                ) : (
                  <div className="w-full h-28 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1">
                    <span className="text-xl">📥</span>
                    <span className="text-[10px] font-bold">点击放入</span>
                  </div>
                )}

                {isSubmitted && (
                  <div className="w-full pt-1.5 border-t border-slate-100 text-center">
                    <p className="text-slate-900 font-serif font-bold text-xs leading-snug">
                      {lineText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
