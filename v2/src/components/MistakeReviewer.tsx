import { useState, useEffect, useRef, useCallback } from 'react';
import md5 from 'md5';
import { audioCache } from '../lib/audioCache';
import { mistakeService, type Mistake } from '../lib/mistakeService';
import { CountdownRing } from './CountdownRing';
import { useCountdown } from '../lib/useCountdown';
import './MistakeReviewer.css';

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
  const hash = md5(sentence);
  return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
};

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

interface SelectedWord {
  poolId: number;
  text: string;
}

interface PoolWord {
  id: number;
  text: string;
  selected: boolean;
}

interface MistakeReviewerProps {
  userId: string;
  initialMistakes: Mistake[];
  onClose: () => void;
  isPreReview?: boolean;
}

export function MistakeReviewer({ userId, initialMistakes, onClose, isPreReview }: MistakeReviewerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  const [queue, setQueue] = useState<Mistake[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [currentMistake, setCurrentMistake] = useState<Mistake | null>(null);
  const [completed, setCompleted] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  // Gameplay states
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [continueDisabled, setContinueDisabled] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  // Sentence Architect specific states
  const [wordPool, setWordPool] = useState<PoolWord[]>([]);
  const [userSelection, setUserSelection] = useState<SelectedWord[]>([]);

  // Spelling Hero specific states
  const [activeChunkIdx, setActiveChunkIdx] = useState(0);
  const [spellingSelection, setSpellingSelection] = useState<(string | null)[]>([]);
  const [shuffledChunkOpts, setShuffledChunkOpts] = useState<string[][]>([]);

  // Timer
  const countdownTimer = useCountdown(15, {
    onExpire: () => {
      if (timerExpired) return;
      setTimerExpired(true);
      handleCheckAnswer(null, true);
    }
  });

  const playAudio = async (url: string) => {
    if (!url) return;
    try {
      const blob = await audioCache.cacheAudio(url);
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = blobUrl;
        audioRef.current.onended = () => URL.revokeObjectURL(blobUrl);
        audioRef.current.play().catch(console.error);
      } else {
        const a = new Audio(blobUrl);
        a.onended = () => URL.revokeObjectURL(blobUrl);
        a.play().catch(console.error);
        audioRef.current = a;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const playSfx = async (type: 'correct' | 'wrong') => {
    const url = type === 'correct'
      ? `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
      : `${PUBLIC_URL_BASE}/ep/sfx/error.mp3`;
    try {
      const blob = await audioCache.cacheAudio(url);
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const a = new Audio(blobUrl);
      a.onended = () => URL.revokeObjectURL(blobUrl);
      a.play().catch(console.error);
      sfxRef.current = a;
    } catch (e) {
      console.error(e);
    }
  };

  // Start reviewer
  useEffect(() => {
    const shuffled = shuffle([...initialMistakes]);
    setQueue(shuffled);
    setActiveIdx(0);
    loadMistake(shuffled, 0);

    // Preload SFX
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`);
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/error.mp3`);
  }, [initialMistakes]);

  const loadMistake = useCallback((currentQueue: Mistake[], index: number) => {
    if (index >= currentQueue.length) {
      setCompleted(true);
      return;
    }

    const mistake = currentQueue[index];
    setCurrentMistake(mistake);
    setSelectedOption(null);
    setLocked(false);
    setShowFeedback(false);
    setTimerExpired(false);
    setContinueDisabled(false);

    const q = mistake.question;

    // Type-specific setups
    if (['vocab-master', 'grammar-wizard', 'passage-decoder', 'passage-decoder-w', 'passage-decoder-s'].includes(mistake.practiceType)) {
      const mapped = q.options.map((text: string, idx: number) => ({ text, originalIdx: idx }));
      setShuffledOptions(shuffle(mapped));
      countdownTimer.reset(mistake.practiceType === 'grammar-wizard' ? 30 : 15);
    } else if (mistake.practiceType === 'sentence-architect') {
      const cleanEn = q.en.replace(/[.!?]$/, "");
      const originalWords = cleanEn.split(" ");
      const noise = q.noise || [];
      const allWords = shuffle([...originalWords, ...noise]);
      
      setWordPool(allWords.map((word, idx) => ({
        id: idx,
        text: word,
        selected: false
      })));
      setUserSelection([]);
      countdownTimer.reset(30);
    } else if (mistake.practiceType === 'spelling-hero') {
      const chunks = q.chunks || [];
      setSpellingSelection(new Array(chunks.length).fill(null));
      setActiveChunkIdx(0);
      setShuffledChunkOpts(chunks.map((c: any) => shuffle([...c.options])));
      countdownTimer.reset(15);
    }
  }, [countdownTimer]);

  const handleOptionClick = (originalIdx: number) => {
    if (locked) return;
    setSelectedOption(originalIdx);
  };

  const handleCheckAnswer = useCallback((saSelection?: SelectedWord[], forceWrong = false) => {
    if (!currentMistake || locked) return;
    setLocked(true);
    countdownTimer.pause();

    setContinueDisabled(true);
    setTimeout(() => setContinueDisabled(false), 800);

    const q = currentMistake.question;
    let correct = false;
    let wrongAnswer: any = undefined;

    if (!forceWrong) {
      if (['vocab-master', 'grammar-wizard', 'passage-decoder', 'passage-decoder-w', 'passage-decoder-s'].includes(currentMistake.practiceType)) {
        correct = selectedOption === q.answer;
        wrongAnswer = selectedOption !== null ? q.options[selectedOption] : undefined;
      } else if (currentMistake.practiceType === 'sentence-architect') {
        const selection = saSelection || userSelection;
        const constructed = selection.map((item, idx) => {
          let t = item.text;
          if (idx === 0) {
            if (t.charAt(0) === t.charAt(0).toLowerCase()) {
              t = t.charAt(0).toUpperCase() + t.slice(1);
            }
          }
          return t;
        }).join(" ");
        const target = q.en.replace(/[.!?]$/, "");
        correct = constructed === target;
        if (!correct && q.accept) {
          correct = q.accept.some((alt: string) => alt.replace(/[.!?]$/, "") === constructed);
        }
        wrongAnswer = constructed;
      } else if (currentMistake.practiceType === 'spelling-hero') {
        correct = spellingSelection.every((val, i) => val === q.chunks[i].correct);
        wrongAnswer = spellingSelection.filter(Boolean).join("-");
      }
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      playSfx('correct');
      // Resolve mistake locally immediately IF it wasn't failed already in this session
      if (!failedIds.has(currentMistake.id) && !isPreReview) {
        mistakeService.resolveMistake(userId, currentMistake.id, true);
      }
      
      // Play voice audio if it exists
      if (currentMistake.practiceType === 'vocab-master' && q.context_sentence) {
        setTimeout(() => playAudio(getAudioUrl(q.context_sentence, currentMistake.textbook)), 250);
      } else if (currentMistake.practiceType === 'sentence-architect' && q.en) {
        const sentenceAudioUrl = q.audio || getAudioUrl(q.en, currentMistake.textbook);
        setTimeout(() => playAudio(sentenceAudioUrl), 250);
      } else if (currentMistake.practiceType === 'spelling-hero' && q.audio) {
        setTimeout(() => playAudio(q.audio), 250);
      }
    } else {
      playSfx('wrong');
      // Mark as failed in this session
      setFailedIds(prev => new Set(prev).add(currentMistake.id));
      
      // Update mistake: unresolved, reset streak, increment attempts, set createdAt = now (deferring to next day)
      mistakeService.addMistake(userId, {
        practiceId: currentMistake.practiceId,
        textbook: currentMistake.textbook,
        unit: currentMistake.unit,
        practiceType: currentMistake.practiceType,
        question: q,
        wrongAnswer
      });
    }
  }, [currentMistake, locked, selectedOption, userSelection, spellingSelection, userId, countdownTimer]);

  const handleContinue = useCallback(() => {
    if (!currentMistake) return;

    let nextQueue = [...queue];
    if (!isCorrect) {
      // Move current mistake to the end of the queue
      const current = nextQueue[activeIdx];
      nextQueue.push(current);
      setQueue(nextQueue);
    }

    const nextIdx = activeIdx + 1;
    setActiveIdx(nextIdx);
    loadMistake(nextQueue, nextIdx);
  }, [currentMistake, queue, isCorrect, activeIdx, loadMistake]);

  // Sentence Architect functions
  const handleSelectWord = (word: PoolWord) => {
    if (locked || word.selected) return;
    setUserSelection(prev => [...prev, { poolId: word.id, text: word.text }]);
    setWordPool(prev => prev.map(w => w.id === word.id ? { ...w, selected: true } : w));
  };

  const handleRemoveWord = (idx: number, item: SelectedWord) => {
    if (locked) return;
    setUserSelection(prev => prev.filter((_, i) => i !== idx));
    setWordPool(prev => prev.map(w => w.id === item.poolId ? { ...w, selected: false } : w));
  };

  // Spelling Hero functions
  const handleSelectChunk = (chunkText: string) => {
    if (locked) return;
    const next = [...spellingSelection];
    next[activeChunkIdx] = chunkText;
    setSpellingSelection(next);

    if (activeChunkIdx < (currentMistake?.question.chunks.length - 1)) {
      setActiveChunkIdx(activeChunkIdx + 1);
    }
  };

  const handleExit = () => {
    countdownTimer.pause();
    if (window.confirm("Are you sure you want to exit the review session? Your resolved mistakes are saved.")) {
      mistakeService.syncToServer(userId);
      onClose();
    } else {
      if (!locked) countdownTimer.resume();
    }
  };

  useEffect(() => {
    return () => {
      // Sync on unmount just in case
      mistakeService.syncToServer(userId);
    };
  }, [userId]);

  // Keyboard Shortcuts for Enter key to check answer and continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || !currentMistake) return;

      const isMc = ['vocab-master', 'grammar-wizard', 'passage-decoder', 'passage-decoder-w', 'passage-decoder-s'].includes(currentMistake.practiceType);

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!locked) {
          const isReady = !(
            (isMc && selectedOption === null) ||
            (currentMistake.practiceType === 'sentence-architect' && userSelection.length === 0) ||
            (currentMistake.practiceType === 'spelling-hero' && spellingSelection.some(v => v === null))
          );
          if (isReady) {
            handleCheckAnswer();
          }
        } else if (!continueDisabled) {
          handleContinue();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completed, currentMistake, locked, selectedOption, userSelection, spellingSelection, continueDisabled, handleCheckAnswer, handleContinue]);

  if (completed) {
    return (
      <div className="mr-overlay">
        <div className="mr-card completed">
          <span className="mr-completed-emoji">🎉</span>
          <h2 className="mr-completed-title">All Done!</h2>
          <p className="mr-completed-text">You have successfully reviewed and resolved these mistakes.</p>
          <button className="mr-btn primary" onClick={() => {
            mistakeService.syncToServer(userId);
            onClose();
          }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentMistake) return null;

  const q = currentMistake.question;
  const isMc = ['vocab-master', 'grammar-wizard', 'passage-decoder', 'passage-decoder-w', 'passage-decoder-s'].includes(currentMistake.practiceType);

  return (
    <div className="mr-overlay">
      <div className="mr-card">
        {/* Progress Bar */}
        <div className="mr-progress-bar">
          {queue.map((_, i) => (
            <div key={i} className={`mr-progress-dot ${i === activeIdx ? 'active' : ''}`} />
          ))}
        </div>

        {/* Top Header */}
        <div className="mr-header">
          <div className="mr-header-left">
            <button className="mr-close-btn" onClick={handleExit}>✕</button>
            <div className="mr-timer-wrapper">
              <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={currentMistake.practiceType === 'grammar-wizard' ? 30 : 15} isRunning={countdownTimer.isRunning && !locked} />
            </div>
          </div>
          <div className="mr-title-group">
            <span className="mr-badge">{currentMistake.practiceType.replace('-', ' ').toUpperCase()}</span>
            <div className="mr-unit-title">{currentMistake.textbook} - {currentMistake.unit}</div>
          </div>
          <div className="mr-header-right" style={{ width: 40 }} />
        </div>

        {/* Question Area */}
        <div className="mr-question-body">
          {/* 1. Multiple Choice */}
          {isMc && (
            <div className="mr-mc-layout">
              <div className="mr-prompt">
                {currentMistake.practiceType.startsWith('passage-decoder') ? (
                  <>
                    {q.speaker && <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{q.speaker}: </span>}
                    {q.en}
                  </>
                ) : (
                  q.prompt
                )}
              </div>
              <div className="mr-options-grid">
                {shuffledOptions.map((opt, i) => {
                  let classes = "mr-option-btn";
                  if (locked) {
                    if (opt.originalIdx === q.answer) classes += " correct";
                    else if (selectedOption === opt.originalIdx) classes += " wrong";
                  } else if (selectedOption === opt.originalIdx) {
                    classes += " selected";
                  }
                  return (
                    <button
                      key={i}
                      className={classes}
                      disabled={locked}
                      onClick={() => handleOptionClick(opt.originalIdx)}
                    >
                      <span className="mr-opt-marker">{i + 1}</span>
                      <span className="mr-opt-text">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Sentence Architect */}
          {currentMistake.practiceType === 'sentence-architect' && (
            <div className="mr-sa-layout">
              <div className="mr-prompt">{q.cn}</div>

              {/* User construction slot */}
              <div className="mr-sa-selection">
                {userSelection.length === 0 && <span className="mr-sa-placeholder">Tap words below to assemble...</span>}
                {userSelection.map((item, idx) => {
                  let text = item.text;
                  if (idx === 0 && text.charAt(0) === text.charAt(0).toLowerCase()) {
                    text = text.charAt(0).toUpperCase() + text.slice(1);
                  }
                  return (
                    <button
                      key={idx}
                      className="mr-sa-word-btn active"
                      disabled={locked}
                      onClick={() => handleRemoveWord(idx, item)}
                    >
                      {text}
                    </button>
                  );
                })}
              </div>

              {/* Word pool */}
              <div className="mr-sa-pool">
                {wordPool.map((word) => (
                  <button
                    key={word.id}
                    className={`mr-sa-word-btn ${word.selected ? 'used' : ''}`}
                    disabled={locked || word.selected}
                    onClick={() => handleSelectWord(word)}
                  >
                    {word.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Spelling Hero */}
          {currentMistake.practiceType === 'spelling-hero' && (
            <div className="mr-sh-layout">
              <div className="mr-prompt-meaning">{q.meaning}</div>
              <div className="mr-sh-syllable-badge">{q.type}</div>

              {/* Syllable Slots */}
              <div className="mr-sh-slots">
                {q.chunks.map((chunk: any, i: number) => {
                  let cls = "mr-sh-slot";
                  if (i === activeChunkIdx && !locked) cls += " active";
                  else if (spellingSelection[i]) cls += " filled";
                  if (locked && showFeedback) {
                    if (spellingSelection[i] === chunk.correct) cls += " correct";
                    else if (spellingSelection[i]) cls += " wrong";
                  }
                  return (
                    <div key={i} className={cls} onClick={() => !locked && setActiveChunkIdx(i)}>
                      {spellingSelection[i] || '?'}
                    </div>
                  );
                })}
              </div>

              {/* Syllable Options */}
              <div className="mr-sh-options">
                {(shuffledChunkOpts[activeChunkIdx] || []).map((opt, idx) => (
                  <button
                    key={idx}
                    className={`mr-sh-opt-btn ${spellingSelection[activeChunkIdx] === opt ? 'selected' : ''}`}
                    disabled={locked}
                    onClick={() => handleSelectChunk(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className={`mr-feedback ${showFeedback ? 'visible' : ''} ${isCorrect ? 'correct' : 'wrong'}`}>
          {showFeedback && (
            <div className="mr-feedback-content">
              <div className="mr-feedback-header">
                <span className="mr-feedback-status">{isCorrect ? '✨ Correct!' : '❌ Keep Learning'}</span>
              </div>
              {!currentMistake.practiceType.startsWith('passage-decoder') && (
                <div className="mr-feedback-explanation">
                  {currentMistake.practiceType === 'vocab-master' && (
                    <>
                      <p className="mr-meaning-text"><strong>{q.word}</strong>: {q.meaning}</p>
                      {q.context_sentence && <p className="mr-context-sentence">📖 {q.context_sentence}</p>}
                      {q.cn && <p className="mr-context-sentence-cn">🇨🇳 {q.cn}</p>}
                    </>
                  )}
                  {currentMistake.practiceType === 'grammar-wizard' && (
                    <>
                      <p className="mr-meaning-text"><strong>Correct:</strong> {q.options[q.answer]}</p>
                      {q.explanation && <p className="mr-explanation-text">💡 {q.explanation}</p>}
                    </>
                  )}
                  {currentMistake.practiceType === 'sentence-architect' && (
                    <>
                      <p className="mr-meaning-text"><strong>Target Sentence:</strong></p>
                      <p className="mr-context-sentence">📖 {q.en}</p>
                      {q.accept && q.accept.length > 1 && (
                        <p className="mr-explanation-text">Accepted: {q.accept.join(" | ")}</p>
                      )}
                    </>
                  )}
                  {currentMistake.practiceType === 'spelling-hero' && (
                    <>
                      <p className="mr-meaning-text"><strong>Word:</strong> {q.word}</p>
                      <p className="mr-explanation-text">Meaning: {q.meaning}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mr-footer">
          {!locked ? (
            <button
              className="mr-btn primary"
              disabled={
                (isMc && selectedOption === null) ||
                (currentMistake.practiceType === 'sentence-architect' && userSelection.length === 0) ||
                (currentMistake.practiceType === 'spelling-hero' && spellingSelection.some(v => v === null))
              }
              onClick={() => handleCheckAnswer()}
            >
              Check Answer
            </button>
          ) : (
            <button className="mr-btn continue" disabled={continueDisabled} onClick={handleContinue}>
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
