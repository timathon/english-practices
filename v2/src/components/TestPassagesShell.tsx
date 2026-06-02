import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './TestPassagesShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { API_URL } from '../lib/auth'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

export function TestPassagesShell({ data, practiceId, unit, textbook }: any) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
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
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrectFeedback, setIsCorrectFeedback] = useState(false)

    // Continue button countdown
    const [continueDisabled, setContinueDisabled] = useState(false)
    const [continueCountdown, setContinueCountdown] = useState(0)
    const countdownTimerRef = useRef<number | null>(null)

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
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
        }
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
        linearQueue.forEach((s: any) => {
            if (textbook) {
                audioCache.preloadAndSync(getAudioUrl(s.en, textbook));
            }
        });
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

        setQ(nextQ)
        setIsRedemption(isRedemp)
        setSelectedOption(null)
        setShowOptions(false)
        setLocked(false)
        setShowFeedback(false)
        setContinueCountdown(0)
        setContinueDisabled(false)
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
        }
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

    const checkAnswer = useCallback((optionIdx: number) => {
        if (locked) return
        setLocked(true)

        // Lock Continue button for 2 seconds
        setContinueDisabled(true)
        setContinueCountdown(2)

        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
        let secondsLeft = 2
        countdownTimerRef.current = window.setInterval(() => {
            secondsLeft -= 1
            setContinueCountdown(secondsLeft)
            if (secondsLeft <= 0) {
                setContinueDisabled(false)
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current)
                    countdownTimerRef.current = null
                }
            }
        }, 1000)

        const isCorrect = optionIdx === q.answer
        setIsCorrectFeedback(isCorrect)
        setSelectedOption(optionIdx)
        setShowFeedback(true)

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
            } else {
                const missed = updatedMistakes.shift()
                updatedMistakes.push(missed) // Move to back
            }
        }

        if (textbook) {
            setTimeout(() => playAudio(getAudioUrl(q.en, textbook)), 200)
        }

        setMistakeQueue(updatedMistakes)
        setScoreLog(updatedScoreLog)

        const totalScore = updatedScoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / queue.length) * 100)
        syncRecord(scorePercent, false)
    }, [locked, q, mistakeQueue, scoreLog, currentIndex, isRedemption, queue.length, textbook])

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

        const totalScore = scoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / finalQueue.length) * 100)
        setFinalScore(scorePercent)

        syncRecord(scorePercent, true)
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
        if (textbook && q) {
            playAudio(getAudioUrl(q.en, textbook))
        }
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
                if (showOptions && locked && !continueDisabled) {
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
    }, [activeSection, completed, historyModal, showOptions, locked, continueDisabled, nextQuestion, checkAnswer, q]);

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
            <div className="tp-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="tp-screen">
                    <div className="tp-header">
                        <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                        <h1>{data.title}</h1>
                        <h2>{data.level}</h2>
                    </div>

                    <div className="tp-section-grid">
                        {sections.map((sec: any) => (
                            <div key={sec.id} className="tp-section-card">
                                <div className="tp-card-header">
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3 className="tp-card-title">{sec.title}</h3>
                                        <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px' }}>
                                            {trialsTracker.getRemainingTrials(practiceId, sec.id)} / 5 attempts left
                                        </div>
                                    </div>
                                    <button
                                        className="tp-start-btn"
                                        onClick={() => handleSectionSelect(sec)}
                                        style={trialsTracker.getRemainingTrials(practiceId, sec.id) === 0 ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                    >
                                        {trialsTracker.getRemainingTrials(practiceId, sec.id) === 0 ? 'LOCKED' : 'START'}
                                    </button>
                                </div>
                                <div className="tp-card-stats">
                                    {(() => {
                                        const s = getStats(sec.title);
                                        return (
                                            <>
                                                <div className="tp-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `TODAY - ${sec.title}`, logs: s.todayLogs })}>
                                                    <span className="tp-stat-label">TODAY</span>
                                                    <span className="tp-stat-val">{s.todayRuns} Runs | Best: {s.todayBest}%</span>
                                                </div>
                                                <div className="tp-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `LIFETIME - ${sec.title}`, logs: s.lifeLogs })}>
                                                    <span className="tp-stat-label">LIFETIME</span>
                                                    <span className="tp-stat-val">{s.lifeRuns} Runs | Best: {s.lifeBest}%</span>
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
                    <div className="tp-modal-overlay" onClick={() => setHistoryModal(null)}>
                        <div className="tp-modal-content" onClick={e => e.stopPropagation()}>
                            <h3 className="tp-modal-title">{historyModal.title}</h3>
                            {historyModal.logs.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                            ) : (
                                <ul className="tp-history-list">
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
                                            <li key={log.id || i} className="tp-history-item">
                                                <span className="tp-history-date">{dateLabel}</span>
                                                <span className="tp-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                    {log.score}%{isUnfinished}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <button className="tp-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Completion View
    if (completed) {
        return (
            <div className="tp-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="tp-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '10px 0 30px 0', color: '#555' }}>Section Complete!</h2>
                    <button className="tp-check-btn" onClick={() => {
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
        <div className="tp-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="tp-screen gameplay">
                <div className="tp-top-bar">
                    <button className="tp-close-btn" onClick={() => {
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeSection.id);
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this section today!`)) {
                            setActiveSection(null);
                            loadRecords();
                        }
                    }}>✕</button>
                    <div className="tp-progress-container">
                        {queue.map((_, i) => {
                            const isActive = (!isRedemption && i === currentIndex) || (isRedemption && q.originalIndex === i);
                            return <div key={i} className={`tp-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`} />
                        })}
                    </div>
                </div>

                <div className="tp-split-viewport">
                    {/* Upper Viewport: Shows full text context formatted as paragraphs/dialogue */}
                    <div className="tp-upper-viewport">
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
                                    <p key={paraIdx} className="tp-paragraph">
                                        {firstSentence.speaker && (
                                            <strong className="tp-speaker-prefix">{firstSentence.speaker}: </strong>
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
                                                    className={`tp-sentence ${isCurrent ? 'active' : ''} ${isPast ? 'completed' : ''}`}
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
                    <div className="tp-lower-viewport">
                        {!showOptions ? (
                            <div className="tp-think-area">
                                <p className="tp-think-prompt">想一想这句话的中文翻译...</p>
                                <p className="tp-think-sub">Think about the translation in your head</p>
                                <button className="tp-reveal-btn" onClick={revealOptions}>
                                    Show Options <span className="tp-shortcut-tag">Space</span>
                                </button>
                            </div>
                        ) : (
                            <div className="tp-options-area">
                                <div className="tp-options-grid">
                                    {q.options.map((opt: string, optIdx: number) => {
                                        let btnClass = "tp-option-btn"
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
                                                <span className="tp-option-num">{optIdx + 1}</span>
                                                <span className="tp-option-text">{opt}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className={`tp-feedback-area ${showFeedback ? 'visible ' + (isCorrectFeedback ? 'correct' : 'wrong') : ''}`}>
                                    {showFeedback ? (
                                        isCorrectFeedback ? (
                                            <div className="tp-feedback-content">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <button className="tp-play-btn" onClick={() => playAudio(getAudioUrl(q.en, textbook))}>
                                                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                    </button>
                                                    <h4 className="tp-feedback-title correct">Excellent!</h4>
                                                </div>
                                                <p className="tp-feedback-sentence">📖 {q.en}</p>
                                            </div>
                                        ) : (
                                            <div className="tp-feedback-content">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <button className="tp-play-btn" onClick={() => playAudio(getAudioUrl(q.en, textbook))}>
                                                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                    </button>
                                                    <h4 className="tp-feedback-title wrong">Correct Answer:</h4>
                                                </div>
                                                <p className="tp-feedback-msg">{q.options[q.answer]}</p>
                                                <p className="tp-feedback-sentence">📖 {q.en}</p>
                                            </div>
                                        )
                                    ) : null}
                                </div>

                                <div className="tp-footer-action">
                                    <button
                                        className="tp-continue-btn"
                                        onClick={nextQuestion}
                                        disabled={!locked || continueDisabled}
                                    >
                                        {continueCountdown > 0
                                            ? `Continue (${continueCountdown}s)`
                                            : (() => {
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
                                            })()
                                        }
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
