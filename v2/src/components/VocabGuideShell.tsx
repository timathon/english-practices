import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './VocabGuideShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { getAudioUrl } from '../lib/practiceAudio'
import { VocabTraceModal } from './VocabTraceModal'
import { VocabFlashcardModal } from './VocabFlashcardModal'
import { VocabDictationModal } from './VocabDictationModal'
import { VocabRecallModal } from './VocabRecallModal'
import { VocabStoryPromptModal } from './VocabStoryPromptModal'

function formatMeaning(item: any): string {
    if (!item || !item.meaning) return ''
    const meaning = String(item.meaning)
    const isPhrase = item.syllable_type === 'phrase' || (typeof item.word === 'string' && item.word.trim().includes(' '))
    if (isPhrase) {
        if (/^phr\.\s*/i.test(meaning)) {
            return meaning
        }
        if (/^phrase\b\s*/i.test(meaning)) {
            return meaning.replace(/^phrase\b\s*/i, 'phr. ')
        }
        // If it starts with a standard single-word POS prefix like "v. ", "n. ", "adj. ", etc., replace with "phr. "
        const posRegex = /^([a-zA-Z]+\.\s*(?:&|and)?\s*[a-zA-Z]*\.?\s*)/i
        if (posRegex.test(meaning)) {
            return meaning.replace(posRegex, 'phr. ')
        }
        return `phr. ${meaning}`
    }
    return meaning
}

