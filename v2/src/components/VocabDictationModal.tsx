import { useState, useEffect, useRef, useCallback } from 'react'
import { audioCache } from '../lib/audioCache'
import { PUBLIC_URL_BASE, getAudioUrl, shuffle } from '../lib/practiceAudio'

interface VocabDictationModalProps {
    vocab: any[]
    chunks: any[][]
    hiddenIndices: Set<number>
    textbook?: string
    isCf?: boolean
    onClose: () => void
}

export function VocabDictationModal({
    vocab,
    chunks,
    hiddenIndices,
    textbook,
    isCf,
    onClose,
}: VocabDictationModalProps) {
    // Setup state
    const [selectedChunks, setSelectedChunks] = useState<boolean[]>(() => new Array(chunks.length).fill(false))
    const [includeLearnt, setIncludeLearnt] = useState(false)
    const [shuffleWords, setShuffleWords] = useState(true)

    // Dictating state
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

    const getEligibleWords = useCallback(() => {
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
    }, [chunks, selectedChunks, hiddenIndices, includeLearnt])

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

    const stopDictation = useCallback(() => {
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
    }, [])

    const startDictation = useCallback(() => {
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
    }, [getEligibleWords, shuffleWords])

    const togglePauseDictation = useCallback(() => {
        setDictationIsPaused(prevPaused => {
            const nextPaused = !prevPaused
            if (nextPaused) {
                if (pausesLeft <= 0) return prevPaused
                setPausesLeft(p => p - 1)
            }
            if (nextPaused) {
                if (dictationAudioRef.current) {
                    dictationAudioRef.current.pause()
                }
            } else {
                if (dictationAudioRef.current) {
                    dictationAudioRef.current.play().catch(console.error)
                }
            }
            return nextPaused
        })
    }, [pausesLeft])

    const handleNextWord = useCallback(() => {
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
    }, [])

    // Dictation audio playback loop
    useEffect(() => {
        if (!isDictating || dictationIsPaused || dictationState === 'finished') {
            return
        }

        if (dictationCurrentIndex >= dictationWords.length) {
            setDictationState('finished')
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
                    dictationTimerRef.current = setTimeout(() => {
                        setDictationPlayCount(prev => prev + 1)
                    }, 1000)
                })
                return () => {
                    active = false
                    if (dictationTimerRef.current) clearTimeout(dictationTimerRef.current)
                }
            } else {
                const silenceDuration = Math.max(5, Math.round((currentWord || '').length * 0.8))
                setSilenceTimeLeft(silenceDuration)
                setDictationState('silence')
            }
        }
    }, [isDictating, dictationIsPaused, dictationState, dictationCurrentIndex, dictationPlayCount, dictationWords])

    // Silence countdown effect
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

    // Keyboard control: Enter
    useEffect(() => {
        const handleEnterKey = (e: KeyboardEvent) => {
            if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return

            const activeElement = document.activeElement
            if (activeElement && (
                activeElement.tagName === 'TEXTAREA' ||
                (activeElement.tagName === 'INPUT' && (activeElement as HTMLInputElement).type !== 'checkbox')
            )) {
                return
            }

            if (!isDictating) {
                if (selectedChunks.some(Boolean)) {
                    e.preventDefault()
                    startDictation()
                }
            } else if (dictationState === 'finished') {
                e.preventDefault()
                startDictation()
            }
        }

        window.addEventListener('keydown', handleEnterKey)
        return () => window.removeEventListener('keydown', handleEnterKey)
    }, [isDictating, selectedChunks, dictationState, startDictation])

    // Keyboard control: Space and ArrowRight
    useEffect(() => {
        if (!isDictating || dictationState === 'finished') return

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
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isDictating, dictationState, togglePauseDictation, handleNextWord, dictationIsPaused, pausesLeft])

    // Clean up timers/audio on unmount
    useEffect(() => {
        return () => {
            if (dictationTimerRef.current) clearTimeout(dictationTimerRef.current)
            if (dictationAudioRef.current) {
                dictationAudioRef.current.pause()
                dictationAudioRef.current = null
            }
        }
    }, [])

    const handleModalClose = () => {
        if (isDictating) {
            if (dictationState === 'finished' || window.confirm("Are you sure you want to exit dictation?")) {
                stopDictation()
                onClose()
            }
        } else {
            onClose()
        }
    }

    const eligibleCount = getEligibleWords().length

    return (
        <div className="vg-modal-backdrop" onClick={(e) => e.stopPropagation()}>
            {!isDictating ? (
                /* Dictation Setup Modal */
                <div className="vg-dictation-setup-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="vg-card-header">
                        <span className="vg-card-header-title">✍️ Dictation Settings</span>
                        <button className="vg-modal-close-btn" onClick={handleModalClose}>&times;</button>
                    </div>
                    
                    <div className="vg-modal-body">
                        <div className="vg-modal-section">
                            <label className="vg-modal-section-title">
                                Select Word Groups (Total: <span key={eligibleCount} className="vg-dictation-pop-number">{eligibleCount}</span> words):
                            </label>
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
            ) : (
                /* Active Dictation View */
                <div className="vg-dictation-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="vg-card-header">
                        <span className="vg-card-header-title">✍️ Dictation in Progress</span>
                        <button 
                            className="vg-modal-close-btn" 
                            onClick={handleModalClose}
                        >
                            &times;
                        </button>
                    </div>

                    {dictationState !== 'finished' ? (() => {
                        const currentWord = dictationWords[dictationCurrentIndex]?.word || ''
                        const silenceDuration = Math.max(5, Math.round(currentWord.length * 0.8))
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
                                <button className="vg-btn-secondary" onClick={() => { stopDictation(); onClose(); }}>Close</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
