import React, { useEffect, useRef, useState } from 'react'
import md5 from 'md5'
const PUBLIC_URL_BASE = 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev'
import {
  getDifficultyBadgeStyle,
  getIgnoredSentences,
  getSentenceDifficulty,
  ignoreSentence,
  isSentenceIgnored,
  unignoreSentence,
  updateSentenceDifficulty,
} from '../../lib/tnDifficulty'

export interface TnRecallSentence {
  id: string
  text: string
  cn: string
  hasChildren?: boolean
  prevText?: string
  keywords?: string
  highlight?: string
}

export interface TnRecallSection {
  title: string
  sentences: TnRecallSentence[]
}

interface TnRecallModalProps {
  isOpen: boolean
  title: string
  sentences: TnRecallSentence[]
  sections?: TnRecallSection[]
  book?: string
  isCf?: boolean
  onClose: () => void
}

function getCountdownSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(8, Math.ceil(words * 2.5))
}

function pickHintWords(text: string): string[] {
  const all: string[] = text.match(/[A-Za-z]+/g) ?? []
  const long = all.filter(w => w.length >= 4)
  const pool = Array.from(new Set(long.length > 0 ? long : all))
  if (pool.length === 0) return []
  const count = Math.min(pool.length, Math.max(1, Math.min(3, Math.ceil(pool.length / 3))))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const chosen = new Set(shuffled.slice(0, count))
  return pool.filter(w => chosen.has(w))
}

