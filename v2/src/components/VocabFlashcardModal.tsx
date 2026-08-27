import { useState, useEffect, useRef } from 'react'
import { audioCache } from '../lib/audioCache'
import { PUBLIC_URL_BASE, getAudioUrl } from '../lib/practiceAudio'
import { AnimatedWordSVG } from './VocabTraceModal'

interface VocabFlashcardModalProps {
    vocab: any[]
    hiddenIndices: Set<number>
    onToggleWordHidden: (index: number) => void
    textbook?: string
    isCf?: boolean
    onClose: () => void
}

export function VocabFlashcardModal({
    vocab,
    hiddenIndices,
    onToggleWordHidden,
    textbook,
    isCf,
    onClose,
}: VocabFlashcardModalProps) {
    const [deck, setDeck] = useState<any[]>([])
    const [currentDeckIndex, setCurrentDeckIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [countdown, setCountdown] = useState<number | null>(null)
    const [slideDirection, setSlideDirection] = useState<'next' | null>(null)
    const [hasClickedDontKnow, setHasClickedDontKnow] = useState(false)
    const [isPeeking, setIsPeeking] = useState(false)
    const [isNextButtonLocked, setIsNextButtonLocked] = useState(false)
    const [flashcardsFinished, setFlashcardsFinished] = useState(false)
    const [playingIndex, setPlayingIndex] = useState<number | null>(null)

    const timerRef = useRef<any>(null)
    const knowCooldownIntervalRef = useRef<any>(null)
    const peekTimeout1Ref = useRef<any>(null)
    const peekTimeout2Ref = useRef<any>(null)
    const peekResetTimeoutRef = useRef<any>(null)

    const clearPeekTimeouts = () => {
        if (peekTimeout1Ref.current) clearTimeout(peekTimeout1Ref.current)
        if (peekTimeout2Ref.current) clearTimeout(peekTimeout2Ref.current)
        if (peekResetTimeoutRef.current) clearTimeout(peekResetTimeoutRef.current)
        peekTimeout1Ref.current = null
        peekTimeout2Ref.current = null
        peekResetTimeoutRef.current = null
        setIsPeeking(false)
    }

    const initDeck = () => {
        let activeDeck = vocab.filter(item => !hiddenIndices.has(item.originalIndex))
        if (activeDeck.length === 0) {
            activeDeck = [...vocab]
        }
        setDeck(activeDeck)
        setCurrentDeckIndex(0)
        setIsFlipped(false)
        setCountdown(null)
        setSlideDirection(null)
        setHasClickedDontKnow(false)
        setFlashcardsFinished(false)
    }

    useEffect(() => {
        initDeck()
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (knowCooldownIntervalRef.current) clearInterval(knowCooldownIntervalRef.current)
            clearPeekTimeouts()
        }
    }, [])

    useEffect(() => {
        setIsNextButtonLocked(true)
        const timer = setTimeout(() => {
            setIsNextButtonLocked(false)
        }, 2000)
        return () => clearTimeout(timer)
    }, [currentDeckIndex])

    const playAudio = async (sentence: string, index: number) => {
        if (!textbook) return
        setPlayingIndex(index)
        const url = getAudioUrl(sentence, textbook, isCf)
        try {
            const blob = await audioCache.cacheAudio(url)
            if (blob) {
                const audio = new Audio(URL.createObjectURL(blob))
                audio.onended = () => setPlayingIndex(null)
                audio.onerror = () => setPlayingIndex(null)
                audio.play()
            } else {
                setPlayingIndex(null)
            }
        } catch (e) {
            console.error(e)
            setPlayingIndex(null)
        }
    }

    useEffect(() => {
        if (deck.length > 0 && deck[currentDeckIndex]) {
            const currentItem = deck[currentDeckIndex]
            if (currentItem.context_sentence) {
                const timer = setTimeout(() => {
                    playAudio(currentItem.context_sentence, currentItem.originalIndex)
                }, 300)
                return () => clearTimeout(timer)
            }
        }
    }, [currentDeckIndex, deck])

    const moveToNextCard = () => {
        setIsNextButtonLocked(true)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        clearPeekTimeouts()
        setCountdown(null)

        setSlideDirection('next')
        setTimeout(() => {
            setCurrentDeckIndex(prev => {
                if (prev + 1 < deck.length) {
                    setIsFlipped(false)
                    setSlideDirection(null)
                    setHasClickedDontKnow(false)
                    return prev + 1
                } else {
                    ;(async () => {
                        const correctUrl = `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
                        try {
                            const blob = await audioCache.cacheAudio(correctUrl)
                            if (blob) {
                                const audio = new Audio(URL.createObjectURL(blob))
                                audio.play().catch(console.error)
                            }
                        } catch (e) {
                            console.error(e)
                        }
                    })()
                    setFlashcardsFinished(true)
                    setSlideDirection(null)
                    return prev
                }
            })
        }, 300)
    }

    const handleKnow = () => {
        if (deck.length === 0 || isNextButtonLocked) return
        const item = deck[currentDeckIndex]
        if (!hiddenIndices.has(item.originalIndex)) {
            onToggleWordHidden(item.originalIndex)
        }
        moveToNextCard()
    }

    const handleDontKnow = () => {
        if (deck.length === 0) return
        setIsFlipped(true)
        setCountdown(5)
        setHasClickedDontKnow(true)
        clearPeekTimeouts()

        const item = deck[currentDeckIndex]
        playAudio(item.word, item.originalIndex + 20000)

        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        let currentSec = 5
        timerRef.current = setInterval(() => {
            currentSec -= 1
            if (currentSec <= 0) {
                clearInterval(timerRef.current)
                timerRef.current = null
                setCountdown(null)
            } else {
                setCountdown(currentSec)
            }
        }, 1000)

        peekTimeout1Ref.current = setTimeout(() => {
            setIsPeeking(true)
            peekResetTimeoutRef.current = setTimeout(() => {
                setIsPeeking(false)
            }, 400)
        }, 1000)

        peekTimeout2Ref.current = setTimeout(() => {
            setIsPeeking(true)
            peekResetTimeoutRef.current = setTimeout(() => {
                setIsPeeking(false)
            }, 400)
        }, 4000)
    }

    const handleCardClick = () => {
        if (hasClickedDontKnow) {
            setIsFlipped(prev => !prev)
            clearPeekTimeouts()
        }
    }

    const handleClose = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (knowCooldownIntervalRef.current) clearInterval(knowCooldownIntervalRef.current)
        clearPeekTimeouts()
        onClose()
    }

    if (deck.length === 0) return null

    const progressPercent = ((currentDeckIndex + 1) / deck.length) * 100
    const currentItem = deck[currentDeckIndex]

    return (
        <div className="vg-modal-backdrop" onClick={(e) => e.stopPropagation()}>
            <div className="vg-flashcard-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vg-card-header">
                    <span className="vg-card-header-title">Vocabulary Flashcards</span>
                    <button className="vg-modal-close-btn" onClick={handleClose}>&times;</button>
                </div>
                
                <div className="vg-card-progress-container">
                    <div className="vg-card-progress-bar" style={{ width: `${flashcardsFinished ? 100 : progressPercent}%` }}></div>
                </div>

                {flashcardsFinished ? (
                    <div className="vg-card-container" style={{ height: '266px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="vg-flashcard-success-hero">
                            <div className="hero-emoji">🎉</div>
                            <h3>Review Completed!</h3>
                            <p>Great work reviewing your flashcards!</p>
                        </div>
                    </div>
                ) : (
                    <div 
                        className={`vg-card-container ${isFlipped ? 'is-flipped' : ''} ${isPeeking ? 'is-peeking' : ''} ${slideDirection ? `slide-${slideDirection}` : ''} ${hasClickedDontKnow ? 'clickable' : ''}`}
                        onClick={handleCardClick}
                    >
                        <div className="vg-card-inner">
                            {/* Front Side */}
                            <div className="vg-card-front">
                                <div className="vg-card-index">Card {currentDeckIndex + 1} of {deck.length}</div>
                                <div className="vg-card-top-right">
                                    <div className="vg-card-word-title">{currentItem.word}</div>
                                    {(currentItem.unit || currentItem.page_number) && (
                                        <div className="vg-card-meta">
                                            {currentItem.unit && (
                                                <span className="vg-card-unit">Unit {currentItem.unit}</span>
                                            )}
                                            {currentItem.page_number && (
                                                <div className="vg-card-page">P{currentItem.page_number}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <AnimatedWordSVG word={currentItem.word} />
                                {currentItem.ipa && currentItem.ipa !== 'none' && (
                                    <div className="vg-card-detail">
                                        <span className="vg-card-label">IPA:</span>
                                        <span className="vg-card-value font-ipa">{currentItem.ipa}</span>
                                    </div>
                                )}
                                {currentItem.syllable_type && (
                                    <div className="vg-card-detail">
                                        <span className="vg-card-label">Syllables:</span>
                                        <span className="vg-card-value">{currentItem.syllable_type}</span>
                                    </div>
                                )}
                                {currentItem.comparison && (
                                    <div className="vg-card-detail">
                                        <span className="vg-card-label">Comparison:</span>
                                        <span className="vg-card-value">{currentItem.comparison}</span>
                                    </div>
                                )}
                                {currentItem.context_sentence && (
                                    <div className="vg-card-context">
                                        <button 
                                            className={`vg-play-btn ${playingIndex === currentItem.originalIndex ? 'playing' : ''}`} 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                playAudio(currentItem.context_sentence, currentItem.originalIndex)
                                            }}
                                            disabled={playingIndex === currentItem.originalIndex}
                                        >
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                        </button>
                                        <span className="vg-sentence">"{currentItem.context_sentence}"</span>
                                    </div>
                                )}
                            </div>

                            {/* Back Side */}
                            <div className="vg-card-back">
                                <div className="vg-card-index">Card {currentDeckIndex + 1} of {deck.length}</div>
                                <div className="vg-card-top-right">
                                    <div className="vg-card-word-title">
                                        {currentItem.word}
                                        <button 
                                            className={`vg-word-play-btn ${playingIndex === currentItem.originalIndex + 20000 ? 'playing' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playAudio(currentItem.word, currentItem.originalIndex + 20000);
                                            }}
                                            title="Play word audio"
                                        >
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                    </div>
                                    {(currentItem.unit || currentItem.page_number) && (
                                        <div className="vg-card-meta">
                                            {currentItem.unit && (
                                                <span className="vg-card-unit">Unit {currentItem.unit}</span>
                                            )}
                                            {currentItem.page_number && (
                                                <div className="vg-card-page">P{currentItem.page_number}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <AnimatedWordSVG word={currentItem.word} />
                                <div className="vg-card-meaning">{currentItem.meaning}</div>
                                {(currentItem.memorization_hook || currentItem.hint) && (
                                    <div className="vg-card-hook">
                                        <span className="vg-hook-label">🧠 Hook:</span>
                                        <span className="vg-hook-text">{currentItem.memorization_hook || currentItem.hint}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className={`vg-modal-footer ${flashcardsFinished ? 'vertical' : ''}`}>
                    {flashcardsFinished ? (
                        <>
                            <button className="vg-btn-primary" onClick={initDeck}>Restart</button>
                            <button className="vg-btn-secondary" onClick={handleClose}>Exit</button>
                        </>
                    ) : (
                        <>
                            <button 
                                className="vg-btn-know" 
                                onClick={handleKnow}
                                disabled={isFlipped || hasClickedDontKnow || isNextButtonLocked}
                            >
                                Know
                            </button>
                            <button 
                                className="vg-btn-dont-know" 
                                onClick={handleDontKnow}
                                disabled={isFlipped || hasClickedDontKnow}
                            >
                                Don't Know
                            </button>
                            <button 
                                className="vg-btn-next" 
                                onClick={moveToNextCard}
                                disabled={countdown !== null || isNextButtonLocked}
                            >
                                {countdown !== null ? `Next (${countdown}s)` : 'Next'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
