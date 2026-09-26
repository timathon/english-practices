import { useState, useEffect, useRef, useCallback } from 'react'
import { audioCache } from '../lib/audioCache'
import { getAudioUrl, shuffle } from '../lib/practiceAudio'
import { AnimatedWordSVG } from './VocabTraceModal'

interface VocabRecallModalProps {
    vocab: any[]
    hiddenIndices: Set<number>
    formatMeaning?: (item: any) => string
    practiceId?: string
    textbook?: string
    isCf?: boolean
    onClose: () => void
}

export function VocabRecallModal({
    vocab,
    hiddenIndices,
    formatMeaning,
    practiceId,
    textbook,
    isCf,
    onClose,
}: VocabRecallModalProps) {
    const [deck, setDeck] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isRevealed, setIsRevealed] = useState(false)
    const [timeLeft, setTimeLeft] = useState(10)
    const [isFinished, setIsFinished] = useState(false)
    const [isPlayingAudio, setIsPlayingAudio] = useState(false)
    const [weights, setWeights] = useState<Record<string, number>>({})

    const weightsKey = `ep-vg-weights-${practiceId || textbook || 'default'}`

    const loadWeights = useCallback((): Record<string, number> => {
        try {
            const raw = localStorage.getItem(weightsKey)
            if (raw) return JSON.parse(raw)
        } catch (e) {
            console.error('Failed to load weights:', e)
        }
        return {}
    }, [weightsKey])

    const getWordWeight = useCallback((wordText: string, currentWeightsMap: Record<string, number> = weights): number => {
        const key = wordText.trim().toLowerCase()
        if (currentWeightsMap[key] !== undefined) return currentWeightsMap[key]
        return 3 // Default initial index is 3
    }, [weights])

    const timerRef = useRef<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const initDeck = useCallback(() => {
        const loadedWeights = loadWeights()
        setWeights(loadedWeights)

        let activeDeck = vocab.filter(item => !hiddenIndices.has(item.originalIndex))
        if (activeDeck.length === 0) {
            activeDeck = [...vocab]
        }
        // Shuffle first, then sort by weight descending so ties remain randomly distributed
        const shuffled = shuffle(activeDeck)
        shuffled.sort((a, b) => {
            const keyA = a.word.trim().toLowerCase()
            const keyB = b.word.trim().toLowerCase()
            const wA = loadedWeights[keyA] !== undefined ? loadedWeights[keyA] : 3
            const wB = loadedWeights[keyB] !== undefined ? loadedWeights[keyB] : 3
            return wB - wA
        })

        setDeck(shuffled)
        setCurrentIndex(0)
        setIsRevealed(false)
        setTimeLeft(10)
        setIsFinished(false)
    }, [vocab, hiddenIndices, loadWeights])

    useEffect(() => {
        initDeck()
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (audioRef.current) audioRef.current.pause()
        }
    }, [])

    const playWordAudio = useCallback(async (wordText: string) => {
        if (!textbook) return
        setIsPlayingAudio(true)
        const url = getAudioUrl(wordText, textbook, isCf)
        try {
            const blob = await audioCache.cacheAudio(url)
            if (blob) {
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                const audio = new Audio(URL.createObjectURL(blob))
                audioRef.current = audio
                audio.onended = () => setIsPlayingAudio(false)
                audio.onerror = () => setIsPlayingAudio(false)
                audio.play().catch(() => setIsPlayingAudio(false))
            } else {
                setIsPlayingAudio(false)
            }
        } catch (e) {
            console.error('Audio playback error:', e)
            setIsPlayingAudio(false)
        }
    }, [textbook, isCf])

    const revealCurrentWord = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        setIsRevealed(true)
        setTimeLeft(0)

        const currentItem = deck[currentIndex]
        if (currentItem) {
            playWordAudio(currentItem.word)
        }
    }, [deck, currentIndex, playWordAudio])

    // Handle timer for current question
    useEffect(() => {
        if (deck.length === 0 || isFinished || isRevealed) return

        setTimeLeft(10)
        if (timerRef.current) clearInterval(timerRef.current)

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                    setIsRevealed(true)
                    const currentItem = deck[currentIndex]
                    if (currentItem) {
                        playWordAudio(currentItem.word)
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [currentIndex, isRevealed, isFinished, deck.length])

    const handleNext = () => {
        if (audioRef.current) {
            audioRef.current.pause()
        }
        setIsPlayingAudio(false)

        if (currentIndex + 1 >= deck.length) {
            setIsFinished(true)
        } else {
            setCurrentIndex(prev => prev + 1)
            setIsRevealed(false)
            setTimeLeft(10)
        }
    }

    const updateWeight = (delta: number) => {
        if (deck.length === 0) return
        const currentItem = deck[currentIndex]
        if (currentItem) {
            const currentW = getWordWeight(currentItem.word)
            const newW = Math.max(1, currentW + delta)
            const wordKey = currentItem.word.trim().toLowerCase()
            const newWeights = { ...weights, [wordKey]: newW }

            setWeights(newWeights)
            try {
                localStorage.setItem(weightsKey, JSON.stringify(newWeights))
            } catch (e) {
                console.error('Failed to save weights:', e)
            }
        }

        handleNext()
    }

    const handleClose = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (audioRef.current) audioRef.current.pause()
        onClose()
    }

    if (deck.length === 0) return null

    const currentItem = deck[currentIndex]
    const progressPercent = ((currentIndex + 1) / deck.length) * 100
    const meaningText = formatMeaning ? formatMeaning(currentItem) : (currentItem?.meaning || '')
    const currentWeight = currentItem ? getWordWeight(currentItem.word) : 3

    return (
        <div className="vg-modal-backdrop" onClick={(e) => e.stopPropagation()}>
            <div className="vg-flashcard-modal vg-recall-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vg-card-header">
                    <span className="vg-card-header-title">💡 Rapid Thinking Practice</span>
                    <button className="vg-modal-close-btn" onClick={handleClose}>&times;</button>
                </div>

                <div className="vg-card-progress-container">
                    <div className="vg-card-progress-bar" style={{ width: `${isFinished ? 100 : progressPercent}%` }}></div>
                </div>

                {!isFinished && (
                    <div className="vg-card-index-bar">
                        <span className="vg-card-index">Word {currentIndex + 1} of {deck.length}</span>
                        <span key={currentItem ? currentItem.word : currentIndex} className={`vg-card-weight-badge ${currentWeight >= 4 ? 'hard' : currentWeight <= 2 ? 'easy' : ''}`}>
                            Index: <b>{currentWeight}</b>
                        </span>
                    </div>
                )}

                {isFinished ? (
                    <div className="vg-recall-content-container" style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="vg-flashcard-success-hero">
                            <div className="hero-emoji">🎯</div>
                            <h3>Practice Complete!</h3>
                            <p>You have reviewed all {deck.length} words in this session.</p>
                        </div>
                    </div>
                ) : (
                    <div className="vg-recall-content-container">
                        <div className="vg-recall-box">
                            {/* Question prompt (Chinese) */}
                            <div className="vg-recall-prompt-section">
                                <div className="vg-recall-meaning">{meaningText}</div>
                            </div>

                            {/* Countdown status */}
                            {!isRevealed ? (
                                <div className="vg-recall-timer-badge">
                                    <span className="timer-icon">⏳</span>
                                    <span>Time left to recall: <b>{timeLeft}s</b></span>
                                </div>
                            ) : (
                                <div className="vg-recall-answer-section">
                                    <div className="vg-recall-word-row">
                                        <div className="vg-recall-word-title">{currentItem.word}</div>
                                        <button 
                                            className={`vg-word-play-btn ${isPlayingAudio ? 'playing' : ''}`}
                                            onClick={() => playWordAudio(currentItem.word)}
                                            title="Replay pronunciation"
                                        >
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                    </div>
                                    <AnimatedWordSVG word={currentItem.word} />
                                    {currentItem.ipa && currentItem.ipa !== 'none' && (
                                        <div className="vg-card-detail" style={{ justifyContent: 'center', marginTop: '6px' }}>
                                            <span className="vg-card-value font-ipa" style={{ fontSize: '1.05em' }}>{currentItem.ipa}</span>
                                        </div>
                                    )}
                                    {currentItem.context_sentence && (
                                        <div className="vg-card-context" style={{ marginTop: '12px' }}>
                                            <button 
                                                className={`vg-play-btn ${isPlayingAudio ? 'playing' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    playWordAudio(currentItem.context_sentence)
                                                }}
                                                title="Play context sentence audio"
                                            >
                                                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                            </button>
                                            <span className="vg-sentence">"{currentItem.context_sentence}"</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={`vg-modal-footer ${isFinished ? 'vertical' : ''}`}>
                    {isFinished ? (
                        <>
                            <button className="vg-btn-primary" onClick={initDeck}>Practice Again</button>
                            <button className="vg-btn-secondary" onClick={handleClose}>Exit</button>
                        </>
                    ) : (
                        <>
                            {!isRevealed ? (
                                <button className="vg-btn-dont-know" onClick={revealCurrentWord}>
                                    Show Now
                                </button>
                            ) : (
                                <>
                                    <button 
                                        className="vg-btn-easy" 
                                        onClick={() => updateWeight(-1)}
                                        title="Reduce index (easier)"
                                    >
                                        Easy
                                    </button>
                                    <button 
                                        className="vg-btn-hard" 
                                        onClick={() => updateWeight(1)}
                                        title="Increase index (harder)"
                                    >
                                        Hard
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