export function VocabGuideShell({ data, practiceId, textbook, unit }: any) {
    const isCf = data?.tts?.by === 'melotts';
    const [vocab, setVocab] = useState<any[]>([])
    const [sortMode, setSortMode] = useState<'default' | 'alpha' | 'difficulty'>('default')
    const [hideCN, setHideCN] = useState(true)
    const [showHiddenMode, setShowHiddenMode] = useState(false)
    const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
    const [forceShowCN, setForceShowCN] = useState<Set<number>>(new Set())
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [playingIndex, setPlayingIndex] = useState<number | null>(null)
    const [isAutoPlaying, setIsAutoPlaying] = useState(false)
    const [autoPlayingIndex, setAutoPlayingIndex] = useState<number | null>(null)
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
    const autoPlayAbortRef = useRef<boolean>(false)
    const currentAudioRef = useRef<HTMLAudioElement | null>(null)
    const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const [tempShowAll, setTempShowAll] = useState(true)
    const [printMode, setPrintMode] = useState<'guide' | 'c2e' | null>(null)
    const [visibleSentenceCn, setVisibleSentenceCn] = useState<Record<number, boolean>>({})
    const sentenceCnTimersRef = useRef<Record<number, any>>({})

    useEffect(() => {
        return () => {
            Object.values(sentenceCnTimersRef.current).forEach(clearTimeout)
        }
    }, [])

    // Modal Triggers
    const [showFlashcards, setShowFlashcards] = useState(false)
    const [showStoryPromptModal, setShowStoryPromptModal] = useState(false)
    const [showDictationModal, setShowDictationModal] = useState(false)
    const [showRecallModal, setShowRecallModal] = useState(false)
    const [traceList, setTraceList] = useState<any[] | null>(null)
    const [weights, setWeights] = useState<Record<string, number>>({})

    const shellRef = useRef<HTMLDivElement>(null)
    const unitKey = `ep-vg-hidden-${practiceId}`
    const weightsKey = `ep-vg-weights-${practiceId || textbook || 'default'}`

    const loadWeights = () => {
        try {
            const raw = localStorage.getItem(weightsKey)
            if (raw) return JSON.parse(raw)
        } catch (e) {
            console.error('Failed to load weights:', e)
        }
        return {}
    }

    const getWordWeight = (wordText: string): number => {
        const key = wordText.trim().toLowerCase()
        if (weights[key] !== undefined) return weights[key]
        return 3 // Default initial difficulty index is 3
    }

    const chunks: any[][] = []
    for (let i = 0; i < vocab.length; i += 10) {
        chunks.push(vocab.slice(i, i + 10))
    }

    useEffect(() => {
        const handleAfterPrint = () => {
            setPrintMode(null)
        }
        window.addEventListener('afterprint', handleAfterPrint)
        return () => {
            window.removeEventListener('afterprint', handleAfterPrint)
        }
    }, [])

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
        window.scrollTo(0, 0)

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

        setWeights(loadWeights())

        return () => {
            Object.assign(document.body.style, originalStyle)
            document.body.classList.remove('vg-active')
        }
    }, [data, practiceId, textbook, unitKey, weightsKey, isCf])

    useEffect(() => {
        setTempShowAll(true)
        const timer = setTimeout(() => {
            setTempShowAll(false)
        }, 3000)
        return () => clearTimeout(timer)
    }, [practiceId])

    const toggleSort = () => {
        let nextMode: 'default' | 'alpha' | 'difficulty' = 'default'
        if (sortMode === 'default') nextMode = 'alpha'
        else if (sortMode === 'alpha') nextMode = 'difficulty'
        else nextMode = 'default'

        setSortMode(nextMode)
        const sorted = [...vocab].sort((a, b) => {
            if (nextMode === 'alpha') {
                return a.word.localeCompare(b.word)
            }
            if (nextMode === 'difficulty') {
                const weightA = getWordWeight(a.word)
                const weightB = getWordWeight(b.word)
                if (weightB !== weightA) {
                    return weightB - weightA // High difficulty to low
                }
                return a.word.localeCompare(b.word) // Then A-Z
            }
            return a.originalIndex - b.originalIndex
        })
        setVocab(sorted)
    }

    const toggleWordHidden = (index: number) => {
        setHiddenIndices(prev => {
            const next = new Set(prev)
            if (next.has(index)) next.delete(index)
            else next.add(index)
            localStorage.setItem(unitKey, JSON.stringify(Array.from(next)))
            return next
        })
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

    const playSingleAudio = (text: string): Promise<void> => {
        return new Promise(async (resolve) => {
            if (!textbook || autoPlayAbortRef.current) {
                resolve()
                return
            }
            try {
                const url = getAudioUrl(text, textbook, isCf)
                const blob = await audioCache.cacheAudio(url)
                if (autoPlayAbortRef.current) {
                    resolve()
                    return
                }
                if (blob) {
                    const audio = new Audio(URL.createObjectURL(blob))
                    currentAudioRef.current = audio
                    audio.onended = () => {
                        currentAudioRef.current = null
                        resolve()
                    }
                    audio.onerror = () => {
                        currentAudioRef.current = null
                        resolve()
                    }
                    audio.play().catch(() => resolve())
                } else {
                    resolve()
                }
            } catch (e) {
                console.error(e)
                resolve()
            }
        })
    }

    const waitDelay = (ms: number) => new Promise(res => setTimeout(res, ms))

    const stopAutoPlay = () => {
        autoPlayAbortRef.current = true
        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current = null
        }
        setIsAutoPlaying(false)
        setAutoPlayingIndex(null)
    }

    const startAutoPlay = async (startFromIndex?: number) => {
        // If already playing and clicked play button without a specific target, stop
        if (isAutoPlaying && startFromIndex === undefined) {
            stopAutoPlay()
            return
        }

        // Interrupt any existing playback
        autoPlayAbortRef.current = true
        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current = null
        }

        // Tiny delay to ensure previous async loop terminates
        await waitDelay(50)

        autoPlayAbortRef.current = false
        setIsAutoPlaying(true)

        // Iterate through visible items in current vocab order
        const itemsToPlay = vocab.filter(item => {
            const isHidden = hiddenIndices.has(item.originalIndex)
            return !isHidden || showHiddenMode || tempShowAll
        })

        const targetIndex = startFromIndex !== undefined ? startFromIndex : (selectedCardIndex ?? null)
        let startIndex = 0
        if (targetIndex !== null) {
            const foundIdx = itemsToPlay.findIndex(item => item.originalIndex === targetIndex)
            if (foundIdx !== -1) {
                startIndex = foundIdx
            }
        }

        for (let i = startIndex; i < itemsToPlay.length; i++) {
            if (autoPlayAbortRef.current) break
            const item = itemsToPlay[i]
            setAutoPlayingIndex(item.originalIndex)

            // Scroll card into view at a comfortable vertical position
            const cardEl = cardRefs.current.get(item.originalIndex)
            if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }

            // Read word 1st time
            if (item.word) {
                await playSingleAudio(item.word)
                if (autoPlayAbortRef.current) break
                await waitDelay(500)
            }

            // Read word 2nd time
            if (item.word) {
                await playSingleAudio(item.word)
                if (autoPlayAbortRef.current) break
                await waitDelay(500)
            }

            // Read sentence 1 time
            if (item.context_sentence) {
                await playSingleAudio(item.context_sentence)
                if (autoPlayAbortRef.current) break
                await waitDelay(1000)
            }
        }

        if (!autoPlayAbortRef.current) {
            stopAutoPlay()
        }
    }

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            autoPlayAbortRef.current = true
            if (currentAudioRef.current) {
                currentAudioRef.current.pause()
                currentAudioRef.current = null
            }
        }
    }, [])

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

    const handlePrint = () => {
        const showChinese = window.confirm("是否在打印的词汇手册中包含中文释义？\n(确定: 包含中文 | 取消: 隐藏中文)");
        setHideCN(!showChinese);
        setPrintMode('guide');
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const handlePrintC2E = () => {
        setPrintMode('c2e');
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })

    const shownCount = vocab.length - hiddenIndices.size
    const c2eWords = vocab.filter(item => showHiddenMode || !hiddenIndices.has(item.originalIndex))

    return (
        <div className={`vg-shell ${printMode === 'c2e' ? 'vg-print-c2e-mode' : ''}`} ref={shellRef}>
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
                                <div className="vg-stats-bar-container">
                                    <div className="vg-stats-bar">
                                        <span>Total: <b>{vocab.length}</b> | Shown: <b>{shownCount}</b> | Hidden: <b>{hiddenIndices.size}</b></span>
                                        <div className="vg-stats-buttons">
                                            <button className="vg-play-cards-btn" onClick={() => setShowFlashcards(true)} title="Start Flashcards">🃏</button>
                                            <button className="vg-story-prompt-btn" onClick={() => setShowStoryPromptModal(true)} title="AI Story Prompt">🤖</button>
                                            <button className="vg-dictation-btn" onClick={() => setShowDictationModal(true)} title="Start Dictation">✍️</button>
                                            <button className="vg-recall-btn" onClick={() => setShowRecallModal(true)} title="Start Rapid Thinking Practice">💡</button>
                                        </div>
                                    </div>
                                    <div className="vg-stats-play-row">
                                        <button
                                            type="button"
                                            className={`vg-level-play-btn ${isAutoPlaying ? 'playing' : ''}`}
                                            onClick={() => startAutoPlay()}
                                            title={isAutoPlaying ? 'Stop Auto Play' : 'Play all words (Word x2, Sentence x1)'}
                                        >
                                            {isAutoPlaying ? '⏹️ Stop Playback' : '▶️ Play All Words'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="vg-controls-container desktop-only">
                                <button id="sort-toggle" onClick={toggleSort} className="vg-control-btn">
                                    <span>
                                        {sortMode === 'default' && 'Textbook Order'}
                                        {sortMode === 'alpha' && 'Sort A-Z'}
                                        {sortMode === 'difficulty' && 'Difficulty (High-Low)'}
                                    </span>
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
                                <button id="print-c2e-btn" onClick={handlePrintC2E} className="vg-control-btn" title="Print Chinese to English Dictation Sheet">
                                    <span>Print C2E 📝</span>
                                </button>
                            </div>

                            <div className="vg-grid">
                                {vocab.map((item) => {
                                    const isHidden = hiddenIndices.has(item.originalIndex)
                                    if (isHidden && !showHiddenMode && !tempShowAll) return null
                                    const isCurrentlyAutoPlaying = autoPlayingIndex === item.originalIndex
                                    const isSelected = selectedCardIndex === item.originalIndex

                                    const handleCardClick = () => {
                                        if (isAutoPlaying) {
                                            if (autoPlayingIndex !== item.originalIndex) {
                                                setSelectedCardIndex(item.originalIndex)
                                                startAutoPlay(item.originalIndex)
                                            }
                                        } else {
                                            setSelectedCardIndex(prev => prev === item.originalIndex ? null : item.originalIndex)
                                        }
                                    }

                                    return (
                                        <div
                                            key={item.originalIndex}
                                            ref={(el) => {
                                                if (el) cardRefs.current.set(item.originalIndex, el)
                                                else cardRefs.current.delete(item.originalIndex)
                                            }}
                                            onClick={handleCardClick}
                                            className={`vg-item ${isHidden ? 'is-hidden' : ''} ${isCurrentlyAutoPlaying ? 'is-auto-playing' : ''} ${isSelected && !isCurrentlyAutoPlaying ? 'is-selected' : ''}`}
                                        >
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
                                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                        </button>
                                                    </span>
                                                </h2>
                                                <div className="vg-item-actions">
                                                    {item.unit && <span className="vg-unit">Unit {item.unit}</span>}
                                                    {item.page_number && <span className="vg-page">P{item.page_number}</span>}
                                                    {(() => {
                                                        const difficulty = getWordWeight(item.word);
                                                        return (
                                                            <span 
                                                                className={`vg-difficulty-badge ${difficulty >= 4 ? 'hard' : difficulty <= 2 ? 'easy' : ''}`}
                                                                title={`Difficulty Index: ${difficulty}`}
                                                            >
                                                                <span className="vg-difficulty-label">Diff:</span>
                                                                <b>{difficulty}</b>
                                                            </span>
                                                        );
                                                    })()}
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
                                                    {(!hideCN || forceShowCN.has(item.originalIndex)) ? formatMeaning(item) : <span className="vg-placeholder">Click to show</span>}
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        playAudio(item.context_sentence, item.originalIndex);
                                                    }}
                                                    disabled={playingIndex === item.originalIndex}
                                                >
                                                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                                </button>
                                                <div className="vg-context-body">
                                                    <span
                                                        className={`vg-sentence ${item.context_sentence_cn ? 'has-translation' : ''}`}
                                                        onClick={(e) => {
                                                            const idx = item.originalIndex;
                                                            setSelectedCardIndex(idx);
                                                            if (!item.context_sentence_cn) return;
                                                            e.stopPropagation();
                                                            setVisibleSentenceCn(prev => ({ ...prev, [idx]: true }));
                                                            if (sentenceCnTimersRef.current[idx]) {
                                                                clearTimeout(sentenceCnTimersRef.current[idx]);
                                                            }
                                                            sentenceCnTimersRef.current[idx] = setTimeout(() => {
                                                                setVisibleSentenceCn(prev => {
                                                                    const updated = { ...prev };
                                                                    delete updated[idx];
                                                                    return updated;
                                                                });
                                                            }, 5000);
                                                        }}
                                                        title={item.context_sentence_cn ? "点击查看中文翻译 (显示5秒)" : undefined}
                                                    >
                                                        "{item.context_sentence}"
                                                    </span>
                                                    {item.context_sentence_cn && visibleSentenceCn[item.originalIndex] && (
                                                        <div className="vg-sentence-cn-popup">
                                                            🇨🇳 {item.context_sentence_cn}
                                                        </div>
                                                    )}
                                                </div>
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
                    <span>
                        {sortMode === 'default' && '📖'}
                        {sortMode === 'alpha' && '🔤'}
                        {sortMode === 'difficulty' && '🔥'}
                    </span>
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
                <button onClick={handlePrintC2E} className="vg-mobile-btn" title="Print C2E">
                    <span>📝</span>
                    <small>C2E</small>
                </button>
                <button onClick={resetHidden} className="vg-mobile-btn danger">
                    <span>🧹</span>
                    <small>Reset</small>
                </button>
            </div>

            {/* C2E Printable Document */}
            <div className="vg-c2e-print-doc">
                <div className="vg-c2e-header">
                    <div className="vg-c2e-title-row">
                        <h1 className="vg-c2e-title">Vocabulary Dictation (Chinese ➔ English)</h1>
                        <span className="vg-c2e-level">{data.level}</span>
                    </div>
                    <div className="vg-c2e-meta-row">
                        <span className="vg-c2e-meta-item">姓名 (Name): <span className="vg-c2e-meta-line"></span></span>
                        <span className="vg-c2e-meta-item">班级 (Class): <span className="vg-c2e-meta-line"></span></span>
                        <span className="vg-c2e-meta-item">日期 (Date): <span className="vg-c2e-meta-line"></span></span>
                        <span className="vg-c2e-meta-item">得分 (Score): <span className="vg-c2e-meta-line short"></span> / {c2eWords.length}</span>
                    </div>
                </div>

                <div className="vg-c2e-grid">
                    {c2eWords.map((item, idx) => (
                        <div key={item.originalIndex ?? idx} className="vg-c2e-item">
                            <span className="vg-c2e-num">{idx + 1}.</span>
                            <span className="vg-c2e-meaning">{formatMeaning(item)}</span>
                            <span className="vg-c2e-blank-line"></span>
                        </div>
                    ))}
                </div>
            </div>

            {showFlashcards && (
                <VocabFlashcardModal
                    vocab={vocab}
                    hiddenIndices={hiddenIndices}
                    onToggleWordHidden={toggleWordHidden}
                    textbook={textbook}
                    practiceId={practiceId}
                    isCf={isCf}
                    onClose={() => setShowFlashcards(false)}
                />
            )}

            {showStoryPromptModal && (
                <VocabStoryPromptModal
                    vocab={vocab}
                    onClose={() => setShowStoryPromptModal(false)}
                />
            )}

            {showDictationModal && (
                <VocabDictationModal
                    vocab={vocab}
                    chunks={chunks}
                    hiddenIndices={hiddenIndices}
                    textbook={textbook}
                    isCf={isCf}
                    onClose={() => setShowDictationModal(false)}
                />
            )}

            {showRecallModal && (
                <VocabRecallModal
                    vocab={vocab}
                    hiddenIndices={hiddenIndices}
                    formatMeaning={formatMeaning}
                    textbook={textbook}
                    practiceId={practiceId}
                    isCf={isCf}
                    onClose={() => {
                        setShowRecallModal(false)
                        setWeights(loadWeights())
                    }}
                />
            )}

            {traceList && traceList.length > 0 && (
                <VocabTraceModal
                    vocabList={traceList}
                    startIndex={0}
                    onClose={() => setTraceList(null)}
                />
            )}
        </div>
    )
}
