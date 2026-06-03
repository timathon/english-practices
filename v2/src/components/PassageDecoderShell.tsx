import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './PassageDecoderShell.css'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { CountdownRing } from './CountdownRing'



export function PassageDecoderShell({ data, practiceId, unit, textbook }: any) {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const sfxRef = useRef<HTMLAudioElement | null>(null)
    const activeSentenceRef = useRef<HTMLSpanElement | null>(null)

    // Sections list with safe IDs
    const sections = (data.sections || []).map((sec: any, idx: number) => ({
        ...sec,
        id: sec.id || `sec_${idx + 1}`
    }));

    const [activeSection, setActiveSection] = useState<any>(null)
    const [queue, setQueue] = useState<any[]>([])
    const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog] = useState<Array<string | null>>([])

    const [isRedemption, setIsRedemption] = useState(false)
    const [q, setQ] = useState<any>(null)
    const [showOptions, setShowOptions] = useState(false)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [locked, setLocked] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [finalScore, setFinalScore] = useState(0)
    const [isCorrectFeedback, setIsCorrectFeedback] = useState(false)

    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {})

    // Countdown timer (15s per question)
    const countdownTimer = useCountdown(15, {
        onExpire: () => {
            if (timerExpiredRef.current) return
            timerExpiredRef.current = true
            checkAnswerRef.current(true)
        }
    })

    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)

    const primaryColor = data.primaryColor || '#4f46e5'
    const primaryDarkColor = data.primaryColorDark || '#3730a3'

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
    }, [])

    const handleSectionSelect = (sec: any) => {
        const hasConsumed = trialsTracker.consumeTrial(practiceId, sec.id)
        if (!hasConsumed) return;

        setActiveSection(sec)
        setActiveRecordId(null)
        recordIdPromiseRef.current = null

        // Passages are played in linear narrative order (NOT shuffled)
        const linearQueue = sec.sentences.map((sentence: any, i: number) => ({
            ...sentence,
            originalIndex: i
        }))

        setQueue(linearQueue)
        setMistakeQueue([])
        setCurrentIndex(0)
        setScoreLog(new Array(sec.sentences.length).fill(null))
        setCompleted(false)

        // Preload audios
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3");
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3");

        loadQuestion(linearQueue, [], 0, false)
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

        if (nextQ) {
            // Create a copy of the question and shuffle its options
            const shuffledQ = { ...nextQ };
            const zipped = shuffledQ.options.map((opt: string, idx: number) => ({
                opt,
                isCorrect: idx === nextQ.answer
            }));
            
            for (let i = zipped.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
            }
            
            shuffledQ.options = zipped.map((z: any) => z.opt);
            shuffledQ.answer = zipped.findIndex((z: any) => z.isCorrect);
            nextQ = shuffledQ;
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

    const syncRecord = async (scorePercent: number, isFinished: boolean) => {
        try {
            const unitName = `${practiceId} (${activeSection.title})`;
            if (activeRecordId) {
                const res = await fetch(`${API_URL}/api/records/${activeRecordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: unitName,
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
                        unit: unitName,
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
                            unit: unitName,
                            score: scorePercent,
                            unfinished: !isFinished
                        })
                    })
                    const j = await res.json()
                    if (j.success && j.id) {
                        setActiveRecordId(j.id)
                        cache.updateRecord({
                            id: j.id,
                            unit: unitName,
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

    const checkAnswer = useCallback((optionIdx: number | null, forceWrong?: boolean) => {
        if (locked) return
        if (!forceWrong && optionIdx === null) return
        setLocked(true)
        countdownTimer.pause()

        const isCorrect = !forceWrong && optionIdx === q.answer
        setIsCorrectFeedback(isCorrect)
        setSelectedOption(optionIdx)

        let updatedMistakes = [...mistakeQueue]
        let updatedScoreLog = [...scoreLog]

        if (isCorrect) {
            playSfx('correct')
            petService.awardCorrectAnswer()
            if (isRedemption) {
                updatedScoreLog[q.originalIndex] = "redemption"
                updatedMistakes.shift() // Remove from mistake queue
            } else {
                updatedScoreLog[currentIndex] = "green"
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
                        practiceType: 'passage-decoder',
                        question: q,
                        wrongAnswer: optionIdx !== null ? q.options[optionIdx] : undefined
                    });
                }
            } else {
                const missed = updatedMistakes.shift()
                updatedMistakes.push(missed) // Move to back
            }
        }

        setMistakeQueue(updatedMistakes)
        setScoreLog(updatedScoreLog)

        const totalScore = updatedScoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / queue.length) * 100)
        syncRecord(scorePercent, false)
    }, [locked, q, mistakeQueue, scoreLog, currentIndex, isRedemption, queue.length, countdownTimer])

    // Keep ref in sync so onExpire uses the latest checkAnswer
    useEffect(() => {
        checkAnswerRef.current = (forceWrong?: boolean) => {
            checkAnswer(null, forceWrong)
        }
    }, [checkAnswer])

    const nextQuestion = useCallback(() => {
        let nextIndex = currentIndex
        if (!isRedemption) {
            nextIndex = currentIndex + 1
            setCurrentIndex(nextIndex)
        }
        loadQuestion(queue, mistakeQueue, nextIndex, isRedemption)
    }, [currentIndex, isRedemption, queue, mistakeQueue])

    const finishGame = async (finalQueue: any[]) => {
        setCompleted(true)
        countdownTimer.pause()

        const totalScore = scoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / finalQueue.length) * 100)
        setFinalScore(scorePercent)

        syncRecord(scorePercent, true)
        if (userId) {
            mistakeService.syncToServer(userId);
        }
    }

    const getStats = (sectionTitle: string) => {
        const u = `${practiceId} (${sectionTitle})`
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

    const revealOptions = () => {
        setShowOptions(true)
        timerExpiredRef.current = false
        countdownTimer.reset(15)
    }

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeSection || completed || historyModal) return;

            if (e.key === ' ') {
                e.preventDefault();
                if (!showOptions) {
                    revealOptions();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (showOptions && locked) {
                    nextQuestion();
                }
            } else if (showOptions && !locked) {
                if (e.key === '1') {
                    e.preventDefault();
                    checkAnswer(0);
                } else if (e.key === '2') {
                    e.preventDefault();
                    checkAnswer(1);
                } else if (e.key === '3') {
                    e.preventDefault();
                    checkAnswer(2);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection, completed, historyModal, showOptions, locked, nextQuestion, checkAnswer, q]);

    // Scroll active sentence into view
    useEffect(() => {
        if (activeSentenceRef.current) {
            activeSentenceRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [currentIndex, q, showOptions]);

    // Menu/Dashboard View
    if (!activeSection) {
        return (
            <div className="pd-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="pd-screen">
                    <div className="pd-header">
                        <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                        <h1>{data.title}</h1>
                        <h2>{data.level}</h2>
                    </div>

                    <div className="pd-section-grid">
                        {sections.map((sec: any) => (
                            <div key={sec.id} className="pd-section-card">
                                <div className="pd-card-header">
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3 className="pd-card-title">{sec.title}</h3>
                                        <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px' }}>
                                            {trialsTracker.getRemainingTrials(practiceId, sec.id)} / 5 attempts left
                                        </div>
                                    </div>
                                    <button
                                        className="pd-start-btn"
                                        onClick={() => handleSectionSelect(sec)}
                                        style={trialsTracker.getRemainingTrials(practiceId, sec.id) === 0 ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                    >
                                        {trialsTracker.getRemainingTrials(practiceId, sec.id) === 0 ? 'LOCKED' : 'START'}
                                    </button>
                                </div>
                                <div className="pd-card-stats">
                                    {(() => {
                                        const s = getStats(sec.title);
                                        return (
                                            <>
                                                <div className="pd-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `TODAY - ${sec.title}`, logs: s.todayLogs })}>
                                                    <span className="pd-stat-label">TODAY</span>
                                                    <span className="pd-stat-val">{s.todayRuns} Runs | Best: {s.todayBest}%</span>
                                                </div>
                                                <div className="pd-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `LIFETIME - ${sec.title}`, logs: s.lifeLogs })}>
                                                    <span className="pd-stat-label">LIFETIME</span>
                                                    <span className="pd-stat-val">{s.lifeRuns} Runs | Best: {s.lifeBest}%</span>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {historyModal && (
                    <div className="pd-modal-overlay" onClick={() => setHistoryModal(null)}>
                        <div className="pd-modal-content" onClick={e => e.stopPropagation()}>
                            <h3 className="pd-modal-title">{historyModal.title}</h3>
                            {historyModal.logs.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                            ) : (
                                <ul className="pd-history-list">
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
                                            <li key={log.id || i} className="pd-history-item">
                                                <span className="pd-history-date">{dateLabel}</span>
                                                <span className="pd-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                    {log.score}%{isUnfinished}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <button className="pd-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Completion View
    if (completed) {
        return (
            <div className="pd-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="pd-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '10px 0 30px 0', color: '#555' }}>Section Complete!</h2>
                    <button className="pd-check-btn" onClick={() => {
                        setActiveSection(null)
                        loadRecords()
                    }} style={{ maxWidth: '300px' }}>
                        Back to Menu
                    </button>
                </div>
            </div>
        )
    }

    if (!q) return null

    return (
        <div className="pd-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="pd-screen gameplay">
                <div className="pd-top-bar">
                    <button className="pd-close-btn" onClick={() => {
                        countdownTimer.pause()
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeSection.id);
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this section today!`)) {
                            if (userId) {
                                mistakeService.syncToServer(userId);
                            }
                            setActiveSection(null);
                            loadRecords();
                        } else {
                            if (!locked && showOptions) countdownTimer.resume()
                        }
                    }}>✕</button>
                    <div className="pd-progress-container">
                        {queue.map((_, i) => {
                            const isActive = (!isRedemption && i === currentIndex) || (isRedemption && q.originalIndex === i);
                            return <div key={i} className={`pd-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`} />
                        })}
                    </div>
                </div>

                <div className="pd-split-viewport">
                    {/* Upper Viewport: Shows full text context formatted as paragraphs/dialogue */}
                    <div className="pd-upper-viewport">
                        {(() => {
                            // Group sentences into paragraphs/lines
                            const paragraphs: any[][] = [];
                            let currentParagraph: any[] = [];

                            queue.forEach((sentence, idx) => {
                                if (sentence.newline && currentParagraph.length > 0) {
                                    paragraphs.push(currentParagraph);
                                    currentParagraph = [];
                                }
                                currentParagraph.push({ ...sentence, index: idx });
                            });
                            if (currentParagraph.length > 0) {
                                paragraphs.push(currentParagraph);
                            }

                            return paragraphs.map((para, paraIdx) => {
                                const firstSentence = para[0];
                                return (
                                    <p key={paraIdx} className="pd-paragraph">
                                        {firstSentence.speaker && (
                                            <strong className="pd-speaker-prefix">{firstSentence.speaker}: </strong>
                                        )}
                                        {para.map((sentence) => {
                                            const isCurrent = isRedemption
                                                ? q.originalIndex === sentence.index
                                                : currentIndex === sentence.index;
                                            const isPast = isRedemption
                                                ? false
                                                : sentence.index < currentIndex;
                                            return (
                                                <span
                                                    key={sentence.id}
                                                    ref={isCurrent ? activeSentenceRef : null}
                                                    className={`pd-sentence ${isCurrent ? 'active' : ''} ${isPast ? 'completed' : ''}`}
                                                >
                                                    {sentence.en}{' '}
                                                </span>
                                            );
                                        })}
                                    </p>
                                );
                            });
                        })()}
                    </div>

                    {/* Lower Viewport: Handles interaction options and feedback */}
                    <div className="pd-lower-viewport">
                        {!showOptions ? (
                            <div className="pd-think-area">
                                <p className="pd-think-prompt">想一想这句话的中文翻译...</p>
                                <p className="pd-think-sub">Think about the translation in your head</p>
                                <button className="pd-reveal-btn" onClick={revealOptions}>
                                    Show Options <span className="pd-shortcut-tag">Space</span>
                                </button>
                            </div>
                        ) : (
                            <div className="pd-options-area">
                                <div className="pd-timer-container">
                                    <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={15} isRunning={countdownTimer.isRunning} />
                                </div>
                                <div className="pd-options-grid">
                                    {q.options.map((opt: string, optIdx: number) => {
                                        let btnClass = "pd-option-btn"
                                        if (locked) {
                                            if (optIdx === q.answer) {
                                                btnClass += " correct"
                                            } else if (selectedOption === optIdx) {
                                                btnClass += " wrong"
                                            }
                                        } else if (selectedOption === optIdx) {
                                            btnClass += " selected"
                                        }

                                        return (
                                            <button
                                                key={optIdx}
                                                className={btnClass}
                                                onClick={() => checkAnswer(optIdx)}
                                                disabled={locked}
                                            >
                                                <span className="pd-option-num">{optIdx + 1}</span>
                                                <span className="pd-option-text">{opt}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {locked && q.remark && (
                                    <div className="pd-remark-banner">
                                        <span className="pd-remark-icon">💡</span>
                                        <div className="pd-remark-text">
                                            <strong>备注：</strong>{q.remark}
                                        </div>
                                    </div>
                                )}

                                <div className="pd-footer-action">
                                    <button
                                        className="pd-continue-btn"
                                        onClick={nextQuestion}
                                        disabled={!locked}
                                    >
                                        {(() => {
                                            let mistakesCount = mistakeQueue.length;
                                            if (isRedemption && isCorrectFeedback) {
                                                mistakesCount = Math.max(0, mistakesCount - 1);
                                            } else if (!isRedemption && !isCorrectFeedback) {
                                                mistakesCount += 1;
                                            }
                                            const isLast = isRedemption
                                                ? (mistakesCount === 0)
                                                : (currentIndex + 1 >= queue.length && mistakesCount === 0);
                                            return isLast ? 'Finish' : 'Continue';
                                        })()}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
