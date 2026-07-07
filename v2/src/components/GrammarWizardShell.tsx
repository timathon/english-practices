import { useState, useRef, useEffect, useCallback } from 'react'
import './GrammarWizardShell.css'
import { DailyLockModal } from './DailyLockModal'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { shuffle, usePracticeAudio } from '../lib/practiceAudio'
import { useNavigationBlocker } from '../lib/useNavigationBlocker'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ActiveHeader } from './shell/ActiveHeader'
import { FooterAction } from './shell/FooterAction'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { CompleteScreenActions } from './shell/CompleteScreenActions'

export function GrammarWizardShell({ data, practiceId, unit, textbook }: any) {
   const { data: session } = useSession()
   const userId = session?.user?.id
   const { playSfx } = usePracticeAudio(textbook)
   
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
   const hasFinishedRef = useRef(false)
   const [practiceRecords, setPracticeRecords] = useState<any[]>([])
   const [gainedXp, setGainedXp] = useState(0)
   const [gainedLove, setGainedLove] = useState(0)
   const [historicalBest, setHistoricalBest] = useState(0)
   const [isNewHigh, setIsNewHigh] = useState(false)
   const [invisibleMode, setInvisibleMode] = useState(false)
   const [historyModal, setHistoryModal] = useState<{title: string, logs: any[]} | null>(null)
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
               const el = document.getElementById(`gw-card-${lastFinishedChallengeId}`);
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

   const primaryColor = data.primaryColor || '#8b5cf6' // Elegant purple for grammar wizards
   const primaryDarkColor = data.primaryColorDark || '#6d28d9'

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

     const handleOptionClick = useCallback((idx: number) => {
         if (locked) return
         setSelectedOption(idx)
     }, [locked])

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
             setPracticeRecords(cache.getRecords() || [])
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
            const isLastMain = !isRedemption && currentIndex === queue.length - 1
            syncRecord(scorePercent, isLastMain)
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
                    <ShellHeader
                        title={data.title}
                        level={data.level}
                        textbook={textbook}
                        unit={unit}
                        prefix="gw"
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
                        prefix="gw"
                    />
                </div>
                
                {historyModal && (
                    <ShellHistoryModal
                        title={historyModal.title}
                        onClose={() => setHistoryModal(null)}
                        logs={historyModal.logs}
                        prefix="gw"
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
                        prefix="gw"
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

    return (
        <div className="gw-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="gw-screen">
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
                        totalSeconds: 30,
                        isRunning: countdownTimer.isRunning
                    }}
                    invisibleMode={invisibleMode}
                    queue={queue}
                    currentIndex={currentIndex}
                    scoreLog={scoreLog}
                    showFeedback={showFeedback}
                    isRedemption={isRedemption}
                    currentQuestion={q}
                    prefix="gw"
                />

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

                <FooterAction
                    locked={locked}
                    disableCheck={selectedOption === null}
                    continueDisabled={continueDisabled}
                    onCheck={() => checkAnswer()}
                    onContinue={nextQuestion}
                    buttonText={originalText}
                    prefix="gw"
                />

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

                {lockModalOpen && (
                     <DailyLockModal onClose={() => setLockModalOpen(false)} />
                 )}
            </div>
        </div>
    )
}
