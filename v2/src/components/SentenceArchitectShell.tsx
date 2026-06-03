import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './SentenceArchitectShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { CountdownRing } from './CountdownRing'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

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
    const { data: session } = useSession()
    const userId = session?.user?.id
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const sfxRef = useRef<HTMLAudioElement | null>(null)

    const [activeChallenge, setActiveChallenge] = useState<any>(null)
    const [queue, setQueue] = useState<any[]>([])
    const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog] = useState<Array<string | null>>([])

    const [isRedemption, setIsRedemption] = useState(false)
    const [q, setQ] = useState<any>(null)
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

    // Settings
    const [autoplay, setAutoplay] = useState(() => {
        try {
            const saved = localStorage.getItem('sa-settings-autoplay')
            return saved !== 'false'
        } catch {
            return true
        }
    })
    const [sfxEnabled, setSfxEnabled] = useState(() => {
        try {
            const saved = localStorage.getItem('sa-settings-sfx')
            return saved !== 'false'
        } catch {
            return true
        }
    })
    const [showSettings, setShowSettings] = useState(false)

    // Countdown / Continue Disabled State
    const [continueCountdown, setContinueCountdown] = useState(0)
    const [continueDisabled, setContinueDisabled] = useState(false)

    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)
    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {})

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
            const res = await fetch(API_URL + '/api/records', { credentials: 'include' })
            const json = await res.json()
            if (Array.isArray(json)) setPracticeRecords(json)
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

    const handleChallengeSelect = (c: any) => {
        const hasConsumed = trialsTracker.consumeTrial(practiceId, c.id)
        if (!hasConsumed) return;

        setActiveChallenge(c)
        setActiveRecordId(null)
        recordIdPromiseRef.current = null

        // Clone and shuffle questions
        const shuffled = shuffle([...c.data]).map((q: any, i: number) => ({ ...q, originalIndex: i }))
        setQueue(shuffled)
        setMistakeQueue([])
        setCurrentIndex(0)
        setScoreLog(new Array(c.data.length).fill(null))
        setCompleted(false)

        // Preload Audio
        shuffled.forEach((qItem: any) => {
            const sentenceAudioUrl = qItem.audio || (textbook ? getAudioUrl(qItem.en, textbook) : null);
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
        countdownTimer.reset()
    }

    const playAudio = async (url: string) => {
        if (!url) return;
        try {
            const blob = await audioCache.cacheAudio(url);
            if (!blob) return;
            const blobUrl = URL.createObjectURL(blob);
            if (audioRef.current) {
                audioRef.current.src = blobUrl;
                audioRef.current.onended = () => URL.revokeObjectURL(blobUrl)
                audioRef.current.play().catch(console.error)
            } else {
                const a = new Audio(blobUrl)
                a.onended = () => URL.revokeObjectURL(blobUrl)
                a.play().catch(console.error)
                audioRef.current = a
            }
        } catch (e) { console.error(e) }
    }

    const playSfx = async (type: 'correct' | 'wrong') => {
        if (!sfxEnabled) return;
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
            petService.awardCorrectAnswer()
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
                if (userId) {
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

        // Sentence audio playback (after correct/wrong sfx if autoplay is on)
        const sentenceAudioUrl = q.audio || (textbook ? getAudioUrl(q.en, textbook) : null);
        if (autoplay && sentenceAudioUrl) {
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
        syncRecord(scorePercent, false)

        // Autoplay countdown timer
        if (autoplay) {
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
        }
    }, [locked, userSelection, q, mistakeQueue, scoreLog, currentIndex, isRedemption, hintUsed, autoplay, queue.length, countdownTimer])

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

        syncRecord(scorePercent, true)
        if (userId) {
            mistakeService.syncToServer(userId);
        }
    }

    const getStats = (challengeTitle: string) => {
        const u = `${practiceId} (${challengeTitle})`
        const logs = practiceRecords.filter(r => r.unit === u)

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

    const toggleAutoplay = () => {
        const next = !autoplay
        setAutoplay(next)
        try { localStorage.setItem('sa-settings-autoplay', String(next)) } catch {}
    }

    const toggleSfx = () => {
        const next = !sfxEnabled
        setSfxEnabled(next)
        try { localStorage.setItem('sa-settings-sfx', String(next)) } catch {}
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
            if (!activeChallenge || completed || historyModal || showSettings || showHintModal) return;
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
    }, [activeChallenge, completed, historyModal, showSettings, showHintModal, locked, userSelection.length, continueDisabled, nextQuestion, checkAnswer]);

    if (!activeChallenge) {
        return (
            <div className="sa-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="sa-screen">
                    <div className="sa-header">
                        <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                        <h1>{data.title}</h1>
                        <h2>{data.level}</h2>
                        <button className="sa-settings-toggle" onClick={() => setShowSettings(true)}>⚙️</button>
                    </div>

                    <div className="sa-challenge-grid">
                        {data.challenges.map((c: any) => (
                            <div key={c.id} className="sa-challenge-card">
                                <div className="sa-card-header">
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{c.icon}</span>
                                        <h3 className="sa-card-title" style={{ marginRight: '8px' }}>{c.title}</h3>
                                        <div style={{ fontSize: '0.7rem', color: 'rgb(153, 153, 153)', marginTop: '2px' }}>
                                            {trialsTracker.getRemainingTrials(practiceId, c.id)} / 5 left
                                        </div>
                                    </div>
                                    <button
                                        className="sa-start-btn"
                                        onClick={() => handleChallengeSelect(c)}
                                        style={trialsTracker.getRemainingTrials(practiceId, c.id) === 0 ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                    >
                                        {trialsTracker.getRemainingTrials(practiceId, c.id) === 0 ? 'LIMIT' : 'START'}
                                    </button>
                                </div>
                                <div className="sa-card-stats">
                                    {(() => {
                                        const s = getStats(c.title);
                                        return (
                                            <>
                                                <div className="sa-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `TODAY - ${c.title}`, logs: s.todayLogs })}>
                                                    <span className="sa-stat-label">TODAY</span>
                                                    <span className="sa-stat-val">{s.todayRuns} Runs | Best: {s.todayBest}%</span>
                                                </div>
                                                <div className="sa-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `LIFETIME - ${c.title}`, logs: s.lifeLogs })}>
                                                    <span className="sa-stat-label">LIFETIME</span>
                                                    <span className="sa-stat-val">{s.lifeRuns} Runs | Best: {s.lifeBest}%</span>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* History Modal */}
                {historyModal && (
                    <div className="sa-modal-overlay" onClick={() => setHistoryModal(null)}>
                        <div className="sa-modal-content" onClick={e => e.stopPropagation()}>
                            <h3 className="sa-modal-title">{historyModal.title}</h3>
                            {historyModal.logs.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                            ) : (
                                <ul className="sa-history-list">
                                    {historyModal.logs.map((log: any, i: number) => {
                                        const d = new Date(log.createdAt);
                                        const isUnfinished = log.unfinished ? ' (Unfinished)' : '';
                                        const now = new Date();
                                        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                        const logMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                        const diffDays = Math.round((todayMidnight.getTime() - logMidnight.getTime()) / 86400000);
                                        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        let dateLabel: string;
                                        if (diffDays === 0) dateLabel = historyModal.title.startsWith('LIFETIME') ? 'Today ' + timeStr : timeStr;
                                        else if (diffDays === 1) dateLabel = 'Yesterday ' + timeStr;
                                        else if (diffDays <= 6) dateLabel = diffDays + ' days ago ' + timeStr;
                                        else dateLabel = d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                                        return (
                                            <li key={log.id || i} className="sa-history-item">
                                                <span className="sa-history-date">{dateLabel}</span>
                                                <span className="sa-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                    {log.score}%{isUnfinished}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <button className="sa-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                        </div>
                    </div>
                )}

                {/* Settings Modal */}
                {showSettings && (
                    <div className="sa-modal-overlay" onClick={() => setShowSettings(false)}>
                        <div className="sa-modal-content" onClick={e => e.stopPropagation()}>
                            <h3 className="sa-modal-title">Settings</h3>
                            <div className="sa-settings-row">
                                <label htmlFor="autoplay-check">Autoplay Audio</label>
                                <input
                                    id="autoplay-check"
                                    type="checkbox"
                                    checked={autoplay}
                                    onChange={toggleAutoplay}
                                />
                            </div>
                            <div className="sa-settings-row">
                                <label htmlFor="sfx-check">Sound Effects</label>
                                <input
                                    id="sfx-check"
                                    type="checkbox"
                                    checked={sfxEnabled}
                                    onChange={toggleSfx}
                                />
                            </div>
                            <button className="sa-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setShowSettings(false)}>Save & Close</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (completed) {
        return (
            <div className="sa-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="sa-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '10px 0 30px 0', color: '#555' }}>Challenge Complete!</h2>
                    
                    {/* Review Mistakes Section */}
                    {mistakeQueue.length > 0 ? (
                        <div className="sa-mistakes-review-box">
                            <h3 className="sa-mistakes-review-title">Review Mistakes:</h3>
                            <div className="sa-mistakes-review-list">
                                {[...new Set(mistakeQueue)].map((qItem: any, idx: number) => (
                                    <div key={qItem.id || idx} className="sa-mistake-review-item">
                                        <div className="sa-mistake-review-cn">{qItem.cn}</div>
                                        <div className="sa-mistake-review-en">{qItem.en}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="sa-perfect-run-badge">🎉 Perfect Run! No mistakes.</div>
                    )}

                    <button className="sa-check-btn" onClick={() => {
                        setActiveChallenge(null)
                        loadRecords()
                    }} style={{ maxWidth: '300px' }}>
                        Back to Menu
                    </button>
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

    const isLastItem = isRedemption
        ? mistakeQueue.length === 0
        : (currentIndex >= queue.length - 1 && mistakeQueue.length === 0);

    return (
        <div className="sa-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="sa-screen">
                <div className="sa-top-bar">
                    <div style={{ position: 'relative', flexShrink: 0, width: 30 }}>
                        <button className="sa-close-btn" onClick={() => {
                            countdownTimer.pause()
                            const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id);
                            if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this challenge today!`)) {
                                if (userId) {
                                    mistakeService.syncToServer(userId);
                                }
                                setActiveChallenge(null);
                                loadRecords();
                            } else {
                                if (!locked) countdownTimer.resume()
                            }
                        }}>✕</button>
                        <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={30} isRunning={countdownTimer.isRunning} />
                    </div>
                    <div className="sa-progress-container">
                        {queue.map((_, i) => {
                            const isActive = (!isRedemption && i === currentIndex && !showFeedback) || (isRedemption && q && q.originalIndex === i && !showFeedback);
                            return <div key={i} className={`sa-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`} />
                        })}
                    </div>
                </div>

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
                                            onClick={() => playAudio(q.audio || getAudioUrl(q.en, textbook))}
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
                                            onClick={() => playAudio(q.audio || getAudioUrl(q.en, textbook))}
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
                <div className="sa-footer-action">
                    {!locked ? (
                        <button
                            className="sa-check-btn"
                            disabled={userSelection.length === 0}
                            onClick={() => checkAnswer()}
                        >
                            Check
                        </button>
                    ) : (
                        <button
                            className={`sa-check-btn continue ${isLastItem ? 'finish' : ''}`}
                            onClick={nextQuestion}
                            disabled={continueDisabled}
                            style={{
                                backgroundColor: isLastItem ? 'var(--primary)' : 'var(--secondary)',
                                borderBottomColor: isLastItem ? 'var(--primary-dark)' : 'var(--secondary-dark)'
                            }}
                        >
                            {continueBtnText}
                        </button>
                    )}
                </div>

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
            </div>
        </div>
    )
}
