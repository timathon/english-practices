import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './GrammarWizardShell.css'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { CountdownRing } from './CountdownRing'

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

export function GrammarWizardShell({ data, practiceId, unit, textbook }: any) {
   const { data: session } = useSession()
   const userId = session?.user?.id
   const sfxRef = useRef<HTMLAudioElement | null>(null)
   
   const [activeChallenge, setActiveChallenge] = useState<any>(null)
   const [queue, setQueue] = useState<any[]>([])
   const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
   const [currentIndex, setCurrentIndex] = useState(0)
   const [scoreLog, setScoreLog] = useState<Array<string | null>>([])
   
   const [isRedemption, setIsRedemption] = useState(false)
   const [q, setQ] = useState<any>(null)
   const [options, setOptions] = useState<any[]>([])

   const [selectedOption, setSelectedOption] = useState<number | null>(null)
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
   const [continueDisabled, setContinueDisabled] = useState(false)
   const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
   const recordIdPromiseRef = useRef<Promise<string> | null>(null)
   const [practiceRecords, setPracticeRecords] = useState<any[]>([])
   const [gainedXp, setGainedXp] = useState(0)
   const [gainedLove, setGainedLove] = useState(0)
   const [historicalBest, setHistoricalBest] = useState(0)
   const [isNewHigh, setIsNewHigh] = useState(false)
   const [invisibleMode, setInvisibleMode] = useState(false)
   const [historyModal, setHistoryModal] = useState<{title: string, logs: any[]} | null>(null)
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

   const primaryColor = data.primaryColor || '#8b5cf6' // Elegant purple for grammar wizards
   const primaryDarkColor = data.primaryColorDark || '#6d28d9'

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

   const handleChallengeSelect = (c: any) => {
       const hasConsumed = trialsTracker.consumeTrial(practiceId, c.id)
       if (!hasConsumed) return;
       
       setActiveChallenge(c)
       setActiveRecordId(null)
       setGainedXp(0)
       setGainedLove(0)
       recordIdPromiseRef.current = null
       
       // Shuffle questions
       const shuffled = shuffle([...c.questions]).map((q: any, i: number) => ({ ...q, originalIndex: i }))
       setQueue(shuffled)
       setMistakeQueue([])
       setCurrentIndex(0)
       setScoreLog(new Array(c.questions.length).fill(null))
       setCompleted(false)
       
       // Preload audio SFX
       audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3");
       audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3");
       
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
       setSelectedOption(null)
       setHintUsed(false)
       setShowHintModal(false)
       setIsClosing(false)
       if (hintIntervalRef.current) {
           clearInterval(hintIntervalRef.current)
           hintIntervalRef.current = null
       }
       setLocked(false)
       setShowFeedback(false)
       timerExpiredRef.current = false
       
       // We keep option original indices but randomize their display order
       const mappedOptions = nextQ.options.map((text: string, idx: number) => ({ text, originalIdx: idx }));
       setOptions(shuffle(mappedOptions));
       // Reset countdown timer
       if (!invisibleMode) {
           countdownTimer.reset()
       } else {
           countdownTimer.pause()
       }
   }

   const playSfx = async (type: 'correct'|'wrong') => {
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

    const handleOptionClick = useCallback((idx: number) => {
        if (locked) return
        setSelectedOption(idx)
    }, [locked])

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
        if (!forceWrong && selectedOption === null) return
        setLocked(true)
        countdownTimer.pause()
        
        setContinueDisabled(true)
        setTimeout(() => setContinueDisabled(false), 1000)

        const isCorrect = !forceWrong && selectedOption === q.answer
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
                       practiceType: 'grammar-wizard',
                       question: q,
                       wrongAnswer: selectedOption !== null ? q.options[selectedOption] : undefined
                   });
               }
           } else {
               const missed = updatedMistakes.shift()
               updatedMistakes.push(missed) // Move to back of the queue
           }
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
           syncRecord(scorePercent, false)
       }
    }, [locked, selectedOption, q, mistakeQueue, scoreLog, currentIndex, isRedemption, hintUsed, queue.length, countdownTimer, userId, practiceId, textbook, unit, invisibleMode])

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
                    if (selectedOption !== null) {
                        checkAnswer();
                    }
                } else {
                    if (!continueDisabled) {
                        nextQuestion();
                    }
                }
            } else if (!locked && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const idx = parseInt(e.key, 10) - 1;
                if (options[idx]) {
                    handleOptionClick(options[idx].originalIdx);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeChallenge, completed, historyModal, showHintModal, locked, selectedOption, continueDisabled, nextQuestion, checkAnswer, options, handleOptionClick]);

   if (!activeChallenge) {
       return (
           <div className="gw-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
               <div className="gw-screen">
                   <div className="gw-header">
                       <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                       <h1>{data.title}</h1>
                       <h2>{data.level}</h2>
                   </div>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '20px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '8px 16px',
                        width: 'fit-content',
                        margin: '0 auto 20px auto'
                    }}>
                        <label style={{ 
                            fontSize: '0.95rem', 
                            color: '#475569', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer',
                            fontWeight: 500
                        }}>
                            <input 
                                type="checkbox" 
                                checked={invisibleMode} 
                                onChange={(e) => setInvisibleMode(e.target.checked)}
                                style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    accentColor: 'var(--primary)',
                                    cursor: 'pointer'
                                }}
                            />
                            <span>👻 Invisible Mode (No timer, no rewards/records)</span>
                        </label>
                    </div>
                   
                   <div className="gw-challenge-grid">
                       {data.challenges.map((c: any) => (
                           <div key={c.id} className="gw-challenge-card">
                               <div className="gw-card-header">
                                   <div style={{ display: 'flex', alignItems: 'center' }}>
                                       <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{c.icon}</span>
                                       <h3 className="gw-card-title" style={{ marginRight: '8px' }}>{c.title}</h3>
                                       <div style={{ fontSize: '0.7rem', color: 'rgb(153, 153, 153)', marginTop: '2px' }}>
                                           {trialsTracker.getRemainingTrials(practiceId, c.id)} / 5 attempts left
                                       </div>
                                   </div>
                                   <button 
                                        className="gw-start-btn" 
                                        onClick={() => handleChallengeSelect(c)}
                                        style={trialsTracker.getRemainingTrials(practiceId, c.id) === 0 ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                   >
                                        {trialsTracker.getRemainingTrials(practiceId, c.id) === 0 ? 'OUT OF ATTEMPTS' : 'START'}
                                   </button>
                                </div>
                               <div className="gw-card-stats">
                                   {(() => {
                                       const s = getStats(c.title);
                                       return (
                                        <>
                                           <div className="gw-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `TODAY - ${c.title}`, logs: s.todayLogs })}>
                                               <span className="gw-stat-label">TODAY</span>
                                               <span className="gw-stat-val" style={s.todayBest >= 70 ? { color: '#10b981', fontWeight: 'bold' } : {}}>{s.todayRuns} Runs | Best: {s.todayBest}%</span>
                                           </div>
                                           <div className="gw-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `LIFETIME - ${c.title}`, logs: s.lifeLogs })}>
                                               <span className="gw-stat-label">LIFETIME</span>
                                               <span className="gw-stat-val">{s.lifeRuns} Runs | Best: {s.lifeBest}%</span>
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
                   <div className="gw-modal-overlay" onClick={() => setHistoryModal(null)}>
                       <div className="gw-modal-content" onClick={e => e.stopPropagation()}>
                           <h3 className="gw-modal-title">{historyModal.title}</h3>
                           {historyModal.logs.length === 0 ? (
                               <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                           ) : (
                               <ul className="gw-history-list">
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
                                           <li key={log.id || i} className="gw-history-item">
                                               <span className="gw-history-date">{dateLabel}</span>
                                               <span className="gw-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                   {log.score}%{isUnfinished}
                                               </span>
                                           </li>
                                       );
                                   })}
                               </ul>
                           )}
                           <button className="gw-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                       </div>
                   </div>
               )}
           </div>
       )
   }

   if (completed) {
        return (
            <div className="gw-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="gw-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
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

                     <button className="gw-check-btn" onClick={() => {
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

   return (
       <div className="gw-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
           <div className="gw-screen">
                <div className="gw-top-bar">
                    <div style={{ position: 'relative', flexShrink: 0, width: 30 }}>
                        <button className="gw-close-btn" onClick={() => {
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
                        {!invisibleMode && <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={30} isRunning={countdownTimer.isRunning} />}
                    </div>
                   <div className="gw-progress-container">
                        {queue.map((_, i) => {
                            const isActive = (!isRedemption && i === currentIndex && !showFeedback) || (isRedemption && q && q.originalIndex === i && !showFeedback);
                            return <div key={i} className={`gw-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`} />
                        })}
                   </div>
               </div>

               <div className="gw-question-area">
                   <div className="gw-prompt-container">
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                           <div className="gw-prompt-category" style={{ margin: 0 }}>{q.category.toUpperCase()}</div>
                           <button className="gw-prompt-hint-btn" onClick={handleShowHint}>💡</button>
                       </div>
                       <div className="gw-prompt-val">{q.prompt}</div>
                   </div>

                   <div className="gw-options-list">
                       {options.map((opt: any, idx: number) => {
                           let classes = "gw-option-btn "
                           if (locked) {
                               if (opt.originalIdx === q.answer) {
                                   classes += "correct "
                               } else if (selectedOption === opt.originalIdx) {
                                   classes += "wrong "
                               }
                           } else {
                               if (selectedOption === opt.originalIdx) {
                                   classes += "selected "
                               }
                           }

                           return (
                               <button 
                                   key={`${opt.text}-${opt.originalIdx}`} 
                                   className={classes}
                                   onClick={() => handleOptionClick(opt.originalIdx)}
                                   disabled={locked}
                               >
                                   <span className="gw-option-marker">{idx + 1}</span>
                                   <span className="gw-option-text">{opt.text}</span>
                               </button>
                           )
                       })}
                   </div>
               </div>

               <div className={`gw-feedback-area ${showFeedback ? 'visible ' + (isCorrectFeedback ? 'correct' : 'wrong') : ''}`}>
                   {showFeedback ? (
                       <>
                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <h3 className="gw-feedback-title" style={{ color: isCorrectFeedback ? '#10b981' : '#ef4444' }}>
                                   {isCorrectFeedback ? 'Excellent!' : 'Incorrect'}
                               </h3>
                           </div>
                           <p className="gw-feedback-msg">
                               {isCorrectFeedback ? 'Great job!' : `Correct Answer: ${q.options[q.answer]}`}
                           </p>
                           <div className="gw-feedback-explanation">
                               <strong>解析:</strong> {q.explanation}
                           </div>
                       </>
                   ) : null}
               </div>

               <div className="gw-footer-action">
                   {!locked ? (
                       <button 
                           className="gw-check-btn" 
                           disabled={selectedOption === null}
                           onClick={() => checkAnswer()}
                       >
                           Check
                       </button>
                   ) : (
                        <button 
                            className="gw-check-btn continue" 
                            onClick={nextQuestion}
                            disabled={continueDisabled}
                        >
                            {(() => {
                                const isCorrect = selectedOption === q.answer;
                                let mistakesCount = mistakeQueue.length;
                                if (isRedemption) {
                                    if (isCorrect) mistakesCount = Math.max(0, mistakesCount - 1);
                                } else {
                                    if (!isCorrect) mistakesCount += 1;
                                }
                                const isLast = isRedemption 
                                    ? (mistakesCount === 0)
                                    : (currentIndex + 1 >= queue.length && mistakesCount === 0);
                                return isLast ? 'Finish' : 'Continue';
                            })()}
                        </button>
                   )}
               </div>

               {(showHintModal || isClosing) && (
                    <div className={`gw-modal-overlay${isClosing ? ' closing' : ''}`} onClick={closeHintModal}>
                        <div className={`gw-modal-content${isClosing ? ' closing' : ''}`} onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    💡 Hint (提示) <span style={{ fontSize: '0.9rem', color: '#999', marginLeft: '6px' }}>({hintTimeLeft}s)</span>
                                </span>
                                <button className="gw-close-btn" style={{ margin: 0, width: 'auto', fontSize: '1.2rem' }} onClick={closeHintModal}>✕</button>
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
