import React from 'react';

interface QuizMultipleChoiceQuestionProps {
  displayedOptions: string[];
  mcSelection: number | null;
  mappedAnswerIndex: number;
  feedback: { isCorrect: boolean; text: string } | null;
  onSelectOption: (idx: number) => void;
}

export const QuizMultipleChoiceQuestion: React.FC<QuizMultipleChoiceQuestionProps> = ({
  displayedOptions,
  mcSelection,
  mappedAnswerIndex,
  feedback,
  onSelectOption,
}) => {
  const isSubmitted = feedback !== null;

  return (
    <div className="space-y-3">
      {displayedOptions.map((opt, idx) => {
        const isSelected = mcSelection === idx;
        const isCorrectAnswer = isSubmitted && idx === mappedAnswerIndex;
        const isWrongSelected = isSubmitted && isSelected && !isCorrectAnswer;

        let cardStyle = 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30';
        let badgeStyle = 'bg-slate-100 text-slate-600';

        if (isSubmitted) {
          if (isCorrectAnswer) {
            cardStyle = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-bold shadow-xs';
            badgeStyle = 'bg-emerald-600 text-white';
          } else if (isWrongSelected) {
            cardStyle = 'bg-rose-50 border-2 border-rose-500 text-rose-900 font-bold shadow-xs';
            badgeStyle = 'bg-rose-600 text-white';
          } else {
            cardStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
          }
        } else if (isSelected) {
          cardStyle = 'bg-teal-50 border-2 border-teal-500 text-teal-900 font-bold shadow-xs';
          badgeStyle = 'bg-teal-600 text-white';
        }

        return (
          <button
            key={idx}
            disabled={isSubmitted}
            onClick={() => onSelectOption(idx)}
            className={`w-full text-left p-3.5 rounded-xl border text-sm transition flex items-center gap-3 ${cardStyle}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-sans font-bold flex-shrink-0 ${badgeStyle}`}>
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="flex-1 font-serif font-bold text-slate-800 text-lg leading-snug">{opt}</span>
          </button>
        );
      })}
    </div>
  );
};
