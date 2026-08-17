import React, { useState, useEffect, useMemo } from 'react';
import { apiService, PoemQuestion, IdiomQuestion, IdiomItem } from '../services/api';
import { playAnswerSFX } from '../utils/sound';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { CachedImage } from './CachedImage';
import { QUESTION_TYPE_LABELS, TYPE_COLORS } from './quiz/quizConstants';
import { QuizModalHeader } from './quiz/QuizModalHeader';
import { QuizCompletionView } from './quiz/QuizCompletionView';
import { QuizAssemblyQuestion } from './quiz/QuizAssemblyQuestion';
import { QuizImageOrderingQuestion } from './quiz/QuizImageOrderingQuestion';
import { QuizMultipleChoiceQuestion } from './quiz/QuizMultipleChoiceQuestion';
import { QuizModalFooter } from './quiz/QuizModalFooter';

export const StudentQuizPreviewModal: React.FC<{
  poemTitle: string;
  questions: (PoemQuestion | IdiomQuestion)[];
  initialIndex: number;
  selectedQuestionIds?: string[];
  onToggleSelectQuestion?: (qId: string) => void;
  onConfirmPublish?: () => void;
  onClose: (result?: { score: number; completed: boolean; details?: any[] }) => void;
}> = ({
  poemTitle,
  questions,
  initialIndex,
  selectedQuestionIds,
  onToggleSelectQuestion,
  onConfirmPublish,
  onClose,
}) => {
  useLockBodyScroll(true);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  const [selectedChars, setSelectedChars] = useState<{ char: string; poolIndex: number }[]>([]);
  const [scrambledPool, setScrambledPool] = useState<(string | null)[]>([]);
  const [mcSelection, setMcSelection] = useState<number | null>(null);

  // Sampled options & mapped answer index (used for VerseCloze 4-option sampling)
  const [displayedOptions, setDisplayedOptions] = useState<string[]>([]);
  const [mappedAnswerIndex, setMappedAnswerIndex] = useState<number>(0);
  
  // ImageOrdering state: Bank (fixed slots), Placed Slots, Initial Order, Selected Source
  const [bankImages, setBankImages] = useState<(string | null)[]>([]);
  const [placedSlots, setPlacedSlots] = useState<(string | null)[]>([]);
  const [initialBankOrder, setInitialBankOrder] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<{ type: 'bank' | 'slot'; index: number } | null>(null);

  // Remediation & Quiz Loop States
  const [currentRoundQuestions, setCurrentRoundQuestions] = useState<(PoemQuestion | IdiomQuestion)[]>(questions);
  const [firstAttemptResults, setFirstAttemptResults] = useState<Record<string, boolean>>({});
  const [userAnswerDetails, setUserAnswerDetails] = useState<Record<string, any>>({});
  const [roundMistakenIds, setRoundMistakenIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [remediationCount, setRemediationCount] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);

  // Map to store frozen interactive states for checked/submitted questions
  const [submittedQuestionStates, setSubmittedQuestionStates] = useState<Record<string, {
    feedback: { isCorrect: boolean; text: string };
    mcSelection: number | null;
    selectedChars: { char: string; poolIndex: number }[];
    scrambledPool: (string | null)[];
    bankImages: (string | null)[];
    placedSlots: (string | null)[];
    displayedOptions: string[];
    mappedAnswerIndex: number;
  }>>({});

  useEffect(() => {
    setCurrentRoundQuestions(questions);
    setFirstAttemptResults({});
    setUserAnswerDetails({});
    setRoundMistakenIds([]);
    setIsCompleted(false);
    setRemediationCount(0);
    setCurrentIndex(initialIndex);
    setSubmittedQuestionStates({});
  }, [questions, initialIndex]);

  const poemLines = useMemo(() => {
    const p = apiService.getQuizLibrary().find(x => x.title === poemTitle);
    if (!p || !p.lines) return [];
    return p.lines.map(l => typeof l === 'string' ? l : l.text);
  }, [poemTitle]);

  const idiomMap = useMemo(() => {
    const groups = apiService.getLocalIdiomGroups();
    const map: Record<string, IdiomItem> = {};
    groups.forEach(g => {
      (g.idioms || []).forEach(i => {
        map[i.word] = i;
      });
    });
    return map;
  }, []);

  const q = currentRoundQuestions[currentIndex];
  const isQuestionSelected = selectedQuestionIds ? selectedQuestionIds.includes(q?.id || '') : true;
  const currentIdiomInfo = q && q.type === 'IdiomAssembly' ? idiomMap[q.answer] : null;

  useEffect(() => {
    if (!q) return;

    const savedState = submittedQuestionStates[q.id];
    if (savedState) {
      setFeedback(savedState.feedback);
      setMcSelection(savedState.mcSelection);
      setSelectedChars(savedState.selectedChars);
      setScrambledPool(savedState.scrambledPool);
      setBankImages(savedState.bankImages);
      setPlacedSlots(savedState.placedSlots);
      setDisplayedOptions(savedState.displayedOptions);
      setMappedAnswerIndex(savedState.mappedAnswerIndex);
      setSelectedSource(null);
      return;
    }

    setFeedback(null);
    setMcSelection(null);

    if (q.type === 'LineAssembly' || q.type === 'IdiomAssembly') {
      const ansChars = (q.answer || '').split('');
      const distChars = q.distractor_chars || [];
      const all = [...ansChars, ...distChars];
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      setScrambledPool(shuffled);
      setSelectedChars([]);
    } else if (q.type === 'ImageOrdering') {
      const imgs = [...(q.images || [])];
      const shuffled = [...imgs].sort(() => Math.random() - 0.5);
      setInitialBankOrder(shuffled);
      setBankImages([...shuffled]);
      setPlacedSlots(Array(imgs.length).fill(null));
      setSelectedSource(null);
    }

    if (q.type === 'VerseCloze') {
      const rawOpts = q.options || [];
      const correctOpt = rawOpts[q.answer] ?? rawOpts[0] ?? '';
      const distractors = rawOpts.filter((_, idx) => idx !== q.answer);
      const sampledDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
      const combined = [correctOpt, ...sampledDistractors].sort(() => Math.random() - 0.5);
      setDisplayedOptions(combined);
      setMappedAnswerIndex(combined.indexOf(correctOpt));
    } else if (q.type !== 'LineAssembly' && q.type !== 'IdiomAssembly' && q.type !== 'ImageOrdering') {
      const rawOpts = (q as any).options || [];
      const correctOpt = rawOpts[(q as any).answer] ?? rawOpts[0] ?? '';
      const shuffled = [...rawOpts].sort(() => Math.random() - 0.5);
      setDisplayedOptions(shuffled);
      setMappedAnswerIndex(shuffled.indexOf(correctOpt));
    }
  }, [currentIndex, q, submittedQuestionStates]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (isCompleted) return;
      const isPreviewMode = !!(onToggleSelectQuestion || onConfirmPublish);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(i => {
          if (i >= currentRoundQuestions.length - 1) return i;
          if (!isPreviewMode && feedback === null) return i;
          return i + 1;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (feedback !== null) {
          if (currentIndex === currentRoundQuestions.length - 1) {
            handleAdvanceNext();
          } else {
            setCurrentIndex(i => Math.min(currentRoundQuestions.length - 1, i + 1));
          }
        } else {
          const hasSelection = (() => {
            if (!q) return false;
            if (q.type === 'LineAssembly' || q.type === 'IdiomAssembly') return selectedChars.length > 0;
            if (q.type === 'ImageOrdering') return placedSlots.some(s => s !== null);
            return mcSelection !== null;
          })();
          if (hasSelection) {
            handleVerify();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentRoundQuestions.length, feedback, isCompleted, onToggleSelectQuestion, onConfirmPublish, mcSelection, selectedChars, placedSlots, q]);

  if (!questions || questions.length === 0 || !q) {
    return (
      <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 text-white p-6 rounded-2xl max-w-sm w-full text-center space-y-4 border border-slate-700 shadow-2xl">
          <div className="text-4xl">📭</div>
          <div className="font-bold text-base">暂无可练习的题目</div>
          <p className="text-xs text-slate-400">该作业尚未配置题目或题库数据未加载完成。</p>
          <button
            onClick={() => onClose()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition cursor-pointer"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const recordAnswerResult = (isRight: boolean, userAnsText: string, correctAnsText: string) => {
    if (!q) return;
    if (firstAttemptResults[q.id] === undefined) {
      setFirstAttemptResults(prev => ({ ...prev, [q.id]: isRight }));
      const opts = displayedOptions.length > 0 ? displayedOptions : ((q as any).options || []);
      setUserAnswerDetails(prev => ({
        ...prev,
        [q.id]: {
          questionId: q.id,
          prompt: q.prompt || (q as any).questionText || (q as any).title || '',
          type: q.type,
          userAnswerText: userAnsText || '(未作答)',
          isCorrect: isRight,
          correctAnswerText: correctAnsText,
          explanation: (q as any).explanation || '',
          options: opts,
          images: q.type === 'ImageOrdering' ? q.images : undefined,
          image: (q as any).image,
          userAnswerIndex: mcSelection,
          correctAnswerIndex: mappedAnswerIndex,
        }
      }));
    }
    if (!isRight) {
      setRoundMistakenIds(prev => Array.from(new Set([...prev, q.id])));
    }
  };

  const handleVerify = () => {
    let currentFeedback: { isCorrect: boolean; text: string } | null = null;
    const currentMcSelection = mcSelection;
    const currentSelectedChars = selectedChars;
    const currentScrambledPool = scrambledPool;
    const currentBankImages = bankImages;
    const currentPlacedSlots = placedSlots;
    const currentDisplayedOptions = displayedOptions;
    const currentMappedAnswerIndex = mappedAnswerIndex;

    if (q.type === 'LineAssembly' || q.type === 'IdiomAssembly') {
      const studentAns = selectedChars.map(c => c.char).join('');
      const isRight = studentAns === q.answer;
      if (isRight) {
        playAnswerSFX('correct');
        currentFeedback = {
          isCorrect: true,
          text: q.type === 'IdiomAssembly'
            ? `🎉 回答正确！成语是：“${q.answer}”${currentIdiomInfo?.pinyin ? ` (${currentIdiomInfo.pinyin})` : ''}！`
            : '🎉 回答正确！精准拼接出了正确的诗句。'
        };
      } else {
        playAnswerSFX('wrong');
        currentFeedback = {
          isCorrect: false,
          text: q.type === 'IdiomAssembly'
            ? `❌ 还需要加油哦！正确成语是：“${q.answer}”${currentIdiomInfo?.pinyin ? ` (${currentIdiomInfo.pinyin})` : ''}`
            : `❌ 还需要加油哦！正确诗句是：“${q.answer}”`
        };
      }
      setFeedback(currentFeedback);
      recordAnswerResult(isRight, `“${studentAns}”`, `“${q.answer}”`);
    } else if (q.type === 'ImageOrdering') {
      if (placedSlots.some(slot => slot === null)) {
        alert('请将所有备选图片放入对应的目标位置后再提交！');
        return;
      }
      const isMatch = (q.images || []).every((img, idx) => img === placedSlots[idx]);
      if (isMatch) {
        playAnswerSFX('correct');
        currentFeedback = { isCorrect: true, text: '🎉 排序正确！插图与诗句发展顺序完全一致。' };
      } else {
        playAnswerSFX('wrong');
        currentFeedback = { isCorrect: false, text: '❌ 图片顺序不对哦，请参照古诗故事情节重新排列。' };
      }
      setFeedback(currentFeedback);
      recordAnswerResult(isMatch, '用户排列了插图顺序', '标准插图情节顺序');
    } else {
      if (mcSelection === null) {
        alert('请先选择一个答案选项！');
        return;
      }
      const isRight = mcSelection === mappedAnswerIndex;
      const userText = mcSelection !== null ? `${String.fromCharCode(65 + mcSelection)}. ${displayedOptions[mcSelection] || ''}` : '';
      const correctText = `${String.fromCharCode(65 + mappedAnswerIndex)}. ${displayedOptions[mappedAnswerIndex] || ''}`;

      if (isRight) {
        playAnswerSFX('correct');
        currentFeedback = {
          isCorrect: true,
          text: `🎉 回答正确！${(q as any).explanation ? `\n解析：${(q as any).explanation}` : ''}`
        };
      } else {
        playAnswerSFX('wrong');
        currentFeedback = {
          isCorrect: false,
          text: `❌ 选错咯！正确答案是 【${String.fromCharCode(65 + mappedAnswerIndex)}】 ${(q as any).options ? (q as any).options[mappedAnswerIndex] : ''}。${(q as any).explanation ? `\n解析：${(q as any).explanation}` : ''}`
        };
      }
      setFeedback(currentFeedback);
      recordAnswerResult(isRight, userText, correctText);
    }

    if (currentFeedback) {
      setSubmittedQuestionStates(prev => ({
        ...prev,
        [q.id]: {
          feedback: currentFeedback!,
          mcSelection: currentMcSelection,
          selectedChars: currentSelectedChars,
          scrambledPool: currentScrambledPool,
          bankImages: currentBankImages,
          placedSlots: currentPlacedSlots,
          displayedOptions: currentDisplayedOptions,
          mappedAnswerIndex: currentMappedAnswerIndex,
        }
      }));
    }
  };

  const handleAdvanceNext = () => {
    if (currentIndex < currentRoundQuestions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      if (roundMistakenIds.length > 0) {
        const nextRoundQs = questions.filter(item => roundMistakenIds.includes(item.id));
        setCurrentRoundQuestions(nextRoundQs);
        setSubmittedQuestionStates(prev => {
          const nextStates = { ...prev };
          roundMistakenIds.forEach(id => {
            delete nextStates[id];
          });
          return nextStates;
        });
        setRoundMistakenIds([]);
        setCurrentIndex(0);
        setRemediationCount(prev => prev + 1);
      } else {
        setIsCompleted(true);
      }
    }
  };

  const handleBankImageClick = (bankIdx: number) => {
    if (feedback !== null) return;
    if (!bankImages[bankIdx]) return;
    if (selectedSource?.type === 'bank' && selectedSource.index === bankIdx) {
      setSelectedSource(null);
    } else {
      setSelectedSource({ type: 'bank', index: bankIdx });
    }
  };

  const handleSlotClick = (targetSlotIdx: number) => {
    if (feedback !== null) return;
    if (!selectedSource) {
      if (placedSlots[targetSlotIdx] !== null) {
        setSelectedSource({ type: 'slot', index: targetSlotIdx });
      }
      return;
    }

    let sourceImg: string | null = null;
    if (selectedSource.type === 'bank') {
      sourceImg = bankImages[selectedSource.index];
    } else {
      sourceImg = placedSlots[selectedSource.index];
    }

    if (!sourceImg) return;

    const existingTargetImg = placedSlots[targetSlotIdx];
    const newPlaced = [...placedSlots];
    const newBank = [...bankImages];

    if (selectedSource.type === 'bank') {
      newBank[selectedSource.index] = null;
    } else {
      newPlaced[selectedSource.index] = null;
    }

    if (existingTargetImg) {
      const origBankIdx = initialBankOrder.indexOf(existingTargetImg);
      if (origBankIdx !== -1) {
        newBank[origBankIdx] = existingTargetImg;
      }
    }

    newPlaced[targetSlotIdx] = sourceImg;
    setPlacedSlots(newPlaced);
    setBankImages(newBank);
    setSelectedSource(null);
  };

  const returnSlotToBank = (slotIdx: number) => {
    if (feedback !== null) return;
    const img = placedSlots[slotIdx];
    if (!img) return;
    const newPlaced = [...placedSlots];
    newPlaced[slotIdx] = null;

    const origBankIdx = initialBankOrder.indexOf(img);
    const newBank = [...bankImages];
    if (origBankIdx !== -1) {
      newBank[origBankIdx] = img;
    }

    setPlacedSlots(newPlaced);
    setBankImages(newBank);
    if (selectedSource?.type === 'slot' && selectedSource.index === slotIdx) {
      setSelectedSource(null);
    }
  };

  const hasSelection = (() => {
    if (q.type === 'LineAssembly' || q.type === 'IdiomAssembly') return selectedChars.length > 0;
    if (q.type === 'ImageOrdering') return placedSlots.some(s => s !== null);
    return mcSelection !== null;
  })();

  return (
    <div className="fixed inset-0 !mt-0 !m-0 bg-black/75 z-[110] flex items-center justify-center p-4" onClick={() => onClose()}>
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all ${
          isQuestionSelected
            ? 'bg-white border border-slate-200'
            : 'bg-amber-50 border-2 border-amber-400/80 shadow-amber-900/20'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <QuizModalHeader
          poemTitle={poemTitle}
          q={q}
          isCompleted={isCompleted}
          remediationCount={remediationCount}
          currentIndex={currentIndex}
          currentRoundQuestions={currentRoundQuestions}
          isQuestionSelected={isQuestionSelected}
          onToggleSelectQuestion={onToggleSelectQuestion}
          onConfirmPublish={onConfirmPublish}
          onClose={onClose}
          submittedQuestionStates={submittedQuestionStates}
          firstAttemptResults={firstAttemptResults}
          feedback={feedback}
          onSelectIndex={setCurrentIndex}
        />

        {isCompleted ? (
          <QuizCompletionView
            poemTitle={poemTitle}
            questions={questions}
            firstAttemptResults={firstAttemptResults}
            userAnswerDetails={userAnswerDetails}
            remediationCount={remediationCount}
            isSubmitted={isSubmitted}
            onConfirmPublish={onConfirmPublish}
            onClose={onClose}
            setIsSubmitted={setIsSubmitted}
          />
        ) : (
          <div className={`p-6 overflow-y-auto flex-1 space-y-6 transition-colors ${
            isQuestionSelected ? 'bg-slate-50' : 'bg-amber-50'
          }`}>
            {!isQuestionSelected && (
              <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>此题目目前【未勾选选入作业】。在右上角或下方点击按钮可重新加入本次发布。</span>
                </div>
                {onToggleSelectQuestion && (
                  <button
                    onClick={() => onToggleSelectQuestion(q.id)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
                  >
                    + 加入作业
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {QUESTION_TYPE_LABELS[q.type] || q.type}
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {q.id}</span>
              </div>
              <div className="space-y-2.5">
                <h4 className="text-lg font-serif font-bold text-slate-800 leading-snug">
                  {q.prompt || (q.type === 'IdiomAssembly' ? '请根据成语释义，点击字块拼接出对应的四字成语：' : '(未设置题目提示)')}
                </h4>
                {q.type === 'IdiomAssembly' && (currentIdiomInfo?.full_meaning || currentIdiomInfo?.meaning) && (
                  <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5 text-sm text-emerald-950 leading-relaxed shadow-2xs">
                    <span className="font-bold text-emerald-800 mr-2 inline-flex items-center gap-1">
                      <span>💡</span>
                      <span>释义提示:</span>
                    </span>
                    <span className="font-medium">
                      {currentIdiomInfo.full_meaning || currentIdiomInfo.meaning?.replace(/^[^。；！？]+?：[^。；！？]+?[。；]\s*/, '')}
                    </span>
                  </div>
                )}
              </div>
              {(q as any).image && (
                <div className="flex justify-center my-2">
                  <CachedImage
                    src={(q as any).image}
                    alt="题目插图"
                    className="max-h-56 sm:max-h-64 w-auto object-contain rounded-2xl border-2 border-slate-200 shadow-md bg-white p-1"
                  />
                </div>
              )}
            </div>

            {(q.type === 'LineAssembly' || q.type === 'IdiomAssembly') && (
              <QuizAssemblyQuestion
                q={q}
                selectedChars={selectedChars}
                scrambledPool={scrambledPool}
                feedback={feedback}
                onRemoveSelectedChar={(idx, item) => {
                  if (feedback !== null) return;
                  const nextSelected = [...selectedChars];
                  nextSelected.splice(idx, 1);
                  setSelectedChars(nextSelected);

                  const nextPool = [...scrambledPool];
                  nextPool[item.poolIndex] = item.char;
                  setScrambledPool(nextPool);
                }}
                onSelectPoolChar={(char, poolIdx) => {
                  if (feedback !== null) return;
                  setSelectedChars([...selectedChars, { char, poolIndex: poolIdx }]);
                  const nextPool = [...scrambledPool];
                  nextPool[poolIdx] = null;
                  setScrambledPool(nextPool);
                }}
              />
            )}

            {q.type === 'ImageOrdering' && (
              <QuizImageOrderingQuestion
                q={q}
                poemLines={poemLines}
                bankImages={bankImages}
                placedSlots={placedSlots}
                selectedSource={selectedSource}
                feedback={feedback}
                onBankImageClick={handleBankImageClick}
                onSlotClick={handleSlotClick}
                onReturnSlotToBank={returnSlotToBank}
              />
            )}

            {q.type !== 'LineAssembly' && q.type !== 'IdiomAssembly' && q.type !== 'ImageOrdering' && (
              <QuizMultipleChoiceQuestion
                displayedOptions={displayedOptions}
                mcSelection={mcSelection}
                mappedAnswerIndex={mappedAnswerIndex}
                feedback={feedback}
                onSelectOption={setMcSelection}
              />
            )}

            {feedback && (
              <div className={`p-4 rounded-2xl border text-sm font-medium whitespace-pre-line animate-in fade-in slide-in-from-bottom-2 ${
                feedback.isCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                {feedback.text}
              </div>
            )}
          </div>
        )}

        {!isCompleted && (
          <QuizModalFooter
            q={q}
            currentIndex={currentIndex}
            currentRoundQuestions={currentRoundQuestions}
            roundMistakenIds={roundMistakenIds}
            feedback={feedback}
            hasSelection={hasSelection}
            onToggleSelectQuestion={onToggleSelectQuestion}
            onConfirmPublish={onConfirmPublish}
            onClose={onClose}
            onPrev={() => setCurrentIndex(i => Math.max(0, i - 1))}
            onNext={() => setCurrentIndex(i => Math.min(currentRoundQuestions.length - 1, i + 1))}
            onAdvanceNext={handleAdvanceNext}
            onVerify={handleVerify}
          />
        )}
      </div>
    </div>
  );
};

export default StudentQuizPreviewModal;
