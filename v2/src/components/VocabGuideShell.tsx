import { useState, useEffect } from 'react'
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

    const unitKey = `ep-vg-hidden-${practiceId}`

    useEffect(() => {
        // Load hidden words from localStorage
        const stored = localStorage.getItem(unitKey)
        if (stored) {
            try {
                setHiddenIndices(new Set(JSON.parse(stored)))
            } catch (e) { console.error(e) }
        }

        // Initialize vocab with original indices
        const initialVocab = data.unit_vocabulary.map((v: any, i: number) => ({ ...v, originalIndex: i }))
        setVocab(initialVocab)

        // Preload audio
        initialVocab.forEach((item: any) => {
            if (item.context_sentence && textbook) {
                audioCache.preloadAndSync(getAudioUrl(item.context_sentence, textbook))
            }
        })
    }, [data, practiceId, textbook])

    const toggleSort = () => {
        const nextSort = !isAlphabetical
        setIsAlphabetical(nextSort)
        const sorted = [...vocab].sort((a, b) => {
            if (nextSort) return a.word.localeCompare(b.word)
            return a.originalIndex - b.originalIndex
        })
        setVocab(sorted)
    }

    const toggleHideCN = () => setHideCN(!hideCN)
    const toggleShowHiddenMode = () => setShowHiddenMode(!showHiddenMode)

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

    const toggleForceShowCN = (index: number) => {
        const next = new Set(forceShowCN)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        setForceShowCN(next)
    }

    const playAudio = async (sentence: string) => {
        if (!textbook) return
        const url = getAudioUrl(sentence, textbook)
        const blob = await audioCache.get(url)
        if (blob) {
            const audio = new Audio(URL.createObjectURL(blob))
            audio.play()
        }
    }

    const shownCount = vocab.length - hiddenIndices.size

    return (
        <div className="vg-shell">
            <header className="vg-header">
                <div className="vg-header-left">
                    <button className="vg-back-btn" onClick={() => window.history.back()}>🏠</button>
                    <div className="vg-titles">
                        <h1>Vocabulary Guide</h1>
                        <p>{data.level}</p>
                    </div>
                </div>
                <div className="vg-stats">
                    Total: <b>{vocab.length}</b> | Shown: <b>{shownCount}</b> | Hidden: <b>{hiddenIndices.size}</b>
                </div>
            </header>

            <div className="vg-controls">
                <button onClick={toggleSort} className="vg-ctrl-btn">
                    {isAlphabetical ? '📖 Textbook Order' : '🔤 Sort A-Z'}
                </button>
                <button onClick={toggleHideCN} className="vg-ctrl-btn">
                    {hideCN ? '👁️ Show CN' : '㊙️ Hide CN'}
                </button>
                <button onClick={toggleShowHiddenMode} className={`vg-ctrl-btn ${showHiddenMode ? 'active' : ''}`}>
                    {showHiddenMode ? '🙈 Hide Learnt' : '👁️ Show Hidden'}
                </button>
                <button onClick={resetHidden} className="vg-ctrl-btn danger">
                    🧹 Reset
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

                            <div className="vg-details" onClick={() => toggleForceShowCN(item.originalIndex)}>
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
                                <button className="vg-play-btn" onClick={() => playAudio(item.context_sentence)}>
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
        </div>
    )
}
