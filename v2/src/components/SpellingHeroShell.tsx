import { useState, useRef, useEffect, useCallback } from 'react'
import { audioCache } from '../lib/audioCache'
import './SpellingHeroShell.css'
import { DailyLockModal } from './DailyLockModal'
import { trialsTracker, getActiveUserId } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'
import { getWordAudioUrl, usePracticeAudio, CORRECT_SFX_URL, ERROR_SFX_URL } from '../lib/practiceAudio'
import { useNavigationBlocker } from '../lib/useNavigationBlocker'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ActiveHeader } from './shell/ActiveHeader'
import { FooterAction } from './shell/FooterAction'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'

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
            unit: (sw as any).unit,
        } as any)
        rawQuestions.push({
            qtype: 'soup',
            word: sw.word,
            cn: sw.meaning,
            correctChunks: sw.chunks.map(c => c.correct),
            distractors: sw.chunks.flatMap(c => c.options.filter(o => o !== c.correct)),
            audio,
            unit: (sw as any).unit,
        } as any)
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
    try {
        const userId = getActiveUserId()
        return JSON.parse(localStorage.getItem(`sh-stats-${userId}-${practiceId}`) || '{}')
    } catch {
        return {}
    }
}

function saveStats(practiceId: string, s: Record<string, ChallengeStats>) {
    const userId = getActiveUserId()
    localStorage.setItem(`sh-stats-${userId}-${practiceId}`, JSON.stringify(s))
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

export function SpellingHeroShell({ data, practiceId, unit, textbook }: { data: ShellData; practiceId: string; unit: string; textbook: string }) {
    const { data: session } = useSession()
    const userId = session?.user?.id

    const { playAudio, playSfx, resolveAudioUrl } = usePracticeAudio(textbook, () => vocabGuide?.tts?.by === 'melotts')

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
    const [gainedXp, setGainedXp]         = useState(0)
    const [gainedLove, setGainedLove]     = useState(0)
    const [historicalBest, setHistoricalBest] = useState(0)
    const [isNewHigh, setIsNewHigh]       = useState(false)
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrect, setIsCorrect]       = useState(false)
    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)
    const hasFinishedRef = useRef(false)
    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {})

    useNavigationBlocker(!!activeChallenge && !completed);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (activeChallenge && !completed) {
                e.preventDefault();
                e.returnValue = '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。';
                return '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [activeChallenge, completed]);

    // Countdown timer (15s per question)
    const countdownTimer = useCountdown(15, {
        onExpire: () => {
            if (timerExpiredRef.current) return
            timerExpiredRef.current = true
            // Auto-submit if ready, else force wrong
            checkAnswerRef.current(true)
        }
    })

    // Linear state
    const [activeSlot, setActiveSlot]       = useState(0)
    const [userChunks, setUserChunks]       = useState<(string | null)[]>([])
    const [shuffledOpts, setShuffledOpts]   = useState<string[][]>([])

    // Soup state
    const [brickPool, setBrickPool]         = useState<string[]>([])
    const [soupSelection, setSoupSelection] = useState<{ text: string; brickIdx: number }[]>([])

    // History modal
    const [historyChallenge, setHistoryChallenge] = useState<Challenge | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)
    const [lastFinishedChallengeId, setLastFinishedChallengeId] = useState<string | null>(null)
    const [flickeringChallengeId, setFlickeringChallengeId] = useState<string | null>(null)
    const [vocabGuide, setVocabGuide] = useState<any>(null)

    useEffect(() => {
        if (!practiceId) return;
        const vocabGuideId = practiceId.replace(/-spelling-hero$/, '-vocab-guide');
        
        fetch(API_URL + `/api/practices/${vocabGuideId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(resData => {
                if (resData && !resData.error) {
                    let content = resData.content;
                    if (resData.isEncrypted && typeof content === 'string') {
                        try {
                            content = decryptContent(content, OBSCURE_KEY);
                        } catch (decErr) {
                            console.error("Decryption of vocab-guide failed:", decErr);
                            return;
                        }
                    }
                    setVocabGuide(content);
                } else {
                    console.warn(`Vocab guide not found or error loading: ${vocabGuideId}`, resData?.error);
                    setVocabGuide(null);
                }
            })
            .catch(err => {
                console.error("Failed to load vocab guide in SpellingHero:", err);
                setVocabGuide(null);
            });
    }, [practiceId]);

    useEffect(() => {
        if (!activeChallenge && lastFinishedChallengeId) {
            setFlickeringChallengeId(lastFinishedChallengeId);
            setTimeout(() => {
                const el = document.getElementById(`sh-card-${lastFinishedChallengeId}`);
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

    // Refs for live game state (avoids stale closures in nextQuestion)
    const queueRef        = useRef<Question[]>([])
    const mistakeRef      = useRef<Question[]>([])
    const scoreLogRef     = useRef<Array<'green' | 'red' | null>>([])
    const indexRef        = useRef(0)
    const redemptionRef   = useRef(false)

    // Preload only SFX on mount; challenge audio is loaded lazily on challenge start
    useEffect(() => {
        audioCache.preloadAndSync(CORRECT_SFX_URL)
        audioCache.preloadAndSync(ERROR_SFX_URL)
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
        timerExpiredRef.current = false

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
        // Reset countdown timer
        if (!invisibleMode) {
            countdownTimer.reset()
        } else {
            countdownTimer.pause()
        }
        return nextQ
    }, [invisibleMode])

    // ── Start a challenge ─────────────────────────────────────────────────────

    const handleChallengeSelect = (c: Challenge) => {
        const stats = getChallengeStats(practiceId, c.id);
        if (stats.today.best === 100) {
            setLockModalOpen(true);
            return;
        }
        if (!trialsTracker.consumeTrial(practiceId, c.id)) return

        const shuffled = [...c.questions].sort(() => Math.random() - 0.5).map((q: any, i: number) => ({ ...q, originalIndex: i }))
        const emptyLog = new Array(c.questions.length).fill(null)

        activeChallengeRef.current = c
        queueRef.current           = shuffled
        mistakeRef.current         = []
        indexRef.current           = 0
        scoreLogRef.current        = emptyLog
        redemptionRef.current      = false

        setActiveRecordId(null)
        recordIdPromiseRef.current = null
        hasFinishedRef.current = false
        setGainedXp(0)
        setGainedLove(0)
        setActiveChallenge(c)
        setQueue(shuffled)
        setCurrentIndex(0)
        setScoreLog(emptyLog)
        setCompleted(false)

        // Preload only this challenge's audio (unique words only)
        const uniqueUrls = [...new Set(shuffled.map(q => q.audio))]
        uniqueUrls.forEach(url => audioCache.preloadAndSync(resolveAudioUrl(url)))

        loadQuestion(shuffled, [], 0, false)
    }

    // ── Linear interactions ───────────────────────────────────────────────────

    const handleSlotClick = (i: number) => {
        if (locked) return
        setActiveSlot(i)
    }

    const handleOptionSelect = useCallback((opt: string) => {
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
    }, [locked, q, userChunks, activeSlot])

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

    const checkAnswer = useCallback((forceWrong?: boolean) => {
        if (!q || locked) return
        if (!forceWrong && !isReady()) return
        setLocked(true)
        countdownTimer.pause()

        let correct = false
        if (!forceWrong) {
            if (q.qtype === 'linear') {
                correct = userChunks.join('') === q.word
            } else {
                correct = soupSelection.map(s => s.text).join('') === q.word
            }
        }

        setIsCorrect(correct)
        setShowFeedback(true)
        playSfx(correct ? 'correct' : 'wrong')
        if (correct) {
            if (!invisibleMode) {
                const { xpGain } = petService.awardCorrectAnswer()
                setGainedXp(prev => prev + xpGain)
                setGainedLove(prev => prev + 1)
            }
        }
        setTimeout(() => playAudio(q.audio), 600)

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
            if (userId) {
                mistakeService.addMistake(userId, {
                    practiceId,
                    textbook,
                    unit,
                    practiceType: 'spelling-hero',
                    question: data.spelling_words.find(sw => sw.word === q.word) || {
                        word: q.word,
                        meaning: q.cn,
                        chunks: q.qtype === 'linear' ? (q as LinearQuestion).chunks : []
                    },
                    wrongAnswer: q.qtype === 'linear' ? userChunks.join('') : soupSelection.map(s => s.text).join('')
                });
            }
        } else if (!correct && redemptionRef.current) {
            newMistakes.push(newMistakes.shift()!)
        }
        mistakeRef.current = newMistakes

        const totalCorrect = newLog.filter(s => s === 'green').length
        const scorePercent = Math.round((totalCorrect / queueRef.current.length) * 100)
        const isLastMain = !redemptionRef.current && indexRef.current === queueRef.current.length - 1
        syncRecord(scorePercent, isLastMain)
    }, [q, locked, userChunks, soupSelection, playSfx, playAudio, isReady])

    // Keep ref in sync so onExpire uses the latest checkAnswer
    useEffect(() => { checkAnswerRef.current = checkAnswer }, [checkAnswer])

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
                        unit: `${practiceId} (${activeChallengeRef.current?.title || ''})`, 
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
                        unit: `${practiceId} (${activeChallengeRef.current?.title || ''})`, 
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
                            unit: `${practiceId} (${activeChallengeRef.current?.title || ''})`, 
                            score: scorePercent,
                            unfinished: !isFinished
                        })
                    })
                    const j = await res.json()
                    if (j.success && j.id) {
                        setActiveRecordId(j.id)
                        cache.updateRecord({
                            id: j.id,
                            unit: `${practiceId} (${activeChallengeRef.current?.title || ''})`,
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
            
            const prevStats = activeChallengeRef.current ? getChallengeStats(practiceId, activeChallengeRef.current.id) : null;
            const histBest = prevStats ? prevStats.lifetime.best : 0;
            setHistoricalBest(histBest)
            setIsNewHigh(histBest === 0 ? score > 0 : score > histBest)

            setCompleted(true)
            if (!invisibleMode) {
                if (activeChallengeRef.current) recordFinish(practiceId, activeChallengeRef.current.id, score)
                petService.awardQuizCompletion()
                syncRecord(score, true)
                if (userId) {
                    mistakeService.syncToServer(userId);
                }
            }
        } else {
            const nextRedemption = nextIndex >= currentQueue.length && currentMistakes.length > 0
            redemptionRef.current = nextRedemption
            loadQuestion(currentQueue, currentMistakes, nextIndex, nextRedemption)
        }
    }

    const soupQ = q?.qtype === 'soup' ? (q as SoupQuestion) : null

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeChallenge || completed || historyChallenge) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!locked) {
                    if (isReady()) {
                        checkAnswer();
                    }
                } else {
                    nextQuestion();
                }
            } else if (!locked && q?.qtype === 'linear' && ['1', '2', '3'].includes(e.key)) {
                e.preventDefault();
                const idx = parseInt(e.key, 10) - 1;
                const opts = shuffledOpts[activeSlot] || [];
                if (opts[idx]) {
                    handleOptionSelect(opts[idx]);
                }
            } else if (!locked && soupQ && ['1','2','3','4','a','s','d','f'].includes(e.key)) {
                e.preventDefault();
                const half = Math.ceil(brickPool.length / 2);
                const markers = ['1','2','3','4','a','s','d','f'];
                const markerIdx = markers.indexOf(e.key);
                const row = markerIdx < 4 ? 0 : 1;
                const col = markerIdx % 4;
                const brickIdx = row * half + col;
                if (brickIdx < brickPool.length) {
                    const used = soupSelection.some(s => s.brickIdx === brickIdx);
                    if (!used) handleBrickClick(brickPool[brickIdx], brickIdx);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeChallenge, completed, historyChallenge, locked, isReady, checkAnswer, nextQuestion, q, shuffledOpts, activeSlot, handleOptionSelect, soupQ, brickPool, soupSelection, handleBrickClick]);

    // ─── Render: Complete screen ──────────────────────────────────────────────

    if (completed && activeChallenge) {
        return (
            <div className="sh-container" style={{ '--primary': '#58cc02', '--primary-dark': '#46a302' } as any}>
                <div className="sh-complete-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', textAlign: 'center' }}>
                    <p className="sh-score-display" style={{ fontSize: '3.5rem', margin: '0', fontWeight: 'bold', color: 'var(--primary)' }}>{finalScore}%</p>
                    <p className="sh-complete-subtitle" style={{ margin: '5px 0 10px 0', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>Challenge Complete!</p>
                    
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

                    <button
                        className="sh-check-btn"
                        style={{ maxWidth: 300 }}
                        onClick={() => {
                            if (activeChallenge) {
                                setLastFinishedChallengeId(activeChallenge.id)
                            }
                            setActiveChallenge(null)
                        }}
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

        return (
            <div className="sh-container" style={{ '--primary': '#58cc02', '--primary-dark': '#46a302' } as any}>
                <div className="sh-screen">
                    {/* Top bar */}
                    <ActiveHeader
                        onClose={() => {
                            countdownTimer.pause()
                            const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id)
                            if (window.confirm(`Quit? You have ${rem} attempt(s) left today.`)) {
                                if (userId && !invisibleMode) {
                                    mistakeService.syncToServer(userId);
                                }
                                setActiveChallenge(null)
                            } else {
                                if (!locked && !invisibleMode) countdownTimer.resume()
                            }
                        }}
                        countdownTimer={{
                            secondsLeft: countdownTimer.secondsLeft,
                            totalSeconds: 15,
                            isRunning: countdownTimer.isRunning
                        }}
                        invisibleMode={invisibleMode}
                        queue={queue}
                        currentIndex={currentIndex}
                        scoreLog={scoreLog}
                        showFeedback={showFeedback}
                        isRedemption={isRedemption}
                        currentQuestion={q}
                        prefix="sh"
                    />

                    {/* Question area */}
                    <div className="sh-question-area">
                        <div className="sh-type-badge">
                            {q.qtype === 'linear' ? 'Pick Each Part' : 'Build the Word'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div className="sh-prompt-cn" style={{ marginBottom: 0 }}>{q.cn}</div>
                            {(q as any).unit && (
                                <span className="sh-unit-badge" style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    fontWeight: 'bold',
                                    border: '1.5px solid #e2e8f0',
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    lineHeight: 'normal'
                                }}>
                                    Unit {(q as any).unit}
                                </span>
                            )}
                        </div>

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
                                    {(shuffledOpts[activeSlot] || []).map((opt, idx) => (
                                        <button
                                            key={`${opt}-${idx}`}
                                            className={`sh-option-btn ${userChunks[activeSlot] === opt ? 'selected' : ''}`}
                                            onClick={() => handleOptionSelect(opt)}
                                            disabled={locked}
                                        >
                                            <span className="sh-option-marker">{idx + 1}</span>
                                            <span>{opt}</span>
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
                                {[0, 1].map(row => {
                                    const half = Math.ceil(brickPool.length / 2)
                                    const start = row * half
                                    const slice = brickPool.slice(start, start + half)
                                    if (slice.length === 0) return null
                                    const markers = row === 0 ? ['1','2','3','4'] : ['a','s','d','f']
                                    return (
                                        <div key={row} className="sh-brick-pool">
                                            {slice.map((brick, i) => {
                                                const brickIdx = start + i
                                                const used = soupSelection.some(s => s.brickIdx === brickIdx)
                                                return (
                                                    <div
                                                        key={brickIdx}
                                                        className={`sh-brick ${used ? 'used' : ''}`}
                                                        onClick={() => !used && handleBrickClick(brick, brickIdx)}
                                                    >
                                                        <span className="sh-option-marker">{markers[i]}</span>
                                                        {brick}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </>
                        )}
                    </div>

                    {/* Feedback area */}
                    <div className={`sh-feedback-area ${showFeedback ? 'visible ' + (isCorrect ? 'correct' : 'wrong') : ''}`}>
                        {showFeedback && (() => {
                            const vocabItem = vocabGuide?.unit_vocabulary?.find((item: any) => item.word.trim().toLowerCase() === q.word.trim().toLowerCase());
                            const memorizationHook = vocabItem?.memorization_hook;
                            const rawIpa = vocabItem?.ipa;
                            const ipa = rawIpa ? (rawIpa.startsWith('/') && rawIpa.endsWith('/') ? rawIpa : `/${rawIpa}/`) : '';
                            const syllableType = vocabItem?.syllable_type;
                            return (
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
                                    {(ipa || syllableType) && (
                                        <div className="sh-feedback-phonics" style={{
                                            marginTop: '6px',
                                            fontSize: '0.85rem',
                                            color: '#475569',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: '12px',
                                            flexWrap: 'wrap',
                                            fontWeight: 500
                                        }}>
                                            {ipa && <span>{ipa}</span>}
                                            {syllableType && <span style={{ color: '#0891b2' }}>{syllableType}</span>}
                                        </div>
                                    )}
                                    {memorizationHook && (
                                        <div className="sh-feedback-hook" style={{
                                            marginTop: '10px',
                                            fontSize: '0.9rem',
                                            color: '#ca8a04',
                                            background: '#fef9c3',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #fef08a',
                                            textAlign: 'center',
                                            maxWidth: '90%',
                                            margin: '10px auto 0 auto',
                                            fontWeight: 500,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}>
                                            💡 记忆法：{memorizationHook}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    {/* Footer */}
                    <FooterAction
                        locked={locked}
                        disableCheck={!isReady()}
                        onCheck={() => checkAnswer()}
                        onContinue={nextQuestion}
                        buttonText={(() => {
                            const mistakesCount = mistakeRef.current.length;
                            const isLast = redemptionRef.current 
                                ? (mistakesCount === 0)
                                : (indexRef.current + 1 >= queue.length && mistakesCount === 0);
                            return isLast ? 'Finish' : 'Continue';
                        })()}
                        prefix="sh"
                    />
                </div>
            </div>
        )
    }

    // ─── Render: Home / Challenge selection ───────────────────────────────────

    return (
        <div className="sh-container" style={{ '--primary': '#58cc02', '--primary-dark': '#46a302' } as any}>
            <div className="sh-screen">
                <ShellHeader
                    title={data.title}
                    level={data.level}
                    textbook={textbook}
                    unit={unit}
                    prefix="sh"
                />

                <InvisibleModeCheckbox
                    checked={invisibleMode}
                    onChange={setInvisibleMode}
                />

                <ChallengeCardGrid
                    challenges={challenges}
                    onStart={handleChallengeSelect}
                    onShowHistory={setHistoryChallenge}
                    getRemainingTrials={(cId) => trialsTracker.getRemainingTrials(practiceId, cId)}
                    getChallengeStatsText={(c) => {
                        const s = getChallengeStats(practiceId, c.id)
                        return {
                            today: `${s.today.attempts} Runs | Best: ${s.today.best}%`,
                            lifetime: `${s.lifetime.attempts} Runs | Best: ${s.lifetime.best}%`,
                            isTodayBestHigh: s.today.best >= 70
                        }
                    }}
                    isLockedToday={(c) => {
                        const s = getChallengeStats(practiceId, c.id)
                        return s.today.best === 100
                    }}
                    flickeringId={flickeringChallengeId}
                    prefix="sh"
                />
            </div>

            {/* History modal */}
            {historyChallenge && (
                <ShellHistoryModal
                    title={historyChallenge.title}
                    onClose={() => setHistoryChallenge(null)}
                    prefix="sh"
                >
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
                </ShellHistoryModal>
            )}

            {lockModalOpen && (
                 <DailyLockModal onClose={() => setLockModalOpen(false)} />
             )}
        </div>
    )
}
