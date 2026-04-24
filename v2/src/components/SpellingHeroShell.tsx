import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './SpellingHeroShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'

const PUBLIC_URL_BASE = 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev'

const getWordAudioUrl = (word: string, book: string) => {
    const hash = md5(word)
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chunk {
    correct: string
    options: string[]
}

interface SpellingWord {
    id: string
    word: string
    meaning: string
    type: string
    chunks: Chunk[]
}

interface LinearQuestion {
    qtype: 'linear'
    word: string
    cn: string
    chunks: Chunk[]
    audio: string
}

interface SoupQuestion {
    qtype: 'soup'
    word: string
    cn: string
    correctChunks: string[]
    distractors: string[]
    audio: string
}

type Question = LinearQuestion | SoupQuestion

interface Challenge {
    id: string
    title: string
    icon: string
    questions: Question[]
}

interface ShellData {
    level: string
    title: string
    spelling_words: SpellingWord[]
}

// ─── Challenge Builder (mirrors sh_release_gen-2.cjs logic) ──────────────────

const ICONS = ['🎯', '🚀', '🔥', '💎', '🌟', '⚡', '🏆', '🎖️', '🌈', '🦋']

function buildChallenges(data: ShellData, textbook: string): Challenge[] {
    // Build raw questions: linear + soup per word
    const rawQuestions: Question[] = []
    data.spelling_words.forEach(sw => {
        const audio = getWordAudioUrl(sw.word, textbook)
        rawQuestions.push({
            qtype: 'linear',
            word: sw.word,
            cn: sw.meaning,
            chunks: sw.chunks,
            audio,
        })
        rawQuestions.push({
            qtype: 'soup',
            word: sw.word,
            cn: sw.meaning,
            correctChunks: sw.chunks.map(c => c.correct),
            distractors: sw.chunks.flatMap(c => c.options.filter(o => o !== c.correct)),
            audio,
        })
    })

    // Pad to nearest multiple of 10
    const totalNeeded = Math.ceil(rawQuestions.length / 10) * 10
    for (let i = 0; i < totalNeeded - rawQuestions.length; i++) {
        rawQuestions.push({ ...rawQuestions[i % rawQuestions.length] })
    }

    // Group into challenges of 10
    const challenges: Challenge[] = []
    for (let i = 0; i < rawQuestions.length; i += 10) {
        const idx = i / 10
        challenges.push({
            id: `ch-${idx + 1}`,
            title: `Challenge ${idx + 1}`,
            icon: ICONS[idx % ICONS.length],
            questions: rawQuestions.slice(i, i + 10),
        })
    }
    return challenges
}

// ─── Stats helpers (localStorage, no server sync for SH) ─────────────────────

interface ChallengeStats {
    today: { date: string; attempts: number; best: number }
    lifetime: { attempts: number; best: number }
}

function getStats(practiceId: string): Record<string, ChallengeStats> {
    try { return JSON.parse(localStorage.getItem(`sh-stats-${practiceId}`) || '{}') } catch { return {} }
}

function saveStats(practiceId: string, s: Record<string, ChallengeStats>) {
    localStorage.setItem(`sh-stats-${practiceId}`, JSON.stringify(s))
}

function getChallengeStats(practiceId: string, challengeId: string): ChallengeStats {
    const all = getStats(practiceId)
    const todayStr = new Date().toLocaleDateString()
    let s = all[challengeId] || { today: { date: todayStr, attempts: 0, best: 0 }, lifetime: { attempts: 0, best: 0 } }
    if (s.today.date !== todayStr) s.today = { date: todayStr, attempts: 0, best: 0 }
    return s
}

function recordFinish(practiceId: string, challengeId: string, score: number) {
    const all = getStats(practiceId)
    const todayStr = new Date().toLocaleDateString()
    if (!all[challengeId]) all[challengeId] = { today: { date: todayStr, attempts: 0, best: 0 }, lifetime: { attempts: 0, best: 0 } }
    const s = all[challengeId]
    if (s.today.date !== todayStr) s.today = { date: todayStr, attempts: 0, best: 0 }
    s.today.attempts++
    if (score > s.today.best) s.today.best = score
    s.lifetime.attempts++
    if (score > s.lifetime.best) s.lifetime.best = score
    saveStats(practiceId, all)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SpellingHeroShell({ data, practiceId, textbook }: { data: ShellData; practiceId: string; textbook: string }) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const sfxRef  = useRef<HTMLAudioElement | null>(null)

    const [challenges] = useState<Challenge[]>(() => buildChallenges(data, textbook))
    const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
    const activeChallengeRef = useRef<Challenge | null>(null)

    // Game state
    const [queue, setQueue]         = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog]         = useState<Array<'green' | 'red' | null>>([])
    const [isRedemption, setIsRedemption] = useState(false)
    const [q, setQ]                       = useState<Question | null>(null)
    const [locked, setLocked]             = useState(false)
    const [completed, setCompleted]       = useState(false)
    const [finalScore, setFinalScore]     = useState(0)
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrect, setIsCorrect]       = useState(false)
    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)

    // Linear state
    const [activeSlot, setActiveSlot]       = useState(0)
    const [userChunks, setUserChunks]       = useState<(string | null)[]>([])
    const [shuffledOpts, setShuffledOpts]   = useState<string[][]>([])

    // Soup state
    const [brickPool, setBrickPool]         = useState<string[]>([])
    const [soupSelection, setSoupSelection] = useState<{ text: string; brickIdx: number }[]>([])

    // History modal
    const [historyChallenge, setHistoryChallenge] = useState<Challenge | null>(null)

    // Refs for live game state (avoids stale closures in nextQuestion)
    const queueRef        = useRef<Question[]>([])
    const mistakeRef      = useRef<Question[]>([])
    const scoreLogRef     = useRef<Array<'green' | 'red' | null>>([])
    const indexRef        = useRef(0)
    const redemptionRef   = useRef(false)

    // Preload only SFX on mount; challenge audio is loaded lazily on challenge start
    useEffect(() => {
        audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`)
        audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/error.mp3`)
    }, [])

    const playAudio = useCallback(async (url: string) => {
        if (!url) return
        try {
            const blob = await audioCache.cacheAudio(url)
            if (!blob) return
            const blobUrl = URL.createObjectURL(blob)
            if (audioRef.current) {
                audioRef.current.src = blobUrl
                audioRef.current.onended = () => URL.revokeObjectURL(blobUrl)
                audioRef.current.play().catch(console.error)
            } else {
                const a = new Audio(blobUrl)
                a.onended = () => URL.revokeObjectURL(blobUrl)
                a.play().catch(console.error)
                audioRef.current = a
            }
        } catch (e) { console.error(e) }
    }, [])

    const playSfx = useCallback(async (type: 'correct' | 'wrong') => {
        const url = type === 'correct'
            ? `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
            : `${PUBLIC_URL_BASE}/ep/sfx/error.mp3`
        try {
            const blob = await audioCache.cacheAudio(url)
            if (!blob) return
            const blobUrl = URL.createObjectURL(blob)
            const a = new Audio(blobUrl)
            a.onended = () => URL.revokeObjectURL(blobUrl)
            a.play().catch(console.error)
            sfxRef.current = a
        } catch (e) { console.error(e) }
    }, [])

    // ── Load a question into state ────────────────────────────────────────────

    const loadQuestion = useCallback((
        currentQueue: Question[],
        currentMistakes: Question[],
        index: number,
        redemption: boolean
    ) => {
        let nextQ: Question | null = null
        let nextRedemption = redemption

        if (index < currentQueue.length) {
            nextQ = currentQueue[index]
            nextRedemption = false
        } else if (currentMistakes.length > 0) {
            nextQ = currentMistakes[0]
            nextRedemption = true
        } else {
            return null // signal finish
        }

        setQ(nextQ)
        setIsRedemption(nextRedemption)
        setLocked(false)
        setShowFeedback(false)

        if (nextQ.qtype === 'linear') {
            const lin = nextQ as LinearQuestion
            setUserChunks(new Array(lin.chunks.length).fill(null))
            setActiveSlot(0)
            // Shuffle options per slot, cached so they don't re-shuffle on re-render
            setShuffledOpts(lin.chunks.map(c => [...c.options].sort(() => Math.random() - 0.5)))
        } else {
            const soup = nextQ as SoupQuestion
            // Build pool: all correct chunks + up to (8 - correct.length) distractors
            const distractorSample = [...soup.distractors]
                .sort(() => Math.random() - 0.5)
                .slice(0, Math.max(0, 8 - soup.correctChunks.length))
            setBrickPool([...soup.correctChunks, ...distractorSample].sort(() => Math.random() - 0.5))
            setSoupSelection([])
        }
        return nextQ
    }, [])

    // ── Start a challenge ─────────────────────────────────────────────────────

    const handleChallengeSelect = (c: Challenge) => {
        if (!trialsTracker.consumeTrial(practiceId, c.id)) return

        const shuffled = [...c.questions].sort(() => Math.random() - 0.5)
        const emptyLog = new Array(c.questions.length).fill(null)

        activeChallengeRef.current = c
        queueRef.current           = shuffled
        mistakeRef.current         = []
        indexRef.current           = 0
        scoreLogRef.current        = emptyLog
        redemptionRef.current      = false

        setActiveRecordId(null)
        setActiveChallenge(c)
        setQueue(shuffled)
        setCurrentIndex(0)
        setScoreLog(emptyLog)
        setCompleted(false)

        // Preload only this challenge's audio (unique words only)
        const uniqueUrls = [...new Set(shuffled.map(q => q.audio))]
        uniqueUrls.forEach(url => audioCache.preloadAndSync(url))

        loadQuestion(shuffled, [], 0, false)
    }

    // ── Linear interactions ───────────────────────────────────────────────────

    const handleSlotClick = (i: number) => {
        if (locked) return
        setActiveSlot(i)
    }

    const handleOptionSelect = (opt: string) => {
        if (locked) return
        const lin = q as LinearQuestion
        const next = [...userChunks]
        next[activeSlot] = opt
        setUserChunks(next)
        // Auto-advance to next unfilled slot
        const nextEmpty = next.findIndex((v, i) => i > activeSlot && v === null)
        if (nextEmpty !== -1) setActiveSlot(nextEmpty)
        else if (next[activeSlot] === null) { /* stay */ }
        else if (activeSlot < lin.chunks.length - 1) setActiveSlot(activeSlot + 1)
    }

    // ── Soup interactions ─────────────────────────────────────────────────────

    const handleBrickClick = (text: string, brickIdx: number) => {
        if (locked) return
        setSoupSelection(prev => [...prev, { text, brickIdx }])
    }

    const handleRemoveSoupBrick = (selIdx: number) => {
        if (locked) return
        setSoupSelection(prev => prev.filter((_, i) => i !== selIdx))
    }

    // ── Check ready ───────────────────────────────────────────────────────────

    const isReady = () => {
        if (!q) return false
        if (q.qtype === 'linear') return userChunks.every(c => c !== null)
        return soupSelection.length > 0
    }

    // ── Check answer ──────────────────────────────────────────────────────────

    const checkAnswer = () => {
        if (!q || locked || !isReady()) return
        setLocked(true)

        let correct = false
        if (q.qtype === 'linear') {
            correct = userChunks.join('') === q.word
        } else {
            correct = soupSelection.map(s => s.text).join('') === q.word
        }

        setIsCorrect(correct)
        setShowFeedback(true)
        playSfx(correct ? 'correct' : 'wrong')
        setTimeout(() => playAudio(q.audio), 200)

        // Update refs immediately so nextQuestion reads fresh values
        const newLog = [...scoreLogRef.current]
        if (!redemptionRef.current) newLog[indexRef.current] = correct ? 'green' : 'red'
        scoreLogRef.current = newLog
        setScoreLog(newLog)

        const newMistakes = [...mistakeRef.current]
        if (correct && redemptionRef.current) {
            newMistakes.shift()
        } else if (!correct && !redemptionRef.current) {
            newMistakes.push(q)
        } else if (!correct && redemptionRef.current) {
            newMistakes.push(newMistakes.shift()!)
        }
        mistakeRef.current = newMistakes

        const totalCorrect = newLog.filter(s => s === 'green').length
        const scorePercent = Math.round((totalCorrect / queueRef.current.length) * 100)
        syncRecord(scorePercent, false)
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
                    unit: `${practiceId} (${activeChallengeRef.current?.title || ''})`, 
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

    // ── Next question ─────────────────────────────────────────────────────────

    const nextQuestion = () => {
        const wasRedemption = redemptionRef.current
        const nextIndex = wasRedemption ? indexRef.current : indexRef.current + 1

        if (!wasRedemption) {
            indexRef.current = nextIndex
            setCurrentIndex(nextIndex)
        }

        const currentQueue    = queueRef.current
        const currentMistakes = mistakeRef.current
        const currentLog      = scoreLogRef.current
        const atEnd           = nextIndex >= currentQueue.length && currentMistakes.length === 0

        if (atEnd) {
            const totalCorrect = currentLog.filter(s => s === 'green').length
            const score        = Math.round((totalCorrect / currentQueue.length) * 100)
            setFinalScore(score)
            setCompleted(true)
            if (activeChallengeRef.current) recordFinish(practiceId, activeChallengeRef.current.id, score)
            syncRecord(score, true)
        } else {
            const nextRedemption = nextIndex >= currentQueue.length && currentMistakes.length > 0
            redemptionRef.current = nextRedemption
            loadQuestion(currentQueue, currentMistakes, nextIndex, nextRedemption)
        }
    }

    // ─── Render: Complete screen ──────────────────────────────────────────────

    if (completed && activeChallenge) {
        return (
            <div className="sh-container" style={{ '--primary': '#58cc02', '--primary-dark': '#46a302' } as any}>
                <div className="sh-complete-screen">
                    <p className="sh-score-display">{finalScore}%</p>
                    <p className="sh-complete-subtitle">Challenge Complete!</p>
                    <button
                        className="sh-check-btn"
                        style={{ maxWidth: 300 }}
                        onClick={() => setActiveChallenge(null)}
                    >
                        Back to Menu
                    </button>
                </div>
            </div>
        )
    }

    // ─── Render: Game screen ──────────────────────────────────────────────────

    if (activeChallenge && q) {
        const linQ = q.qtype === 'linear' ? (q as LinearQuestion) : null
        const soupQ = q.qtype === 'soup' ? (q as SoupQuestion) : null

        return (
            <div className="sh-container" style={{ '--primary': '#58cc02', '--primary-dark': '#46a302' } as any}>
                <div className="sh-screen">
                    {/* Top bar */}
                    <div className="sh-top-bar">
                        <button className="sh-close-btn" onClick={() => {
                            const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id)
                            if (window.confirm(`Quit? You have ${rem} attempt(s) left today.`)) {
                                setActiveChallenge(null)
                            }
                        }}>✕</button>
                        <div className="sh-progress-container">
                            {queue.map((_, i) => {
                                const isActive = !isRedemption && i === currentIndex && !showFeedback
                                return (
                                    <div
                                        key={i}
                                        className={`sh-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Question area */}
                    <div className="sh-question-area">
                        <div className="sh-type-badge">
                            {q.qtype === 'linear' ? 'Pick Each Part' : 'Build the Word'}
                        </div>
                        <div className="sh-prompt-cn">{q.cn}</div>

                        {/* ── Linear UI ── */}
                        {linQ && (
                            <>
                                <div className="sh-slots-container">
                                    {linQ.chunks.map((chunk, i) => {
                                        let cls = 'sh-slot'
                                        if (i === activeSlot && !locked) cls += ' active'
                                        else if (userChunks[i]) cls += ' filled'
                                        if (locked && showFeedback) {
                                            if (userChunks[i] === chunk.correct) cls = cls.replace('filled', '') + ' correct'
                                            else if (userChunks[i]) cls = cls.replace('filled', '') + ' wrong'
                                        }
                                        return (
                                            <div key={i} className={cls} onClick={() => handleSlotClick(i)}>
                                                {userChunks[i] || '?'}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="sh-options-grid">
                                    {(shuffledOpts[activeSlot] || []).map(opt => (
                                        <button
                                            key={opt}
                                            className={`sh-option-btn ${userChunks[activeSlot] === opt ? 'selected' : ''}`}
                                            onClick={() => handleOptionSelect(opt)}
                                            disabled={locked}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── Soup UI ── */}
                        {soupQ && (
                            <>
                                <div className={`sh-soup-answer${showFeedback && !isCorrect ? ' shake' : ''}`}>
                                    {soupSelection.length === 0 && (
                                        <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Tap bricks below to spell</span>
                                    )}
                                    {soupSelection.map((s, i) => (
                                        <div
                                            key={i}
                                            className="sh-brick-answer"
                                            onClick={() => handleRemoveSoupBrick(i)}
                                        >
                                            {s.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="sh-brick-pool">
                                    {brickPool.map((brick, i) => {
                                        const used = soupSelection.some(s => s.brickIdx === i)
                                        return (
                                            <div
                                                key={i}
                                                className={`sh-brick ${used ? 'used' : ''}`}
                                                onClick={() => !used && handleBrickClick(brick, i)}
                                            >
                                                {brick}
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Feedback area */}
                    <div className={`sh-feedback-area ${showFeedback ? 'visible ' + (isCorrect ? 'correct' : 'wrong') : ''}`}>
                        {showFeedback && (
                            <>
                                <h3 className="sh-feedback-title" style={{ color: isCorrect ? '#58cc02' : '#ff4b4b' }}>
                                    {isCorrect ? 'Excellent!' : 'Keep Trying!'}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <button className="sh-play-btn" onClick={() => playAudio(q.audio)}>
                                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </button>
                                    <p className="sh-feedback-word">{q.word}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sh-footer-action">
                        {!locked ? (
                            <button
                                className="sh-check-btn"
                                disabled={!isReady()}
                                onClick={checkAnswer}
                            >
                                Check
                            </button>
                        ) : (
                            <button className="sh-check-btn continue" onClick={nextQuestion}>
                                Continue
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ─── Render: Home / Challenge selection ───────────────────────────────────

    return (
        <div className="sh-container" style={{ '--primary': '#58cc02', '--primary-dark': '#46a302' } as any}>
            <div className="sh-screen">
                <header className="sh-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', height: 40 }}>
                        <Link
                            to="/dashboard"
                            style={{ position: 'absolute', left: 0, fontSize: '1.5rem', textDecoration: 'none' }}
                        >
                            🏠
                        </Link>
                        <h1>{data.title}</h1>
                    </div>
                    <h2 style={{ marginTop: 15 }}>{data.level}</h2>
                </header>

                <div className="sh-challenge-grid">
                    {challenges.map(c => {
                        const s = getChallengeStats(practiceId, c.id)
                        const rem = trialsTracker.getRemainingTrials(practiceId, c.id)
                        return (
                            <div key={c.id} className="sh-challenge-card">
                                <div className="sh-card-header">
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.5rem', marginRight: 10 }}>{c.icon}</span>
                                        <h3 className="sh-card-title">{c.title}</h3>
                                        <span style={{ fontSize: '0.7rem', color: '#bbb', marginLeft: 8, marginTop: 2 }}>
                                            {rem} / 5 left
                                        </span>
                                    </div>
                                    <button
                                        className="sh-start-btn"
                                        onClick={() => handleChallengeSelect(c)}
                                        disabled={rem === 0}
                                        style={rem === 0 ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                    >
                                        {rem === 0 ? 'LIMIT' : 'START'}
                                    </button>
                                </div>
                                <div className="sh-card-stats">
                                    <div
                                        className="sh-stat-row"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setHistoryChallenge(c)}
                                    >
                                        <span className="sh-stat-label">TODAY</span>
                                        <span className="sh-stat-val">{s.today.attempts} Runs | Best: {s.today.best}%</span>
                                    </div>
                                    <div
                                        className="sh-stat-row"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setHistoryChallenge(c)}
                                    >
                                        <span className="sh-stat-label">LIFETIME</span>
                                        <span className="sh-stat-val">{s.lifetime.attempts} Runs | Best: {s.lifetime.best}%</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* History modal (simple stats — SH uses localStorage not server) */}
            {historyChallenge && (
                <div className="sh-modal-overlay" onClick={() => setHistoryChallenge(null)}>
                    <div className="sh-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="sh-modal-header">
                            <h3 className="sh-modal-title">{historyChallenge.title}</h3>
                            <button className="sh-modal-close" onClick={() => setHistoryChallenge(null)}>✕</button>
                        </div>
                        {(() => {
                            const s = getChallengeStats(practiceId, historyChallenge.id)
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '10px 14px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Today</div>
                                        <div style={{ fontWeight: 600 }}>{s.today.attempts} runs &nbsp;|&nbsp; Best: {s.today.best}%</div>
                                    </div>
                                    <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '10px 14px' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Lifetime</div>
                                        <div style={{ fontWeight: 600 }}>{s.lifetime.attempts} runs &nbsp;|&nbsp; Best: {s.lifetime.best}%</div>
                                    </div>
                                    <button
                                        className="sh-check-btn"
                                        style={{ marginTop: 10 }}
                                        onClick={() => setHistoryChallenge(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}
