import { useState, useEffect, useRef } from 'react'
import './VocabGuideShell.css'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

export function VocabGuideShell({ data, practiceId, textbook }: any) {
    const [vocab, setVocab] = useState<any[]>([])
    const [isAlphabetical, setIsAlphabetical] = useState(false)
    const [hideCN, setHideCN] = useState(true)
    const [showHiddenMode, setShowHiddenMode] = useState(false)
    const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
    const [forceShowCN, setForceShowCN] = useState<Set<number>>(new Set())
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [playingIndex, setPlayingIndex] = useState<number | null>(null)

    const shellRef = useRef<HTMLDivElement>(null)
    const unitKey = `ep-vg-hidden-${practiceId}`

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
    }, [data, practiceId, textbook, unitKey])

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

    const scrollToTop = () => shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollToBottom = () => shellRef.current?.scrollTo({ top: shellRef.current.scrollHeight, behavior: 'smooth' })

    const shownCount = vocab.length - hiddenIndices.size

    return (
        <div className="vg-shell" ref={shellRef}>
            <header className="vg-header-main">
                <div className="vg-header-top">
                    <button className="vg-back-btn" onClick={() => window.history.back()}>🏠</button>
                    <h1>Vocabulary Guide</h1>
                </div>
                <h2>{data.level}</h2>
            </header>

            <div className="vg-stats-bar">
                Total: <b>{vocab.length}</b> | Shown: <b>{shownCount}</b> | Hidden: <b>{hiddenIndices.size}</b>
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
                    if (isHidden && !showHiddenMode) return null

                    return (
                        <div key={item.originalIndex} className={`vg-item ${isHidden ? 'is-hidden' : ''}`}>
                            <div className="vg-word-header">
                                <h2 className="vg-word-title">
                                    {item.originalIndex + 1}. {item.word}
                                    {item.ipa && <span className="vg-ipa">[{item.ipa}]</span>}
                                </h2>
                                <div className="vg-item-actions">
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
        </div>
    )
}
