import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './GrammarGuardShell.css'
import { DailyLockModal } from './DailyLockModal'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { practiceCache } from '../lib/practiceCache'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'
import { useCountdown } from '../lib/useCountdown'
import { shuffle, usePracticeAudio, getAudioUrl } from '../lib/practiceAudio'
import { useNavigationBlocker } from '../lib/useNavigationBlocker'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ActiveHeader } from './shell/ActiveHeader'
import { FooterAction } from './shell/FooterAction'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { CompleteScreenActions } from './shell/CompleteScreenActions'
import { QuestionReviewList, getEncouragementMessage, type QuestionResultItem } from './shell/QuestionReviewList'

interface TnNodeData {
    text: string
    cn: string
}

export function GrammarGuardShell({ data, practiceId, unit, textbook }: any) {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const { playAudio, playSfx } = usePracticeAudio(textbook)

    const [tnMap, setTnMap] = useState<Record<string, TnNodeData>>({})

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
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [questionResults, setQuestionResults] = useState<QuestionResultItem[]>([])
    const [historyModal, setHistoryModal] = useState<{title: string, logs: any[]} | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)
    const [lastFinishedChallengeId, setLastFinishedChallengeId] = useState<string | null>(null)
    const [flickeringChallengeId, setFlickeringChallengeId] = useState<string | null>(null)
    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {})

    useNavigationBlocker(!!activeChallenge && !completed)

    // Load Text Navigator JSON to resolve tn_id -> { text, cn }
    useEffect(() => {
        if (!practiceId) return
        const tnPracticeId = practiceId.replace(/-grammar-guard.*$/, '-text-navigator')

        const parseTnTree = (content: any) => {
            const map: Record<string, TnNodeData> = {}
            const traverse = (node: any) => {
                if (!node) return
                if (node.id && node.text) {
                    map[node.id] = {
                        text: node.text,
                        cn: node.cn || ''
                    }
                }
                if (node.children && Array.isArray(node.children)) {
                    for (const c of node.children) traverse(c)
                }
            }

            if (content?.sections && Array.isArray(content.sections)) {
                for (const sec of content.sections) {
                    if (sec.tree) traverse(sec.tree)
                }
            } else if (content?.tree) {
                traverse(content.tree)
            }
            return map
        }

        const loadTn = async () => {
            try {
                let tnData = practiceCache.getSync(tnPracticeId)
                if (!tnData) {
                    const res = await fetch(`${API_URL}/api/practices/${tnPracticeId}`, { credentials: 'include' })
                    tnData = await res.json()
                    if (tnData && !tnData.error) {
                        practiceCache.set(tnPracticeId, tnData)
                    }
                }

                if (tnData && !tnData.error) {
                    let content = tnData.content
                    if (tnData.isEncrypted && typeof content === 'string') {
                        content = decryptContent(content, OBSCURE_KEY)
                    }
                    const map = parseTnTree(content)
                    setTnMap(map)
                }
            } catch (err) {
                console.error('Failed to load text-navigator in GrammarGuard:', err)
            }
        }

        loadTn()
    }, [practiceId])

    useEffect(() => {
        if (!activeChallenge && lastFinishedChallengeId) {
            setFlickeringChallengeId(lastFinishedChallengeId)
            setTimeout(() => {
                const el = document.getElementById(`gg-card-${lastFinishedChallengeId}`)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 50)

            const timer = setTimeout(() => {
                setFlickeringChallengeId(null)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [activeChallenge, lastFinishedChallengeId])

    const countdownSeconds = activeChallenge?.category === 'verb_be' ? 15 : 15

    // Countdown timer (15s for Grammar Guard questions)
    const countdownTimer = useCountdown(15, {
        onExpire: () => {
            if (timerExpiredRef.current) return
            timerExpiredRef.current = true
            checkAnswerRef.current(true)
        }
    })

    const primaryColor = data.primaryColor || '#0284c7'
    const primaryDarkColor = data.primaryColorDark || '#0369a1'

    const loadRecords = async () => {
        try {
            const cached = cache.getRecords()
            if (cached) {
                setPracticeRecords(cached)
            }
            const res = await fetch(`${API_URL}/api/records`, { credentials: 'include' })
            const json = await res.json()
            if (Array.isArray(json)) {
                cache.setRecords(json)
                setPracticeRecords(json)
            }
        } catch (e) {
            console.error('Failed to load records:', e)
        }
    }

    useEffect(() => {
        loadRecords()
    }, [practiceId])

    const startQuestion = useCallback((question: any) => {
        setQ(question)
        setSelectedOption(null)
        setLocked(false)
        setShowFeedback(false)
        setIsCorrectFeedback(false)
        setContinueDisabled(false)

        const mapped = question.options.map((opt: string, idx: number) => ({
            text: opt,
            originalIdx: idx
        }))
        setOptions(shuffle(mapped))

        timerExpiredRef.current = false
        if (!invisibleMode) {
            countdownTimer.reset(15)
        } else {
            countdownTimer.pause()
        }
    }, [invisibleMode, countdownTimer])

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
            console.error('Failed to sync record:', e)
        }
    }

    const finishPractice = async () => {
        countdownTimer.pause()
        const correctCount = scoreLog.filter(s => s === 'green').length
        const total = queue.length
        const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0

        setFinalScore(pct)
        setCompleted(true)

        if (!invisibleMode) {
            await syncRecord(pct, true)
            setPracticeRecords(prev => [...prev, {
                unit: `${practiceId} (${activeChallenge.title})`,
                score: pct,
                createdAt: new Date().toISOString(),
                unfinished: false
            }])
        }

        if (pct === 100) {
            playSfx('correct')
        }
    }

    const nextQuestion = useCallback(() => {
        countdownTimer.pause()
        if (!isRedemption) {
            const nextIdx = currentIndex + 1
            if (nextIdx < queue.length) {
                setCurrentIndex(nextIdx)
                startQuestion(queue[nextIdx])
            } else {
                if (mistakeQueue.length > 0) {
                    setIsRedemption(true)
                    startQuestion(mistakeQueue[0])
                } else {
                    finishPractice()
                }
            }
        } else {
            const nextMistakes = mistakeQueue.slice(1)
            setMistakeQueue(nextMistakes)
            if (nextMistakes.length > 0) {
                startQuestion(nextMistakes[0])
            } else {
                finishPractice()
            }
        }
    }, [isRedemption, currentIndex, queue, mistakeQueue, startQuestion])

    const currentMatchedSentence = useMemo(() => {
        if (!q?.tn_id) return null
        return tnMap[q.tn_id] || null
    }, [q, tnMap])

    const checkAnswer = useCallback((forceWrong = false) => {
        if (locked) return
        setLocked(true)
        countdownTimer.pause()

        const isTimeOut = forceWrong && timerExpiredRef.current
        const isCorrect = !isTimeOut && selectedOption === q.answer
        setIsCorrectFeedback(isCorrect)
        setShowFeedback(true)

        // Audio and SFX playback
        if (isCorrect) {
            playSfx('correct')
        } else {
            playSfx('wrong')
        }

        // Play the matched sentence audio automatically
        const sentenceText = currentMatchedSentence?.text || ''
        if (sentenceText) {
            const audioUrl = getAudioUrl(sentenceText, textbook)
            setTimeout(() => {
                playAudio(audioUrl)
            }, 300)
        }

        const newScoreLog = [...scoreLog]
        if (!isRedemption) {
            newScoreLog[currentIndex] = isCorrect ? 'green' : 'red'
            setScoreLog(newScoreLog)

            const total = queue.length
            const currentCorrect = newScoreLog.filter(s => s === 'green').length
            const pct = Math.round((currentCorrect / total) * 100)

            if (!invisibleMode) {
                syncRecord(pct, false)
            }

            if (!isCorrect) {
                setMistakeQueue(prev => [...prev, q])
            }
        }

        // Record question review item (only during main quiz, like GrammarWizard)
        if (!isRedemption) {
            const userAnswerText = selectedOption !== null && q.options[selectedOption] ? q.options[selectedOption] : '未作答'
            const correctAnswerText = q.options[q.answer]
            const resultItem: QuestionResultItem = {
                id: q.id,
                prompt: q.prompt,
                userAnswer: isTimeOut ? '超时未选' : userAnswerText,
                correctAnswer: correctAnswerText,
                isCorrect,
                extraInfo: q.explanation
            }
            setQuestionResults(prev => {
                const next = [...prev]
                next[currentIndex] = resultItem
                return next
            })
        }

        // Record in Mistake Book
        if (!isCorrect && userId && !invisibleMode) {
            mistakeService.addMistake(userId, {
                practiceId,
                textbook,
                unit,
                practiceType: 'grammar-guard',
                question: {
                    ...q,
                    category: activeChallenge?.category || 'grammar',
                    en: sentenceText,
                    cn: currentMatchedSentence?.cn || ''
                },
                wrongAnswer: isTimeOut ? '超时未选' : (selectedOption !== null ? q.options[selectedOption] : '未作答')
            })
            mistakeService.syncToServer(userId)
        }
    }, [locked, countdownTimer, selectedOption, q, isRedemption, currentIndex, queue, scoreLog, invisibleMode, activeChallenge, textbook, unit, userId, practiceId, playSfx, playAudio, currentMatchedSentence])

    checkAnswerRef.current = checkAnswer

    const handleChallengeSelect = (challenge: any, overrideInvisible?: boolean) => {
        const isInv = overrideInvisible !== undefined ? overrideInvisible : invisibleMode
        const rem = trialsTracker.getRemainingTrials(practiceId, challenge.id)

        if (!isInv && rem <= 0) {
            setLockModalOpen(true)
            return
        }

        if (!isInv) {
            trialsTracker.consumeTrial(practiceId, challenge.id)
        }

        setActiveChallenge(challenge)
        setActiveRecordId(null)
        recordIdPromiseRef.current = null
        hasFinishedRef.current = false

        const rawQuestions = challenge.questions || []
        const qs = shuffle(rawQuestions)
        setQueue(qs)
        setMistakeQueue([])
        setCurrentIndex(0)
        setScoreLog(new Array(qs.length).fill(null))
        setIsRedemption(false)
        setCompleted(false)
        setQuestionResults([])

        if (qs.length > 0) {
            startQuestion(qs[0])
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

    const originalButtonText = isRedemption
        ? (mistakeQueue.length === 0 ? 'Finish' : 'Continue')
        : (currentIndex >= queue.length - 1 && mistakeQueue.length === 0 ? 'Finish' : 'Continue')

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeChallenge || completed || historyModal || showHintModal) return
            if (e.key === 'Enter') {
                e.preventDefault()
                if (!locked) {
                    if (selectedOption !== null) {
                        checkAnswer()
                    }
                } else {
                    if (!continueDisabled) {
                        nextQuestion()
                    }
                }
            } else if (!locked && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault()
                const idx = parseInt(e.key, 10) - 1
                if (options[idx]) {
                    handleOptionClick(options[idx].originalIdx)
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeChallenge, completed, historyModal, showHintModal, locked, selectedOption, continueDisabled, nextQuestion, checkAnswer, options, handleOptionClick])

    if (!activeChallenge) {
        return (
            <div className="gg-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="gg-screen">
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
                            const s = getStats(c.title)
                            setHistoryModal({ title: `TODAY - ${c.title}`, logs: s.todayLogs })
                        }}
                        getRemainingTrials={(cId) => trialsTracker.getRemainingTrials(practiceId, cId)}
                        getChallengeStatsText={(c) => {
                            const s = getStats(c.title)
                            return {
                                today: `${s.todayRuns} Runs | Best: ${s.todayBest}%`,
                                lifetime: `${s.lifeRuns} Runs | Best: ${s.lifeBest}%`,
                                isTodayBestHigh: s.todayBest >= 70
                            }
                        }}
                        isLockedToday={(c) => getStats(c.title).todayBest === 100}
                        flickeringId={flickeringChallengeId}
                        prefix="gw"
                        onResetTrials={(cId) => {
                            trialsTracker.resetTrials(practiceId, cId)
                            setPracticeRecords([...practiceRecords])
                        }}
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
        const encouragement = getEncouragementMessage(finalScore)
        return (
            <div className="gg-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="gg-screen">
                    <div style={{ textAlign: 'center', padding: '10px 0 12px 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '4px' }}>
                            {finalScore >= 80 ? '🎉' : finalScore >= 60 ? '👍' : '💪'}
                        </div>
                        <h2 style={{ color: primaryColor, margin: '0 0 4px 0', fontSize: '1.25rem' }}>
                            {encouragement.title}
                        </h2>
                        <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: primaryDarkColor }}>
                            {finalScore}%
                        </div>
                    </div>

                    <QuestionReviewList items={questionResults} maxHeight={440} />

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
                                setInvisibleMode(overrideInvisible)
                            }
                            handleChallengeSelect(activeChallenge, overrideInvisible)
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

    return (
        <div className="gg-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="gg-screen">
                <ActiveHeader
                    onClose={() => {
                        countdownTimer.pause()
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id)
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this challenge today!`)) {
                            if (userId && !invisibleMode) {
                                mistakeService.syncToServer(userId)
                            }
                            setActiveChallenge(null)
                            loadRecords()
                        } else {
                            if (!locked) countdownTimer.resume()
                        }
                    }}
                    countdownTimer={{
                        secondsLeft: countdownTimer.secondsLeft,
                        totalSeconds: countdownSeconds,
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

                <div className="gg-question-area">
                    <div className="gg-prompt-container">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div className="gg-prompt-category">{activeChallenge?.category || 'GRAMMAR'}</div>
                            <button className="gg-prompt-hint-btn" onClick={handleShowHint} title="查看提示">💡</button>
                        </div>
                        <div className="gg-prompt-val">{q.prompt}</div>
                    </div>

                    <div className="gg-options-list">
                        {options.map((opt: any, idx: number) => {
                            let classes = 'gg-option-btn '
                            if (locked) {
                                if (opt.originalIdx === q.answer) {
                                    classes += 'correct '
                                } else if (selectedOption === opt.originalIdx) {
                                    classes += 'wrong '
                                }
                            } else {
                                if (selectedOption === opt.originalIdx) {
                                    classes += 'selected '
                                }
                            }

                            return (
                                <button
                                    key={`${opt.text}-${opt.originalIdx}`}
                                    className={classes}
                                    onClick={() => handleOptionClick(opt.originalIdx)}
                                    disabled={locked}
                                >
                                    <span className="gg-option-marker">{idx + 1}</span>
                                    <span className="gg-option-text">{opt.text}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className={`gg-feedback-area ${showFeedback ? 'visible ' + (isCorrectFeedback ? 'correct' : 'wrong') : ''}`}>
                    {showFeedback && (
                        <>
                            <h3 className="gg-feedback-title" style={{ color: isCorrectFeedback ? '#10b981' : '#ef4444' }}>
                                {isCorrectFeedback ? 'Excellent! 答对了' : `Incorrect (正确答案: ${q.options[q.answer]})`}
                            </h3>

                            {/* Full Sentence, Chinese Translation & Audio Playback from TN */}
                            {currentMatchedSentence && (
                                <div className="gg-feedback-target-sentence">
                                    <div className="gg-sentence-text-box">
                                        <div className="gg-sentence-en">{currentMatchedSentence.text}</div>
                                        {currentMatchedSentence.cn && (
                                            <div className="gg-sentence-cn">{currentMatchedSentence.cn}</div>
                                        )}
                                    </div>
                                    <button
                                        className="gg-audio-play-btn"
                                        title="播放原句音频"
                                        onClick={() => {
                                            const audioUrl = getAudioUrl(currentMatchedSentence.text, textbook)
                                            playAudio(audioUrl)
                                        }}
                                    >
                                        🔊
                                    </button>
                                </div>
                            )}

                            <div className="gg-feedback-explanation">
                                <strong>解析:</strong> {q.explanation}
                            </div>
                        </>
                    )}
                </div>

                <FooterAction
                    locked={locked}
                    disableCheck={selectedOption === null}
                    continueDisabled={continueDisabled}
                    onCheck={() => checkAnswer()}
                    onContinue={nextQuestion}
                    buttonText={originalButtonText}
                    prefix="gw"
                />

                {(showHintModal || isClosing) && (
                    <div className={`gg-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={closeHintModal}>
                        <div className={`gg-modal-content ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💡</div>
                            <h3 style={{ margin: '0 0 10px 0', color: primaryDarkColor }}>语法小提示</h3>
                            <p style={{ fontSize: '1.05rem', color: '#334155', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                                {q.hint || '请根据句子主语的人称与单复数选择正确的 be 动词形式。'}
                            </p>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                窗口将在 {hintTimeLeft} 秒后自动关闭
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
