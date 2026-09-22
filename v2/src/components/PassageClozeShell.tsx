import { useState, useRef, useEffect, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'
import './PassageClozeShell.css'
import { DailyLockModal } from './DailyLockModal'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { usePracticeRecords } from '../hooks/usePracticeRecords'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import md5 from 'md5'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'
import { GrammarPointModal } from './cloze/GrammarPointModal'
import { ArticleReadingModal } from './cloze/ArticleReadingModal'
import { PassageViewport } from './cloze/PassageViewport'
import { QuestionPane } from './cloze/QuestionPane'
import { CompletionReview } from './cloze/CompletionReview'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

export function PassageClozeShell({ data, practiceId, unit, textbook }: any) {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const sfxRef = useRef<HTMLAudioElement | null>(null)
    const sentenceAudioRef = useRef<HTMLAudioElement | null>(null)
    const activeSentenceRef = useRef<HTMLSpanElement | null>(null)
    const lastActiveSectionIdRef = useRef<string | null>(null)

    // Grammar Index Modal State
    const [grammarIndexData, setGrammarIndexData] = useState<any>(null)
    const [activeGrammarPointModal, setActiveGrammarPointModal] = useState<any>(null)

    // Article Translation & Reading Modal State
    const [translationModalOpen, setTranslationModalOpen] = useState(false)
    const [revealedTranslationIndex, setRevealedTranslationIndex] = useState<number | null>(null)
    const [highlightedSentenceIndex, setHighlightedSentenceIndex] = useState<number | null>(null)
    const [playingSentenceIdx, setPlayingSentenceIdx] = useState<number | null>(null)
    const [autoPlayNext, setAutoPlayNext] = useState(false)
    const autoPlayNextRef = useRef(false)
    const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const modalSentenceRefs = useRef<{ [idx: number]: HTMLElement | null }>({})

    // Auto-scroll playing sentence into view in the reading modal as high as possible (to top)
    useEffect(() => {
        if (translationModalOpen && playingSentenceIdx !== null) {
            const el = modalSentenceRefs.current[playingSentenceIdx];
            if (el) {
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    }, [playingSentenceIdx, translationModalOpen]);

    const toggleTranslation = (sIdx: number) => {
        setHighlightedSentenceIndex(sIdx);
        if (translationTimeoutRef.current) {
            clearTimeout(translationTimeoutRef.current);
            translationTimeoutRef.current = null;
        }

        if (revealedTranslationIndex === sIdx) {
            setRevealedTranslationIndex(null);
        } else {
            setRevealedTranslationIndex(sIdx);
            // Auto revert back to English after 5 seconds
            translationTimeoutRef.current = setTimeout(() => {
                setRevealedTranslationIndex(prev => prev === sIdx ? null : prev);
                translationTimeoutRef.current = null;
            }, 5000);
        }
    };

    const stopSentenceAudio = () => {
        if (sentenceAudioRef.current) {
            sentenceAudioRef.current.pause();
            sentenceAudioRef.current = null;
        }
        setPlayingSentenceIdx(null);
    };

    const playSentenceAudio = async (text: string, idx: number) => {
        if (!text || !textbook) return;

        // If clicking on the currently playing sentence, stop it
        if (playingSentenceIdx === idx && sentenceAudioRef.current) {
            stopSentenceAudio();
            return;
        }

        if (sentenceAudioRef.current) {
            sentenceAudioRef.current.pause();
            sentenceAudioRef.current = null;
        }

        const cleanText = text.replace(/^#+\s*/, '').trim();
        const url = getAudioUrl(cleanText, textbook);
        setPlayingSentenceIdx(idx);
        setHighlightedSentenceIndex(idx);

        try {
            const blob = await audioCache.cacheAudio(url);
            if (blob) {
                const audio = new Audio(URL.createObjectURL(blob));
                sentenceAudioRef.current = audio;
                audio.onended = () => {
                    const allSentences = (activeSection?.filled_text || activeSection?.raw_text || []);
                    if (autoPlayNextRef.current && idx + 1 < allSentences.length) {
                        const nextIdx = idx + 1;
                        const nextSent = allSentences[nextIdx];
                        const nextClean = nextSent.replace(/^#+\s*/, '').trim();
                        playSentenceAudio(nextClean, nextIdx);
                    } else {
                        setPlayingSentenceIdx(null);
                    }
                };
                audio.play().catch(e => {
                    console.warn("Failed to play sentence audio:", e);
                    setPlayingSentenceIdx(null);
                });
            } else {
                setPlayingSentenceIdx(null);
            }
        } catch (e) {
            console.warn("Play sentence audio error:", e);
            setPlayingSentenceIdx(null);
        }
    };

    // Load grammar index data
    useEffect(() => {
        let indexPracticeId = 'A10_a10-yp_a10-yp-grammar-index';
        if (practiceId && practiceId.includes('_')) {
            const parts = practiceId.split('_');
            if (parts.length >= 2) {
                indexPracticeId = `${parts[0]}_${parts[1]}_${parts[1]}-grammar-index`;
            }
        }

        fetch(`${API_URL}/api/practices/${indexPracticeId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(resData => {
                if (resData && !resData.error) {
                    let content = resData.content;
                    if (resData.isEncrypted && typeof content === 'string') {
                        try {
                            content = decryptContent(content, OBSCURE_KEY);
                        } catch (e) {
                            console.error("Grammar index decryption failed:", e);
                            return;
                        }
                    }
                    setGrammarIndexData(content);
                }
            })
            .catch(err => {
                console.warn("Failed to load grammar index:", err);
            });
    }, [practiceId]);

    const sections = (data?.sections || []).map((sec: any, idx: number) => ({
        ...sec,
        id: sec.id || `sec_${idx + 1}`
    }));

    const [activeSection, setActiveSection] = useState<any>(null)
    const [flickeringSectionId, setFlickeringSectionId] = useState<string | null>(null)
    const [questionsQueue, setQuestionsQueue] = useState<any[]>([])
    const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
    const [currentQIndex, setCurrentQIndex] = useState(0)
    const [isRedemption, setIsRedemption] = useState(false)
    const [answersLog, setAnswersLog] = useState<Array<{ answeredOption: number | null; answeredText?: string | null; isCorrect: boolean }>>([])

    const [q, setQ] = useState<any>(null)
    const [showOptions, setShowOptions] = useState(false)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [locked, setLocked] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [finalScore, setFinalScore] = useState(0)

    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {})

    // Countdown timer (15s per question once options are revealed)
    const countdownTimer = useCountdown(15, {
        onExpire: () => {
            if (timerExpiredRef.current) return
            timerExpiredRef.current = true
            checkAnswerRef.current(true)
        }
    })

    const {
        practiceRecords,
        setActiveRecordId,
        recordIdPromiseRef,
        loadRecords,
        syncRecord: baseSyncRecord,
        getStats
    } = usePracticeRecords({ practiceId })
    const hasFinishedRef = useRef(false)

    const blocker = useBlocker(
        ({ nextLocation, currentLocation }) =>
            !!activeSection && !completed && nextLocation.pathname !== currentLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === 'blocked') {
            const proceed = window.confirm('您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。');
            if (proceed) {
                setActiveSection(null);
                blocker.reset();
            } else {
                blocker.reset();
            }
        }
    }, [blocker]);

    const [gainedXp, setGainedXp] = useState(0)
    const [gainedLove, setGainedLove] = useState(0)
    const [historicalBest, setHistoricalBest] = useState(0)
    const [isNewHigh, setIsNewHigh] = useState(false)
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)

    const primaryColor = data?.primaryColor || '#0284c7'
    const primaryDarkColor = data?.primaryColorDark || '#0369a1'

    const handleSectionSelect = (sec: any) => {
        const stats = getStats(sec.title);
        if (stats.todayBest === 100) {
            setLockModalOpen(true);
            return;
        }
        const hasConsumed = trialsTracker.consumeTrial(practiceId, sec.id)
        if (!hasConsumed) return;

        lastActiveSectionIdRef.current = sec.id
        setFlickeringSectionId(null)
        setActiveSection(sec)
        setActiveRecordId(null)
        setGainedXp(0)
        setGainedLove(0)
        recordIdPromiseRef.current = null
        hasFinishedRef.current = false

        const qs = (sec.questions || []).map((question: any, i: number) => ({
            ...question,
            originalIndex: i
        }))

        setQuestionsQueue(qs)
        setMistakeQueue([])
        setCurrentQIndex(0)
        setIsRedemption(false)
        setAnswersLog([])
        setCompleted(false)

        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3");
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3");

        loadQuestion(qs, [], 0, false)
    }

    const loadQuestion = (queue: any[], currentMistakes: any[], index: number, redemption: boolean) => {
        let nextQ: any = null
        let isRedemp = redemption

        if (index < queue.length) {
            nextQ = queue[index]
            isRedemp = false
        } else if (currentMistakes.length > 0) {
            nextQ = currentMistakes[0]
            isRedemp = true
        } else {
            finishPractice(queue)
            return
        }

        // Shuffle options and recalculate correct answer index each time question is presented
        if (nextQ && Array.isArray(nextQ.options) && nextQ.options.length > 0) {
            const originalCorrect = nextQ.options[nextQ.answer];
            const indices = nextQ.options.map((_: any, i: number) => i);
            // Fisher-Yates shuffle
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            const shuffledOptions = indices.map((i: number) => nextQ.options[i]);
            const newAnswerIndex = shuffledOptions.indexOf(originalCorrect);

            nextQ = {
                ...nextQ,
                options: shuffledOptions,
                answer: newAnswerIndex !== -1 ? newAnswerIndex : nextQ.answer
            };
        }

        setQ(nextQ)
        setIsRedemption(isRedemp)
        setSelectedOption(null)
        setShowOptions(false)
        setLocked(false)
        timerExpiredRef.current = false
        countdownTimer.pause()
    }

    const playSfx = async (type: 'correct' | 'wrong') => {
        const url = type === 'correct'
            ? "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3"
            : "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3";
        try {
            const blob = await audioCache.cacheAudio(url);
            if (!blob) return;
            const blobUrl = URL.createObjectURL(blob);
            if (sfxRef.current) {
                sfxRef.current.src = blobUrl;
                sfxRef.current.onended = () => URL.revokeObjectURL(blobUrl)
                sfxRef.current.play().catch(console.error)
            } else {
                const a = new Audio(blobUrl)
                a.onended = () => URL.revokeObjectURL(blobUrl)
                a.play().catch(console.error)
                sfxRef.current = a
            }
        } catch (e) { console.error(e) }
    }

    const syncRecord = useCallback(async (scorePercent: number, isFinished: boolean) => {
        if (isFinished) {
            hasFinishedRef.current = true
        } else if (hasFinishedRef.current) {
            return
        }
        if (activeSection) {
            await baseSyncRecord(activeSection.title, scorePercent, isFinished)
        }
    }, [baseSyncRecord, activeSection])

    const checkAnswer = useCallback((optionIdx: number | null, forceWrong?: boolean) => {
        if (locked) return
        if (!forceWrong && optionIdx === null) return
        setLocked(true)
        countdownTimer.pause()

        const isCorrect = !forceWrong && optionIdx === q.answer
        setSelectedOption(optionIdx)

        let updatedMistakes = [...mistakeQueue]
        const newAnswersLog = [...answersLog]

        const chosenText = optionIdx !== null && q?.options ? q.options[optionIdx] : null;

        if (isCorrect) {
            playSfx('correct')
            if (!invisibleMode) {
                const { xpGain } = petService.awardCorrectAnswer()
                setGainedXp(prev => prev + xpGain)
                setGainedLove(prev => prev + 1)
            }
            if (isRedemption) {
                updatedMistakes.shift() // Resolved mistake, remove from queue
            } else {
                newAnswersLog[q.originalIndex] = {
                    answeredOption: optionIdx,
                    answeredText: chosenText,
                    isCorrect: true
                }
            }
        } else {
            playSfx('wrong')
            if (!isRedemption) {
                newAnswersLog[q.originalIndex] = {
                    answeredOption: optionIdx,
                    answeredText: chosenText,
                    isCorrect: false
                }
                updatedMistakes.push(q) // Add to mistake queue for redemption

                if (userId && !invisibleMode) {
                    mistakeService.addMistake(userId, {
                        practiceId,
                        textbook,
                        unit,
                        practiceType: 'passage-cloze',
                        question: q,
                        wrongAnswer: chosenText || undefined
                    });
                }
            } else {
                // Wrong again during redemption, move to the end of mistakeQueue
                const missed = updatedMistakes.shift()
                if (missed) {
                    updatedMistakes.push(missed)
                }
            }
        }

        setMistakeQueue(updatedMistakes)
        setAnswersLog(newAnswersLog)

        const totalCorrect = newAnswersLog.filter(a => a?.isCorrect).length
        const scorePercent = Math.round((totalCorrect / questionsQueue.length) * 100)
        if (!invisibleMode) {
            const isLast = !isRedemption && currentQIndex === questionsQueue.length - 1 && updatedMistakes.length === 0
            syncRecord(scorePercent, isLast)
        }
    }, [locked, q, answersLog, currentQIndex, isRedemption, mistakeQueue, questionsQueue.length, countdownTimer, invisibleMode, userId, practiceId, textbook, unit, syncRecord])

    useEffect(() => {
        checkAnswerRef.current = (forceWrong?: boolean) => {
            checkAnswer(null, forceWrong)
        }
    }, [checkAnswer])

    const nextQuestion = useCallback(() => {
        let nextIndex = currentQIndex
        if (!isRedemption) {
            nextIndex = currentQIndex + 1
            setCurrentQIndex(nextIndex)
        }
        loadQuestion(questionsQueue, mistakeQueue, nextIndex, isRedemption)
    }, [currentQIndex, isRedemption, questionsQueue, mistakeQueue])

    const finishPractice = async (finalQueue: any[]) => {
        setCompleted(true)
        countdownTimer.pause()

        const totalCorrect = answersLog.filter(a => a?.isCorrect).length
        const scorePercent = Math.round((totalCorrect / finalQueue.length) * 100)
        setFinalScore(scorePercent)

        const u = `${practiceId} (${activeSection.title})`
        const logs = practiceRecords.filter(r => r.unit === u)
        const histBest = logs.length > 0 ? Math.max(...logs.map(t => t.score)) : 0
        setHistoricalBest(histBest)
        setIsNewHigh(histBest === 0 ? scorePercent > 0 : scorePercent > histBest)

        if (!invisibleMode) {
            petService.awardQuizCompletion()
            syncRecord(scorePercent, true)
            if (userId) {
                mistakeService.syncToServer(userId);
            }
        }
    }

    const revealOptions = () => {
        setShowOptions(true)
        timerExpiredRef.current = false
        if (!invisibleMode) {
            countdownTimer.reset(15)
        } else {
            countdownTimer.pause()
        }
    }

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeSection || completed || historyModal) return;

            if (e.key === 'Enter' || e.key === ' ') {
                if (!showOptions) {
                    e.preventDefault();
                    revealOptions();
                } else if (showOptions && locked) {
                    e.preventDefault();
                    nextQuestion();
                }
            } else if (showOptions && !locked) {
                if (e.key >= '1' && e.key <= '4') {
                    const idx = parseInt(e.key) - 1;
                    if (q?.options && idx < q.options.length) {
                        e.preventDefault();
                        checkAnswer(idx);
                    }
                } else if (e.key.toLowerCase() >= 'a' && e.key.toLowerCase() <= 'd') {
                    const idx = e.key.toLowerCase().charCodeAt(0) - 97;
                    if (q?.options && idx < q.options.length) {
                        e.preventDefault();
                        checkAnswer(idx);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection, completed, historyModal, showOptions, locked, q, nextQuestion, checkAnswer]);

    // Scroll active sentence into view inside upper passage viewport
    useEffect(() => {
        if (activeSentenceRef.current) {
            activeSentenceRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }, [currentQIndex, q, showOptions]);

    // Lookup grammar rule in loaded grammar index
    const openGrammarPoint = (pointId: string, pointName: string) => {
        if (!grammarIndexData) {
            setActiveGrammarPointModal({
                name: pointName,
                rule: "考点精讲正在载入...",
                example: ""
            });
            return;
        }

        let foundPoint: any = null;
        for (const cat of grammarIndexData.categories || []) {
            for (const pt of cat.points || []) {
                if (pt.id === pointId) {
                    foundPoint = pt;
                    break;
                }
            }
            if (foundPoint) break;
        }

        if (foundPoint) {
            setActiveGrammarPointModal(foundPoint);
        } else {
            setActiveGrammarPointModal({
                name: pointName,
                rule: "暂无详细规则讲解。",
                example: ""
            });
        }
    };

    // Dashboard View
    if (!activeSection) {
        const mappedChallenges = sections.map((sec: any) => ({
            ...sec,
            title: sec.title,
            id: sec.id,
            icon: sec.icon || '🧩'
        }));

        return (
            <div className="cloze-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="cloze-screen">
                    <ShellHeader
                        title={data?.title || '语篇填空'}
                        level={data?.level}
                        textbook={textbook}
                        unit={unit}
                        prefix="cloze"
                    />

                    <InvisibleModeCheckbox
                        checked={invisibleMode}
                        onChange={setInvisibleMode}
                    />

                    <ChallengeCardGrid
                        challenges={mappedChallenges}
                        onStart={handleSectionSelect}
                        onShowHistory={(c) => {
                            const stats = getStats(c.title);
                            setHistoryModal({
                                title: `TODAY - ${c.title}`,
                                logs: stats.todayLogs
                            });
                        }}
                        getRemainingTrials={(cId) => trialsTracker.getRemainingTrials(practiceId, cId)}
                        getChallengeStatsText={(c) => {
                            const stats = getStats(c.title);
                            return {
                                today: `${stats.todayRuns} Runs | Best: ${stats.todayBest}%`,
                                lifetime: `${stats.lifeRuns} Runs | Best: ${stats.lifeBest}%`,
                                isTodayBestHigh: stats.todayBest >= 70
                            };
                        }}
                        isLockedToday={(c) => getStats(c.title).todayBest === 100}
                        flickeringId={flickeringSectionId}
                        prefix="cloze"
                        invisibleMode={invisibleMode}
                    />
                </div>

                {historyModal && (
                    <ShellHistoryModal
                        title={historyModal.title}
                        onClose={() => setHistoryModal(null)}
                        logs={historyModal.logs}
                        prefix="cloze"
                    />
                )}
                {lockModalOpen && (
                    <DailyLockModal onClose={() => setLockModalOpen(false)} />
                )}
            </div>
        )
    }

    // Completion View
    if (completed) {
        return (
            <div className="cloze-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <CompletionReview
                    finalScore={finalScore}
                    invisibleMode={invisibleMode}
                    isNewHigh={isNewHigh}
                    historicalBest={historicalBest}
                    gainedXp={gainedXp}
                    gainedLove={gainedLove}
                    questionsQueue={questionsQueue}
                    answersLog={answersLog}
                    onOpenGrammarPoint={openGrammarPoint}
                    onOpenTranslationModal={() => {
                        setRevealedTranslationIndex(null);
                        setTranslationModalOpen(true);
                    }}
                    onBackToMenu={() => {
                        setActiveSection(null);
                        loadRecords();
                    }}
                />

                <ArticleReadingModal
                    isOpen={translationModalOpen}
                    activeSection={activeSection}
                    onClose={() => {
                        if (sentenceAudioRef.current) sentenceAudioRef.current.pause();
                        if (translationTimeoutRef.current) {
                            clearTimeout(translationTimeoutRef.current);
                            translationTimeoutRef.current = null;
                        }
                        setPlayingSentenceIdx(null);
                        setRevealedTranslationIndex(null);
                        setHighlightedSentenceIndex(null);
                        setTranslationModalOpen(false);
                    }}
                    revealedTranslationIndex={revealedTranslationIndex}
                    toggleTranslation={toggleTranslation}
                    highlightedSentenceIndex={highlightedSentenceIndex}
                    setHighlightedSentenceIndex={setHighlightedSentenceIndex}
                    playingSentenceIdx={playingSentenceIdx}
                    playSentenceAudio={playSentenceAudio}
                    autoPlayNext={autoPlayNext}
                    setAutoPlayNext={setAutoPlayNext}
                    autoPlayNextRef={autoPlayNextRef}
                    modalSentenceRefs={modalSentenceRefs}
                />

                <GrammarPointModal
                    grammarPoint={activeGrammarPointModal}
                    onClose={() => setActiveGrammarPointModal(null)}
                />
            </div>
        )
    }

    if (!q) return null

    return (
        <div className="cloze-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="cloze-screen gameplay">
                {/* Top bar */}
                <div className="cloze-top-bar">
                    <button className="cloze-close-btn" onClick={() => {
                        countdownTimer.pause()
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeSection.id);
                        if (window.confirm(`确定退出练习吗？今日该小节还剩 ${rem} 次机会。`)) {
                            if (userId) {
                                mistakeService.syncToServer(userId);
                            }
                            setActiveSection(null);
                            loadRecords();
                        } else {
                            if (!locked && showOptions && !invisibleMode) countdownTimer.resume()
                        }
                    }}>✕</button>

                    <div className="cloze-progress-container">
                        {questionsQueue.map((_, i) => {
                            const isCurrent = i === currentQIndex;
                            const ans = answersLog[i];
                            let segmentClass = "cloze-progress-segment";
                            if (isCurrent) segmentClass += " active";
                            if (ans) {
                                segmentClass += ans.isCorrect ? " green" : " red";
                            }
                            return <div key={i} className={segmentClass} />;
                        })}
                    </div>
                </div>

                {/* Split Viewport */}
                <div className="cloze-split-viewport">
                    {/* Upper Viewport (Full Passage) */}
                    <div className="cloze-upper-viewport">
                        <PassageViewport
                            rawText={activeSection?.raw_text}
                            activeBlankNum={q?.blank_num}
                            activeSentenceIdx={q?.sentence_index}
                            activeSentenceRef={activeSentenceRef}
                            questionsQueue={questionsQueue}
                            answersLog={answersLog}
                            currentQIndex={currentQIndex}
                            mistakeQueue={mistakeQueue}
                            onSelectBlank={(qIdx) => {
                                setCurrentQIndex(qIdx);
                                loadQuestion(questionsQueue, mistakeQueue, qIdx, false);
                            }}
                        />
                    </div>

                    {/* Lower Viewport (Question & Think / Options) */}
                    <QuestionPane
                        q={q}
                        currentQIndex={currentQIndex}
                        totalQuestions={questionsQueue.length}
                        isRedemption={isRedemption}
                        mistakeCount={mistakeQueue.length}
                        showOptions={showOptions}
                        invisibleMode={invisibleMode}
                        countdownTimer={countdownTimer}
                        locked={locked}
                        selectedOption={selectedOption}
                        activeSection={activeSection}
                        onRevealOptions={revealOptions}
                        onCheckAnswer={checkAnswer}
                        onNextQuestion={nextQuestion}
                    />
                </div>

                <GrammarPointModal
                    grammarPoint={activeGrammarPointModal}
                    onClose={() => setActiveGrammarPointModal(null)}
                />
            </div>
        </div>
    )
}
