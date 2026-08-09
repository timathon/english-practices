import React, { useState, useEffect, useMemo } from 'react';
import { apiService, PoemQuestion } from '../services/api';
import { playAnswerSFX } from '../utils/sound';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { CachedImage } from './CachedImage';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  LineAssembly:   '连句组装',
  VerseCloze:    '诗句填空',
  PinyinMatch:   '拼音辨析',
  TextToCn:      '诗意理解',
  CulturalContext:'文化背景',
  ImageOrdering: '插图排序',
  ImageToLine:   '图配句',
};

const TYPE_COLORS: Record<string, string> = {
  LineAssembly:   'bg-violet-100 text-violet-800 border-violet-200',
  VerseCloze:    'bg-teal-100 text-teal-800 border-teal-200',
  PinyinMatch:   'bg-sky-100 text-sky-800 border-sky-200',
  TextToCn:      'bg-amber-100 text-amber-800 border-amber-200',
  CulturalContext:'bg-rose-100 text-rose-800 border-rose-200',
  ImageOrdering: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ImageToLine:   'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export const StudentQuizPreviewModal: React.FC<{
  poemTitle: string;
  questions: PoemQuestion[];
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
  const [currentRoundQuestions, setCurrentRoundQuestions] = useState<PoemQuestion[]>(questions);
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

  const q = currentRoundQuestions[currentIndex];
  const isQuestionSelected = selectedQuestionIds ? selectedQuestionIds.includes(q?.id || '') : true;

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

    if (q.type === 'LineAssembly') {
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
    } else if (q.type !== 'LineAssembly' && q.type !== 'ImageOrdering') {
      const rawOpts = (q as any).options || [];
      const correctOpt = rawOpts[(q as any).answer] ?? rawOpts[0] ?? '';
      const shuffled = [...rawOpts].sort(() => Math.random() - 0.5);
      setDisplayedOptions(shuffled);
      setMappedAnswerIndex(shuffled.indexOf(correctOpt));
    }
  }, [currentIndex, q, submittedQuestionStates]);

  // Keyboard Navigation: Left/Right Arrow for Previous/Next, Enter for Submit / Advance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard shortcuts if active element is an input or textarea
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
          // Trigger verify/submit if selection is present
          const hasSelection = (() => {
            if (!q) return false;
            if (q.type === 'LineAssembly') return selectedChars.length > 0;
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

  if (!q && !isCompleted) return null;

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
    let currentMcSelection = mcSelection;
    let currentSelectedChars = selectedChars;
    let currentScrambledPool = scrambledPool;
    let currentBankImages = bankImages;
    let currentPlacedSlots = placedSlots;
    let currentDisplayedOptions = displayedOptions;
    let currentMappedAnswerIndex = mappedAnswerIndex;

    if (q.type === 'LineAssembly') {
      const studentAns = selectedChars.map(c => c.char).join('');
      const isRight = studentAns === q.answer;
      if (isRight) {
        playAnswerSFX('correct');
        currentFeedback = { isCorrect: true, text: '🎉 回答正确！精准拼接出了正确的诗句。' };
      } else {
        playAnswerSFX('wrong');
        currentFeedback = { isCorrect: false, text: `❌ 还需要加油哦！正确诗句是：“${q.answer}”` };
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
      // Reached the end of current round
      if (roundMistakenIds.length > 0) {
        // Prepare remediation round
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
        // No mistakes remaining! Complete quiz
        setIsCompleted(true);
      }
    }
  };

  // ImageOrdering click handling (Fixed bank slots)
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

    // Remove source from its original location
    if (selectedSource.type === 'bank') {
      newBank[selectedSource.index] = null; // LEAVE BLANK AT FIXED INDEX
    } else {
      newPlaced[selectedSource.index] = null;
    }

    // If target slot had an existing image, return it to its fixed original bank slot
    if (existingTargetImg) {
      const origBankIdx = initialBankOrder.indexOf(existingTargetImg);
      if (origBankIdx !== -1) {
        newBank[origBankIdx] = existingTargetImg;
      }
    }

    // Place source into target slot
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

  return (
    <div className="fixed inset-0 !mt-0 !m-0 bg-black/75 z-[110] flex items-center justify-center p-4" onClick={() => onClose()}>
      <div
        className={`rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors ${
          isQuestionSelected
            ? 'bg-white border border-slate-200'
            : 'bg-amber-50 border-2 border-amber-400/80 shadow-amber-900/20'
        }`}
        onClick={e => e.stopPropagation()}
      >
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
                let indicatorText = '';

                if (submittedState) {
                  if (submittedState.feedback.isCorrect) {
                    if (firstAttempt === false) {
                      // Corrected during remediation round
                      bgStyle = 'bg-amber-500 border-amber-400 shadow-amber-500/50';
                      indicatorText = '✏️';
                    } else {
                      // First time correct
                      bgStyle = 'bg-emerald-500 border-emerald-400 shadow-emerald-500/50';
                      indicatorText = '✓';
                    }
                  } else {
                    // Incorrect
                    bgStyle = 'bg-rose-500 border-rose-400 shadow-rose-500/50';
                    indicatorText = '✕';
                  }
                }

                const isPreviewMode = !!(onToggleSelectQuestion || onConfirmPublish);
                const isNavigable = isPreviewMode || idx <= currentIndex || feedback !== null || submittedState !== undefined;

                return (
                  <div
                    key={qItem.id || idx}
                    onClick={() => {
                      if (isNavigable) {
                        setCurrentIndex(idx);
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

        {isCompleted ? (
          (() => {
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
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>🚀 确认发布作业</span>
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
          })()
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
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs transition whitespace-nowrap"
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
              <h4 className="text-lg font-serif font-bold text-slate-800 leading-snug">
                {q.prompt || '(未设置题目提示)'}
              </h4>
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

            {q.type === 'LineAssembly' && (
              <div className="space-y-5">
                <div className={`min-h-[64px] rounded-2xl p-3 flex flex-wrap gap-2 justify-center items-center border-2 transition ${
                  feedback
                    ? feedback.isCorrect
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : 'bg-rose-50/80 border-rose-300'
                    : 'bg-amber-50/80 border-dashed border-amber-300'
                }`}>
                  {selectedChars.length === 0 ? (
                    <span className="text-xs text-amber-700/70 font-medium">点击下方汉字块组成诗句</span>
                  ) : (
                    selectedChars.map((item, idx) => {
                      const isSubmitted = feedback !== null;
                      const targetChar = (q.answer || '')[idx];
                      const isCharRight = isSubmitted && item.char === targetChar;

                      return (
                        <button
                          key={idx}
                          disabled={isSubmitted}
                          onClick={() => {
                            if (isSubmitted) return;
                            const nextSelected = [...selectedChars];
                            nextSelected.splice(idx, 1);
                            setSelectedChars(nextSelected);

                            const nextPool = [...scrambledPool];
                            nextPool[item.poolIndex] = item.char;
                            setScrambledPool(nextPool);
                          }}
                          className={`w-10 h-10 font-bold rounded-xl text-lg font-serif transition transform ${
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

                <div className="flex flex-wrap gap-2.5 justify-center p-2">
                  {scrambledPool.map((char, poolIdx) => {
                    const isSubmitted = feedback !== null;

                    if (char === null) {
                      return (
                        <div
                          key={poolIdx}
                          className="w-12 h-12 border-2 border-dashed border-slate-200 bg-slate-100/50 rounded-2xl flex items-center justify-center text-slate-300 text-xs font-mono font-bold"
                        >
                          ·
                        </div>
                      );
                    }

                    return (
                      <button
                        key={poolIdx}
                        disabled={isSubmitted}
                        onClick={() => {
                          if (isSubmitted) return;
                          setSelectedChars([...selectedChars, { char, poolIndex: poolIdx }]);
                          const nextPool = [...scrambledPool];
                          nextPool[poolIdx] = null;
                          setScrambledPool(nextPool);
                        }}
                        className={`w-12 h-12 border font-serif font-bold rounded-2xl text-xl shadow-xs transition transform ${
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
            )}

            {q.type === 'ImageOrdering' && (
              <div className="space-y-5">
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
                      onClick={() => returnSlotToBank(selectedSource.index)}
                      className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold"
                    >
                      ↩ 放回备选库
                    </button>
                  )}
                </div>

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
                            if (!feedback) handleBankImageClick(bIdx);
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

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    🎯 诗句排序位置 (Target Places)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {placedSlots.map((slotImg, sIdx) => {
                      const isSelected = !feedback && selectedSource?.type === 'slot' && selectedSource.index === sIdx;
                      const targetImg = (q.images || [])[sIdx];
                      const lineText = poemLines[sIdx] || `第 ${sIdx + 1} 句`;
                      const isSubmitted = feedback !== null;
                      const isSlotCorrect = isSubmitted && slotImg === targetImg;

                      return (
                        <div
                          key={sIdx}
                          onClick={() => {
                            if (!feedback) handleSlotClick(sIdx);
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
                                  returnSlotToBank(sIdx);
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
            )}

            {q.type !== 'LineAssembly' && q.type !== 'ImageOrdering' && (
              <div className="space-y-3">
                {displayedOptions.map((opt, idx) => {
                  const isSelected = mcSelection === idx;
                  const isSubmitted = feedback !== null;
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
                      onClick={() => setMcSelection(idx)}
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
          <div className="bg-white border-t border-slate-200 flex flex-col">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-30 transition"
                >
                  ← 上一题
                </button>

                {currentIndex === currentRoundQuestions.length - 1 && feedback !== null ? (
                  <button
                    onClick={handleAdvanceNext}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5 animate-bounce"
                  >
                    {roundMistakenIds.length > 0 ? (
                      <span>🔄 重练错题 ({roundMistakenIds.length}题) →</span>
                    ) : (
                      <span>🎉 完成打卡 & 查看成绩 →</span>
                    )}
                  </button>
                ) : (() => {
                  const isPreviewMode = !!(onToggleSelectQuestion || onConfirmPublish);
                  const isNextDisabled = currentIndex === currentRoundQuestions.length - 1 || (!isPreviewMode && feedback === null);

                  return (
                    <button
                      onClick={() => setCurrentIndex(i => Math.min(currentRoundQuestions.length - 1, i + 1))}
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
                  );
                })()}
              </div>

              {(() => {
                const hasSelection = (() => {
                  if (q.type === 'LineAssembly') return selectedChars.length > 0;
                  if (q.type === 'ImageOrdering') return placedSlots.some(s => s !== null);
                  return mcSelection !== null;
                })();

                const isSubmitDisabled = feedback !== null || !hasSelection;

                return (
                  <button
                    onClick={handleVerify}
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
                );
              })()}
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
                  <span>🚀 确认发布作业</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentQuizPreviewModal;
