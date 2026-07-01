import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import './BugHunterShell.css'
import { trialsTracker } from '../lib/trialsTracker'
import { API_URL } from '../lib/auth'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { audioCache } from '../lib/audioCache'
import { DailyLockModal } from './DailyLockModal'

// Build flat challenge list from sections: each section → 2 challenges (spelling, grammar)
function buildChallenges(data: any) {
    const challenges: any[] = []
    const sectionIcons: Record<string, string> = {
        'Unit 1': '🌱', 'Unit 2': '🤝', 'Unit 3': '📚',
        'Unit 4': '🏺', 'Unit 5': '🔍', 'Unit 6': '🏫',
    }
    data.sections.forEach((sec: any) => {
        const iconKey = Object.keys(sectionIcons).find(k => sec.title.includes(k)) || ''
        const icon = sectionIcons[iconKey] || '📝'
        const label = sec.title.replace(/^Unit \d+:\s*/, '')
        challenges.push({
            id: `${sec.id}-spelling`,
            sectionId: sec.id,
            sectionTitle: sec.title,
            type: 'spelling',
            icon: '🔤',
            title: `${label} — Spelling`,
            sentences: sec.sentences,
            sectionIcon: icon,
        })
        challenges.push({
            id: `${sec.id}-grammar`,
            sectionId: sec.id,
            sectionTitle: sec.title,
            type: 'grammar',
            icon: '📝',
            title: `${label} — Grammar`,
            sentences: sec.sentences,
            sectionIcon: icon,
        })
    })
    return challenges
}

// Group challenges by section
function groupBySection(challenges: any[]) {
    const map: Map<string, any[]> = new Map()
    challenges.forEach(c => {
        if (!map.has(c.sectionId)) map.set(c.sectionId, [])
        map.get(c.sectionId)!.push(c)
    })
    return [...map.entries()].map(([, cards]) => cards)
}

