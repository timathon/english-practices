import { useState, useEffect, useRef, useCallback } from 'react'
import { audioCache } from '../lib/audioCache'
import { getAudioUrl, shuffle } from '../lib/practiceAudio'
import { AnimatedWordSVG } from './VocabTraceModal'

interface VocabRecallModalProps {
    vocab: any[]
    hiddenIndices: Set<number>
    formatMeaning?: (item: any) => string
    textbook?: string
    isCf?: boolean
    onClose: () => void
}

export function VocabRecallModal({
    vocab,
    hiddenIndices,
    formatMeaning,
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

    const timerRef = useRef<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const initDeck = useCallback(() => {
        let activeDeck = vocab.filter(item => !hiddenIndices.has(item.originalIndex))
        if (activeDeck.length === 0) {
            activeDeck = [...vocab]
        }
        // Shuffle the deck for practice
        setDeck(shuffle(activeDeck))
        setCurrentIndex(0)
        setIsRevealed(false)
        setTimeLeft(10)
        setIsFinished(false)
    }, [vocab, hiddenIndices])

    useEffect(() => {
        initDeck()
    }, [initDeck])

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
                    revealCurrentWord()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [deck, currentIndex, isRevealed, isFinished, revealCurrentWord])

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

    const handleClose = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (audioRef.current) audioRef.current.pause()
        onClose()
    }

    if (deck.length === 0) return null

    const currentItem = deck[currentIndex]
    const progressPercent = ((currentIndex + 1) / deck.length) * 100
    const meaningText = formatMeaning ? formatMeaning(currentItem) : (currentItem?.meaning || '')

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
                            <div className="vg-card-index">Word {currentIndex + 1} of {deck.length}</div>
                            
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
                                    Show Now ({timeLeft}s)
                                </button>
                            ) : (
                                <button className="vg-btn-next" onClick={handleNext}>
                                    Next ➡️
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
