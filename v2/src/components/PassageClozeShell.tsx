import React, { useState, useRef, useEffect, useCallback } from 'react'
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
import { CountdownRing } from './CountdownRing'
import md5 from 'md5'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'

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
    const [playingSentenceIdx, setPlayingSentenceIdx] = useState<number | null>(null)

    const playSentenceAudio = async (text: string, idx: number) => {
        if (!text || !textbook) return;
        if (sentenceAudioRef.current) {
            sentenceAudioRef.current.pause();
            sentenceAudioRef.current = null;
        }
        const cleanText = text.replace(/^#+\s*/, '').trim();
        const url = getAudioUrl(cleanText, textbook);
        setPlayingSentenceIdx(idx);
        try {
            const blob = await audioCache.cacheAudio(url);
            if (blob) {
                const audio = new Audio(URL.createObjectURL(blob));
                sentenceAudioRef.current = audio;
                audio.onended = () => setPlayingSentenceIdx(null);
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
        // Derive full practice ID for grammar index matching current textbook & module:
        // e.g. "A10_a10-yp_a10-yp-1" -> "A10_a10-yp_a10-yp-grammar-index"
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
    const [answersLog, setAnswersLog] = useState<Array<{ answeredOption: number | null; isCorrect: boolean }>>([])

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
                    isCorrect: true
                }
            }
        } else {
            playSfx('wrong')
            if (!isRedemption) {
                newAnswersLog[q.originalIndex] = {
                    answeredOption: optionIdx,
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
                        wrongAnswer: optionIdx !== null ? q.options[optionIdx] : undefined
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

    // Render formatted passage with interactive blank pills and highlighted active sentence
    const renderPassageWithPills = () => {
        if (!activeSection?.raw_text) return null;
        const rawText = activeSection.raw_text;
        const activeBlankNum = q?.blank_num;
        const activeSentenceIdx = q?.sentence_index;

        // If raw_text is already an array of sentences
        if (Array.isArray(rawText)) {
            return (
                <div className="cloze-passage-paragraph">
                    {rawText.map((sentStr: string, sIdx: number) => {
                        const isCurrentSentence = activeSentenceIdx !== undefined
                            ? activeSentenceIdx === sIdx
                            : (activeBlankNum !== undefined && (sentStr.includes(`${activeBlankNum}. _`) || new RegExp(`\\b${activeBlankNum}\\.\\s*_+`).test(sentStr)));

                        const parts = sentStr.split(/(\d+\.\s*_{3,}(?:\s*\([^)]+\))?)/g);

                        return (
                            <span
                                key={sIdx}
                                ref={isCurrentSentence ? activeSentenceRef : null}
                                className={`cloze-passage-sentence ${isCurrentSentence ? 'is-active-sentence' : ''}`}
                            >
                                {parts.map((part: string, ptIdx: number) => {
                                    const match = part.match(/^(\d+)\.\s*________(?:\s*\(([^)]+)\))?/);
                                    if (match) {
                                        const blankNum = parseInt(match[1]);
                                        const qIndex = questionsQueue.findIndex(item => item.blank_num === blankNum);
                                        const isActive = qIndex === currentQIndex;
                                        const answerData = answersLog[qIndex];

                                        let pillClass = "cloze-blank-pill";
                                        let pillContent = `${blankNum}. ______`;
                                        const targetQ = questionsQueue[qIndex];
                                        const baseWord = targetQ?.base_word || match[2];

                                        if (isActive) {
                                            pillClass += " active";
                                        }
                                        if (answerData) {
                                            if (answerData.isCorrect) {
                                                pillClass += " answered-correct";
                                                pillContent = `${blankNum}. ${targetQ.options[targetQ.answer]}`;
                                            } else {
                                                pillClass += " answered-wrong";
                                                const chosen = answerData.answeredOption !== null ? targetQ.options[answerData.answeredOption] : '未答';
                                                pillContent = `${blankNum}. ${chosen}`;
                                            }
                                        }

                                        return (
                                            <React.Fragment key={ptIdx}>
                                                <span
                                                    className={pillClass}
                                                    onClick={() => {
                                                        if (qIndex >= 0 && qIndex < questionsQueue.length) {
                                                            setCurrentQIndex(qIndex);
                                                            loadQuestion(questionsQueue, mistakeQueue, qIndex, false);
                                                        }
                                                    }}
                                                    title={`点击跳转至第 ${blankNum} 题`}
                                                >
                                                    {pillContent}
                                                </span>
                                                {baseWord ? <span className="cloze-base-word-text"> ({baseWord})</span> : null}
                                            </React.Fragment>
                                        );
                                    }
                                    return <span key={ptIdx}>{part}</span>;
                                })}{' '}
                            </span>
                        );
                    })}
                </div>
            );
        }

        const paragraphs = (rawText as string).split('\n\n');

        return paragraphs.map((para: string, pIdx: number) => {
            // Split paragraph into sentences on [.!?] that are NOT preceded by a list number (e.g. avoid splitting "1.")
            const sentenceMatches = para.split(/(?<=[.!?])(?<!\b\d+[.!?])\s+(?=[A-Z"“\d])/g);

            return (
                <p key={pIdx} className="cloze-passage-paragraph">
                    {sentenceMatches.map((sentStr: string, sIdx: number) => {
                        // Check if this sentence contains the active blank marker: e.g. "1. ___"
                        const hasActiveBlank = activeBlankNum !== undefined &&
                            (sentStr.includes(`${activeBlankNum}. _`) || new RegExp(`\\b${activeBlankNum}\\.\\s*_+`).test(sentStr));

                        // Split sentence by blank markers: e.g. 1. ________ (have) or 1. ________
                        const parts = sentStr.split(/(\d+\.\s*_{3,}(?:\s*\([^)]+\))?)/g);

                        return (
                            <span
                                key={sIdx}
                                ref={hasActiveBlank ? activeSentenceRef : null}
                                className={`cloze-passage-sentence ${hasActiveBlank ? 'is-active-sentence' : ''}`}
                            >
                                {parts.map((part: string, ptIdx: number) => {
                                    const match = part.match(/^(\d+)\.\s*________(?:\s*\(([^)]+)\))?/);
                                    if (match) {
                                        const blankNum = parseInt(match[1]);
                                        const qIndex = questionsQueue.findIndex(item => item.blank_num === blankNum);
                                        const isActive = qIndex === currentQIndex;
                                        const answerData = answersLog[qIndex];

                                        let pillClass = "cloze-blank-pill";
                                        let pillContent = `${blankNum}. ______`;

                                        if (isActive) {
                                            pillClass += " active";
                                        }
                                        if (answerData) {
                                            if (answerData.isCorrect) {
                                                pillClass += " answered-correct";
                                                const targetQ = questionsQueue[qIndex];
                                                pillContent = `${blankNum}. ${targetQ.options[targetQ.answer]}`;
                                            } else {
                                                pillClass += " answered-wrong";
                                                const targetQ = questionsQueue[qIndex];
                                                const chosen = answerData.answeredOption !== null ? targetQ.options[answerData.answeredOption] : '未答';
                                                pillContent = `${blankNum}. ${chosen}`;
                                            }
                                        }

                                        return (
                                            <span
                                                key={ptIdx}
                                                className={pillClass}
                                                onClick={() => {
                                                    if (qIndex >= 0 && qIndex < questionsQueue.length) {
                                                        setCurrentQIndex(qIndex);
                                                        loadQuestion(questionsQueue, mistakeQueue, qIndex, false);
                                                    }
                                                }}
                                                title={`点击跳转至第 ${blankNum} 题`}
                                            >
                                                {pillContent}
                                            </span>
                                        );
                                    }
                                    return <span key={ptIdx}>{part}</span>;
                                })}{' '}
                            </span>
                        );
                    })}
                </p>
            );
        });
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
                <div className="cloze-screen" style={{ padding: '24px 20px', textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.2rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '4px 0 12px 0', color: '#1e293b', fontSize: '1.4rem', fontWeight: 'bold' }}>Section Complete!</h2>

                    <div style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#64748b' }}>
                        {invisibleMode ? (
                            <i>Practice Mode (Invisible). Score not recorded.</i>
                        ) : isNewHigh ? (
                            <strong style={{ color: '#10b981' }}>🎉 New High Score! You've set a new record!</strong>
                        ) : (
                            <span>Highest recorded score: <strong style={{ color: 'var(--primary)' }}>{historicalBest}%</strong></span>
                        )}
                    </div>

                    {!invisibleMode && (
                        <div style={{ display: 'inline-flex', gap: '16px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0284c7' }}>⚡ +{gainedXp} XP</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e11d48' }}>❤️ +{gainedLove}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ca8a04' }}>🪙 +1 Coin</span>
                        </div>
                    )}

                    {/* Question by Question Review Table */}
                    <div style={{ textAlign: 'left', margin: '14px 0', overflowX: 'auto' }}>
                        <h3 style={{ fontSize: '1rem', color: '#334155', marginBottom: '8px' }}>📝 答题回顾与考点索引</h3>
                        <table className="cloze-results-table">
                            <thead>
                                <tr>
                                    <th>题号</th>
                                    <th>正确答案</th>
                                    <th>你的选择</th>
                                    <th>考点类型</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questionsQueue.map((item, idx) => {
                                    const ans = answersLog[idx];
                                    const isCorrect = ans?.isCorrect;
                                    const chosenText = ans && ans.answeredOption !== null ? item.options[ans.answeredOption] : '未作答';
                                    const correctText = item.options[item.answer];

                                    return (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 600 }}>{item.blank_num}</td>
                                            <td style={{ color: '#10b981', fontWeight: 600 }}>{correctText}</td>
                                            <td style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                {chosenText} {isCorrect ? '✓' : '✗'}
                                            </td>
                                            <td>
                                                <span
                                                    className="cloze-grammar-badge-clickable"
                                                    onClick={() => openGrammarPoint(item.grammar_point_id, item.grammar_point_name)}
                                                    title="点击查看此考点详细解析与例题"
                                                >
                                                    🔍 {item.grammar_point_name}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                        <button
                            className="cloze-continue-btn"
                            onClick={() => {
                                setRevealedTranslationIndex(null);
                                setTranslationModalOpen(true);
                            }}
                            style={{ background: '#059669', minWidth: '180px' }}
                        >
                            📖 文章翻译与朗读
                        </button>
                        <button
                            className="cloze-continue-btn"
                            onClick={() => {
                                setActiveSection(null);
                                loadRecords();
                            }}
                            style={{ minWidth: '180px' }}
                        >
                            Back to Menu
                        </button>
                    </div>
                </div>

                {/* Article Translation & Reading Modal */}
                {translationModalOpen && activeSection && (
                    <div className="cloze-modal-overlay" onClick={() => {
                        if (sentenceAudioRef.current) sentenceAudioRef.current.pause();
                        setPlayingSentenceIdx(null);
                        setTranslationModalOpen(false);
                    }}>
                        <div className="cloze-modal-card cloze-article-modal" onClick={e => e.stopPropagation()}>
                            <button
                                className="cloze-modal-close"
                                onClick={() => {
                                    if (sentenceAudioRef.current) sentenceAudioRef.current.pause();
                                    setPlayingSentenceIdx(null);
                                    setTranslationModalOpen(false);
                                }}
                            >✕</button>
                            <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{activeSection.icon || '📖'}</span>
                                <span>{activeSection.title} - 全文精读与朗读</span>
                            </h3>

                            <div className="cloze-article-scroll-container">
                                {(activeSection.filled_text || activeSection.raw_text || []).map((sent: string, sIdx: number) => {
                                    const isHeading = sent.startsWith('#');
                                    const cleanEn = sent.replace(/^#+\s*/, '').trim();
                                    const cnText = (activeSection.filled_text_cn?.[sIdx] || activeSection.raw_text_cn?.[sIdx] || '').replace(/^#+\s*/, '').trim();
                                    const isCnRevealed = revealedTranslationIndex === sIdx;

                                    if (isHeading) {
                                        return (
                                            <h4 key={sIdx} className="cloze-modal-article-heading">
                                                {isCnRevealed && cnText ? cnText : cleanEn}
                                                {cnText && (
                                                    <button
                                                        className="cloze-toggle-cn-btn"
                                                        onClick={() => setRevealedTranslationIndex(isCnRevealed ? null : sIdx)}
                                                        title={isCnRevealed ? "显示英文" : "显示中文"}
                                                    >
                                                        {isCnRevealed ? "英" : "中"}
                                                    </button>
                                                )}
                                            </h4>
                                        );
                                    }

                                    return (
                                        <div key={sIdx} className={`cloze-article-sentence-row ${isCnRevealed ? 'is-cn' : ''}`}>
                                            <span className="cloze-article-sentence-num">{sIdx + 1}.</span>
                                            <div className="cloze-article-sentence-body">
                                                <span className="cloze-article-sentence-text">
                                                    {isCnRevealed && cnText ? cnText : cleanEn}
                                                </span>
                                            </div>
                                            <div className="cloze-article-sentence-actions">
                                                {cnText && (
                                                    <button
                                                        className={`cloze-toggle-cn-btn ${isCnRevealed ? 'active' : ''}`}
                                                        onClick={() => setRevealedTranslationIndex(isCnRevealed ? null : sIdx)}
                                                        title={isCnRevealed ? "切换回英文" : "点击查看该句中文翻译"}
                                                    >
                                                        {isCnRevealed ? "英" : "中"}
                                                    </button>
                                                )}
                                                <button
                                                    className={`cloze-sentence-audio-btn ${playingSentenceIdx === sIdx ? 'is-playing' : ''}`}
                                                    onClick={() => playSentenceAudio(cleanEn, sIdx)}
                                                    title="朗读本句"
                                                >
                                                    {playingSentenceIdx === sIdx ? '🔊' : '🔈'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Grammar Point Modal in Result Screen */}
                {activeGrammarPointModal && (
                    <div className="cloze-modal-overlay" onClick={() => setActiveGrammarPointModal(null)}>
                        <div className="cloze-modal-card" onClick={e => e.stopPropagation()}>
                            <button className="cloze-modal-close" onClick={() => setActiveGrammarPointModal(null)}>✕</button>
                            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.25rem' }}>
                                💡 {activeGrammarPointModal.name}
                            </h3>
                            <div style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#334155' }}>
                                <p style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                                    <strong>考点规则：</strong><br />
                                    {activeGrammarPointModal.rule}
                                </p>
                                {activeGrammarPointModal.example && (
                                    <p style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #10b981', color: '#166534' }}>
                                        <strong>真题示例：</strong><br />
                                        <code>{activeGrammarPointModal.example}</code>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
                        {renderPassageWithPills()}
                    </div>

                    {/* Lower Viewport (Question & Think / Options) */}
                    <div className="cloze-lower-viewport">
                        <div className="cloze-question-header">
                            <span className="cloze-q-badge">
                                {isRedemption ? (
                                    <span style={{ color: '#ea580c' }}>🔄 错题重练: 第 {q.blank_num} 空 (剩余 {mistakeQueue.length} 题)</span>
                                ) : (
                                    `第 ${q.blank_num} 空 (${currentQIndex + 1} / ${questionsQueue.length})`
                                )}
                            </span>
                            {showOptions && !invisibleMode && (
                                <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={15} isRunning={countdownTimer.isRunning} />
                            )}
                        </div>

                        {!showOptions ? (
                            <div className="cloze-think-box">
                                <button className="cloze-reveal-btn" onClick={revealOptions}>
                                    Show Options <span className="cloze-shortcut-tag">Enter / Space</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="cloze-options-grid">
                                    {q.options.map((opt: string, optIdx: number) => {
                                        let btnClass = "cloze-option-btn";
                                        if (locked) {
                                            if (optIdx === q.answer) {
                                                btnClass += " correct";
                                            } else if (selectedOption === optIdx) {
                                                btnClass += " wrong";
                                            }
                                        } else if (selectedOption === optIdx) {
                                            btnClass += " selected";
                                        }

                                        return (
                                            <button
                                                key={optIdx}
                                                className={btnClass}
                                                onClick={() => checkAnswer(optIdx)}
                                                disabled={locked}
                                            >
                                                <span className="cloze-option-idx">{String.fromCharCode(65 + optIdx)}</span>
                                                <span>{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {locked && (
                                    <div className={`cloze-explanation-banner ${selectedOption === q.answer ? '' : 'is-wrong'}`}>
                                        {(activeSection?.filled_text_cn?.[q.sentence_index] || activeSection?.raw_text_cn?.[q.sentence_index]) && (
                                            <div className="cloze-sentence-cn-box">
                                                <span className="cloze-sentence-cn-label">📖 句意：</span>
                                                <span>{(activeSection.filled_text_cn?.[q.sentence_index] || activeSection.raw_text_cn[q.sentence_index]).replace(/^#+\s*/, '')}</span>
                                            </div>
                                        )}
                                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <strong>{selectedOption === q.answer ? '💡 解析点拨：' : '⚠️ 正确答案与解析：'}</strong>
                                            {q.grammar_point_name && (
                                                <span className="cloze-grammar-label-badge">
                                                    考点: {q.grammar_point_name}
                                                </span>
                                            )}
                                        </div>
                                        <div>{q.explanation}</div>
                                        {q.rule_summary && (
                                            <div style={{ marginTop: '4px', opacity: 0.9 }}>
                                                <strong>规则速记：</strong>{q.rule_summary}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="cloze-footer-action">
                                    <button
                                        className="cloze-continue-btn"
                                        onClick={nextQuestion}
                                        disabled={!locked}
                                    >
                                        {!isRedemption
                                            ? (currentQIndex + 1 >= questionsQueue.length
                                                ? (mistakeQueue.length > 0 ? `进入错题重做 (${mistakeQueue.length} 题)` : '查看成绩与考点')
                                                : '下一题 (Next)')
                                            : (mistakeQueue.length === 0 ? '查看成绩与考点' : `下一道错题 (剩余 ${mistakeQueue.length} 题)`)}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Grammar Point Modal during Gameplay */}
                {activeGrammarPointModal && (
                    <div className="cloze-modal-overlay" onClick={() => setActiveGrammarPointModal(null)}>
                        <div className="cloze-modal-card" onClick={e => e.stopPropagation()}>
                            <button className="cloze-modal-close" onClick={() => setActiveGrammarPointModal(null)}>✕</button>
                            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.25rem' }}>
                                💡 {activeGrammarPointModal.name}
                            </h3>
                            <div style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#334155' }}>
                                <p style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                                    <strong>考点规则：</strong><br />
                                    {activeGrammarPointModal.rule}
                                </p>
                                {activeGrammarPointModal.example && (
                                    <p style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #10b981', color: '#166534' }}>
                                        <strong>真题示例：</strong><br />
                                        <code>{activeGrammarPointModal.example}</code>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
