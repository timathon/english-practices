import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './GrammarWizardShell.css'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { API_URL } from '../lib/auth'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'

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
   const [historyModal, setHistoryModal] = useState<{title: string, logs: any[]} | null>(null)

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
       
       // We keep option original indices but randomize their display order
       const mappedOptions = nextQ.options.map((text: string, idx: number) => ({ text, originalIdx: idx }));
       setOptions(shuffle(mappedOptions));
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

   const handleOptionClick = (idx: number) => {
       if (locked) return
       setSelectedOption(idx)
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

   const checkAnswer = () => {
       if (locked || selectedOption === null) return
       setLocked(true)
       
       setContinueDisabled(true)
       setTimeout(() => setContinueDisabled(false), 1000)

       const isCorrect = selectedOption === q.answer
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
       syncRecord(scorePercent, false)
   }

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

   if (!activeChallenge) {
       return (
           <div className="gw-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
               <div className="gw-screen">
                   <div className="gw-header">
                       <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                       <h1>{data.title}</h1>
                       <h2>{data.level}</h2>
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
                                               <span className="gw-stat-val">{s.todayRuns} Runs | Best: {s.todayBest}%</span>
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
               <div className="gw-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                   <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '10px 0 30px 0', color: '#555' }}>Challenge Complete!</h2>
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
                    <button className="gw-close-btn" onClick={() => {
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id);
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this challenge today!`)) {
                            setActiveChallenge(null);
                            loadRecords();
                        }
                    }}>✕</button>
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
                       {options.map((opt: any) => {
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
                                   key={opt.text} 
                                   className={classes}
                                   onClick={() => handleOptionClick(opt.originalIdx)}
                                   disabled={locked}
                               >
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
                           onClick={checkAnswer}
                       >
                           Check
                       </button>
                   ) : (
                       <button 
                           className="gw-check-btn continue" 
                           onClick={nextQuestion}
                           disabled={continueDisabled}
                       >
                           Continue
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
