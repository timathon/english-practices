import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './VocabGuideShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

export function VocabGuideShell({ data, practiceId, textbook, unit }: any) {
    const [vocab, setVocab] = useState<any[]>([])
    const [isAlphabetical, setIsAlphabetical] = useState(false)
    const [hideCN, setHideCN] = useState(true)
    const [showHiddenMode, setShowHiddenMode] = useState(false)
    const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
    const [forceShowCN, setForceShowCN] = useState<Set<number>>(new Set())
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [playingIndex, setPlayingIndex] = useState<number | null>(null)
    const [tempShowAll, setTempShowAll] = useState(true)

    // Flashcard States
    const [showFlashcards, setShowFlashcards] = useState(false)
    const [deck, setDeck] = useState<any[]>([])
    const [currentDeckIndex, setCurrentDeckIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [countdown, setCountdown] = useState<number | null>(null)
    const [slideDirection, setSlideDirection] = useState<'next' | null>(null)
    const [hasClickedDontKnow, setHasClickedDontKnow] = useState(false)
    const [knowCooldownSecs, setKnowCooldownSecs] = useState(0)
    const [isPeeking, setIsPeeking] = useState(false)

    const timerRef = useRef<any>(null)
    const knowCooldownIntervalRef = useRef<any>(null)
    const peekTimeout1Ref = useRef<any>(null)
    const peekTimeout2Ref = useRef<any>(null)
    const peekResetTimeoutRef = useRef<any>(null)
    const shellRef = useRef<HTMLDivElement>(null)
    const unitKey = `ep-vg-hidden-${practiceId}`

    const clearPeekTimeouts = () => {
        if (peekTimeout1Ref.current) clearTimeout(peekTimeout1Ref.current)
        if (peekTimeout2Ref.current) clearTimeout(peekTimeout2Ref.current)
        if (peekResetTimeoutRef.current) clearTimeout(peekResetTimeoutRef.current)
        peekTimeout1Ref.current = null
        peekTimeout2Ref.current = null
        peekResetTimeoutRef.current = null
        setIsPeeking(false)
    }

    useEffect(() => {
        const originalStyle = {
            maxWidth: document.body.style.maxWidth,
            margin: document.body.style.margin,
            background: document.body.style.background,
            fontSize: document.body.style.fontSize,
            lineHeight: document.body.style.lineHeight,
            color: document.body.style.color,
            position: document.body.style.position,
            padding: document.body.style.padding,
            boxSizing: document.body.style.boxSizing
        }

        document.body.style.maxWidth = '800px'
        document.body.style.margin = '0 auto'
        document.body.style.background = '#fff'
        document.body.style.fontSize = '14px'
        document.body.style.lineHeight = '1.5'
        document.body.style.color = '#333'
        document.body.style.position = 'relative'
        document.body.style.padding = '15px'
        document.body.style.boxSizing = 'border-box'
        document.body.classList.add('vg-active')
        
        const initialVocab = data.unit_vocabulary.map((v: any, i: number) => ({ ...v, originalIndex: i }))
        setVocab(initialVocab)

        initialVocab.forEach((item: any) => {
            if (item.context_sentence && textbook) {
                audioCache.preloadAndSync(getAudioUrl(item.context_sentence, textbook))
            }
            if (item.word && textbook) {
                audioCache.preloadAndSync(getAudioUrl(item.word, textbook))
            }
        })

        const stored = localStorage.getItem(unitKey)
        if (stored) {
            try {
                setHiddenIndices(new Set(JSON.parse(stored)))
            } catch (e) { console.error(e) }
        }

        return () => {
            Object.assign(document.body.style, originalStyle)
            document.body.classList.remove('vg-active')
            if (knowCooldownIntervalRef.current) {
                clearInterval(knowCooldownIntervalRef.current)
            }
            clearPeekTimeouts()
        }
    }, [data, practiceId, textbook, unitKey])

    useEffect(() => {
        setTempShowAll(true)
        const timer = setTimeout(() => {
            setTempShowAll(false)
        }, 3000)
        return () => clearTimeout(timer)
    }, [practiceId])

    useEffect(() => {
        if (showFlashcards && deck.length > 0 && deck[currentDeckIndex]) {
            const currentItem = deck[currentDeckIndex]
            if (currentItem.context_sentence) {
                const timer = setTimeout(() => {
                    playAudio(currentItem.context_sentence, currentItem.originalIndex)
                }, 300)
                return () => clearTimeout(timer)
            }
        }
    }, [showFlashcards, currentDeckIndex, deck])

    const toggleSort = () => {
        const nextSort = !isAlphabetical
        setIsAlphabetical(nextSort)
        const sorted = [...vocab].sort((a, b) => {
            if (nextSort) return a.word.localeCompare(b.word)
            return a.originalIndex - b.originalIndex
        })
        setVocab(sorted)
    }

    const toggleWordHidden = (index: number) => {
        const next = new Set(hiddenIndices)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        setHiddenIndices(next)
        localStorage.setItem(unitKey, JSON.stringify(Array.from(next)))
    }

    const resetHidden = () => {
        if (window.confirm("Are you sure you want to reset all hidden words?")) {
            setHiddenIndices(new Set())
            localStorage.removeItem(unitKey)
        }
    }

    const refreshCache = async () => {
        if (isRefreshing) return
        setIsRefreshing(true)
        let updatedCount = 0
        try {
            for (const item of vocab) {
                if (!item.context_sentence || !textbook) continue
                const url = getAudioUrl(item.context_sentence, textbook)
                const baseUrl = url.split('?')[0]
                const baseHash = md5(baseUrl)
                const cacheKey = "ep-audio-" + baseHash
                const cached = await audioCache.get(cacheKey)
                const currentVersion = cached?.meta?.lastModified || 0

                try {
                    const headUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
                    const response = await fetch(headUrl, { method: 'HEAD' })
                    const lastModifiedStr = response.headers.get('Last-Modified')
                    if (lastModifiedStr) {
                        const lastModified = new Date(lastModifiedStr).getTime()
                        if (lastModified > currentVersion) {
                            await audioCache.cacheAudio(url, true)
                            updatedCount++
                        }
                    }
                } catch (e) {
                    console.error(`Failed to check ${item.word}`, e)
                }
            }
            alert(`Refresh complete. Updated ${updatedCount} audio files.`)
        } finally {
            setIsRefreshing(false)
        }
    }

    const playAudio = async (sentence: string, index: number) => {
        if (!textbook) return
        setPlayingIndex(index)
        const url = getAudioUrl(sentence, textbook)
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

    const openFlashcards = () => {
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
        setShowFlashcards(true)
    }

    const closeFlashcards = () => {
        setShowFlashcards(false)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        if (knowCooldownIntervalRef.current) {
            clearInterval(knowCooldownIntervalRef.current)
            knowCooldownIntervalRef.current = null
        }
        clearPeekTimeouts()
        setKnowCooldownSecs(0)
    }

    const moveToNextCard = () => {
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
                    alert("Review completed! Great work!")
                    setShowFlashcards(false)
                    setSlideDirection(null)
                    return prev
                }
            })
        }, 300)
    }

    const handleKnow = () => {
        if (deck.length === 0 || knowCooldownSecs > 0) return
        setKnowCooldownSecs(3)
        if (knowCooldownIntervalRef.current) {
            clearInterval(knowCooldownIntervalRef.current)
        }
        let secondsLeft = 3
        knowCooldownIntervalRef.current = setInterval(() => {
            secondsLeft -= 1
            if (secondsLeft <= 0) {
                clearInterval(knowCooldownIntervalRef.current)
                knowCooldownIntervalRef.current = null
                setKnowCooldownSecs(0)
            } else {
                setKnowCooldownSecs(secondsLeft)
            }
        }, 1000)

        const item = deck[currentDeckIndex]
        if (!hiddenIndices.has(item.originalIndex)) {
            const next = new Set(hiddenIndices)
            next.add(item.originalIndex)
            setHiddenIndices(next)
            localStorage.setItem(unitKey, JSON.stringify(Array.from(next)))
        }
        moveToNextCard()
    }

    const handleDontKnow = () => {
        if (deck.length === 0) return
        setIsFlipped(true)
        setCountdown(5)
        setHasClickedDontKnow(true)
        clearPeekTimeouts()

        // Play word audio when user clicks "Don't know"
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

        // First peek after 1s
        peekTimeout1Ref.current = setTimeout(() => {
            setIsPeeking(true)
            peekResetTimeoutRef.current = setTimeout(() => {
                setIsPeeking(false)
            }, 400)
        }, 1000)

        // Second peek after 4s
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

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })

    const shownCount = vocab.length - hiddenIndices.size
    const progressPercent = deck.length > 0 ? ((currentDeckIndex + 1) / deck.length) * 100 : 0

    return (
        <div className="vg-shell" ref={shellRef}>
            <header className="vg-header-main">
                <div className="vg-header-top">
                    <Link to="/dashboard" state={{ textbook, unit }} className="vg-back-btn">🏠</Link>
                    <h1>Vocabulary Guide</h1>
                </div>
                <h2>{data.level}</h2>
            </header>

            <div className="vg-stats-bar">
                <span>Total: <b>{vocab.length}</b> | Shown: <b>{shownCount}</b> | Hidden: <b>{hiddenIndices.size}</b></span>
                <button className="vg-play-cards-btn" onClick={openFlashcards} title="Start Flashcards">▶️ Play</button>
            </div>

            <div className="vg-controls-container desktop-only">
                <button id="sort-toggle" onClick={toggleSort} className="vg-control-btn">
                    <span>{isAlphabetical ? 'Textbook Order' : 'Sort A-Z'}</span>
                </button>
                <button id="toggle-cn" onClick={() => setHideCN(!hideCN)} className="vg-control-btn">
                    <span>{hideCN ? 'Show CN' : 'Hide CN'}</span>
                </button>
                <button id="show-hidden-toggle" onClick={() => setShowHiddenMode(!showHiddenMode)} className={`vg-control-btn ${showHiddenMode ? 'active' : ''}`}>
                    <span>{showHiddenMode ? 'Hide Learnt' : 'Show Hidden'}</span>
                </button>
                <button id="reset-hidden" onClick={resetHidden} className="vg-control-btn">
                    <span>Reset Hidden</span>
                </button>
                <button id="refresh-cache" onClick={refreshCache} className={`vg-control-btn ${isRefreshing ? 'loading' : ''}`}>
                    <span>{isRefreshing ? 'Checking...' : 'Refresh 🔊'}</span>
                </button>
            </div>

            <div className="vg-grid">
                {vocab.map((item) => {
                    const isHidden = hiddenIndices.has(item.originalIndex)
                    if (isHidden && !showHiddenMode && !tempShowAll) return null

                    return (
                        <div key={item.originalIndex} className={`vg-item ${isHidden ? 'is-hidden' : ''}`}>
                            <div className="vg-word-header">
                                <h2 className="vg-word-title">
                                    {item.originalIndex + 1}. {item.word}
                                    <span className="vg-ipa-container">
                                        {item.ipa && <span className="vg-ipa">{item.ipa}</span>}
                                        <button 
                                            className={`vg-word-play-btn ${playingIndex === item.originalIndex + 10000 ? 'playing' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playAudio(item.word, item.originalIndex + 10000);
                                            }}
                                            title="Play word audio"
                                        >
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                    </span>
                                </h2>
                                <div className="vg-item-actions">
                                    {item.unit && <span className="vg-unit">Unit {item.unit}</span>}
                                    {item.page_number && <span className="vg-page">P{item.page_number}</span>}
                                    <input 
                                        type="checkbox" 
                                        checked={isHidden} 
                                        onChange={() => toggleWordHidden(item.originalIndex)}
                                        title="Mark as Learnt"
                                    />
                                </div>
                            </div>

                            <div className="vg-details" onClick={() => {
                                const next = new Set(forceShowCN)
                                if (next.has(item.originalIndex)) next.delete(item.originalIndex)
                                else next.add(item.originalIndex)
                                setForceShowCN(next)
                            }}>
                                <span className="vg-label">🇨🇳 中文释义:</span>
                                <span className="vg-value">
                                    {(!hideCN || forceShowCN.has(item.originalIndex)) ? item.meaning : <span className="vg-placeholder">Click to show</span>}
                                </span>
                            </div>

                            <div className="vg-details">
                                <span className="vg-label">🎵 音节类型:</span>
                                <span className="vg-value">{item.syllable_type}</span>
                            </div>

                            <div className="vg-details">
                                <span className="vg-label">🔍 易混辨析:</span>
                                <span className="vg-value">{item.comparison}</span>
                            </div>

                            <div className="vg-context">
                                <button 
                                    className={`vg-play-btn ${playingIndex === item.originalIndex ? 'playing' : ''}`} 
                                    onClick={() => playAudio(item.context_sentence, item.originalIndex)}
                                    disabled={playingIndex === item.originalIndex}
                                >
                                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                </button>
                                <span className="vg-sentence">"{item.context_sentence}"</span>
                            </div>

                            <div className="vg-hook">
                                <span className="vg-hook-label">🧠 核心记忆法:</span>
                                {item.memorization_hook || item.hint}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="vg-scroll-btns">
                <button className="vg-scroll-btn" onClick={scrollToTop}>▲</button>
                <button className="vg-scroll-btn" onClick={scrollToBottom}>▼</button>
            </div>

            <div className="vg-mobile-nav mobile-only">
                <button onClick={toggleSort} className="vg-mobile-btn">
                    <span>{isAlphabetical ? '📖' : '🔤'}</span>
                    <small>Sort</small>
                </button>
                <button onClick={() => setHideCN(!hideCN)} className="vg-mobile-btn">
                    <span>{hideCN ? '㊙️' : '👁️'}</span>
                    <small>{hideCN ? 'Show CN' : 'Hide CN'}</small>
                </button>
                <button onClick={() => setShowHiddenMode(!showHiddenMode)} className={`vg-mobile-btn ${showHiddenMode ? 'active' : ''}`}>
                    <span>{showHiddenMode ? '🙈' : '👁️'}</span>
                    <small>Hidden</small>
                </button>
                <button onClick={refreshCache} className="vg-mobile-btn">
                    <span>🔄</span>
                    <small>Refresh</small>
                </button>
                <button onClick={resetHidden} className="vg-mobile-btn danger">
                    <span>🧹</span>
                    <small>Reset</small>
                </button>
            </div>

            {showFlashcards && deck.length > 0 && (
                <div className="vg-modal-backdrop" onClick={closeFlashcards}>
                    <div className="vg-flashcard-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vg-card-header">
                            <span className="vg-card-header-title">Vocabulary Flashcards</span>
                            <button className="vg-modal-close-btn" onClick={closeFlashcards}>&times;</button>
                        </div>

                        <div className="vg-card-progress-container">
                            <div className="vg-card-progress-bar" style={{ width: `${progressPercent}%` }}></div>
                        </div>

                        <div 
                            className={`vg-card-container ${isFlipped ? 'is-flipped' : ''} ${isPeeking ? 'is-peeking' : ''} ${slideDirection ? `slide-${slideDirection}` : ''} ${hasClickedDontKnow ? 'clickable' : ''}`}
                            onClick={handleCardClick}
                        >
                            <div className="vg-card-inner">
                                {/* Front Side */}
                                <div className="vg-card-front">
                                    <div className="vg-card-index">Card {currentDeckIndex + 1} of {deck.length}</div>
                                    <div className="vg-card-word-title">{deck[currentDeckIndex].word}</div>
                                    {deck[currentDeckIndex].ipa && (
                                        <div className="vg-card-detail">
                                            <span className="vg-card-label">IPA:</span>
                                            <span className="vg-card-value font-ipa">{deck[currentDeckIndex].ipa}</span>
                                        </div>
                                    )}
                                    {deck[currentDeckIndex].syllable_type && (
                                        <div className="vg-card-detail">
                                            <span className="vg-card-label">Syllables:</span>
                                            <span className="vg-card-value">{deck[currentDeckIndex].syllable_type}</span>
                                        </div>
                                    )}
                                    {deck[currentDeckIndex].comparison && (
                                        <div className="vg-card-detail">
                                            <span className="vg-card-label">Comparison:</span>
                                            <span className="vg-card-value">{deck[currentDeckIndex].comparison}</span>
                                        </div>
                                    )}
                                    {deck[currentDeckIndex].context_sentence && (
                                        <div className="vg-card-context">
                                            <button 
                                                className={`vg-play-btn ${playingIndex === deck[currentDeckIndex].originalIndex ? 'playing' : ''}`} 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    playAudio(deck[currentDeckIndex].context_sentence, deck[currentDeckIndex].originalIndex)
                                                }}
                                                disabled={playingIndex === deck[currentDeckIndex].originalIndex}
                                            >
                                                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                            </button>
                                            <span className="vg-sentence">"{deck[currentDeckIndex].context_sentence}"</span>
                                        </div>
                                    )}
                                    {(deck[currentDeckIndex].unit || deck[currentDeckIndex].page_number) && (
                                        <div className="vg-card-meta">
                                            {deck[currentDeckIndex].unit && (
                                                <span className="vg-card-unit">Unit {deck[currentDeckIndex].unit}</span>
                                            )}
                                            {deck[currentDeckIndex].page_number && (
                                                <div className="vg-card-page">P{deck[currentDeckIndex].page_number}</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Back Side */}
                                <div className="vg-card-back">
                                    <div className="vg-card-index">Card {currentDeckIndex + 1} of {deck.length}</div>
                                    <div className="vg-card-word-title">
                                        {deck[currentDeckIndex].word}
                                        <button 
                                            className={`vg-word-play-btn ${playingIndex === deck[currentDeckIndex].originalIndex + 20000 ? 'playing' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playAudio(deck[currentDeckIndex].word, deck[currentDeckIndex].originalIndex + 20000);
                                            }}
                                            title="Play word audio"
                                        >
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </button>
                                    </div>
                                    <div className="vg-card-meaning">{deck[currentDeckIndex].meaning}</div>
                                    {(deck[currentDeckIndex].memorization_hook || deck[currentDeckIndex].hint) && (
                                        <div className="vg-card-hook">
                                            <span className="vg-hook-label">🧠 Hook:</span>
                                            <span className="vg-hook-text">{deck[currentDeckIndex].memorization_hook || deck[currentDeckIndex].hint}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="vg-modal-footer">
                            <button 
                                className="vg-btn-know" 
                                onClick={handleKnow}
                                disabled={isFlipped || knowCooldownSecs > 0 || hasClickedDontKnow}
                            >
                                {knowCooldownSecs > 0 ? `Know (${knowCooldownSecs}s)` : 'Know'}
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
                                disabled={countdown !== null}
                            >
                                {countdown !== null ? `Next (${countdown}s)` : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
