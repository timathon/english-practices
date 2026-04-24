import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './VocabMasterShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

export function VocabMasterShell({ data, practiceId, unit, textbook }: any) {
   const audioRef = useRef<HTMLAudioElement | null>(null)
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
   const [completed, setCompleted] = useState(false)
   const [finalScore, setFinalScore] = useState(0)
   const [showFeedback, setShowFeedback] = useState(false)
   const [isCorrectFeedback, setIsCorrectFeedback] = useState(false)
   const [continueDisabled, setContinueDisabled] = useState(false)
   const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
   const [practiceRecords, setPracticeRecords] = useState<any[]>([])
   const [historyModal, setHistoryModal] = useState<{title: string, logs: any[]} | null>(null)

   const primaryColor = data.primaryColor || '#3b82f6'
   const primaryDarkColor = data.primaryColorDark || '#2563eb'

   const loadRecords = async () => {
       try {
           const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + '/api/records', { credentials: 'include' })
           const json = await res.json()
           if (Array.isArray(json)) setPracticeRecords(json)
       } catch (e) {
           console.error("Failed to load records", e)
       }
   }
   
   useEffect(() => {
       loadRecords()
   }, [])

   const handleChallengeSelect = (c: any) => {
       const hasConsumed = trialsTracker.consumeTrial(practiceId, c.id)
       if (!hasConsumed) return;
       
       setActiveChallenge(c)
       setActiveRecordId(null)
       
       // Clone and shuffle questions
       const shuffled = [...c.questions].sort(() => Math.random() - 0.5).map((q: any, i: number) => ({ ...q, originalIndex: i }))
       setQueue(shuffled)
       setMistakeQueue([])
       setCurrentIndex(0)
       setScoreLog(new Array(c.questions.length).fill(null))
       setCompleted(false)
       
       // Background Preload & Sync
       c.questions.forEach((q: any) => {
           if (q.audio) {
               audioCache.preloadAndSync(q.audio);
           } else if (q.context_sentence && textbook) {
               audioCache.preloadAndSync(getAudioUrl(q.context_sentence, textbook));
           }
       });
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
       setLocked(false)
       setShowFeedback(false)
       
       // Generate shuffled options that retain original index
       const indexedOptions = nextQ.options.map((text: string, idx: number) => ({ text, originalIdx: idx }))
       indexedOptions.sort(() => Math.random() - 0.5)
       setOptions(indexedOptions)
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
           const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/records${activeRecordId ? '/' + activeRecordId : ''}`;
           const method = activeRecordId ? 'PUT' : 'POST';
           
           const res = await fetch(url, {
               method,
               headers: { 'Content-Type': 'application/json' },
               credentials: 'include',
               body: JSON.stringify({ 
                   unit: `${practiceId} (${activeChallenge.title})`, 
                   score: scorePercent,
                   unfinished: !isFinished
               })
           })
           const j = await res.json()
           if (method === 'POST' && j.success && j.id) {
               setActiveRecordId(j.id)
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
               updatedMistakes.push(missed) // Move to back of the line
           }
       }

       if (q.context_sentence && textbook) {
           setTimeout(() => playAudio(getAudioUrl(q.context_sentence, textbook)), 200)
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

   if (!activeChallenge) {
       return (
           <div className="vm-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
               <div className="vm-screen">
                   <div className="vm-header">
                       <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                       <h1>{data.title}</h1>
                       <h2>{data.level}</h2>
                   </div>
                   
                   <div className="vm-challenge-grid">
                       {data.challenges.map((c: any) => (
                           <div key={c.id} className="vm-challenge-card">
                               <div className="vm-card-header">
                                   <div style={{ display: 'flex', alignItems: 'center' }}>
                                       <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{c.icon}</span>
                                       <h3 className="vm-card-title" style={{ marginRight: '8px' }}>{c.title}</h3>
                                       <div style={{ fontSize: '0.7rem', color: 'rgb(153, 153, 153)', marginTop: '2px' }}>
                                           {trialsTracker.getRemainingTrials(practiceId, c.id)} / 5 attempts left
                                       </div>
                                   </div>
                                   <button 
                                        className="vm-start-btn" 
                                        onClick={() => handleChallengeSelect(c)}
                                        style={trialsTracker.getRemainingTrials(practiceId, c.id) === 0 ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                   >
                                        {trialsTracker.getRemainingTrials(practiceId, c.id) === 0 ? 'OUT OF ATTEMPTS' : 'START'}
                                   </button>
                               </div>
                               <div className="vm-card-stats">
                                   {(() => {
                                       const s = getStats(c.title);
                                       return (
                                        <>
                                           <div className="vm-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `TODAY - ${c.title}`, logs: s.todayLogs })}>
                                               <span className="vm-stat-label">TODAY</span>
                                               <span className="vm-stat-val">{s.todayRuns} Runs | Best: {s.todayBest}%</span>
                                           </div>
                                           <div className="vm-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `LIFETIME - ${c.title}`, logs: s.lifeLogs })}>
                                               <span className="vm-stat-label">LIFETIME</span>
                                               <span className="vm-stat-val">{s.lifeRuns} Runs | Best: {s.lifeBest}%</span>
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
                   <div className="vm-modal-overlay" onClick={() => setHistoryModal(null)}>
                       <div className="vm-modal-content" onClick={e => e.stopPropagation()}>
                           <h3 className="vm-modal-title">{historyModal.title}</h3>
                           {historyModal.logs.length === 0 ? (
                               <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                           ) : (
                               <ul className="vm-history-list">
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
                                           <li key={log.id || i} className="vm-history-item">
                                               <span className="vm-history-date">{dateLabel}</span>
                                               <span className="vm-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                   {log.score}%{isUnfinished}
                                               </span>
                                           </li>
                                       );
                                   })}
                               </ul>
                           )}
                           <button className="vm-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                       </div>
                   </div>
               )}
           </div>
       )
   }

   if (completed) {
       return (
           <div className="vm-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
               <div className="vm-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                   <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '10px 0 30px 0', color: '#555' }}>Challenge Complete!</h2>
                    <button className="vm-check-btn" onClick={() => {
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

   const isCloze = q.type === "Cloze"
   const isCn2En = q.type === "Cn2En"
   const typeText = isCloze ? "Fill in the blank" : isCn2En ? "Select the English word" : "Select the Chinese meaning"

   return (
       <div className="vm-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
           <div className="vm-screen">
                <div className="vm-top-bar">
                    <button className="vm-close-btn" onClick={() => {
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id);
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this challenge today!`)) {
                            setActiveChallenge(null);
                            loadRecords();
                        }
                    }}>✕</button>
                   <div className="vm-progress-container">
                        {queue.map((_, i) => {
                            const isActive = (!isRedemption && i === currentIndex && !showFeedback) || (isRedemption && q && q.originalIndex === i && !showFeedback);
                            return <div key={i} className={`vm-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`} />
                        })}
                   </div>
               </div>

               <div className="vm-question-area">
                   <div className="vm-prompt-container">
                       <div className="vm-prompt-type">{typeText}</div>
                       <div className="vm-prompt-val">{q.prompt}</div>
                       <button className="vm-prompt-hint-btn" onClick={() => setHintUsed(true)}>💡</button>
                       <div className={`vm-hint-text ${hintUsed ? 'visible' : ''}`}>{q.hint}</div>
                   </div>

                   <div className="vm-options-grid">
                       {options.map((opt: any) => {
                           // Determine classes based on selection/locked state
                           let classes = "vm-option-btn "
                           if (locked) {
                               if (opt.originalIdx === q.answer) {
                                   classes += "correct " // Always reveal correct answer
                               } else if (selectedOption === opt.originalIdx) {
                                   classes += "wrong " // Mark wrong if selected
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
                                   {opt.text}
                               </button>
                           )
                       })}
                   </div>
               </div>

               <div className={`vm-feedback-area ${showFeedback ? 'visible ' + (isCorrectFeedback ? 'correct' : 'wrong') : ''}`}>
                   {showFeedback ? (
                       isCorrectFeedback ? (
                           <>
                               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   {q.audio && (
                                        <button className="vm-play-btn" onClick={() => playAudio(q.audio)}>
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>                                    
                                   )}
                                   {q.context_sentence && textbook && !q.audio && (
                                       <button className="vm-play-btn" onClick={() => playAudio(getAudioUrl(q.context_sentence, textbook))}>
                                           <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                       </button>
                                   )}
                                   <h3 className="vm-feedback-title" style={{ color: '#58cc02' }}>Excellent!</h3>
                               </div>
                               <p className="vm-feedback-msg">{q.word} - {q.meaning}</p>
                               <div className="vm-feedback-sentence">📖 {q.context_sentence}</div>
                           </>
                       ) : (
                           <>
                               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   {q.audio && (
                                        <button className="vm-play-btn" onClick={() => playAudio(q.audio)}>
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>                                    
                                   )}
                                   {q.context_sentence && textbook && !q.audio && (
                                       <button className="vm-play-btn" onClick={() => playAudio(getAudioUrl(q.context_sentence, textbook))}>
                                           <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                       </button>
                                   )}
                                   <h3 className="vm-feedback-title" style={{ color: '#ea2b2b' }}>Correct Answer:</h3>
                               </div>
                               <p className="vm-feedback-msg">{q.options[q.answer]}</p>
                               <div className="vm-feedback-sentence">💡 {q.hint}</div>
                           </>
                       )
                   ) : null}
               </div>

               <div className="vm-footer-action">
                   {!locked ? (
                       <button 
                           className="vm-check-btn" 
                           disabled={selectedOption === null}
                           onClick={checkAnswer}
                       >
                           Check
                       </button>
                   ) : (
                       <button 
                           className="vm-check-btn continue" 
                           onClick={nextQuestion}
                           disabled={continueDisabled}
                       >
                           Continue
                       </button>
                   )}
               </div>
           </div>
       </div>
   )
}