export function TnRecallModal({ isOpen, title, sentences, sections, book, isCf, onClose }: TnRecallModalProps): React.ReactElement | null {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedSentences, setSelectedSentences] = useState<TnRecallSentence[] | null>(null)
  const [selectedSectionTitle, setSelectedSectionTitle] = useState<string | null>(null)
  const [queue, setQueue] = useState<TnRecallSentence[]>([])
  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [currentDiff, setCurrentDiff] = useState(3)
  const [showIgnored, setShowIgnored] = useState(false)
  const [ignoredKeys, setIgnoredKeys] = useState<string[]>([])
  const [isRating, setIsRating] = useState<-1 | 1 | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [hintWords, setHintWords] = useState<string[]>([])
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [easyCount, setEasyCount] = useState(0)
  const [difficultSentences, setDifficultSentences] = useState<TnRecallSentence[]>([])

  useEffect(() => {
    if (!isOpen) return
    setIgnoredKeys(getIgnoredSentences())
    setShowIgnored(false)
    setShowSummary(false)
    setShowHint(false)
    setHintWords([])
    setEasyCount(0)
    setDifficultSentences([])
    if (sections && sections.length > 1) {
      setSelectedSentences(null)
      setSelectedSectionTitle(null)
      setQueue([])
    } else {
      setSelectedSentences(sentences)
      setSelectedSectionTitle(sections?.[0]?.title ?? null)
    }
  }, [isOpen, sentences, sections])

  useEffect(() => {
    if (!isOpen || !selectedSentences || selectedSentences.length === 0) return
    const active = selectedSentences.filter(s => !isSentenceIgnored(s.text))
    const sorted = [...active].sort((a, b) => {
      const diffB = getSentenceDifficulty(b.text)
      const diffA = getSentenceDifficulty(a.text)
      if (diffB !== diffA) return diffB - diffA
      return Math.random() - 0.5
    })
    setQueue(sorted)
    setIndex(0)
    setRevealed(false)
    if (sorted.length > 0) {
      setTimeLeft(getCountdownSeconds(sorted[0].text))
      setCurrentDiff(getSentenceDifficulty(sorted[0].text))
    }
  }, [isOpen, selectedSentences])

  useEffect(() => {
    if (!isOpen || revealed || index >= queue.length) return
    if (timeLeft <= 0) {
      setRevealed(true)
      return
    }
    const timer = window.setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [isOpen, revealed, timeLeft, index, queue.length])

  const current = queue[index]
  const isDone = showSummary || (selectedSentences !== null && !current)

  useEffect(() => {
    if (!isOpen || showIgnored || isDone || !current) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!revealed) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault()
          setRevealed(true)
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault()
          if (!showHint) {
            setHintWords(pickHintWords(current.text))
            setShowHint(true)
          }
        }
      } else {
        if ((e.key === '1' || e.key === 'ArrowLeft') && isRating === null) {
          e.preventDefault()
          handleRate(-1)
        } else if ((e.key === '2' || e.key === 'ArrowRight') && isRating === null) {
          e.preventDefault()
          handleRate(1)
        } else if (e.key === '3') {
          e.preventDefault()
          speakEnglish(current.text)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, showIgnored, isDone, current, revealed, isRating])

  useEffect(() => {
    if (!isOpen || !book || queue.length === 0) return
    const controller = new AbortController()
    queue.forEach((s) => {
      const url = `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${isCf ? 'cf/' : ''}${md5(s.text)}.mp3`
      fetch(url, { signal: controller.signal }).catch(() => {})
    })
    return () => controller.abort()
  }, [isOpen, book, isCf, queue])

  if (!isOpen) return null

  const speakEnglish = (text: string) => {
    if (isAudioPlaying) return
    setIsAudioPlaying(true)
    const fallbackTts = () => {
      if (!('speechSynthesis' in window)) {
        setIsAudioPlaying(false)
        return
      }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-GB'
      u.onend = () => setIsAudioPlaying(false)
      u.onerror = () => setIsAudioPlaying(false)
      window.speechSynthesis.speak(u)
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (book) {
      const url = `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${isCf ? 'cf/' : ''}${md5(text)}.mp3`
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setIsAudioPlaying(false)
      audio.onerror = fallbackTts
      audio.play().catch(fallbackTts)
      return
    }
    fallbackTts()
  }

  const handleRate = (delta: -1 | 1) => {
    if (!current || isRating !== null) return
    const nextDiff = updateSentenceDifficulty(current.text, delta)
    setCurrentDiff(nextDiff)
    setIsRating(delta)
    if (delta === -1) {
      setEasyCount(c => c + 1)
    } else {
      setDifficultSentences(prev => prev.some(s => s.text === current.text) ? prev : [...prev, current])
    }
    window.setTimeout(() => {
      setIsRating(null)
      const nextIdx = index + 1
      setIndex(nextIdx)
      setRevealed(false)
      setShowHint(false)
      setHintWords([])
    setHintWords([])
      if (nextIdx < queue.length) {
        setTimeLeft(getCountdownSeconds(queue[nextIdx].text))
        setCurrentDiff(getSentenceDifficulty(queue[nextIdx].text))
      }
    }, 2000)
  }

  const handleIgnore = () => {
    if (!current) return
    const nextKeys = ignoreSentence(current.text)
    setIgnoredKeys(nextKeys)
    const nextQueue = queue.filter((_, i) => i !== index)
    setQueue(nextQueue)
    setRevealed(false)
    const nextIdx = index >= nextQueue.length ? nextQueue.length : index
    setIndex(nextIdx)
    if (nextIdx < nextQueue.length) {
      setTimeLeft(getCountdownSeconds(nextQueue[nextIdx].text))
      setCurrentDiff(getSentenceDifficulty(nextQueue[nextIdx].text))
    }
  }

  const handleUnignore = (s: TnRecallSentence) => {
    const nextKeys = unignoreSentence(s.text)
    setIgnoredKeys(nextKeys)
    setQueue(prev => [...prev, s])
  }

  const activeSource = selectedSentences ?? sentences
  const ignoredList = activeSource.filter(s => ignoredKeys.includes(s.text.trim().replace(/\s+/g, ' ').toLowerCase()))

  const badgeStyle = getDifficultyBadgeStyle(currentDiff)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg, #1e293b)',
          color: 'var(--text-h, #1e293b)',
          border: '1px solid var(--border, #334155)',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1.3 }}>💡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</div>
              {selectedSectionTitle && (
                <div style={{ fontSize: '0.82rem', opacity: 0.72, marginTop: '2px' }}>
                  {selectedSectionTitle}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowIgnored(v => !v)}
              style={{
                background: showIgnored ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                border: '1px solid var(--border, #334155)',
                borderRadius: '8px',
                color: showIgnored ? '#d97706' : 'var(--text-muted, #64748b)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 10px',
              }}
              title="View Ignored Sentences"
            >
              🚫 Ignored ({ignoredList.length})
            </button>
            <button
              onClick={() => {
                if (showIgnored) {
                  setShowIgnored(false)
                } else if (!isDone && selectedSentences !== null && (easyCount + difficultSentences.length > 0)) {
                  setShowSummary(true)
                } else {
                  onClose()
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {selectedSentences === null && sections && sections.length > 1 && !showIgnored ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.92rem', opacity: 0.8, marginBottom: '4px' }}>
              Choose a section to practice:
            </div>
            {sections.map((sec, idx) => (
              <button
                key={`${sec.title}-${idx}`}
                onClick={() => {
                  setSelectedSentences(sec.sentences)
                  setSelectedSectionTitle(sec.title)
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border, #334155)',
                  backgroundColor: 'var(--code-bg, rgba(15, 23, 42, 0.5))',
                  color: 'var(--text-h, #1e293b)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{sec.title}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{sec.sentences.length}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setSelectedSentences(sentences)
                setSelectedSectionTitle('All Sections')
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                backgroundColor: 'rgba(59, 130, 246, 0.14)',
                color: '#2563eb',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              <span>All Sections</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>{sentences.length}</span>
            </button>
          </div>
        ) : showIgnored ? (
          <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ignoredList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.7 }}>
                No ignored sentences in this unit.
              </div>
            ) : (
              ignoredList.map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--code-bg, rgba(15, 23, 42, 0.5))',
                    border: '1px solid var(--border, #334155)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{s.text}</div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.75 }}>{s.cn}</div>
                  </div>
                  <button
                    onClick={() => handleUnignore(s)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#059669',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Resume
                  </button>
                </div>
              ))
            )}
          </div>
        ) : isDone ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>
              Session Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px', fontSize: '0.95rem' }}>
              <span style={{ color: '#059669', fontWeight: 600 }}>Easy: {easyCount}</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Difficult: {difficultSentences.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {difficultSentences.length > 0 && (
                <button
                  onClick={() => {
                    const retry = [...difficultSentences]
                    setQueue(retry)
                    setIndex(0)
                    setRevealed(false)
                    setShowHint(false)
    setHintWords([])
                    setShowSummary(false)
                    setEasyCount(0)
                    setDifficultSentences([])
                    setTimeLeft(getCountdownSeconds(retry[0].text))
                    setCurrentDiff(getSentenceDifficulty(retry[0].text))
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#dc2626',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Retry Difficult ({difficultSentences.length})
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.88rem', opacity: 0.85 }}>
              <span>{index + 1} / {queue.length}</span>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: '999px',
                  border: `1px solid ${badgeStyle.borderColor}`,
                  backgroundColor: badgeStyle.backgroundColor,
                  color: badgeStyle.color,
                  fontWeight: 600,
                  transition: 'all 0.25s ease',
                  transform: isRating !== null ? 'scale(1.2)' : 'scale(1)',
                  display: 'inline-block',
                }}
              >
                Diff: {currentDiff}{isRating === -1 ? ' (-1)' : isRating === 1 ? ' (+1)' : ''}
              </span>
              {!revealed && (
                <span style={{ fontWeight: 700, color: timeLeft <= 2 ? '#dc2626' : '#2563eb' }}>
                  ⏱ {timeLeft}s
                </span>
              )}
            </div>

            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'var(--code-bg, rgba(15, 23, 42, 0.5))',
                border: '1px solid var(--border, #334155)',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              {current.prevText && (
                <div
                  style={{
                    fontSize: '0.88rem',
                    opacity: 0.65,
                    marginBottom: '12px',
                    paddingBottom: '10px',
                    borderBottom: '1px dashed var(--border, #334155)',
                    lineHeight: 1.4,
                  }}
                >
                  {current.prevText}
                </div>
              )}
              <div style={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.5 }}>
                {current.cn}
              </div>

              {!revealed && showHint && hintWords.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '1rem', color: '#d97706', fontWeight: 600, letterSpacing: '0.5px' }}>
                  💡 {hintWords.join('   ')}
                </div>
              )}

              {revealed && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border, #334155)' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2563eb', marginBottom: '10px', lineHeight: 1.5 }}>
                    {hintWords.length > 0
                      ? current.text.split(/(\b[A-Za-z]+\b)/g).map((part, idx) =>
                          hintWords.some(hw => hw.toLowerCase() === part.toLowerCase()) ? (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: 'rgba(250, 204, 21, 0.35)',
                                color: '#b45309',
                                padding: '0 3px',
                                borderRadius: '4px',
                              }}
                            >
                              {part}
                            </span>
                          ) : (
                            part
                          )
                        )
                      : current.text}
                  </div>
                  <button
                    onClick={() => speakEnglish(current.text)}
                    disabled={isAudioPlaying}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border, #334155)',
                      backgroundColor: 'var(--bg, #1e293b)',
                      color: 'var(--text-h, #1e293b)',
                      cursor: isAudioPlaying ? 'not-allowed' : 'pointer',
                      opacity: isAudioPlaying ? 0.5 : 1,
                      fontSize: '0.9rem',
                    }}
                  >
                    {isAudioPlaying ? '🔊 Playing...' : '🔊 Listen'}
                  </button>
                </div>
              )}
            </div>

            {!revealed ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    if (!showHint) {
                      setHintWords(pickHintWords(current.text))
                      setShowHint(true)
                    }
                  }}
                  disabled={showHint}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    color: '#d97706',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: showHint ? 'default' : 'pointer',
                    opacity: showHint ? 0.5 : 1,
                  }}
                  title="Show Hint (H)"
                >
                  💡 Hint
                </button>
                <button
                  onClick={() => setRevealed(true)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  Reveal English
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                {current.hasChildren && (
                  <button
                    onClick={handleIgnore}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border, #334155)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted, #94a3b8)',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                    }}
                    title="Ignore this sentence"
                  >
                    🚫
                  </button>
                )}
                <button
                  onClick={() => handleRate(-1)}
                  disabled={isRating !== null}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: isRating !== null ? 'not-allowed' : 'pointer',
                    opacity: isRating !== null ? 0.5 : 1,
                  }}
                >
                  Easy (-1)
                </button>
                <button
                  onClick={() => handleRate(1)}
                  disabled={isRating !== null}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: isRating !== null ? 'not-allowed' : 'pointer',
                    opacity: isRating !== null ? 0.5 : 1,
                  }}
                >
                  Difficult (+1)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