export function BugHunterShell({ data, practiceId, unit, textbook }: any) {
    const sfxRef = useRef<HTMLAudioElement | null>(null)

    const challenges = buildChallenges(data)
    const grouped = groupBySection(challenges)

    const [activeChallenge, setActiveChallenge] = useState<any>(null)
    const [queue, setQueue] = useState<any[]>([])   // shuffled sentence list
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog] = useState<Array<string | null>>([])
    const [completed, setCompleted] = useState(false)
    const [finalScore, setFinalScore] = useState(0)
    const [flickeringId, setFlickeringId] = useState<string | null>(null)
    const [lastFinishedId, setLastFinishedId] = useState<string | null>(null)
    const [historyModal, setHistoryModal] = useState<{ title: string; logs: any[] } | null>(null)
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [gainedXp, setGainedXp] = useState(0)
    const [gainedLove, setGainedLove] = useState(0)
    const [lockModalOpen, setLockModalOpen] = useState(false)
    const [isNewHigh, setIsNewHigh] = useState(false)
    const [historicalBest, setHistoricalBest] = useState(0)
    const activeRecordId = useRef<string | null>(null)
    const hasFinished = useRef(false)



    // Per-sentence game state: track selected option index for each of the 2 bugs
    const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({}) // errorIdx -> optionIdx
    const [locked, setLocked] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrectFeedback, setIsCorrectFeedback] = useState(false)
    const [continueDisabled, setContinueDisabled] = useState(false)
    const [tryAgainActive, setTryAgainActive] = useState(false)
    const [fixedErrors, setFixedErrors] = useState<Record<number, 'correct' | 'wrong'>>({})

    // Track which bugs have been discovered/revealed by clicking on their word.
    // errorIdx -> boolean (revealed)
    const [revealedBugs, setRevealedBugs] = useState<Record<number, boolean>>({})

    const blocker = useBlocker(
        ({ nextLocation, currentLocation }) =>
            !!activeChallenge && !completed && nextLocation.pathname !== currentLocation.pathname
    )
    useEffect(() => {
        if (blocker.state === 'blocked') {
            if (window.confirm('您当前正在进行挑战，确定要离开吗？')) {
                setActiveChallenge(null); blocker.reset()
            } else blocker.reset()
        }
    }, [blocker])

    useEffect(() => {
        const h = (e: BeforeUnloadEvent) => {
            if (activeChallenge && !completed) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', h)
        return () => window.removeEventListener('beforeunload', h)
    }, [activeChallenge, completed])

    useEffect(() => {
        if (!activeChallenge && lastFinishedId) {
            setFlickeringId(lastFinishedId)
            setTimeout(() => {
                document.getElementById(`bh-card-${lastFinishedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 50)
            const t = setTimeout(() => setFlickeringId(null), 2000)
            return () => clearTimeout(t)
        }
    }, [activeChallenge, lastFinishedId])

    const loadRecords = async () => {
        try {
            const cached = cache.getRecords()
            if (cached) setPracticeRecords(cached)
            const res = await fetch(API_URL + '/api/records', { credentials: 'include' })
            const json = await res.json()
            if (Array.isArray(json)) { cache.setRecords(json); setPracticeRecords(json) }
        } catch { /* offline */ }
    }
    useEffect(() => { loadRecords() }, [])

    const playSfx = async (type: 'correct' | 'wrong') => {
        const url = type === 'correct'
            ? 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3'
            : 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3'
        try {
            const blob = await audioCache.cacheAudio(url)
            if (!blob) return
            const blobUrl = URL.createObjectURL(blob)
            const a = sfxRef.current || new Audio()
            a.src = blobUrl
            a.onended = () => URL.revokeObjectURL(blobUrl)
            a.play().catch(() => { })
            sfxRef.current = a
        } catch { /* ignore */ }
    }

    const getStats = (challengeTitle: string) => {
        const u = `${practiceId} (${challengeTitle})`
        const logs = practiceRecords.filter(r => r.unit === u && !r.unfinished)
        const todayStr = new Date().toLocaleDateString()
        const todayLogs = logs.filter(r => new Date(r.createdAt).toLocaleDateString() === todayStr)
        return {
            todayRuns: todayLogs.length,
            todayBest: todayLogs.length > 0 ? Math.max(...todayLogs.map((t: any) => t.score)) : 0,
            lifeRuns: logs.length,
            lifeBest: logs.length > 0 ? Math.max(...logs.map((t: any) => t.score)) : 0,
            todayLogs, lifeLogs: logs
        }
    }

    const syncRecord = async (scorePercent: number, isFinished: boolean) => {
        try {
            if (isFinished) hasFinished.current = true
            else if (hasFinished.current) return
            const body = { unit: `${practiceId} (${activeChallenge?.title})`, score: scorePercent, unfinished: !isFinished }
            if (activeRecordId.current) {
                await fetch(`${API_URL}/api/records/${activeRecordId.current}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body)
                })
            } else {
                const res = await fetch(`${API_URL}/api/records`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body)
                })
                const j = await res.json()
                if (j.success && j.id) activeRecordId.current = j.id
            }
        } catch { /* offline */ }
    }

    const startChallenge = (c: any) => {
        const stats = getStats(c.title)
        if (stats.todayBest === 100) { setLockModalOpen(true); return }
        if (!trialsTracker.consumeTrial(practiceId, c.id)) return
        setActiveChallenge(c)
        const sequence = [...c.sentences]
        setQueue(sequence)
        setCurrentIndex(0)
        setScoreLog(new Array(c.sentences.length).fill(null))
        setCompleted(false)
        setGainedXp(0); setGainedLove(0)
        activeRecordId.current = null; hasFinished.current = false
        resetSentenceState()
        audioCache.preloadAndSync('https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3')
        audioCache.preloadAndSync('https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3')
    }

    const resetSentenceState = () => {
        setSelectedOptions({})
        setRevealedBugs({})
        setLocked(false)
        setFixedErrors({})
        setShowFeedback(false)
        setContinueDisabled(false)
    }

    // Current sentence & its bug variant
    const currentSentence = queue[currentIndex]
    const currentBug = currentSentence?.bugs?.find((b: any) => b.type === activeChallenge?.type)

    const handleWordClick = useCallback((tokenIdx: number, wordText: string) => {
        if (!currentBug || locked) return
        
        const buggyText: string = currentBug.buggy
        const tokens = buggyText.match(/\S+/g) || []
        
        const errorIdx = currentBug.errors.findIndex((e: any) => {
            if (e.buggy_word !== wordText) return false

            // If a context field is provided, check if the clicked word matches the context.
            if (e.context) {
                // e.context is a substring of the buggy sentence, e.g. "on a grass".
                // We reconstruct the surrounding phrase at this tokenIdx to verify.
                const contextTokens = e.context.split(/\s+/)
                const wordPosInContext = contextTokens.indexOf(wordText)
                if (wordPosInContext !== -1) {
                    const startTokenIdx = tokenIdx - wordPosInContext
                    let isMatch = true
                    for (let j = 0; j < contextTokens.length; j++) {
                        const actualTok = tokens[startTokenIdx + j]?.replace(/[.,!?;:'"]+$/, '')
                        const expectedTok = contextTokens[j].replace(/[.,!?;:'"]+$/, '')
                        if (actualTok !== expectedTok) {
                            isMatch = false
                            break
                        }
                    }
                    if (isMatch) return true
                }
                return false
            }

            // Fallback: match by occurrence index order of buggy_word
            // Filter out any errors that have a context since we know they don't match this token
            const sameWordErrors = currentBug.errors.filter((x: any) => x.buggy_word === wordText && !x.context)

            let targetOccurrenceIdx = 0
            for (let i = 0; i < tokens.length; i++) {
                const tokStr = tokens[i].replace(/[.,!?;:'"]+$/, '')
                if (i === tokenIdx) break
                if (tokStr === wordText) {
                    // Check if this token matches any of the context errors
                    const matchesContext = currentBug.errors.some((err: any) => {
                        if (err.buggy_word !== wordText || !err.context) return false
                        const ctxToks = err.context.split(/\s+/)
                        const wPos = ctxToks.indexOf(wordText)
                        if (wPos === -1) return false
                        const sIdx = i - wPos
                        for (let k = 0; k < ctxToks.length; k++) {
                            if (tokens[sIdx + k]?.replace(/[.,!?;:'"]+$/, '') !== ctxToks[k].replace(/[.,!?;:'"]+$/, '')) return false
                        }
                        return true
                    })
                    if (!matchesContext) {
                        targetOccurrenceIdx++
                    }
                }
            }

            const orderIdx = sameWordErrors.indexOf(e)
            return orderIdx === targetOccurrenceIdx
        })

        if (errorIdx === -1) {
            // Clicked a non-error word -> play wrong sfx and show temporary feedback
            playSfx('wrong')
            setShowFeedback(true)
            setIsCorrectFeedback(false)
            setTryAgainActive(true)
            setTimeout(() => {
                setShowFeedback(false)
                setTryAgainActive(false)
            }, 2000)
            return
        }

        // Toggle or reveal this bug options panel
        setRevealedBugs(prev => ({ ...prev, [errorIdx]: true }))
        setShowFeedback(false)
    }, [currentBug, locked])

    const checkAnswer = useCallback(() => {
        if (!currentBug || locked) return
        const errorCount = currentBug.errors.length
        
        // Ensure options selected for all errors
        const hasAllSelections = Array.from({ length: errorCount }).every((_, i) => selectedOptions[i] !== undefined)
        if (!hasAllSelections) return

        setLocked(true)
        setShowFeedback(true)
        setContinueDisabled(true)
        setTimeout(() => setContinueDisabled(false), 800)

        const newFixed: Record<number, 'correct' | 'wrong'> = {}
        let allCorrect = true
        let correctCount = 0

        currentBug.errors.forEach((error: any, i: number) => {
            const isCorrect = selectedOptions[i] === error.answer
            newFixed[i] = isCorrect ? 'correct' : 'wrong'
            if (isCorrect) {
                correctCount++
            } else {
                allCorrect = false
            }
        })

        setFixedErrors(newFixed)
        setIsCorrectFeedback(allCorrect)
        playSfx(allCorrect ? 'correct' : 'wrong')

        if (correctCount > 0) {
            const xpGain = correctCount * 5
            setGainedXp(prev => prev + xpGain)
            setGainedLove(prev => prev + correctCount)
        }

        // Compute sentence score (must be perfectly allCorrect to get green)
        const score = allCorrect ? 'green' : 'red'
        
        // If wrong, append the sentence to the end of the queue so user does it again
        if (!allCorrect) {
            setQueue(prev => [...prev, currentSentence])
            setScoreLog(prev => [...prev, null])
        }

        const updatedLog = [...scoreLog]
        updatedLog[currentIndex] = score
        setScoreLog(updatedLog)
        
        const scorePercent = Math.round(updatedLog.filter(v => v === 'green').length / queue.length * 100)
        syncRecord(scorePercent, currentIndex === queue.length - 1 && allCorrect)
    }, [selectedOptions, locked, currentBug, scoreLog, currentIndex, queue, currentSentence])

    const handleContinue = () => {
        const nextIndex = currentIndex + 1
        if (nextIndex < queue.length) {
            setCurrentIndex(nextIndex)
            resetSentenceState()
        } else {
            finishGame()
        }
    }

    const finishGame = async () => {
        setCompleted(true)
        const greenCount = scoreLog.filter(v => v === 'green').length
        const pct = Math.round(greenCount / queue.length * 100)
        setFinalScore(pct)
        const u = `${practiceId} (${activeChallenge.title})`
        const logs = practiceRecords.filter(r => r.unit === u && !r.unfinished)
        const histBest = logs.length > 0 ? Math.max(...logs.map((t: any) => t.score)) : 0
        setHistoricalBest(histBest)
        setIsNewHigh(pct > histBest)
        petService.awardQuizCompletion()
        syncRecord(pct, true)
    }

    // Render buggy sentence as word tokens
    const renderSentence = () => {
        if (!currentSentence || !currentBug) return null
        const buggyText: string = currentBug.buggy
        const errors: any[] = currentBug.errors

        // Tokenise respecting punctuation attached to words
        const tokens = buggyText.match(/\S+/g) || []

        return tokens.map((rawToken, tokenIdx) => {
            // Strip trailing punctuation for matching
            const stripped = rawToken.replace(/[.,!?;:'"]+$/, '')
            const trailing = rawToken.slice(stripped.length)
            
            const errorIdx = errors.findIndex((e: any) => {
                if (e.buggy_word !== stripped) return false

                if (e.context) {
                    const contextTokens = e.context.split(/\s+/)
                    const wordPosInContext = contextTokens.indexOf(stripped)
                    if (wordPosInContext !== -1) {
                        const startTokenIdx = tokenIdx - wordPosInContext
                        let isMatch = true
                        for (let j = 0; j < contextTokens.length; j++) {
                            const actualTok = tokens[startTokenIdx + j]?.replace(/[.,!?;:'"]+$/, '')
                            const expectedTok = contextTokens[j].replace(/[.,!?;:'"]+$/, '')
                            if (actualTok !== expectedTok) {
                                isMatch = false
                                break
                            }
                        }
                        if (isMatch) return true
                    }
                    // Since this error has a context that does not match this token, it is NOT this error.
                    return false
                }

                // Fallback (for errors without a context field)
                // Filter out any errors that have a context since we know they don't match this token
                const sameWordErrors = errors.filter((x: any) => x.buggy_word === stripped && !x.context)
                
                let targetOccurrenceIdx = 0
                // Count occurrences of stripped in tokens up to tokenIdx, skipping occurrences that match context errors
                for (let i = 0; i < tokens.length; i++) {
                    const tokStr = tokens[i].replace(/[.,!?;:'"]+$/, '')
                    if (i === tokenIdx) break
                    if (tokStr === stripped) {
                        // Check if this token matches any of the context errors
                        const matchesContext = errors.some((err: any) => {
                            if (err.buggy_word !== stripped || !err.context) return false
                            const ctxToks = err.context.split(/\s+/)
                            const wPos = ctxToks.indexOf(stripped)
                            if (wPos === -1) return false
                            const sIdx = i - wPos
                            for (let k = 0; k < ctxToks.length; k++) {
                                if (tokens[sIdx + k]?.replace(/[.,!?;:'"]+$/, '') !== ctxToks[k].replace(/[.,!?;:'"]+$/, '')) return false
                            }
                            return true
                        })
                        if (!matchesContext) {
                            targetOccurrenceIdx++
                        }
                    }
                }

                const orderIdx = sameWordErrors.indexOf(e)
                return orderIdx === targetOccurrenceIdx
            })

            const isBug = errorIdx !== -1
            const fixed = fixedErrors[errorIdx]

            let cls = 'bh-word'
            let displayWord = stripped
            if (isBug) {
                if (fixed === 'correct') {
                    cls += ' buggy-fixed'
                    // Find the correct option text
                    const errObj = errors[errorIdx]
                    displayWord = errObj.options[errObj.answer]
                } else if (fixed === 'wrong') {
                    cls += ' buggy-wrong'
                } else if (revealedBugs[errorIdx]) {
                    cls += ' buggy-selected'
                }
            }

            return (
                <span key={tokenIdx} className={cls} onClick={() => handleWordClick(tokenIdx, stripped)}>
                    {displayWord}{trailing}
                </span>
            )
        })
    }

    // ── HOME SCREEN ─────────────────────────────────────────────────────────
    if (!activeChallenge) {
        return (
            <div className="bh-shell-container">
                <div className="bh-screen">
                    <div className="bh-header">
                        <Link to="/dashboard" state={{ textbook, unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                        <h1>🐛 {data.title}</h1>
                        <h2>{data.level}</h2>
                    </div>

                    <div className="bh-challenge-grid">
                        {grouped.map((pair, gi) => (
                            <div key={gi} className="bh-section-group">
                                <div className="bh-section-label">
                                    {pair[0].sectionIcon} {pair[0].sectionTitle}
                                </div>
                                <div className="bh-section-cards">
                                    {pair.map((c: any) => {
                                        const s = getStats(c.title)
                                        return (
                                            <div
                                                key={c.id}
                                                id={`bh-card-${c.id}`}
                                                className={`bh-challenge-card ${c.type}-type ${flickeringId === c.id ? 'flicker-active' : ''}`}
                                            >
                                                <div>
                                                    <div className={`bh-card-type-badge ${c.type}`}>
                                                        {c.icon} {c.type}
                                                    </div>
                                                    <div className="bh-card-stats">
                                                        <div
                                                            className="bh-stat-row"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => setHistoryModal({ title: `TODAY — ${c.title}`, logs: s.todayLogs })}
                                                        >
                                                            <span className="bh-stat-label">Today</span>
                                                            <span className="bh-stat-val" style={s.todayBest >= 70 ? { color: '#10b981', fontWeight: 'bold' } : {}}>
                                                                {s.todayRuns} runs · {s.todayBest}%
                                                            </span>
                                                        </div>
                                                        <div
                                                            className="bh-stat-row"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => setHistoryModal({ title: `LIFETIME — ${c.title}`, logs: s.lifeLogs })}
                                                        >
                                                            <span className="bh-stat-label">Best</span>
                                                            <span className="bh-stat-val">{s.lifeBest}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className={`bh-start-btn ${c.type}`}
                                                    onClick={() => startChallenge(c)}
                                                    style={s.todayBest === 100
                                                        ? { background: '#10b981', borderBottomColor: '#059669' }
                                                        : trialsTracker.getRemainingTrials(practiceId, c.id) === 0
                                                            ? { background: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' }
                                                            : {}}
                                                >
                                                    {s.todayBest === 100 ? '🔒 DONE' :
                                                        trialsTracker.getRemainingTrials(practiceId, c.id) === 0 ? 'NO ATTEMPTS' : 'START'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {historyModal && (
                    <div className="bh-modal-overlay" onClick={() => setHistoryModal(null)}>
                        <div className="bh-modal-content" onClick={e => e.stopPropagation()}>
                            <h3 className="bh-modal-title">{historyModal.title}</h3>
                            {historyModal.logs.length === 0
                                ? <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                                : <ul className="bh-history-list">
                                    {historyModal.logs.map((log: any, i: number) => {
                                        const d = new Date(log.createdAt)
                                        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        return (
                                            <li key={log.id || i} className="bh-history-item">
                                                <span className="bh-history-date">{timeStr}</span>
                                                <span className="bh-history-score" style={{ color: log.score >= 80 ? '#10b981' : 'inherit' }}>{log.score}%</span>
                                            </li>
                                        )
                                    })}
                                </ul>}
                            <button className="bh-check-btn" style={{ marginTop: '16px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                        </div>
                    </div>
                )}
                {lockModalOpen && <DailyLockModal onClose={() => setLockModalOpen(false)} />}
            </div>
        )
    }

    // ── COMPLETED SCREEN ────────────────────────────────────────────────────
    if (completed) {
        return (
            <div className="bh-shell-container">
                <div className="bh-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: 0 }}>{finalScore}%</h1>
                    <h2 style={{ margin: '5px 0 10px', color: '#333', fontSize: '1.4rem', fontWeight: 'bold' }}>Challenge Complete! 🐛✅</h2>
                    <div style={{ marginBottom: '20px', fontSize: '0.95rem', color: '#555' }}>
                        {isNewHigh
                            ? <div style={{ color: '#10b981', fontWeight: 'bold' }}>🎉 New High Score!</div>
                            : <div>Keep trying! Your best is <strong style={{ color: 'var(--primary)' }}>{historicalBest}%</strong></div>}
                    </div>
                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '16px 20px', marginBottom: '28px', width: '100%', maxWidth: '340px' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Rewards Earned</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.8rem' }}>⚡</span>
                                <span style={{ fontWeight: 'bold', color: '#0284c7' }}>+{gainedXp} XP</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.8rem' }}>❤️</span>
                                <span style={{ fontWeight: 'bold', color: '#e11d48' }}>+{gainedLove}</span>
                            </div>
                        </div>
                    </div>
                    <button className="bh-check-btn" style={{ maxWidth: '300px' }} onClick={() => {
                        setLastFinishedId(activeChallenge.id)
                        setActiveChallenge(null)
                        loadRecords()
                    }}>Back to Menu</button>
                </div>
            </div>
        )
    }

    // ── GAME SCREEN ─────────────────────────────────────────────────────────
    if (!currentSentence || !currentBug) return null

    const isAllChecked = Object.keys(fixedErrors).length === currentBug.errors.length

    return (
        <div className="bh-shell-container">
            <div className="bh-screen">
                {/* Top bar */}
                <div className="bh-top-bar">
                    <button className="bh-close-btn" onClick={() => {
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id)
                        if (window.confirm(`Quit? You have ${rem} attempt(s) left today.`)) {
                            setActiveChallenge(null); loadRecords()
                        }
                    }}>✕</button>
                    <div className="bh-progress-container">
                        {queue.map((_, i) => {
                            const seg = scoreLog[i]
                            const isActive = i === currentIndex && !isAllChecked
                            return <div key={i} className={`bh-progress-segment ${seg || ''} ${isActive ? 'active' : ''}`} />
                        })}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#aaa', flexShrink: 0 }}>{currentIndex + 1}/{queue.length}</span>
                </div>

                {/* Mode badge */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div className={`bh-mode-badge ${activeChallenge.type}`}>
                        {activeChallenge.icon} {activeChallenge.type === 'spelling' ? 'Spelling Bugs' : 'Grammar Bugs'}
                    </div>
                </div>

                <div className="bh-question-area">
                    {/* Preceding context sentence or Title */}
                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, marginBottom: '10px', fontStyle: 'italic' }}>
                        {currentIndex > 0 ? queue[currentIndex - 1].en : activeChallenge.title}
                    </div>

                    {/* Buggy sentence */}
                    <div className="bh-sentence-wrapper">{renderSentence()}</div>



                    {/* Dual Options Panels */}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', margin: '8px 0 16px 0', alignItems: 'flex-start' }}>
                        {currentBug.errors.map((error: any, errorIdx: number) => {
                            const isRevealed = revealedBugs[errorIdx]
                            if (!isRevealed) return null

                            const chosenOptIdx = selectedOptions[errorIdx]

                            return (
                                <div key={errorIdx} className="bh-options-panel" style={{ margin: 0 }}>
                                    <div className="bh-options-label">
                                        Fix: <strong style={{ color: '#475569' }}>"{error.buggy_word}"</strong>
                                    </div>
                                    {error.label && error.label !== 'spelling' && (
                                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                            <span className="bh-error-type-tag">{error.label}</span>
                                        </div>
                                    )}
                                    <div className="bh-options-grid">
                                        {error.options.map((opt: string, idx: number) => {
                                            let cls = 'bh-option-btn'
                                            if (locked) {
                                                if (idx === error.answer) cls += ' correct'
                                                else if (chosenOptIdx === idx) cls += ' wrong'
                                            } else {
                                                if (chosenOptIdx === idx) cls += ' selected'
                                            }
                                            return (
                                                <button
                                                    key={idx}
                                                    className={cls}
                                                    disabled={locked}
                                                    onClick={() => !locked && setSelectedOptions(prev => ({ ...prev, [errorIdx]: idx }))}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Feedback */}
                    <div className={`bh-feedback-area ${showFeedback ? `visible ${isCorrectFeedback ? 'correct' : 'wrong'}` : ''}`}>
                        {showFeedback && (
                            tryAgainActive ? (
                                <>
                                    <h3 className="bh-feedback-title" style={{ color: '#ef4444' }}>✗ Try Again</h3>
                                    <p className="bh-feedback-msg">That word is correct. Find a word with a mistake!</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="bh-feedback-title" style={{ color: isCorrectFeedback ? '#10b981' : '#ef4444' }}>
                                        {isCorrectFeedback ? '✓ Correct!' : '✗ Wrong'}
                                    </h3>
                                    <p className="bh-feedback-msg">
                                        {isCorrectFeedback
                                            ? '🎉 Both bugs fixed! Ready to continue.'
                                            : `Review the corrected answers above.`}
                                    </p>
                                </>
                            )
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bh-footer-action">
                    {locked && Object.keys(fixedErrors).length === currentBug.errors.length ? (
                        <button
                            className="bh-check-btn continue"
                            disabled={continueDisabled}
                            onClick={handleContinue}
                        >
                            {currentIndex + 1 >= queue.length ? 'Finish 🎉' : 'Next Sentence →'}
                        </button>
                    ) : (
                        <button 
                            className="bh-check-btn" 
                            disabled={
                                Array.from({ length: currentBug.errors.length }).some((_, i) => selectedOptions[i] === undefined) || 
                                locked
                            } 
                            onClick={checkAnswer}
                        >
                            Check
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
