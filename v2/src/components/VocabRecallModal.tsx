import { useState, useEffect, useRef, useCallback } from 'react'
import { audioCache } from '../lib/audioCache'
import { getAudioUrl, shuffle } from '../lib/practiceAudio'
import { AnimatedWordSVG } from './VocabTraceModal'
import './VocabMasterShell.css'

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
    const [isRateLocked, setIsRateLocked] = useState(false)
    const [weightDeltaAnim, setWeightDeltaAnim] = useState<number | null>(null)
    const [showHintModal, setShowHintModal] = useState(false)
    const [hintTimeLeft, setHintTimeLeft] = useState(5)
    const [isClosing, setIsClosing] = useState(false)
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
    const rateLockTimerRef = useRef<any>(null)
    const weightAnimTimerRef = useRef<any>(null)
    const hintIntervalRef = useRef<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const forceResetHint = useCallback(() => {
        setShowHintModal(false)
        setIsClosing(false)
        if (hintIntervalRef.current) {
            clearInterval(hintIntervalRef.current)
            hintIntervalRef.current = null
        }
    }, [])

    const closeHintModal = useCallback(() => {
        setShowHintModal(prev => {
            if (!prev) return false
            setIsClosing(true)
            setTimeout(() => {
                setShowHintModal(false)
                setIsClosing(false)
                if (hintIntervalRef.current) {
                    clearInterval(hintIntervalRef.current)
                    hintIntervalRef.current = null
                }
            }, 200)
            return prev
        })
    }, [])

    const handleShowHint = useCallback(() => {
        setIsClosing(false)
        setShowHintModal(true)
        setHintTimeLeft(5)

        if (hintIntervalRef.current) clearInterval(hintIntervalRef.current)

        let secondsLeft = 5
        hintIntervalRef.current = setInterval(() => {
            secondsLeft -= 1
            setHintTimeLeft(secondsLeft)
            if (secondsLeft <= 0) {
                closeHintModal()
            }
        }, 1000)
    }, [closeHintModal])

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

        // Pre-load and save all audio files to IndexedDB for seamless Rapid Thinking practice
        if (textbook && vocab && vocab.length > 0) {
            for (const item of vocab) {
                if (item?.word) {
                    const url = getAudioUrl(item.word, textbook, isCf)
                    if (url) {
                        audioCache.preloadAndSync(url)
                    }
                }
            }
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (rateLockTimerRef.current) clearTimeout(rateLockTimerRef.current)
            if (weightAnimTimerRef.current) clearTimeout(weightAnimTimerRef.current)
            if (hintIntervalRef.current) clearInterval(hintIntervalRef.current)
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

    // Lock Easy/Hard buttons for 1 second when word is revealed
    useEffect(() => {
        if (isRevealed) {
            setIsRateLocked(true)
            if (rateLockTimerRef.current) clearTimeout(rateLockTimerRef.current)
            rateLockTimerRef.current = setTimeout(() => {
                setIsRateLocked(false)
                rateLockTimerRef.current = null
            }, 1000)
        } else {
            setIsRateLocked(false)
            if (rateLockTimerRef.current) {
                clearTimeout(rateLockTimerRef.current)
                rateLockTimerRef.current = null
            }
        }
        return () => {
            if (rateLockTimerRef.current) {
                clearTimeout(rateLockTimerRef.current)
                rateLockTimerRef.current = null
            }
        }
    }, [isRevealed])

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
        forceResetHint()
        if (weightAnimTimerRef.current) {
            clearTimeout(weightAnimTimerRef.current)
            weightAnimTimerRef.current = null
        }
        setWeightDeltaAnim(null)
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
        if (deck.length === 0 || isRateLocked || weightDeltaAnim !== null) return
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

        setIsRateLocked(true)
        setWeightDeltaAnim(delta)

        if (weightAnimTimerRef.current) clearTimeout(weightAnimTimerRef.current)
        weightAnimTimerRef.current = setTimeout(() => {
            weightAnimTimerRef.current = null
            setWeightDeltaAnim(null)
            handleNext()
        }, 1000)
    }

    const handleClose = () => {
        forceResetHint()
        if (timerRef.current) clearInterval(timerRef.current)
        if (rateLockTimerRef.current) clearTimeout(rateLockTimerRef.current)
        if (weightAnimTimerRef.current) clearTimeout(weightAnimTimerRef.current)
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
                        <span 
                            key={`${currentItem ? currentItem.word : currentIndex}-${weightDeltaAnim ?? 'none'}`} 
                            className={`vg-card-weight-badge ${currentWeight >= 4 ? 'hard' : currentWeight <= 2 ? 'easy' : ''} ${weightDeltaAnim !== null ? (weightDeltaAnim < 0 ? 'anim-easy' : 'anim-hard') : ''}`}
                        >
                            Index: <b>{currentWeight}</b>
                            {weightDeltaAnim !== null && (
                                <span className={`vg-badge-delta-floating ${weightDeltaAnim < 0 ? 'delta-minus' : 'delta-plus'}`}>
                                    {weightDeltaAnim > 0 ? `+${weightDeltaAnim}` : weightDeltaAnim}
                                </span>
                            )}
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
                                    {((currentItem.ipa && currentItem.ipa !== 'none') || currentItem.memorization_hook || currentItem.hint) && (
                                        <div className="vg-card-detail" style={{ justifyContent: 'center', alignItems: 'center', marginTop: '6px', display: 'flex', gap: '8px' }}>
                                            {currentItem.ipa && currentItem.ipa !== 'none' && (
                                                <span className="vg-card-value font-ipa" style={{ fontSize: '1.05em' }}>{currentItem.ipa}</span>
                                            )}
                                            {(currentItem.memorization_hook || currentItem.hint) && (
                                                <button 
                                                    className="vm-prompt-hint-btn" 
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleShowHint()
                                                    }}
                                                    title="Hint"
                                                >
                                                    💡
                                                </button>
                                            )}
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
                                        disabled={isRateLocked}
                                        title="Reduce index (easier)"
                                    >
                                        Easy
                                    </button>
                                    <button 
                                        className="vg-btn-hard" 
                                        onClick={() => updateWeight(1)}
                                        disabled={isRateLocked}
                                        title="Increase index (harder)"
                                    >
                                        Hard
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>

                {(showHintModal || isClosing) && (
                    <div className={`vm-modal-overlay${isClosing ? ' closing' : ''}`} onClick={closeHintModal} style={{ zIndex: 1200 }}>
                        <div className={`vm-modal-content${isClosing ? ' closing' : ''}`} onClick={e => e.stopPropagation()} style={{ textAlign: 'center', background: '#ffffff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary, #3b82f6)' }}>
                                    💡 Hint (提示) <span style={{ fontSize: '0.9rem', color: '#999', marginLeft: '6px' }}>({hintTimeLeft}s)</span>
                                </span>
                                <button className="vm-close-btn" style={{ margin: 0, width: 'auto', fontSize: '1.2rem' }} onClick={closeHintModal}>✕</button>
                            </div>
                            <div style={{ fontSize: '1.05rem', color: '#333', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                {currentItem?.memorization_hook || currentItem?.hint || '暂无提示'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
