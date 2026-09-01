import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './VocabGuideShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { getAudioUrl } from '../lib/practiceAudio'
import { VocabTraceModal } from './VocabTraceModal'
import { VocabFlashcardModal } from './VocabFlashcardModal'
import { VocabDictationModal } from './VocabDictationModal'

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
    const [printMode, setPrintMode] = useState<'guide' | 'c2e' | null>(null)

    // Modal Triggers
    const [showFlashcards, setShowFlashcards] = useState(false)
    const [showDictationModal, setShowDictationModal] = useState(false)
    const [traceList, setTraceList] = useState<any[] | null>(null)

    const shellRef = useRef<HTMLDivElement>(null)
    const unitKey = `ep-vg-hidden-${practiceId}`

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
        }
    }, [data, practiceId, textbook, unitKey, isCf])

    useEffect(() => {
        setTempShowAll(true)
        const timer = setTimeout(() => {
            setTempShowAll(false)
        }, 3000)
        return () => clearTimeout(timer)
    }, [practiceId])

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
                                <div className="vg-stats-bar">
                                    <span>Total: <b>{vocab.length}</b> | Shown: <b>{shownCount}</b> | Hidden: <b>{hiddenIndices.size}</b></span>
                                    <div className="vg-stats-buttons">
                                        <button className="vg-play-cards-btn" onClick={() => setShowFlashcards(true)} title="Start Flashcards">▶️</button>
                                        <button className="vg-dictation-btn" onClick={() => setShowDictationModal(true)} title="Start Dictation">✍️</button>
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
                                <button id="print-c2e-btn" onClick={handlePrintC2E} className="vg-control-btn" title="Print Chinese to English Dictation Sheet">
                                    <span>Print C2E 📝</span>
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
                            <span className="vg-c2e-meaning">{item.meaning}</span>
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
                    isCf={isCf}
                    onClose={() => setShowFlashcards(false)}
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
