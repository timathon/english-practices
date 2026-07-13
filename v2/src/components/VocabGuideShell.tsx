import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './VocabGuideShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { VocabTraceModal, AnimatedWordSVG } from './VocabTraceModal'
import { shuffle } from '../lib/practiceAudio'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string, isCf?: boolean) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${isCf ? 'cf/' : ''}${hash}.mp3`;
}

export function VocabGuideShell({ data, practiceId, textbook, unit }: any) {
    const isCf = data?.tts?.by === 'melotts';
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
    const [isPeeking, setIsPeeking] = useState(false)
    const [traceList, setTraceList] = useState<any[] | null>(null)
    const [isNextButtonLocked, setIsNextButtonLocked] = useState(false)
    const [flashcardsFinished, setFlashcardsFinished] = useState(false)

    useEffect(() => {
        if (!showFlashcards) {
            setIsNextButtonLocked(false)
            return
        }
        setIsNextButtonLocked(true)
        const timer = setTimeout(() => {
            setIsNextButtonLocked(false)
        }, 2000)
        return () => clearTimeout(timer)
    }, [currentDeckIndex, showFlashcards])

    // Dictation States
    const [showDictationModal, setShowDictationModal] = useState(false)
    const [selectedChunks, setSelectedChunks] = useState<boolean[]>([])
    const [includeLearnt, setIncludeLearnt] = useState(false)
    const [shuffleWords, setShuffleWords] = useState(true)

    const [isDictating, setIsDictating] = useState(false)
    const [dictationWords, setDictationWords] = useState<any[]>([])
    const [dictationCurrentIndex, setDictationCurrentIndex] = useState(0)
    const [dictationPlayCount, setDictationPlayCount] = useState(0) // 0, 1, 2
    const [dictationState, setDictationState] = useState<'playing' | 'silence' | 'finished'>('playing')
    const [dictationIsPaused, setDictationIsPaused] = useState(false)
    const [silenceTimeLeft, setSilenceTimeLeft] = useState(0)
    const [pausesLeft, setPausesLeft] = useState(0)

    const dictationTimerRef = useRef<any>(null)
    const dictationAudioRef = useRef<HTMLAudioElement | null>(null)

    const chunks: any[][] = []
    for (let i = 0; i < vocab.length; i += 10) {
        chunks.push(vocab.slice(i, i + 10))
    }

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
                audioCache.preloadAndSync(getAudioUrl(item.context_sentence, textbook, isCf))
            }
            if (item.word && textbook) {
                audioCache.preloadAndSync(getAudioUrl(item.word, textbook, isCf))
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
    }, [data, practiceId, textbook, unitKey, isCf])

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
                const url = getAudioUrl(item.context_sentence, textbook, isCf)
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

    const playDictationWord = (wordText: string): Promise<void> => {
        return new Promise(async (resolve) => {
            const url = getAudioUrl(wordText, textbook || '', isCf)
            try {
                const blob = await audioCache.cacheAudio(url)
                if (!blob) {
                    resolve()
                    return
                }
                const blobUrl = URL.createObjectURL(blob)
                const audio = new Audio(blobUrl)
                dictationAudioRef.current = audio
                
                audio.onended = () => {
                    URL.revokeObjectURL(blobUrl)
                    dictationAudioRef.current = null
                    resolve()
                }
                audio.onerror = () => {
                    URL.revokeObjectURL(blobUrl)
                    dictationAudioRef.current = null
                    resolve()
                }
                
                audio.play().catch(err => {
                    console.error("Audio play failed:", err)
                    resolve()
                })
            } catch (e) {
                console.error("Dictation audio cache failed:", e)
                resolve()
            }
        })
    }

    const stopDictation = () => {
        setIsDictating(false)
        setDictationState('playing')
        setDictationCurrentIndex(0)
        setDictationPlayCount(0)
        setSilenceTimeLeft(0)
        setDictationIsPaused(false)
        if (dictationTimerRef.current) {
            clearTimeout(dictationTimerRef.current)
            dictationTimerRef.current = null
        }
        if (dictationAudioRef.current) {
            dictationAudioRef.current.pause()
            dictationAudioRef.current = null
        }
    }

    const openDictationSetup = () => {
        setSelectedChunks(new Array(chunks.length).fill(false))
        setIncludeLearnt(false)
        setShuffleWords(true)
        setShowDictationModal(true)
    }

    const getEligibleWords = () => {
        let list: any[] = []
        chunks.forEach((chunk, idx) => {
            if (selectedChunks[idx]) {
                chunk.forEach(wordItem => {
                    const isHidden = hiddenIndices.has(wordItem.originalIndex)
                    if (includeLearnt || !isHidden) {
                        list.push(wordItem)
                    }
                })
            }
        })
        return list
    }

    const startDictation = () => {
        const eligible = getEligibleWords()
        if (eligible.length === 0) {
            alert("No words match the selected criteria.")
            return
        }
        
        let finalWords = [...eligible]
        if (shuffleWords) {
            finalWords = shuffle(finalWords)
        }
        
        setDictationWords(finalWords)
        setDictationCurrentIndex(0)
        setDictationPlayCount(0)
        setDictationState('playing')
        setDictationIsPaused(false)
        setPausesLeft(Math.ceil(finalWords.length / 5))
        setIsDictating(true)
        setShowDictationModal(false)
    }

    const togglePauseDictation = () => {
        const nextPaused = !dictationIsPaused
        if (nextPaused) {
            if (pausesLeft <= 0) return
            setPausesLeft(prev => prev - 1)
        }
        setDictationIsPaused(nextPaused)
        if (nextPaused) {
            if (dictationAudioRef.current) {
                dictationAudioRef.current.pause()
            }
        } else {
            if (dictationAudioRef.current) {
                dictationAudioRef.current.play().catch(console.error)
            }
        }
    }

    const handleNextWord = () => {
        if (dictationAudioRef.current) {
            dictationAudioRef.current.pause()
            dictationAudioRef.current = null
        }
        if (dictationTimerRef.current) {
            clearTimeout(dictationTimerRef.current)
            dictationTimerRef.current = null
        }
        setDictationPlayCount(0)
        setDictationState('playing')
        setDictationCurrentIndex(prev => prev + 1)
    }

    // Effect for the dictation player loop (playing audio)
    useEffect(() => {
        if (!isDictating || dictationIsPaused || dictationState === 'finished') {
            return
        }

        // Check if finished
        if (dictationCurrentIndex >= dictationWords.length) {
            setDictationState('finished')
            // Play correct sound
            ;(async () => {
                const correctUrl = `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
                try {
                    const blob = await audioCache.cacheAudio(correctUrl)
                    if (blob) {
                        const audio = new Audio(URL.createObjectURL(blob))
                        audio.play().catch(console.error)
                    }
                } catch(e) {
                    console.error(e)
                }
            })()
            return
        }

        const currentItem = dictationWords[dictationCurrentIndex]
        const currentWord = currentItem?.word
        const currentSentence = currentItem?.context_sentence || currentWord
        const textToPlay = dictationPlayCount < 2 ? currentWord : currentSentence

        if (dictationState === 'playing') {
            if (dictationPlayCount < 3) {
                let active = true
                playDictationWord(textToPlay).then(() => {
                    if (!active) return
                    // Wait 1 second before the next state update
                    dictationTimerRef.current = setTimeout(() => {
                        setDictationPlayCount(prev => prev + 1)
                    }, 1000)
                })
                return () => {
                    active = false
                    if (dictationTimerRef.current) clearTimeout(dictationTimerRef.current)
                }
            } else {
                // Transition to silence
                const silenceDuration = Math.max(3, Math.min(8, Math.round(currentWord.length * 0.4)))
                setSilenceTimeLeft(silenceDuration)
                setDictationState('silence')
            }
        }
    }, [isDictating, dictationIsPaused, dictationState, dictationCurrentIndex, dictationPlayCount, dictationWords])

    // Effect for the silence countdown
    useEffect(() => {
        if (!isDictating || dictationIsPaused || dictationState !== 'silence') {
            return
        }

        if (silenceTimeLeft > 0) {
            const timer = setTimeout(() => {
                setSilenceTimeLeft(prev => prev - 1)
            }, 1000)
            return () => clearTimeout(timer)
        } else {
            setDictationPlayCount(0)
            setDictationState('playing')
            setDictationCurrentIndex(prev => prev + 1)
        }
    }, [isDictating, dictationIsPaused, dictationState, silenceTimeLeft])

    // Enter keyboard control for start/restart dictation
    useEffect(() => {
        const handleEnterKey = (e: KeyboardEvent) => {
            if (e.code !== 'Enter' && e.code !== 'NumpadEnter') {
                return
            }

            const activeElement = document.activeElement
            if (activeElement && (
                activeElement.tagName === 'TEXTAREA' ||
                (activeElement.tagName === 'INPUT' && (activeElement as HTMLInputElement).type !== 'checkbox')
            )) {
                return
            }

            if (showDictationModal) {
                if (selectedChunks.some(Boolean)) {
                    e.preventDefault()
                    startDictation()
                }
            } else if (isDictating && dictationState === 'finished') {
                e.preventDefault()
                startDictation()
            }
        }

        window.addEventListener('keydown', handleEnterKey)
        return () => {
            window.removeEventListener('keydown', handleEnterKey)
        }
    }, [showDictationModal, selectedChunks, isDictating, dictationState, startDictation])

    // Keyboard controls for dictation
    useEffect(() => {
        if (!isDictating || dictationState === 'finished') {
            return
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement
            if (activeElement && (
                activeElement.tagName === 'TEXTAREA' ||
                (activeElement.tagName === 'INPUT' && (activeElement as HTMLInputElement).type !== 'checkbox')
            )) {
                return
            }

            if (e.code === 'Space') {
                e.preventDefault()
                if (dictationIsPaused || pausesLeft > 0) {
                    togglePauseDictation()
                }
            } else if (e.code === 'ArrowRight') {
                e.preventDefault()
                if (dictationState !== 'playing') {
                    handleNextWord()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isDictating, dictationState, togglePauseDictation, handleNextWord, dictationIsPaused, pausesLeft])

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
        setFlashcardsFinished(false)
        setShowFlashcards(true)
    }

    const closeFlashcards = () => {
        setShowFlashcards(false)
        setFlashcardsFinished(false)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        if (knowCooldownIntervalRef.current) {
            clearInterval(knowCooldownIntervalRef.current)
            knowCooldownIntervalRef.current = null
        }
        clearPeekTimeouts()
    }

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
                    // Play correct sound
                    ;(async () => {
                        const correctUrl = `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
                        try {
                            const blob = await audioCache.cacheAudio(correctUrl)
                            if (blob) {
                                const audio = new Audio(URL.createObjectURL(blob))
                                audio.play().catch(console.error)
                            }
                        } catch(e) {
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

    const handlePrint = () => {
        const showChinese = window.confirm("是否在打印的词汇手册中包含中文释义？\n(确定: 包含中文 | 取消: 隐藏中文)");
        setHideCN(!showChinese);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })

    const shownCount = vocab.length - hiddenIndices.size
    const progressPercent = deck.length > 0 ? ((currentDeckIndex + 1) / deck.length) * 100 : 0

    return (
        <div className="vg-shell" ref={shellRef}>
            <table className="vg-print-table">
                <thead className="vg-print-header-group">
                    <tr>
                        <td>
                            <header className="vg-header-main">
                                <div className="vg-header-top">
                                    <Link to="/dashboard" state={{ textbook, unit }} className="vg-back-btn">🏠</Link>
                                    <h1>Vocabulary Guide</h1>
                                </div>
                                <h2>{data.level}</h2>
                                <span className="vg-print-page-num"></span>
                            </header>
                        </td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div className="vg-stats-bar-wrapper">
                                <div className="vg-stats-bar">
                                    <span>Total: <b>{vocab.length}</b> | Shown: <b>{shownCount}</b> | Hidden: <b>{hiddenIndices.size}</b></span>
                                    <div className="vg-stats-buttons">
                                        <button className="vg-play-cards-btn" onClick={openFlashcards} title="Start Flashcards">▶️</button>
                                        <button className="vg-dictation-btn" onClick={openDictationSetup} title="Start Dictation">✍️</button>
                                    </div>
                                </div>
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
                                <button id="print-btn" onClick={handlePrint} className="vg-control-btn">
                                    <span>Print 🖨️</span>
                                </button>
                            </div>

                            <div className="vg-grid">
                                {vocab.map((item) => {
                                    const isHidden = hiddenIndices.has(item.originalIndex)
                                    if (isHidden && !showHiddenMode && !tempShowAll) return null

                                    return (
                                        <div key={item.originalIndex} className={`vg-item ${isHidden ? 'is-hidden' : ''}`}>
                                            <div className="vg-item-watermark">{item.originalIndex + 1}</div>
                                            <div className="vg-word-header">
                                                <h2 className="vg-word-title">
                                                    <span className="vg-word-num">{item.originalIndex + 1}. </span>
                                                    <span 
                                                        className="vg-word-text" 
                                                        onClick={() => setTraceList([item])}
                                                        title="Click to see stroke order"
                                                    >
                                                        {item.word}
                                                    </span>
                                                    <span className="vg-ipa-container">
                                                        {item.ipa && item.ipa !== 'none' && <span className="vg-ipa">{item.ipa}</span>}
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
                        </td>
                    </tr>
                </tbody>
            </table>

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
                <button onClick={handlePrint} className="vg-mobile-btn">
                    <span>🖨️</span>
                    <small>Print</small>
                </button>
                <button onClick={resetHidden} className="vg-mobile-btn danger">
                    <span>🧹</span>
                    <small>Reset</small>
                </button>
            </div>

            {showFlashcards && deck.length > 0 && (
                <div className="vg-modal-backdrop" onClick={(e) => e.stopPropagation()}>
                    <div className="vg-flashcard-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vg-card-header">
                            <span className="vg-card-header-title">Vocabulary Flashcards</span>
                            <button className="vg-modal-close-btn" onClick={closeFlashcards}>&times;</button>
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
                                            <div className="vg-card-word-title">{deck[currentDeckIndex].word}</div>
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
                                        <AnimatedWordSVG word={deck[currentDeckIndex].word} />
                                        {deck[currentDeckIndex].ipa && deck[currentDeckIndex].ipa !== 'none' && (
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
                                    </div>

                                    {/* Back Side */}
                                    <div className="vg-card-back">
                                        <div className="vg-card-index">Card {currentDeckIndex + 1} of {deck.length}</div>
                                        <div className="vg-card-top-right">
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
                                        <AnimatedWordSVG word={deck[currentDeckIndex].word} />
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
                        )}

                        <div className={`vg-modal-footer ${flashcardsFinished ? 'vertical' : ''}`}>
                            {flashcardsFinished ? (
                                <>
                                    <button className="vg-btn-primary" onClick={openFlashcards}>Restart</button>
                                    <button className="vg-btn-secondary" onClick={closeFlashcards}>Exit</button>
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
            )}

            {traceList && traceList.length > 0 && (
                <VocabTraceModal
                    vocabList={traceList}
                    startIndex={0}
                    onClose={() => setTraceList(null)}
                />
            )}

            {/* Dictation Setup Modal */}
            {showDictationModal && (
                <div className="vg-modal-backdrop" onClick={(e) => e.stopPropagation()}>
                    <div className="vg-dictation-setup-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vg-card-header">
                            <span className="vg-card-header-title">✍️ Dictation Settings</span>
                            <button className="vg-modal-close-btn" onClick={() => setShowDictationModal(false)}>&times;</button>
                        </div>
                        
                        <div className="vg-modal-body">
                            <div className="vg-modal-section">
                                <label className="vg-modal-section-title">Select Word Groups (Total: <span key={getEligibleWords().length} className="vg-dictation-pop-number">{getEligibleWords().length}</span> words):</label>
                                <div className="vg-dictation-groups-grid">
                                    {chunks.map((_, idx) => {
                                        const start = idx * 10 + 1
                                        const end = Math.min((idx + 1) * 10, vocab.length)
                                        return (
                                            <label key={idx} className="vg-dictation-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedChunks[idx] || false}
                                                    onChange={(e) => {
                                                        const copy = [...selectedChunks]
                                                        copy[idx] = e.target.checked
                                                        setSelectedChunks(copy)
                                                    }}
                                                />
                                                <span>Words {start} - {end}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                                <div className="vg-modal-actions-small">
                                    <button type="button" className="vg-btn-secondary-sm" onClick={() => setSelectedChunks(new Array(chunks.length).fill(true))}>Select All</button>
                                    <button type="button" className="vg-btn-secondary-sm" onClick={() => setSelectedChunks(new Array(chunks.length).fill(false))}>Deselect All</button>
                                </div>
                            </div>

                            <div className="vg-modal-section settings-options">
                                <label className="vg-dictation-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={includeLearnt}
                                        onChange={(e) => setIncludeLearnt(e.target.checked)}
                                    />
                                    <span>Include learnt/hidden words</span>
                                </label>
                                <label className="vg-dictation-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={shuffleWords}
                                        onChange={(e) => setShuffleWords(e.target.checked)}
                                    />
                                    <span>Shuffle word order</span>
                                </label>
                            </div>
                        </div>

                        <div className="vg-modal-footer">
                            <button 
                                type="button" 
                                className="vg-btn-primary" 
                                onClick={startDictation}
                                disabled={!selectedChunks.some(Boolean)}
                            >
                                Start
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Dictation View */}
            {isDictating && (
                <div className="vg-modal-backdrop" onClick={(e) => e.stopPropagation()}>
                    <div className="vg-dictation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vg-card-header">
                            <span className="vg-card-header-title">✍️ Dictation in Progress</span>
                            <button 
                                className="vg-modal-close-btn" 
                                onClick={() => {
                                    if (dictationState === 'finished' || window.confirm("Are you sure you want to exit dictation?")) {
                                        stopDictation()
                                    }
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {dictationState !== 'finished' ? (() => {
                            const currentWord = dictationWords[dictationCurrentIndex]?.word || ''
                            const silenceDuration = Math.max(3, Math.min(8, Math.round(currentWord.length * 0.4)))
                            const displayTime = dictationState === 'playing' ? silenceDuration : silenceTimeLeft
                            return (
                                <>
                                    <div className="vg-dictation-progress-container">
                                        <div className="vg-dictation-progress-bar" style={{ width: `${((dictationCurrentIndex) / dictationWords.length) * 100}%` }}></div>
                                    </div>

                                    <div className="vg-dictation-body">
                                        <div className="vg-dictation-stats">
                                            Word <b>{dictationCurrentIndex + 1}</b> of <b>{dictationWords.length}</b>
                                        </div>

                                        <div className="vg-dictation-card">
                                            <div className="vg-dictation-wave-animation">
                                                <span></span><span></span><span></span><span></span>
                                            </div>
                                            <div className="status-text">
                                                🔊 Reading Word...
                                            </div>
                                            <div className="vg-dictation-bottom-area">
                                                <div className={`vg-dictation-countdown-small ${dictationState === 'playing' ? 'blurred' : ''}`}>
                                                    {displayTime}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="vg-modal-footer">
                                        <button 
                                            className="vg-btn-pause" 
                                            onClick={togglePauseDictation}
                                            disabled={pausesLeft === 0 && !dictationIsPaused}
                                        >
                                            {dictationIsPaused ? '▶️ Resume' : `⏸️ Pause x${pausesLeft}`}
                                        </button>
                                        <button 
                                            className="vg-btn-next-dictation" 
                                            onClick={handleNextWord}
                                            disabled={dictationState === 'playing'}
                                        >
                                            Next ➡️
                                        </button>
                                    </div>
                                </>
                            )
                        })() : (
                            // Finished Results view
                            <div className="vg-dictation-results-body">
                                <div className="vg-dictation-success-hero">
                                    <div className="hero-emoji">🎉</div>
                                    <h3>Dictation Finished!</h3>
                                    <p>Please check your spelling against the list below:</p>
                                </div>

                                <div className="vg-dictation-results-list">
                                    {dictationWords.map((item, idx) => (
                                        <div key={idx} className="vg-dictation-result-item">
                                            <span className="result-num">{idx + 1}.</span>
                                            <div className="result-detail">
                                                <span className="result-word">{item.word}</span>
                                                {item.ipa && <span className="result-ipa">{item.ipa}</span>}
                                                <span className="result-meaning">{item.meaning}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="vg-modal-footer">
                                    <button className="vg-btn-primary" onClick={startDictation}>Restart</button>
                                    <button className="vg-btn-secondary" onClick={stopDictation}>Close</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
