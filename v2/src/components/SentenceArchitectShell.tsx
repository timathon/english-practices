import { useState, useRef, useEffect, useCallback } from 'react'
import './SentenceArchitectShell.css'
import { DailyLockModal } from './DailyLockModal'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { getAudioUrl, shuffle, usePracticeAudio } from '../lib/practiceAudio'
import { useNavigationBlocker } from '../lib/useNavigationBlocker'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ActiveHeader } from './shell/ActiveHeader'
import { FooterAction } from './shell/FooterAction'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { CompleteScreenActions } from './shell/CompleteScreenActions'

interface PoolWord {
    id: number;
    text: string;
    cleanWord: string;
    ipa?: string;
    selected: boolean;
}

interface SelectedWord {
    poolId: number;
    text: string;
}

export function SentenceArchitectShell({ data, practiceId, unit, textbook }: any) {
    const isCf = data?.tts?.by === 'melotts'
    const { data: session } = useSession()
    const userId = session?.user?.id
    const { playAudio, playSfx } = usePracticeAudio(textbook, () => isCf)

    const [activeChallenge, setActiveChallenge] = useState<any>(null)
    const [queue, setQueue] = useState<any[]>([])
    const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog] = useState<Array<string | null>>([])

    const [isRedemption, setIsRedemption] = useState(false)
    const [q, setQ] = useState<any>(null)
    const [questionTimeLimit, setQuestionTimeLimit] = useState(30)
    const [wordPool, setWordPool] = useState<PoolWord[]>([])
    const [userSelection, setUserSelection] = useState<SelectedWord[]>([])

    const [locked, setLocked] = useState(false)
    const [hintUsed, setHintUsed] = useState(false)
    const [showHintModal, setShowHintModal] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [hintTimeLeft, setHintTimeLeft] = useState(5)
    const hintIntervalRef = useRef<number | null>(null)
    const [completed, setCompleted] = useState(false)
    const [finalScore, setFinalScore] = useState(0)
    
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrectFeedback, setIsCorrectFeedback] = useState(false)
    const [, setUserSentenceStr] = useState("")



    // Countdown / Continue Disabled State
    const [continueCountdown, setContinueCountdown] = useState(0)
    const [continueDisabled, setContinueDisabled] = useState(false)

    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)
    const hasFinishedRef = useRef(false)
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [gainedXp, setGainedXp] = useState(0)
    const [gainedLove, setGainedLove] = useState(0)
    const [historicalBest, setHistoricalBest] = useState(0)
    const [isNewHigh, setIsNewHigh] = useState(false)
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)
    const [lastFinishedChallengeId, setLastFinishedChallengeId] = useState<string | null>(null)
    const [flickeringChallengeId, setFlickeringChallengeId] = useState<string | null>(null)
    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {})

    useNavigationBlocker(!!activeChallenge && !completed);

    useEffect(() => {
        if (!activeChallenge && lastFinishedChallengeId) {
            setFlickeringChallengeId(lastFinishedChallengeId);
            setTimeout(() => {
                const el = document.getElementById(`sa-card-${lastFinishedChallengeId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);

            const timer = setTimeout(() => {
                setFlickeringChallengeId(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [activeChallenge, lastFinishedChallengeId])

    // Countdown timer (30s per question)
    const countdownTimer = useCountdown(30, {
        onExpire: () => {
            if (timerExpiredRef.current) return
            timerExpiredRef.current = true
            checkAnswerRef.current(true)
        }
    })

    const primaryColor = data.primaryColor || '#3b82f6'
    const primaryDarkColor = data.primaryColorDark || '#2563eb'
    const ipaDict = data.ipaDict || {}

    const loadRecords = async () => {
        try {
            const cached = cache.getRecords()
            if (cached) {
                setPracticeRecords(cached)
            }
            const res = await fetch(API_URL + '/api/records', { credentials: 'include' })
            const json = await res.json()
            if (Array.isArray(json)) {
                cache.setRecords(json)
                setPracticeRecords(json)
            }
        } catch (e) {
            console.error("Failed to load records", e)
        }
    }

    useEffect(() => {
        loadRecords()
        return () => {
            if (hintIntervalRef.current) clearInterval(hintIntervalRef.current)
        }
    }, [])

    // Preload standard audio SFX
    useEffect(() => {
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3")
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3")
    }, [])

    const handleChallengeSelect = (c: any, overrideInvisible?: boolean) => {
        const isInvisible = overrideInvisible !== undefined ? overrideInvisible : invisibleMode;
        if (!isInvisible) {
            const stats = getStats(c.title);
            if (stats.todayBest === 100) {
                setLockModalOpen(true);
                return;
            }
            const hasConsumed = trialsTracker.consumeTrial(practiceId, c.id)
            if (!hasConsumed) return;
        }

        setActiveChallenge(c)
        setActiveRecordId(null)
        setGainedXp(0)
        setGainedLove(0)
        recordIdPromiseRef.current = null
        hasFinishedRef.current = false

        // Clone and shuffle questions
        const shuffled = shuffle([...c.data]).map((q: any, i: number) => ({ ...q, originalIndex: i }))
        setQueue(shuffled)
        setMistakeQueue([])
        setCurrentIndex(0)
        setScoreLog(new Array(c.data.length).fill(null))
        setCompleted(false)

        // Preload Audio
        shuffled.forEach((qItem: any) => {
            const sentenceAudioUrl = qItem.audio || (textbook ? getAudioUrl(qItem.en, textbook, isCf) : null);
            if (sentenceAudioUrl) {
                audioCache.preloadAndSync(sentenceAudioUrl);
            }
        });

        loadQuestion(shuffled, [], 0, false)
    }

    const loadQuestion = (currentQueue: any[], currentMistakes: any[], index: number, redemption: boolean) => {
        let nextQ = null
        let isRedemp = redemption

        if (index < currentQueue.length) {
            nextQ = currentQueue[index]
            isRedemp = false
        } else if (currentMistakes.length > 0) {
            nextQ = currentMistakes[0]
            isRedemp = true
        } else {
            finishGame(currentQueue)
            return
        }

        setQ(nextQ)
        setIsRedemption(isRedemp)
        setHintUsed(false)
        setShowHintModal(false)
        setIsClosing(false)
        if (hintIntervalRef.current) {
            clearInterval(hintIntervalRef.current)
            hintIntervalRef.current = null
        }
        setLocked(false)
        setShowFeedback(false)
        setUserSelection([])
        setContinueCountdown(0)
        setContinueDisabled(false)
        timerExpiredRef.current = false

        // Generate Shuffled Word Pool
        const cleanEn = nextQ.en.replace(/[.!?]$/, "");
        const originalWords = cleanEn.split(" ");
        
        // Randomly select 2 or 3 noise words from the pool
        const noisePool = [...(nextQ.noise || [])];
        const noiseCount = Math.floor(Math.random() * 2) + 2; // Randomly choose 2 or 3
        const selectedNoise: string[] = [];
        while (selectedNoise.length < noiseCount && noisePool.length > 0) {
            const randomIndex = Math.floor(Math.random() * noisePool.length);
            selectedNoise.push(noisePool.splice(randomIndex, 1)[0]);
        }
        
        const allWords = shuffle([...originalWords, ...selectedNoise]);

        const poolItems = allWords.map((word, idx) => {
            let displayWord = word;
            const isAcronym = word.length > 1 && word === word.toUpperCase();
            const isI = word === "I";
            const isOriginalCapitalized = word.charAt(0) === word.charAt(0).toUpperCase() && word.charAt(0) !== word.charAt(0).toLowerCase();

            let shouldKeepCapital = isAcronym || isI;

            if (!shouldKeepCapital && isOriginalCapitalized) {
                const foundInMiddle = originalWords.some((w: string, i: number) => i > 0 && w === word);
                if (foundInMiddle) {
                    shouldKeepCapital = true;
                }
            }

            if (!shouldKeepCapital) {
                displayWord = word.toLowerCase();
            }

            const cleanWord = displayWord.toLowerCase().replace(/[^a-z]/g, "");
            const ipa = ipaDict[cleanWord];

            return {
                id: idx,
                text: displayWord,
                cleanWord,
                ipa,
                selected: false
            };
        });

        setWordPool(poolItems)
        // Reset countdown timer
        const timeLimit = Math.max(30, 15 + allWords.length * 2);
        setQuestionTimeLimit(timeLimit);
        if (!invisibleMode) {
            countdownTimer.reset(timeLimit)
        } else {
            countdownTimer.pause()
        }
    }



    const selectWord = (word: PoolWord) => {
        if (locked || word.selected) return;

        setUserSelection(prev => [...prev, { poolId: word.id, text: word.text }]);
        setWordPool(prev => prev.map(w => w.id === word.id ? { ...w, selected: true } : w));
    }

    const removeWord = (idx: number, selectionItem: SelectedWord) => {
        if (locked) return;

        setUserSelection(prev => prev.filter((_, i) => i !== idx));
        setWordPool(prev => prev.map(w => w.id === selectionItem.poolId ? { ...w, selected: false } : w));
    }

    const syncRecord = async (scorePercent: number, isFinished: boolean) => {
        try {
            if (isFinished) {
                hasFinishedRef.current = true
            } else if (hasFinishedRef.current) {
                return
            }

            if (activeRecordId) {
                const res = await fetch(`${API_URL}/api/records/${activeRecordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: `${practiceId} (${activeChallenge.title})`,
                        score: scorePercent,
                        unfinished: !isFinished
                    })
                })
                const j = await res.json()
                if (j.success) {
                    cache.updateRecord({
                        id: activeRecordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    })
                }
            } else if (recordIdPromiseRef.current) {
                const recordId = await recordIdPromiseRef.current
                const res = await fetch(`${API_URL}/api/records/${recordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: `${practiceId} (${activeChallenge.title})`,
                        score: scorePercent,
                        unfinished: !isFinished
                    })
                })
                const j = await res.json()
                if (j.success) {
                    cache.updateRecord({
                        id: recordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    })
                }
            } else {
                const postPromise = (async () => {
                    const res = await fetch(`${API_URL}/api/records`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            unit: `${practiceId} (${activeChallenge.title})`,
                            score: scorePercent,
                            unfinished: !isFinished
                        })
                    })
                    const j = await res.json()
                    if (j.success && j.id) {
                        setActiveRecordId(j.id)
                        cache.updateRecord({
                            id: j.id,
                            unit: `${practiceId} (${activeChallenge.title})`,
                            score: scorePercent,
                            unfinished: !isFinished,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        } as any)
                        return j.id as string
                    }
                    throw new Error("Failed to create record")
                })()

                recordIdPromiseRef.current = postPromise
                await postPromise
            }
        } catch (e) {
            console.error("Failed to sync record", e)
        }
    }

    const checkAnswer = useCallback((forceWrong?: boolean) => {
        if (locked) return
        if (!forceWrong && userSelection.length === 0) return
        setLocked(true)
        countdownTimer.pause()

        // Construct user sentence string (capitalizing first word if needed)
        const constructed = userSelection.map((item, idx) => {
            let t = item.text;
            if (idx === 0) {
                if (t.charAt(0) === t.charAt(0).toLowerCase()) {
                    t = t.charAt(0).toUpperCase() + t.slice(1);
                }
            }
            return t;
        }).join(" ");

        setUserSentenceStr(constructed);

        const target = q.en.replace(/[.!?]$/, "");
        let isCorrect = false
        if (!forceWrong) {
            isCorrect = constructed === target;
            if (!isCorrect && q.accept) {
                isCorrect = q.accept.some((alt: string) => alt.replace(/[.!?]$/, "") === constructed);
            }
        }

        setIsCorrectFeedback(isCorrect)
        setShowFeedback(true)

        let updatedMistakes = [...mistakeQueue]
        let updatedScoreLog = [...scoreLog]

        if (isCorrect) {
            playSfx('correct')
            if (!invisibleMode) {
                const { xpGain } = petService.awardCorrectAnswer()
                setGainedXp(prev => prev + xpGain)
                setGainedLove(prev => prev + 1)
            }
            let scoreType = "green"
            if (isRedemption) {
                scoreType = "redemption"
                updatedScoreLog[q.originalIndex] = scoreType
                updatedMistakes.shift() // Remove from mistake queue
            } else {
                if (hintUsed) scoreType = "yellow"
                updatedScoreLog[currentIndex] = scoreType
            }
        } else {
            playSfx('wrong')
            if (!isRedemption) {
                updatedScoreLog[currentIndex] = "red"
                updatedMistakes.push(q)
                if (userId && !invisibleMode) {
                    mistakeService.addMistake(userId, {
                        practiceId,
                        textbook,
                        unit,
                        practiceType: 'sentence-architect',
                        question: q,
                        wrongAnswer: constructed
                    });
                }
            } else {
                const missed = updatedMistakes.shift()
                updatedMistakes.push(missed) // Move to back of the queue
            }
        }

        // Sentence audio playback (after correct/wrong sfx)
        const sentenceAudioUrl = q.audio || (textbook ? getAudioUrl(q.en, textbook, isCf) : null);
        if (sentenceAudioUrl) {
            setTimeout(() => playAudio(sentenceAudioUrl), 600);
        }

        setMistakeQueue(updatedMistakes)
        setScoreLog(updatedScoreLog)

        const totalScore = updatedScoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            if (curr === "yellow") return acc + 0.5
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / queue.length) * 100)
        if (!invisibleMode) {
            const isLastMain = !isRedemption && currentIndex === queue.length - 1
            syncRecord(scorePercent, isLastMain)
        }

        // Autoplay countdown timer
        setContinueDisabled(true)
        setContinueCountdown(2)
        const timer = setInterval(() => {
            setContinueCountdown(c => {
                if (c <= 1) {
                    clearInterval(timer)
                    setContinueDisabled(false)
                    return 0
                }
                return c - 1
            })
        }, 1000)
    }, [locked, userSelection, q, mistakeQueue, scoreLog, currentIndex, isRedemption, hintUsed, queue.length, countdownTimer, invisibleMode, isCf])

    // Keep ref in sync so onExpire uses the latest checkAnswer
    useEffect(() => { checkAnswerRef.current = checkAnswer }, [checkAnswer])

    const nextQuestion = () => {
        let nextIndex = currentIndex
        if (!isRedemption) {
            nextIndex = currentIndex + 1
            setCurrentIndex(nextIndex)
        }
        loadQuestion(queue, mistakeQueue, nextIndex, isRedemption)
    }

    const finishGame = async (finalQueue: any[]) => {
        setCompleted(true)

        const totalScore = scoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            if (curr === "yellow") return acc + 0.5
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / finalQueue.length) * 100)
        setFinalScore(scorePercent)

        const u = `${practiceId} (${activeChallenge.title})`
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

    const getStats = (challengeTitle: string) => {
        const u = `${practiceId} (${challengeTitle})`
        const logs = practiceRecords.filter(r => r.unit === u && !r.unfinished)

        const todayStr = new Date().toLocaleDateString()
        const todayLogs = logs.filter(r => new Date(r.createdAt).toLocaleDateString() === todayStr)

        const todayBest = todayLogs.length > 0 ? Math.max(...todayLogs.map(t => t.score)) : 0
        const lifeBest = logs.length > 0 ? Math.max(...logs.map(t => t.score)) : 0

        return {
            todayRuns: todayLogs.length,
            todayBest,
            lifeRuns: logs.length,
            lifeBest,
            todayLogs,
            lifeLogs: logs
        }
    }



    const closeHintModal = () => {
        setIsClosing(true)
        setTimeout(() => {
            setShowHintModal(false)
            setIsClosing(false)
            if (hintIntervalRef.current) {
                clearInterval(hintIntervalRef.current)
                hintIntervalRef.current = null
            }
        }, 200)
    }

    const handleShowHint = () => {
        setHintUsed(true)
        setShowHintModal(true)
        setHintTimeLeft(5)
        
        if (hintIntervalRef.current) clearInterval(hintIntervalRef.current)
        
        let secondsLeft = 5
        hintIntervalRef.current = window.setInterval(() => {
            secondsLeft -= 1
            setHintTimeLeft(secondsLeft)
            if (secondsLeft <= 0) {
                closeHintModal()
            }
        }, 1000)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeChallenge || completed || historyModal || showHintModal) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!locked) {
                    if (userSelection.length > 0) {
                        checkAnswer();
                    }
                } else {
                    if (!continueDisabled) {
                        nextQuestion();
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeChallenge, completed, historyModal, showHintModal, locked, userSelection.length, continueDisabled, nextQuestion, checkAnswer]);

    if (!activeChallenge) {
        return (
            <div className="sa-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="sa-screen">
                    <ShellHeader
                        title={data.title}
                        level={data.level}
                        textbook={textbook}
                        unit={unit}
                        prefix="sa"
                    />
                    
                    <InvisibleModeCheckbox
                        checked={invisibleMode}
                        onChange={setInvisibleMode}
                    />

                    <ChallengeCardGrid
                        challenges={data.challenges}
                        onStart={handleChallengeSelect}
                        invisibleMode={invisibleMode}
                        onShowHistory={(c) => {
                            const s = getStats(c.title);
                            setHistoryModal({ title: `TODAY - ${c.title}`, logs: s.todayLogs });
                        }}
                        getRemainingTrials={(cId) => trialsTracker.getRemainingTrials(practiceId, cId)}
                        getChallengeStatsText={(c) => {
                            const s = getStats(c.title);
                            return {
                                today: `${s.todayRuns} Runs | Best: ${s.todayBest}%`,
                                lifetime: `${s.lifeRuns} Runs | Best: ${s.lifeBest}%`,
                                isTodayBestHigh: s.todayBest >= 70
                            };
                        }}
                        isLockedToday={(c) => getStats(c.title).todayBest === 100}
                        flickeringId={flickeringChallengeId}
                        prefix="sa"
                    />
                </div>
                
                {historyModal && (
                    <ShellHistoryModal
                        title={historyModal.title}
                        onClose={() => setHistoryModal(null)}
                        logs={historyModal.logs}
                        prefix="sa"
                    />
                )}

                {lockModalOpen && (
                    <DailyLockModal onClose={() => setLockModalOpen(false)} />
                )}
            </div>
        )
    }

    if (completed) {
        return (
            <div className="sa-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="sa-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '5px 0 10px 0', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>Challenge Complete!</h2>
                    
                    {/* High Score / Record Status */}
                    <div style={{ margin: '10px 0 20px 0', fontSize: '1rem', color: '#555' }}>
                        {invisibleMode ? (
                            <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                                Practice Mode (Invisible). Score not saved.
                            </div>
                        ) : isNewHigh ? (
                            <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                                🎉 New High Score! You've set a new record!
                            </div>
                        ) : (
                            <div>
                                Keep trying! Your highest score is <strong style={{ color: 'var(--primary)' }}>{historicalBest}%</strong>. You can do even better!
                            </div>
                        )}
                    </div>

                    {/* Rewards Summary Card */}
                    <div style={{
                        width: '100%',
                        maxWidth: '400px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '16px 20px',
                        marginBottom: '30px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                        {invisibleMode ? (
                            <div style={{ color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic' }}>
                                Practice Mode active. No rewards are awarded.
                            </div>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Rewards Earned</h3>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.8rem', marginBottom: '2px' }}>⚡</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0284c7' }}>+{gainedXp} XP</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.8rem', marginBottom: '2px' }}>❤️</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e11d48' }}>+{gainedLove} ❤️</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.8rem', marginBottom: '2px' }}>🪙</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ca8a04' }}>+1 Coin</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Review Mistakes Section */}
                    {(() => {
                        if (finalScore === 100) {
                            return <div className="sa-perfect-run-badge" style={{ marginBottom: '25px' }}>🎉 Perfect Run! No mistakes.</div>;
                        } else if (finalScore >= 80) {
                            return <div className="sa-perfect-run-badge" style={{ color: '#0284c7', marginBottom: '25px' }}>✨ Great job! Challenge completed with mistakes corrected.</div>;
                        } else if (finalScore >= 60) {
                            return <div className="sa-perfect-run-badge" style={{ color: '#0f766e', marginBottom: '25px' }}>👍 Good effort! All mistakes corrected. Keep it up!</div>;
                        } else {
                            return <div className="sa-perfect-run-badge" style={{ color: '#64748b', marginBottom: '25px' }}>💪 Nice practice! You corrected all mistakes. Keep improving!</div>;
                        }
                    })()}

                    <CompleteScreenActions
                        remainingTrials={trialsTracker.getRemainingTrials(practiceId, activeChallenge.id)}
                        onBack={() => {
                            setLastFinishedChallengeId(activeChallenge.id)
                            setActiveChallenge(null)
                            setCompleted(false)
                            loadRecords()
                        }}
                        onTryAgain={(overrideInvisible) => {
                            if (overrideInvisible !== undefined) {
                                setInvisibleMode(overrideInvisible);
                            }
                            handleChallengeSelect(activeChallenge, overrideInvisible);
                        }}
                        prefix="sa"
                        isLockedToday={getStats(activeChallenge.title).todayBest === 100}
                        invisibleMode={invisibleMode}
                    />
                </div>
            </div>
        )
    }

    if (!q) return null

    const originalText = isRedemption
        ? (mistakeQueue.length === 0 ? "Finish" : "Continue")
        : (currentIndex >= queue.length - 1 && mistakeQueue.length === 0 ? "Finish" : "Continue");

    const continueBtnText = continueCountdown > 0
        ? `${originalText} (${continueCountdown}s)`
        : originalText;



    return (
        <div className="sa-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="sa-screen">
                <ActiveHeader
                    onClose={() => {
                        countdownTimer.pause()
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id)
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this challenge today!`)) {
                            if (userId && !invisibleMode) {
                                mistakeService.syncToServer(userId);
                            }
                            setActiveChallenge(null);
                            loadRecords();
                        } else {
                            if (!locked) countdownTimer.resume()
                        }
                    }}
                    countdownTimer={{
                        secondsLeft: countdownTimer.secondsLeft,
                        totalSeconds: questionTimeLimit,
                        isRunning: countdownTimer.isRunning
                    }}
                    invisibleMode={invisibleMode}
                    queue={queue}
                    currentIndex={currentIndex}
                    scoreLog={scoreLog}
                    showFeedback={showFeedback}
                    isRedemption={isRedemption}
                    currentQuestion={q}
                    prefix="sa"
                />

                <div className="sa-question-area">
                    <div className="sa-prompt-container">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '5px' }}>
                            <div className="sa-prompt-type" style={{ margin: 0 }}>Build the Sentence</div>
                            <button className="sa-prompt-hint-btn" onClick={handleShowHint}>💡</button>
                        </div>
                        <div className="sa-prompt-val">{q.cn}</div>
                    </div>

                    {/* Answer Selection Area */}
                    <div className="sa-answer-area">
                        {locked ? (
                            <div className="sa-sentence-text" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', padding: '10px 0', width: '100%', textAlign: 'center' }}>
                                {userSelection.map((item, idx) => {
                                    let text = item.text;
                                    if (idx === 0) {
                                        if (text.charAt(0) === text.charAt(0).toLowerCase()) {
                                            text = text.charAt(0).toUpperCase() + text.slice(1);
                                        }
                                    }
                                    return text;
                                }).join(" ")}
                                {/[.!?]$/.test(q.en) && !/[.!?]$/.test(userSelection[userSelection.length - 1]?.text || '') ? q.en.slice(-1) : ''}
                            </div>
                        ) : (
                            <>
                                {userSelection.length === 0 && (
                                    <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Tap words below to assemble</span>
                                )}
                                {userSelection.map((item, idx) => {
                                    let text = item.text;
                                    if (idx === 0) {
                                        if (text.charAt(0) === text.charAt(0).toLowerCase()) {
                                            text = text.charAt(0).toUpperCase() + text.slice(1);
                                        }
                                    }
                                    return (
                                        <button
                                            key={idx}
                                            className="sa-word-btn-answer"
                                            onClick={() => removeWord(idx, item)}
                                        >
                                            {text}
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    {/* Word Pool Area */}
                    <div className="sa-word-pool">
                        {wordPool.map((word) => (
                            <button
                                key={word.id}
                                className={`sa-word-btn ${word.selected ? 'selected' : ''}`}
                                onClick={() => selectWord(word)}
                                disabled={locked || word.selected}
                            >
                                <span>{word.text}</span>
                                {word.ipa && <span className="sa-ipa">[{word.ipa}]</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feedback Area */}
                <div className={`sa-feedback-area ${showFeedback ? 'visible ' + (isCorrectFeedback ? 'correct' : 'wrong') : ''}`}>
                    {showFeedback ? (
                        isCorrectFeedback ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {(q.audio || textbook) && (
                                        <button
                                            className="sa-play-btn"
                                            onClick={() => playAudio(q.audio || getAudioUrl(q.en, textbook, isCf))}
                                        >
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </button>
                                    )}
                                    <h3 className="sa-feedback-title" style={{ color: '#58cc02' }}>Perfect Structure!</h3>
                                </div>
                                <p className="sa-feedback-msg">{q.en}</p>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {(q.audio || textbook) && (
                                        <button
                                            className="sa-play-btn"
                                            onClick={() => playAudio(q.audio || getAudioUrl(q.en, textbook, isCf))}
                                        >
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </button>
                                    )}
                                    <h3 className="sa-feedback-title" style={{ color: '#ea2b2b' }}>Correct Answer:</h3>
                                </div>
                                <p className="sa-feedback-msg">{q.en}</p>
                                <div className="sa-feedback-sentence">💡 {q.hint}</div>
                            </>
                        )
                    ) : null}
                </div>

                {/* Footer Action Button */}
                <FooterAction
                    locked={locked}
                    disableCheck={userSelection.length === 0}
                    continueDisabled={continueDisabled}
                    onCheck={() => checkAnswer()}
                    onContinue={nextQuestion}
                    buttonText={continueBtnText}
                    prefix="sa"
                />

                {(showHintModal || isClosing) && (
                    <div className={`sa-modal-overlay${isClosing ? ' closing' : ''}`} onClick={closeHintModal}>
                        <div className={`sa-modal-content${isClosing ? ' closing' : ''}`} onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    💡 Hint (提示) <span style={{ fontSize: '0.9rem', color: '#999', marginLeft: '6px' }}>({hintTimeLeft}s)</span>
                                </span>
                                <button className="sa-close-btn" style={{ margin: 0, width: 'auto', fontSize: '1.2rem' }} onClick={closeHintModal}>✕</button>
                            </div>
                            <div style={{ fontSize: '1.05rem', color: '#333', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                {q.hint}
                            </div>
                        </div>
                    </div>
                )}

                {lockModalOpen && (
                     <DailyLockModal onClose={() => setLockModalOpen(false)} />
                 )}
            </div>
        </div>
    )
}
