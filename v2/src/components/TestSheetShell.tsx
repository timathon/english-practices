import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import { audioCache } from '../lib/audioCache'
import { API_URL, useSession } from '../lib/auth'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { trialsTracker } from '../lib/trialsTracker'
import './TestSheetShell.css'

import type {
  Section,
  TestSheetData,
  TestSheetShellProps,
  HighlightedSentence
} from './test-sheet/TestSheetTypes'
import {
  PUBLIC_URL_BASE,
  isAnswerCorrect,
  resolveTestAudioUrl,
  renderPromptText,
  parseWordBlocks
} from './test-sheet/testSheetUtils'
import { StartModal, ConfirmSubmitModal, ConfirmStopAudioModal } from './test-sheet/TestSheetModals'
import { TestSheetQuestionItem } from './test-sheet/TestSheetQuestionItem'
import {
  TestSheetInteractivePassage,
  TestSheetInlineBlanksPassage
} from './test-sheet/TestSheetPassage'
import { TestSheetAudioPlayer } from './test-sheet/TestSheetAudioPlayer'
import { TestSheetPrintView } from './test-sheet/TestSheetPrintView'

const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function shuffleTestData(sourceData: TestSheetData): TestSheetData {
  if (!sourceData) return sourceData
  return {
    ...sourceData,
    sections: sourceData.sections.map(section => {
      const secCopy: Section = { ...section }

      // Shuffle section-level option bank / wordbank (preserve sequential order for story-ordering)
      let shuffledOptions = secCopy.options
      let shuffledWordbank = secCopy.wordbank

      if (secCopy.type !== 'story-ordering' && secCopy.options && Array.isArray(secCopy.options)) {
        shuffledOptions = shuffleArray(secCopy.options)
        secCopy.options = shuffledOptions
      }
      if (secCopy.type !== 'story-ordering' && secCopy.wordbank && Array.isArray(secCopy.wordbank)) {
        shuffledWordbank = shuffleArray(secCopy.wordbank)
        secCopy.wordbank = shuffledWordbank
      }

      // Shuffle questions order for story-ordering
      if (secCopy.type === 'story-ordering' && secCopy.questions && Array.isArray(secCopy.questions)) {
        secCopy.questions = shuffleArray(secCopy.questions)
      }

      // Shuffle question-level options (e.g. multiple-choice, cloze-passage) or word order blocks (put-words-in-order)
      if (secCopy.questions && Array.isArray(secCopy.questions)) {
        secCopy.questions = secCopy.questions.map(q => {
          // Remap numeric answer if section-level wordbank or options was shuffled
          if (typeof q.answer === 'number') {
            if (section.wordbank && shuffledWordbank) {
              const originalWord = section.wordbank[q.answer]
              const newIdx = shuffledWordbank.indexOf(originalWord)
              if (newIdx !== -1) {
                return { ...q, answer: newIdx }
              }
            } else if (section.options && shuffledOptions) {
              const originalOption = section.options[q.answer]
              const newIdx = shuffledOptions.indexOf(originalOption)
              if (newIdx !== -1) {
                return { ...q, answer: newIdx }
              }
            }
          }

          if (q.options && Array.isArray(q.options) && q.options.length > 1) {
            const originalCorrectText = typeof q.answer === 'number'
              ? q.options[q.answer]
              : String(q.answer)

            const qShuffledOptions = shuffleArray(q.options)
            let newAnswer = q.answer

            if (typeof q.answer === 'number') {
              const newIdx = qShuffledOptions.indexOf(originalCorrectText)
              if (newIdx !== -1) {
                newAnswer = newIdx
              }
            }

            return {
              ...q,
              options: qShuffledOptions,
              answer: newAnswer
            }
          }

          // Shuffle word blocks for sentence formation / 连词成句
          if (secCopy.type === 'put-words-in-order') {
            const blocks = parseWordBlocks(q.prompt)
            if (blocks.length > 1) {
              const shuffledBlocks = shuffleArray(blocks)
              return {
                ...q,
                prompt: shuffledBlocks.map(b => /^[.?!,;:]+$/.test(b) ? `(${b})` : b).join(', ')
              }
            }
          }

          return q
        })
      }

      return secCopy
    })
  }
}

export function TestSheetShell({
  data,
  practiceId,
  unit,
  textbook,
  initialAnswers,
  initialSubmitted,
  initialScore,
  onCloseReadOnly
}: TestSheetShellProps) {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const isReadOnly = !!initialAnswers

  // Shuffled test data (or original if read-only review)
  const [testData, setTestData] = useState<TestSheetData>(() => {
    if (!data || isReadOnly) return data
    return shuffleTestData(data)
  })

  const getInitialAnswersWithExamples = useCallback((tData: TestSheetData, existing?: Record<string, string | number | boolean>) => {
    const res: Record<string, string | number | boolean> = { ...(existing || {}) }
    if (tData && tData.sections) {
      tData.sections.forEach(sec => {
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach(q => {
            if (q.isExample && q.answer !== undefined && res[q.id] === undefined) {
              res[q.id] = String(q.answer)
            }
          })
        }
      })
    }
    return res
  }, [])

  useEffect(() => {
    if (data) {
      const preparedData = isReadOnly ? data : shuffleTestData(data)
      setTestData(preparedData)
      setUserAnswers(prev => getInitialAnswersWithExamples(preparedData, prev))
    }
  }, [data, isReadOnly, getInitialAnswersWithExamples])

  // State
  const [showStartModal, setShowStartModal] = useState(!isReadOnly)
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false)
  const [activeSectionIdx, setActiveSectionIdx] = useState(0)
  const [highlightedSentence, setHighlightedSentence] = useState<HighlightedSentence | null>(null)

  const handleResetAttempts = () => {
    trialsTracker.resetTrials(practiceId, 'test-sheet')
    setRemainingAttempts(trialsTracker.getRemainingTrials(practiceId, 'test-sheet'))
  }

  const [userAnswers, setUserAnswers] = useState<Record<string, string | number | boolean>>(() =>
    getInitialAnswersWithExamples(data, initialAnswers || {})
  )
  const [selectedBlocksMap, setSelectedBlocksMap] = useState<Record<string, number[]>>({})
  const [replayCounts, setReplayCounts] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(!!initialSubmitted)

  const [playingAudioInfo, setPlayingAudioInfo] = useState<{ key: string; stopAudio: () => void } | null>(null)
  const [pendingSectionIdx, setPendingSectionIdx] = useState<number | null>(null)

  const handleAudioPlayingChange = useCallback((key: string, isPlaying: boolean, stopAudio: () => void) => {
    if (isPlaying) {
      setPlayingAudioInfo({ key, stopAudio })
    } else {
      setPlayingAudioInfo(prev => (prev?.key === key ? null : prev))
    }
  }, [])

  const handleSectionChange = useCallback((targetIdx: number) => {
    if (targetIdx === activeSectionIdx) return
    if (playingAudioInfo && !submitted) {
      setPendingSectionIdx(targetIdx)
    } else {
      setActiveSectionIdx(targetIdx)
    }
  }, [activeSectionIdx, playingAudioInfo, submitted])

  const handlePlayIncrement = useCallback((key: string) => {
    setReplayCounts(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }))
  }, [])
  const [score, setScore] = useState(initialScore || 0)
  const [gainedXp, setGainedXp] = useState(0)
  const [gainedLove, setGainedLove] = useState(0)
  const [gainedCoins, setGainedCoins] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState(() => trialsTracker.getRemainingTrials(practiceId, 'test-sheet'))
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const recordIdPromiseRef = useRef<Promise<string> | null>(null)
  const hasFinishedRef = useRef(false)

  const blocker = useBlocker(
    ({ nextLocation, currentLocation }) =>
      !isReadOnly && !showStartModal && !submitted && nextLocation.pathname !== currentLocation.pathname
  )

  useEffect(() => {
    if (!isReadOnly && blocker.state === 'blocked') {
      const proceed = window.confirm('您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。')
      if (proceed) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker, isReadOnly])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isReadOnly) return
      if (!showStartModal && !submitted) {
        e.preventDefault()
        e.returnValue = '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。'
        return '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [showStartModal, submitted, isReadOnly])

  useEffect(() => {
    if (!showStartModal && !submitted) {
      document.body.classList.add('taking-test')
    } else {
      document.body.classList.remove('taking-test')
    }
    return () => {
      document.body.classList.remove('taking-test')
    }
  }, [showStartModal, submitted])

  // Drag to scroll tabs refs & state
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollability = useCallback(() => {
    if (!tabsRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current
    setCanScrollLeft(scrollLeft > 1)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])

  useEffect(() => {
    const el = tabsRef.current
    if (!el) return

    checkScrollability()
    el.addEventListener('scroll', checkScrollability, { passive: true })
    window.addEventListener('resize', checkScrollability)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScrollability()
      })
      resizeObserver.observe(el)
    }

    return () => {
      el.removeEventListener('scroll', checkScrollability)
      window.removeEventListener('resize', checkScrollability)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [checkScrollability, data.sections])

  // Scroll active tab into view when section changes
  useEffect(() => {
    if (!tabsRef.current) return
    const activeTab = tabsRef.current.querySelector('.ts-section-tab.active') as HTMLElement
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
    const timer = setTimeout(checkScrollability, 300)
    return () => clearTimeout(timer)
  }, [activeSectionIdx, checkScrollability])

  // Clear highlighted/marked sentence when switching sections
  useEffect(() => {
    setHighlightedSentence(null)
  }, [activeSectionIdx])

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (!tabsRef.current) return
    const scrollAmount = 240
    tabsRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  const handleTabsMouseDown = (e: React.MouseEvent) => {
    if (!tabsRef.current) return
    isDraggingRef.current = true
    startXRef.current = e.pageX - tabsRef.current.offsetLeft
    scrollLeftRef.current = tabsRef.current.scrollLeft
  }

  const handleTabsMouseLeave = () => {
    isDraggingRef.current = false
  }

  const handleTabsMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !tabsRef.current) return
    e.preventDefault()
    const x = e.pageX - tabsRef.current.offsetLeft
    const walk = (x - startXRef.current) * 1.5
    tabsRef.current.scrollLeft = scrollLeftRef.current - walk
  }

  // Preload SFX and all Listening audio for the test sheet (stored in IndexedDB, detects R2 updates via HEAD)
  useEffect(() => {
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`)
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/error.mp3`)

    if (data?.sections) {
      for (const sec of data.sections) {
        if (sec.audio) {
          const url = resolveTestAudioUrl(sec.audio, textbook)
          if (url) audioCache.preloadAndSync(url)
        }
        if (Array.isArray(sec.questions)) {
          for (const q of sec.questions) {
            if (q.audio) {
              const url = resolveTestAudioUrl(q.audio, textbook)
              if (url) audioCache.preloadAndSync(url)
            }
          }
        }
      }
    }
  }, [data, textbook])

  // Scroll to top when active section changes
  useEffect(() => {
    if (isReadOnly) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeSectionIdx, isReadOnly])

  const playSfx = useCallback(async (isCorrect: boolean) => {
    const url = isCorrect
      ? `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
      : `${PUBLIC_URL_BASE}/ep/sfx/error.mp3`
    try {
      const blob = await audioCache.cacheAudio(url)
      if (!blob) return
      const blobUrl = URL.createObjectURL(blob)
      const a = new Audio(blobUrl)
      a.onended = () => URL.revokeObjectURL(blobUrl)
      a.play().catch(console.error)
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Sync record with server
  const syncRecord = async (scorePercent: number, isFinished: boolean) => {
    if (isReadOnly) return
    try {
      console.log(`Syncing record for ${textbook} ${unit}`)
      if (isFinished) {
        hasFinishedRef.current = true
      } else if (hasFinishedRef.current) {
        return
      }

      const bodyData = {
        unit: `${practiceId} (Test Sheet)`,
        score: scorePercent,
        unfinished: !isFinished,
        answers: userAnswers
      }

      if (activeRecordId) {
        const res = await fetch(`${API_URL}/api/records/${activeRecordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(bodyData)
        })
        const j = await res.json()
        if (j.success) {
          cache.updateRecord({
            id: activeRecordId,
            score: scorePercent,
            unfinished: !isFinished,
            updatedAt: new Date().toISOString()
          })
        }
      } else if (recordIdPromiseRef.current) {
        const recordId = await recordIdPromiseRef.current
        const res = await fetch(`${API_URL}/api/records/${recordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(bodyData)
        })
        const j = await res.json()
        if (j.success) {
          cache.updateRecord({
            id: recordId,
            score: scorePercent,
            unfinished: !isFinished,
            updatedAt: new Date().toISOString()
          })
        }
      } else {
        const postPromise = (async () => {
          const res = await fetch(`${API_URL}/api/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bodyData)
          })
          const j = await res.json()
          if (j.success && j.id) {
            setActiveRecordId(j.id)
            cache.updateRecord({
              id: j.id,
              unit: `${practiceId} (Test Sheet)`,
              score: scorePercent,
              unfinished: !isFinished,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as any)
            return j.id as string
          }
          throw new Error("Failed to create record")
        })()

        recordIdPromiseRef.current = postPromise
        await postPromise
      }
    } catch (e) {
      console.error("Failed to sync record", e)
    }
  }

  // Handle value change
  const handleAnswerChange = (qId: string, value: string | number | boolean, section?: Section) => {
    if (submitted) return
    setUserAnswers(prev => {
      const next = { ...prev, [qId]: value }
      if (
        section &&
        typeof value === 'string' &&
        value !== "" &&
        (section.type === 'fill-in-the-blank-wordbank' ||
         section.type === 'cloze-passage-wordbank' ||
         section.type === 'definition-matching' ||
         section.type === 'matching' ||
         section.type === 'dialogue-completion' ||
         section.type === 'story-ordering')
      ) {
        section.questions.forEach(otherQ => {
          if (otherQ.id !== qId && !otherQ.isExample && String(next[otherQ.id] || '') === String(value)) {
            next[otherQ.id] = ""
          }
        })
      }
      return next
    })
  }

  // Start the test after user confirms attempt consumption
  const handleStartTest = () => {
    const hasConsumed = trialsTracker.consumeTrial(practiceId, 'test-sheet')
    if (hasConsumed) {
      setRemainingAttempts(trialsTracker.getRemainingTrials(practiceId, 'test-sheet'))
      setShowStartModal(false)
    } else {
      alert("Failed to start. No attempts remaining.")
    }
  }

  // Submit test and grade
  const handleSubmit = () => {
    if (submitted) return

    let totalQuestions = 0
    let correctCount = 0

    testData.sections.forEach(section => {
      section.questions.forEach(q => {
        if (q.isExample) return
        totalQuestions++
        const userAns = userAnswers[q.id]
        if (isAnswerCorrect(userAns, q.answer, section, q.type)) {
          correctCount++
        }
      })
    })

    const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    setScore(finalScore)
    setSubmitted(true)

    // Rewards
    const xpGain = Math.round(finalScore * 0.5)
    const loveGain = Math.round(finalScore * 0.2)
    setGainedXp(xpGain)
    setGainedLove(loveGain)

    let coinsGain = 0
    if (finalScore >= 90) {
      coinsGain = 2
    } else if (finalScore >= 70) {
      coinsGain = 1
    }
    setGainedCoins(coinsGain)

    petService.awardQuizCompletion(coinsGain)
    playSfx(finalScore >= 60)
    syncRecord(finalScore, true)
  }

  // Retry the test
  const handleRetry = () => {
    const newShuffledData = shuffleTestData(data)
    setTestData(newShuffledData)
    setUserAnswers(getInitialAnswersWithExamples(newShuffledData))
    setSelectedBlocksMap({})
    setReplayCounts({})
    setSubmitted(false)
    setScore(0)
    setGainedXp(0)
    setGainedLove(0)
    setGainedCoins(0)
    setRemainingAttempts(trialsTracker.getRemainingTrials(practiceId, 'test-sheet'))
    setShowStartModal(true)
    setActiveRecordId(null)
    recordIdPromiseRef.current = null
    hasFinishedRef.current = false
    setActiveSectionIdx(0)
  }

  const activeSection = testData.sections[activeSectionIdx]

  return (
    <div className="ts-shell-container">
      {/* Header bar */}
      <header className="ts-header">
        <div className="ts-header-nav">
          {isReadOnly ? (
            <button onClick={onCloseReadOnly} className="ts-home-btn" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>❌</button>
          ) : (
            <Link to="/dashboard" className="ts-home-btn">🏠</Link>
          )}
          <div className="ts-title-wrapper">
            <h1>{testData.title}</h1>
            <div className="ts-subtitle-row">
              <h2>{testData.level}</h2>
              <button
                type="button"
                className="ts-header-print-btn no-print"
                onClick={() => window.print()}
                title="Print Test Sheet (打印试卷)"
                aria-label="Print test sheet"
              >
                🖨️
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="ts-layout">
        {/* Sticky section tabs wrapper */}
        <div className="ts-section-tabs-wrapper">
          <button
            type="button"
            className="ts-tabs-scroll-btn prev"
            disabled={!canScrollLeft}
            onClick={() => handleScrollTabs('left')}
            aria-label="Scroll tabs left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div
            ref={tabsRef}
            className="ts-section-tabs"
            onMouseDown={handleTabsMouseDown}
            onMouseLeave={handleTabsMouseLeave}
            onMouseUp={handleTabsMouseUp}
            onMouseMove={handleTabsMouseMove}
          >
            {testData.sections.map((sec, idx) => {
              const hasError = submitted && Array.isArray(sec.questions) && sec.questions.some(q => {
                if (q.isExample) return false
                const userAns = userAnswers[q.id]
                return !isAnswerCorrect(userAns, q.answer, sec, q.type)
              })

              return (
                <button
                  key={sec.id}
                  className={`ts-section-tab ${activeSectionIdx === idx ? 'active' : ''} ${hasError ? 'has-error' : ''}`}
                  onClick={() => handleSectionChange(idx)}
                >
                  <span className="ts-tab-num">{idx + 1}/{testData.sections.length}</span>
                  <span className="ts-tab-title">{sec.title}</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="ts-tabs-scroll-btn next"
            disabled={!canScrollRight}
            onClick={() => handleScrollTabs('right')}
            aria-label="Scroll tabs right"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="ts-content-area">
          <aside className="ts-sidebar">
            {submitted && (
              <div className="ts-score-summary">
                <h4>Graded Result</h4>
                <div className="ts-score-badge" style={{ borderColor: score >= 60 ? '#10b981' : '#ef4444' }}>
                  <span className="ts-score-num" style={{ color: score >= 60 ? '#10b981' : '#ef4444' }}>{score}%</span>
                </div>
                {isReadOnly ? (
                  <button className="ts-retry-btn" onClick={onCloseReadOnly} style={{ background: '#6b7280' }}>Close View</button>
                ) : (
                  <button className="ts-retry-btn" onClick={handleRetry}>Try Again</button>
                )}
              </div>
            )}
          </aside>

          {/* Content sheet */}
          <main className="ts-sheet-paper">
            {activeSection && (
              <div className="ts-section-view">
                <div className="ts-section-header">
                  <div className="ts-instruction" style={{ lineHeight: '1.6', marginBottom: '12px' }}>
                    {renderPromptText(activeSection.instruction)}
                  </div>
                  {activeSection.type === 'put-words-in-order' && (
                    <div className="ts-scrolling-banner" title="在卷面书写时，一定要做到“句首字母大写”。">
                      <span className="ts-scrolling-badge">
                        <span>📢</span>
                        <span>温馨提示</span>
                      </span>
                      <div className="ts-scrolling-track">
                        <span className="ts-scrolling-content">
                          在卷面书写时，一定要做到“句首字母大写”。
                        </span>
                      </div>
                    </div>
                  )}
                  {activeSection.audio && (
                    <div style={{ marginTop: '10px' }}>
                      <TestSheetAudioPlayer
                        audio={activeSection.audio}
                        audioKey={`sec_${activeSection.id}`}
                        textbook={textbook}
                        submitted={submitted}
                        replayCounts={replayCounts}
                        onPlayIncrement={handlePlayIncrement}
                        onPlayingStateChange={handleAudioPlayingChange}
                        activePlayingKey={playingAudioInfo?.key}
                      />
                    </div>
                  )}
                  {submitted && activeSection.audio?.text && (
                    <div
                      className="ts-reading-comprehension-passage"
                      style={{
                        margin: '18px 0 10px 0',
                        padding: '16px 20px',
                        background: '#f8fafc',
                        borderLeft: '4px solid #8b5cf6',
                        borderRadius: '6px',
                        lineHeight: '1.8',
                        fontSize: '1.05em',
                        color: '#334155'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#6d28d9', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎧</span>
                        <span>听力原文 (Listening Script)</span>
                      </div>
                      <TestSheetInteractivePassage
                        passageText={activeSection.audio.text}
                        highlightedSentence={highlightedSentence}
                        setHighlightedSentence={setHighlightedSentence}
                      />
                    </div>
                  )}
                </div>



                {/* Render Dialogue Completion Inline Text */}
                {activeSection.type === 'dialogue-completion' && activeSection.dialogue && (
                  <div className="ts-dialogue-completion-container" style={{ margin: '20px 0', padding: '15px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                    {activeSection.dialogue.map((turn, tIdx) => (
                      <div key={tIdx} className="ts-dialogue-turn" style={{ margin: '8px 0', lineHeight: '1.6' }}>
                        <strong className="ts-speaker" style={{ color: '#4b5563', marginRight: '8px' }}>{turn.speaker}:</strong>
                        <span className="ts-turn-text">
                          <TestSheetInlineBlanksPassage
                            text={turn.text}
                            section={activeSection}
                            userAnswers={userAnswers}
                            submitted={submitted}
                            handleAnswerChange={handleAnswerChange}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Render Inline Blanks Passage (Cloze, Wordbank, or Short-Answer/Profile cards with blankIndex) */}
                {activeSection.passage && (
                  activeSection.type === 'cloze-passage' ||
                  activeSection.type === 'cloze-passage-wordbank' ||
                  activeSection.questions.some(q => q.blankIndex !== undefined)
                ) && (
                  <div className="ts-cloze-passage-container" style={{ margin: '20px 0', padding: '16px 20px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '8px', lineHeight: '2.2', fontSize: '1.05em' }}>
                    <TestSheetInlineBlanksPassage
                      text={activeSection.passage}
                      section={activeSection}
                      userAnswers={userAnswers}
                      submitted={submitted}
                      handleAnswerChange={handleAnswerChange}
                    />
                  </div>
                )}

                {/* Render Passage for reading comprehension, true-false, or other reading tasks with passage without inline blanks */}
                {activeSection.passage &&
                  activeSection.type !== 'cloze-passage' &&
                  activeSection.type !== 'cloze-passage-wordbank' &&
                  !activeSection.questions.some(q => q.blankIndex !== undefined) && (
                  <div className="ts-reading-comprehension-passage" style={{ margin: '20px 0', padding: '20px', background: '#fcfcfc', borderLeft: '4px solid #3b82f6', borderRadius: '4px', lineHeight: '1.8', fontSize: '1.05em', fontStyle: 'italic', color: '#374151' }}>
                    <TestSheetInteractivePassage
                      passageText={activeSection.passage}
                      highlightedSentence={highlightedSentence}
                      setHighlightedSentence={setHighlightedSentence}
                    />
                  </div>
                )}

                {/* Questions List */}
                <div className="ts-questions-list">
                  {activeSection.questions.map((q, qIdx) => {
                    const allInline = activeSection.questions.every(item => item.blankIndex !== undefined)
                    if ((activeSection.type === 'cloze-passage' || activeSection.type === 'cloze-passage-wordbank' || activeSection.type === 'dialogue-completion' || allInline) && !submitted) {
                      return null
                    }
                    return (
                      <TestSheetQuestionItem
                        key={q.id}
                        q={q}
                        section={activeSection}
                        index={qIdx}
                        submitted={submitted}
                        userAnswers={userAnswers}
                        selectedBlocksMap={selectedBlocksMap}
                        setSelectedBlocksMap={setSelectedBlocksMap}
                        handleAnswerChange={handleAnswerChange}
                        textbook={textbook}
                        replayCounts={replayCounts}
                        onPlayIncrement={handlePlayIncrement}
                        onPlayingStateChange={handleAudioPlayingChange}
                        activePlayingKey={playingAudioInfo?.key}
                        highlightedSentence={highlightedSentence}
                        setHighlightedSentence={setHighlightedSentence}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bottom actions */}
            <div className="ts-footer-actions" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {!submitted ? (
                activeSectionIdx < testData.sections.length - 1 ? (
                  <>
                    {activeSectionIdx > 0 && (
                      <button
                        className="ts-submit-btn ts-prev-btn"
                        onClick={() => handleSectionChange(activeSectionIdx - 1)}
                        style={{ maxWidth: '80px' }}
                      >
                        &lt;
                      </button>
                    )}
                    <button
                      className="ts-submit-btn ts-next-btn"
                      onClick={() => handleSectionChange(activeSectionIdx + 1)}
                      style={{ margin: 0 }}
                    >
                      Next Section
                    </button>
                  </>
                ) : (
                  <>
                    {activeSectionIdx > 0 && (
                      <button
                        className="ts-submit-btn ts-prev-btn"
                        onClick={() => handleSectionChange(activeSectionIdx - 1)}
                        style={{ maxWidth: '80px' }}
                      >
                        &lt;
                      </button>
                    )}
                    <button
                      className="ts-submit-btn"
                      onClick={() => setShowConfirmSubmitModal(true)}
                      style={{ margin: 0 }}
                    >
                      Submit Test
                    </button>
                  </>
                )
              ) : (
                <div className="ts-results-dashboard">
                  <h3>🎉 Test Graded!</h3>
                  <div className="ts-rewards-grid">
                    <div className="ts-reward-card">
                      <span className="ts-reward-emoji">⚡</span>
                      <span className="ts-reward-val">+{gainedXp} XP</span>
                    </div>
                    <div className="ts-reward-card">
                      <span className="ts-reward-emoji">❤️</span>
                      <span className="ts-reward-val">+{gainedLove} Love</span>
                    </div>
                    {gainedCoins > 0 && (
                      <div className="ts-reward-card">
                        <span className="ts-reward-emoji">🪙</span>
                        <span className="ts-reward-val">+{gainedCoins} Coin{gainedCoins > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {showStartModal && (
        <StartModal
          remainingAttempts={remainingAttempts}
          isAdmin={isAdmin}
          onStart={handleStartTest}
          onResetAttempts={handleResetAttempts}
        />
      )}

      {showConfirmSubmitModal && (
        <ConfirmSubmitModal
          onConfirm={() => {
            setShowConfirmSubmitModal(false)
            handleSubmit()
          }}
          onCancel={() => setShowConfirmSubmitModal(false)}
        />
      )}

      {pendingSectionIdx !== null && (
        <ConfirmStopAudioModal
          onConfirm={() => {
            if (playingAudioInfo) {
              playingAudioInfo.stopAudio()
            }
            setPlayingAudioInfo(null)
            const nextIdx = pendingSectionIdx
            setPendingSectionIdx(null)
            setActiveSectionIdx(nextIdx)
          }}
          onCancel={() => {
            setPendingSectionIdx(null)
          }}
        />
      )}

      {/* Printable Sheet (visible only in print mode) */}
      <TestSheetPrintView data={testData} />
    </div>
  )
}
export default TestSheetShell

