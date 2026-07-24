import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useBlocker } from 'react-router-dom'
import { audioCache } from '../lib/audioCache'
import { API_URL, useSession } from '../lib/auth'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { trialsTracker } from '../lib/trialsTracker'
import './TestSheetShell.css'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getOrdinal = (n: number) => {
  if (n === 1) return "1st"
  if (n === 2) return "2nd"
  if (n === 3) return "3rd"
  if (n === 4) return "4th"
  if (n === 5) return "5th"
  return `${n}th`
}

const parseWordBlocks = (prompt?: string): string[] => {
  if (!prompt) return []
  const result: string[] = []
  const rawParts = prompt.includes(',')
    ? prompt.split(',').map(s => s.trim()).filter(Boolean)
    : prompt.split(/\s+/).filter(Boolean)

  for (const part of rawParts) {
    const match = part.match(/^(.*?)\s*(\([.?!,;:]+\))$/)
    if (match) {
      if (match[1]) result.push(match[1])
      if (match[2]) result.push(match[2])
    } else {
      result.push(part)
    }
  }
  return result
}

const unwrapBlockText = (raw: string): string => {
  if (raw.startsWith('(') && raw.endsWith(')')) {
    return raw.slice(1, -1)
  }
  return raw
}

const formatSentenceFromBlocks = (blocks: string[]): string => {
  let sentence = ""
  for (let i = 0; i < blocks.length; i++) {
    const text = unwrapBlockText(blocks[i])
    const isPunct = /^[.?!,;:]+$/.test(text)
    if (i === 0 || isPunct) {
      sentence += text
    } else {
      sentence += " " + text
    }
  }
  return sentence
}

const normalizeSentence = (str: string): string => {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+([.?!])/g, '$1')
    .replace(/\s+/g, ' ')
}

interface Question {
  id: string
  prompt?: string
  answer: string | number | boolean
  options?: string[]
  translation?: string
  explanation?: string
  blankIndex?: number
  type?: 'multiple-choice' | 'short-answer'
}

interface Section {
  id: string
  title: string
  instruction: string
  type: 'fill-in-the-blank-wordbank' | 'fill-in-the-blank-firstletter' | 'multiple-choice' | 'definition-matching' | 'dialogue-completion' | 'cloze-passage' | 'true-false' | 'reading-comprehension' | 'cloze-passage-wordbank' | 'put-words-in-order' | string
  wordbank?: string[]
  options?: string[]
  passage?: string
  dialogue?: { speaker: string; text: string }[]
  questions: Question[]
}

interface TestSheetData {
  level: string
  title: string
  sections: Section[]
}

interface TestSheetShellProps {
  data: TestSheetData
  practiceId: string
  unit: string
  textbook: string
  initialAnswers?: Record<string, string | number | boolean>
  initialSubmitted?: boolean
  initialScore?: number
  onCloseReadOnly?: () => void
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
  const navigate = useNavigate()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const isReadOnly = !!initialAnswers

  // State
  const [showStartModal, setShowStartModal] = useState(!isReadOnly)
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false)
  const [activeSectionIdx, setActiveSectionIdx] = useState(0)
  const [highlightedSentence, setHighlightedSentence] = useState<{ paraIdx: string | number; sentenceIdx: number } | null>(null)

  const handleResetAttempts = () => {
    trialsTracker.resetTrials(practiceId, 'test-sheet')
    setRemainingAttempts(trialsTracker.getRemainingTrials(practiceId, 'test-sheet'))
  }
  const [userAnswers, setUserAnswers] = useState<Record<string, string | number | boolean>>(initialAnswers || {})
  const [selectedBlocksMap, setSelectedBlocksMap] = useState<Record<string, number[]>>({})
  const [submitted, setSubmitted] = useState(!!initialSubmitted)
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
  );

  useEffect(() => {
    if (!isReadOnly && blocker.state === 'blocked') {
      const proceed = window.confirm('您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。');
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, isReadOnly]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isReadOnly) return
      if (!showStartModal && !submitted) {
        e.preventDefault();
        e.returnValue = '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。';
        return '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [showStartModal, submitted]);

  useEffect(() => {
    if (!showStartModal && !submitted) {
      document.body.classList.add('taking-test');
    } else {
      document.body.classList.remove('taking-test');
    }
    return () => {
      document.body.classList.remove('taking-test');
    };
  }, [showStartModal, submitted]);

  // Scroll active tab into view when section changes
  useEffect(() => {
    if (!tabsRef.current) return
    const activeTab = tabsRef.current.querySelector('.ts-section-tab.active') as HTMLElement
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeSectionIdx])

  // Clear highlighted/marked sentence when switching sections
  useEffect(() => {
    setHighlightedSentence(null)
  }, [activeSectionIdx])

  // Drag to scroll tabs refs & state
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)

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
    const walk = (x - startXRef.current) * 1.5 // multiplier for scroll speed
    tabsRef.current.scrollLeft = scrollLeftRef.current - walk
  }

  // Preload SFX
  useEffect(() => {
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`)
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/error.mp3`)
  }, [])

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
    if (isReadOnly) return;
    try {
      console.log(`Syncing record for ${textbook} ${unit}`);
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
         section.type === 'dialogue-completion')
      ) {
        section.questions.forEach(otherQ => {
          if (otherQ.id !== qId && String(next[otherQ.id] || '') === String(value)) {
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

    data.sections.forEach(section => {
      section.questions.forEach(q => {
        totalQuestions++
        const userAns = userAnswers[q.id]
        
        if (section.type === 'multiple-choice' || section.type === 'cloze-passage') {
          if (userAns !== undefined && userAns !== '' && Number(userAns) === Number(q.answer)) {
            correctCount++
          }
        } else if (section.type === 'true-false') {
          if (userAns !== undefined && userAns !== '' && String(userAns) === String(q.answer)) {
            correctCount++
          }
        } else if (section.type === 'reading-comprehension') {
          if (q.type === 'multiple-choice') {
            if (userAns !== undefined && userAns !== '' && Number(userAns) === Number(q.answer)) {
              correctCount++
            }
          } else if (q.type === 'short-answer') {
            // Give points for writing anything to support student input
            if (String(userAns || '').trim().length > 0) {
              correctCount++
            }
          } else {
            // Default string based check
            const normalizedUser = String(userAns || '').trim().toLowerCase()
            const normalizedCorrect = String(q.answer).trim().toLowerCase()
            if (normalizedUser === normalizedCorrect) {
              correctCount++
            }
          }
        } else if (section.type === 'put-words-in-order') {
          const normUser = normalizeSentence(String(userAns || ''))
          const normAns = normalizeSentence(String(q.answer || ''))
          if (normUser && normUser === normAns) {
            correctCount++
          }
        } else {
          // String based fill-in-the-blank / matching
          const normalizedUser = String(userAns || '').trim().toLowerCase()
          const normalizedCorrect = String(q.answer).trim().toLowerCase()
          if (normalizedUser === normalizedCorrect) {
            correctCount++
          }
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
    setUserAnswers({})
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


  const cleanOptionText = (text: string, oIdx: number) => {
    const prefix = String.fromCharCode(65 + oIdx);
    const regex = new RegExp(`^${prefix}\\s*[.\\u3001]\\s*`, 'i');
    return text.replace(regex, '');
  };


  // Inline parser to render select elements for cloze passages & dialogue
  const parseInlineBlanks = (text: string, section: Section) => {
    const lines = text.split('\n')
    const renderedBlocks: React.ReactNode[] = []

    let inTable = false
    let tableHeaders: string[] = []
    let tableRows: string[][] = []

    const parseLineContent = (lineText: string) => {
      const parts = lineText.split(/(\[\d+\])/g)
      return parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (match) {
          const blankNum = parseInt(match[1], 10)
          const q = section.questions.find(item => item.blankIndex === blankNum)
          if (!q) return part

          const isClozeIndex = section.type === 'cloze-passage'
          const isUserCorrect = isClozeIndex
            ? userAnswers[q.id] !== undefined && userAnswers[q.id] !== '' && Number(userAnswers[q.id]) === Number(q.answer)
            : String(userAnswers[q.id] || '').trim().toLowerCase() === String(q.answer).trim().toLowerCase()

          let selectClass = "ts-inline-select"
          if (section.type === 'dialogue-completion') {
            selectClass += " dialogue-type"
          }
          if (submitted) {
            selectClass += isUserCorrect ? " correct" : " wrong"
          }

          const correctRaw = isClozeIndex
            ? (q.options?.[Number(q.answer)] || '')
            : String(q.answer)
          const correctDisplay = isClozeIndex
            ? cleanOptionText(correctRaw, Number(q.answer))
            : correctRaw

          return (
            <span key={index} className="ts-inline-select-wrapper" style={{ margin: '0 4px', display: 'inline-block' }}>
              <select
                className={selectClass}
                value={(userAnswers[q.id] !== undefined ? String(userAnswers[q.id]) : '') as any}
                disabled={submitted}
                onChange={(e) => handleAnswerChange(q.id, e.target.value, section)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: submitted ? (isUserCorrect ? '#d1fae5' : '#fee2e2') : '#fff',
                  color: '#374151',
                  fontSize: '0.95em',
                  cursor: submitted ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="">({blankNum})</option>
                {section.type === 'cloze-passage' ? (
                  q.options?.map((opt, optIdx) => (
                    <option key={optIdx} value={optIdx}>
                      {opt}
                    </option>
                  ))
                ) : section.type === 'cloze-passage-wordbank' ? (
                  section.wordbank?.map((word, wordIdx) => {
                    const usingQ = section.questions.find(otherQ => String(userAnswers[otherQ.id] || '') === String(word))
                    const showSuffix = usingQ && usingQ.id !== q.id
                    const suffix = showSuffix ? ` (${usingQ.blankIndex})` : ''
                    return (
                      <option key={wordIdx} value={word}>
                        {word}{suffix}
                      </option>
                    )
                  })
                ) : section.type === 'dialogue-completion' ? (
                  section.options?.map((opt, optIdx) => {
                    const usingQ = section.questions.find(otherQ => String(userAnswers[otherQ.id] || '') === String(opt))
                    const showSuffix = usingQ && usingQ.id !== q.id
                    const suffix = showSuffix ? ` (${usingQ.blankIndex})` : ''
                    return (
                      <option key={optIdx} value={opt}>
                        {opt}{suffix}
                      </option>
                    )
                  })
                ) : null}
              </select>
              {submitted && !isUserCorrect && (
                <span className="ts-inline-reveal-word" style={{ marginLeft: '4px', color: '#10b981', fontWeight: 'bold' }}>
                  ({correctDisplay})
                </span>
              )}
            </span>
          )
        }

        // Parse inline formatting (**bold**) for non-blank text
        const boldParts = part.split(/(\*\*.*?\*\*)/g)
        return boldParts.map((bp, bidx) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return <strong key={bidx}>{bp.slice(2, -2)}</strong>
          }
          return bp
        })
      })
    }

    const flushTable = (key: string | number) => {
      if (tableRows.length > 0 || tableHeaders.length > 0) {
        renderedBlocks.push(
          <div key={`table-${key}`} className="ts-passage-table-wrapper">
            <table className="ts-passage-table">
              {tableHeaders.length > 0 && (
                <thead>
                  <tr>
                    {tableHeaders.map((h, i) => (
                      <th key={i}>
                        {parseLineContent(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rowIndex) => {
                  const diff = tableHeaders.length - row.length
                  return (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => {
                        const isLast = cellIndex === row.length - 1
                        const colSpan = (isLast && diff > 0) ? diff + 1 : undefined
                        return (
                          <td key={cellIndex} colSpan={colSpan} style={colSpan ? { textAlign: 'center' } : undefined}>
                            {parseLineContent(cell)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
        tableHeaders = []
        tableRows = []
      }
      inTable = false
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).slice(1, -1)

        if (cells.every(c => /^:-*-*:*$/.test(c) || /^-+$/.test(c))) {
          continue
        }

        if (!inTable) {
          inTable = true
          tableHeaders = cells
        } else {
          tableRows.push(cells)
        }
      } else {
        if (inTable) {
          flushTable(i)
        }

        if (line) {
          if (section.type === 'dialogue-completion') {
            renderedBlocks.push(
              <span key={i} style={{ display: 'inline' }}>
                {parseLineContent(line)}
              </span>
            )
          } else {
            renderedBlocks.push(
              <p key={i} style={{ margin: '12px 0', minHeight: 'auto' }}>
                {parseLineContent(line)}
              </p>
            )
          }
        } else {
          renderedBlocks.push(
            <div key={`empty-${i}`} style={{ minHeight: '12px' }} />
          )
        }
      }
    }

    if (inTable) {
      flushTable('end')
    }

    return renderedBlocks
  }

  const renderPromptText = (text?: string) => {
    if (!text) return null
    const parts = text.split(/(<u>.*?<\/u>)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('<u>') && part.endsWith('</u>')) {
        return <u key={idx}>{part.slice(3, -4)}</u>
      }
      return part
    })
  }

  // Render question types dynamically
  const renderQuestion = (q: Question, section: Section, index: number) => {
    let isUserCorrect = false
    if (section.type === 'multiple-choice') {
      isUserCorrect = userAnswers[q.id] !== undefined && Number(userAnswers[q.id]) === Number(q.answer)
    } else if (section.type === 'true-false') {
      isUserCorrect = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '' && String(userAnswers[q.id]) === String(q.answer)
    } else if (section.type === 'reading-comprehension') {
      if (q.type === 'multiple-choice') {
        isUserCorrect = userAnswers[q.id] !== undefined && Number(userAnswers[q.id]) === Number(q.answer)
      } else {
        isUserCorrect = String(userAnswers[q.id] || '').trim().length > 0
      }
    } else if (section.type === 'cloze-passage') {
      isUserCorrect = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '' && Number(userAnswers[q.id]) === Number(q.answer)
    } else if (section.type === 'short-answer') {
      isUserCorrect = userAnswers[q.id] !== undefined && String(userAnswers[q.id]).trim() === String(q.answer).trim()
    } else if (section.type === 'fill-in-the-blank-firstletter') {
      const ans = String(q.answer).trim().toLowerCase()
      const userAns = String(userAnswers[q.id] || '').trim().toLowerCase()
      isUserCorrect = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '' && (
        userAns === ans ||
        (ans.length > 1 && userAns === ans.substring(1))
      )
    } else if (section.type === 'put-words-in-order') {
      const normUser = normalizeSentence(String(userAnswers[q.id] || ''))
      const normAns = normalizeSentence(String(q.answer || ''))
      isUserCorrect = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '' && normUser === normAns
    } else {
      isUserCorrect = String(userAnswers[q.id] || '').trim().toLowerCase() === String(q.answer).trim().toLowerCase()
    }

    switch (section.type) {
      case 'fill-in-the-blank-wordbank': {
        const parts = (q.prompt || '').split(/______/)
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">
                {renderPromptText(parts[0])}
                <select
                  className="ts-wordbank-select"
                  value={(userAnswers[q.id] !== undefined ? String(userAnswers[q.id]) : '') as any}
                  disabled={submitted}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value, section)}
                >
                  <option value="">-- Choose --</option>
                  {section.wordbank?.map(word => {
                    const usingQIdx = section.questions.findIndex(otherQ => userAnswers[otherQ.id] === word)
                    const showSuffix = usingQIdx !== -1 && section.questions[usingQIdx].id !== q.id
                    const suffix = showSuffix ? ` (${usingQIdx + 1})` : ''
                    return (
                      <option key={word} value={word}>
                        {word}{suffix}
                      </option>
                    )
                  })}
                </select>
                {renderPromptText(parts[1])}
              </span>
            </div>

            {submitted && (
              <div className="ts-feedback-detail">
                {!isUserCorrect && (
                  <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{String(q.answer)}</strong></p>
                )}
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'definition-matching': {
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span className="ts-question-prompt">
                <span className="ts-question-num">{index + 1}.</span> {renderPromptText(q.prompt)}
              </span>
              <select
                className="ts-wordbank-select"
                value={(userAnswers[q.id] !== undefined ? String(userAnswers[q.id]) : '') as any}
                disabled={submitted}
                onChange={(e) => handleAnswerChange(q.id, e.target.value, section)}
              >
                <option value="">-- Choose Word --</option>
                {section.wordbank?.map(word => {
                  const usingQIdx = section.questions.findIndex(otherQ => userAnswers[otherQ.id] === word)
                  const showSuffix = usingQIdx !== -1 && section.questions[usingQIdx].id !== q.id
                  const suffix = showSuffix ? ` (${usingQIdx + 1})` : ''
                  return (
                    <option key={word} value={word}>
                      {word}{suffix}
                    </option>
                  )
                })}
              </select>
            </div>

            {submitted && (
              <div className="ts-feedback-detail">
                {!isUserCorrect && (
                  <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{String(q.answer)}</strong></p>
                )}
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'true-false': {
        const userVal = userAnswers[q.id]
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">{renderPromptText(q.prompt)}</span>
            </div>
            <div className="ts-tf-container" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {[true, false].map((val) => {
                const label = val ? 'T' : 'F'
                let btnClass = "ts-option-btn ts-tf-btn"
                if (userVal === val) btnClass += " selected"
                if (submitted) {
                  if (q.answer === val) btnClass += " correct-reveal"
                  else if (userVal === val) btnClass += " wrong-reveal"
                }
                return (
                  <button
                    key={label}
                    className={btnClass}
                    disabled={submitted}
                    style={{ padding: '6px 20px', minWidth: '60px' }}
                    onClick={() => handleAnswerChange(q.id, val)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div className="ts-feedback-detail">
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'reading-comprehension': {
        const isMultipleChoice = q.type === 'multiple-choice'
        const activeOptIdx = (isMultipleChoice && userAnswers[q.id] !== undefined) ? Number(userAnswers[q.id]) : null

        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">{renderPromptText(q.prompt)}</span>
            </div>

            {isMultipleChoice ? (
              <div className="ts-options-container">
                {q.options?.map((option, oIdx) => {
                  let btnClass = "ts-option-btn"
                  if (activeOptIdx === oIdx) btnClass += " selected"
                  
                  if (submitted) {
                    if (Number(q.answer) === oIdx) {
                      btnClass += " correct-reveal"
                    } else if (activeOptIdx === oIdx) {
                      btnClass += " wrong-reveal"
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      className={btnClass}
                      disabled={submitted}
                      onClick={() => handleAnswerChange(q.id, oIdx)}
                    >
                      <span className="ts-option-letter">{String.fromCharCode(65 + oIdx)}.</span>
                      <span className="ts-option-text">{renderPromptText(cleanOptionText(option, oIdx))}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="ts-short-answer-container" style={{ marginTop: '10px' }}>
                <textarea
                  className="ts-blank-input"
                  style={{ width: '100%', minHeight: '80px', padding: '10px', boxSizing: 'border-box' }}
                  value={String(userAnswers[q.id] || '')}
                  disabled={submitted}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Type your response here..."
                />
              </div>
            )}

            {submitted && (
              <div className="ts-feedback-detail">
                {!isMultipleChoice && (
                  <p className="ts-correct-ans-reveal">Sample Answer: <strong className="ts-reveal-word">{String(q.answer)}</strong></p>
                )}
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'cloze-passage':
      case 'cloze-passage-wordbank':
      case 'dialogue-completion': {
        const isClozeIndex = section.type === 'cloze-passage'
        const correctDisplay = isClozeIndex
          ? (q.options?.[Number(q.answer)] || '')
          : String(q.answer)

        const userDisplay = isClozeIndex
          ? (userAnswers[q.id] !== undefined && userAnswers[q.id] !== '' ? q.options?.[Number(userAnswers[q.id])] : '--')
          : (userAnswers[q.id] || '--')

        return (
          <div key={q.id} className={`ts-question-card ${isUserCorrect ? 'correct' : 'wrong'}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">Blank ({q.blankIndex}):</span>
              <span className="ts-question-prompt">
                Your Answer: <strong className="ts-user-ans">{String(userDisplay)}</strong>
              </span>
            </div>
            <div className="ts-feedback-detail">
              {!isUserCorrect && (
                <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{correctDisplay}</strong></p>
              )}
              {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
              {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
            </div>
          </div>
        )
      }

      case 'fill-in-the-blank-firstletter': {
        const parts = (q.prompt || '').split(/______/)
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">
                {parts[0]}
                <input
                  type="text"
                  className="ts-blank-input"
                  value={(userAnswers[q.id] !== undefined ? String(userAnswers[q.id]) : '') as any}
                  disabled={submitted}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="type here..."
                />
                {parts[1]}
              </span>
            </div>

            {submitted && (
              <div className="ts-feedback-detail">
                {!isUserCorrect && (
                  <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{String(q.answer)}</strong></p>
                )}
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'multiple-choice': {
        const activeOptIdx = userAnswers[q.id] !== undefined ? Number(userAnswers[q.id]) : null
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">{renderPromptText(q.prompt)}</span>
            </div>

            <div className="ts-options-container">
              {q.options?.map((option, oIdx) => {
                let btnClass = "ts-option-btn"
                if (activeOptIdx === oIdx) btnClass += " selected"
                
                if (submitted) {
                  if (Number(q.answer) === oIdx) {
                    btnClass += " correct-reveal"
                  } else if (activeOptIdx === oIdx) {
                    btnClass += " wrong-reveal"
                  }
                }

                return (
                  <button
                    key={oIdx}
                    className={btnClass}
                    disabled={submitted}
                    onClick={() => handleAnswerChange(q.id, oIdx)}
                  >
                    <span className="ts-option-letter">{String.fromCharCode(65 + oIdx)}.</span>
                    <span className="ts-option-text">{renderPromptText(cleanOptionText(option, oIdx))}</span>
                  </button>
                )
              })}
            </div>

            {submitted && (
              <div className="ts-feedback-detail">
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'short-answer': {
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">{renderPromptText(q.prompt || '')}</span>
            </div>

            <div className="ts-short-answer-container" style={{ marginTop: '10px' }}>
              <input
                type="text"
                className="ts-blank-input"
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '6px' }}
                value={String(userAnswers[q.id] || '')}
                disabled={submitted}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder="Type your answer here..."
              />
            </div>

            {submitted && (
              <div className="ts-feedback-detail">
                {!isUserCorrect && (
                  <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{String(q.answer)}</strong></p>
                )}
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'put-words-in-order': {
        const availableBlocks = parseWordBlocks(q.prompt)
        const selectedIndices = selectedBlocksMap[q.id] || []
        const userVal = String(userAnswers[q.id] || '')

        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">
                <span style={{ fontSize: '0.85em', color: '#64748b', fontWeight: 500, marginRight: '8px' }}>
                  (Click words to form sentence)
                </span>
              </span>
            </div>

            {/* Available Word Blocks / Scrambled Pool */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', marginBottom: '14px' }}>
              {availableBlocks.map((block, bIdx) => {
                const isUsed = selectedIndices.includes(bIdx)
                return (
                  <button
                    key={bIdx}
                    disabled={submitted || isUsed}
                    className="ts-option-btn"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      opacity: isUsed ? 0.35 : 1,
                      cursor: (submitted || isUsed) ? 'default' : 'pointer',
                      border: '1.5px solid #cbd5e1',
                      background: isUsed ? '#f1f5f9' : '#ffffff',
                      color: isUsed ? '#94a3b8' : '#334155',
                      boxShadow: isUsed ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onClick={() => {
                      if (submitted || isUsed) return
                      const newIndices = [...selectedIndices, bIdx]
                      setSelectedBlocksMap(prev => ({ ...prev, [q.id]: newIndices }))
                      const newAns = formatSentenceFromBlocks(newIndices.map(i => availableBlocks[i]))
                      handleAnswerChange(q.id, newAns, section)
                    }}
                  >
                    {block}
                  </button>
                )
              })}
            </div>

            {/* Assembled Sentence Display */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px', minHeight: '44px', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#f8fafc' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: userVal ? '#1e293b' : '#94a3b8', flex: 1 }}>
                {userVal || <span style={{ fontWeight: 400, fontStyle: 'italic' }}>Click word blocks above to form sentence...</span>}
              </div>

              {!submitted && userVal && (
                <button
                  type="button"
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedBlocksMap(prev => ({ ...prev, [q.id]: [] }))
                    handleAnswerChange(q.id, '', section)
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Assembled Chips / Tokens Preview when clicked */}
            {selectedIndices.length > 0 && !submitted && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '4px' }}>Selected:</span>
                {selectedIndices.map((bIdx, pos) => (
                  <span
                    key={pos}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Click to remove"
                    onClick={() => {
                      const newIndices = selectedIndices.filter((_, p) => p !== pos)
                      setSelectedBlocksMap(prev => ({ ...prev, [q.id]: newIndices }))
                      const newAns = formatSentenceFromBlocks(newIndices.map(i => availableBlocks[i]))
                      handleAnswerChange(q.id, newAns, section)
                    }}
                  >
                    {availableBlocks[bIdx]} ✕
                  </span>
                ))}
              </div>
            )}

            {submitted && (
              <div className="ts-feedback-detail">
                {!isUserCorrect && (
                  <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{String(q.answer)}</strong></p>
                )}
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <div key={q.id} className="ts-question-card">
            <p>Unsupported question type: {section.type}</p>
          </div>
        )
    }
  }

  const renderPassage = (passageText: string) => {
    const lines = passageText.split('\n')
    const renderedBlocks: React.ReactNode[] = []
    
    let inTable = false
    let tableHeaders: string[] = []
    let tableRows: string[][] = []

    const renderInlineFormatting = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g)
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>
        }
        return part
      })
    }

    const renderSentences = (text: string, pIdx: string | number) => {
      const sentences = text.split(/(?<=[.!?])\s+/)
      return sentences.map((sentence, sIdx) => {
        const isHighlighted = highlightedSentence?.paraIdx === pIdx && highlightedSentence?.sentenceIdx === sIdx
        return (
          <span
            key={sIdx}
            className={`ts-passage-sentence ${isHighlighted ? 'highlighted' : ''}`}
            style={{ cursor: 'pointer', borderRadius: '3px', padding: '1px 3px', transition: 'background 0.2s ease' }}
            onClick={() => setHighlightedSentence(prev => prev?.paraIdx === pIdx && prev?.sentenceIdx === sIdx ? null : { paraIdx: pIdx, sentenceIdx: sIdx })}
          >
            {renderInlineFormatting(sentence)}{' '}
          </span>
        )
      })
    }

    const flushTable = (key: string | number) => {
      if (tableRows.length > 0 || tableHeaders.length > 0) {
        renderedBlocks.push(
          <div key={`table-${key}`} className="ts-passage-table-wrapper">
            <table className="ts-passage-table">
              {tableHeaders.length > 0 && (
                <thead>
                  <tr>
                    {tableHeaders.map((h, i) => (
                      <th key={i}>
                        {renderSentences(h, `th-${key}-${i}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rowIndex) => {
                  const diff = tableHeaders.length - row.length
                  return (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => {
                        const isLast = cellIndex === row.length - 1
                        const colSpan = (isLast && diff > 0) ? diff + 1 : undefined
                        return (
                          <td key={cellIndex} colSpan={colSpan} style={colSpan ? { textAlign: 'center' } : undefined}>
                            {renderSentences(cell, `td-${key}-${rowIndex}-${cellIndex}`)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
        tableHeaders = []
        tableRows = []
      }
      inTable = false
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).slice(1, -1)
        
        if (cells.every(c => /^:-*-*:*$/.test(c) || /^-+$/.test(c))) {
          continue
        }

        if (!inTable) {
          inTable = true
          tableHeaders = cells
        } else {
          tableRows.push(cells)
        }
      } else {
        if (inTable) {
          flushTable(i)
        }
        
        if (line.startsWith('[HTML:') && line.endsWith(']')) {
          const rawHtml = line.slice(6, -1)
          renderedBlocks.push(
            <div key={`html-${i}`} dangerouslySetInnerHTML={{ __html: rawHtml }} style={{ margin: '15px 0' }} />
          )
          continue
        }

        if (line) {
          if (line.startsWith('#')) {
            const match = line.match(/^(#+)\s*(.*)$/)
            if (match) {
              const headerLevel = Math.min(match[1].length + 1, 6)
              const content = match[2]
              const Tag = `h${headerLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
              renderedBlocks.push(
                <Tag key={`h-${i}`} style={{ marginBottom: '12px', fontWeight: 'bold', color: '#1e293b' }}>
                  {renderInlineFormatting(content)}
                </Tag>
              )
              continue
            }
          }
          renderedBlocks.push(
            <p key={`p-${i}`} style={{ marginBottom: '12px' }}>
              {renderSentences(line, i)}
            </p>
          )
        }
      }
    }

    if (inTable) {
      flushTable('end')
    }

    return renderedBlocks
  }

  const activeSection = data.sections[activeSectionIdx]

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
            <h1>{data.title}</h1>
            <h2>{data.level}</h2>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="ts-layout">
        {/* Sticky section tabs */}
        <div
          ref={tabsRef}
          className="ts-section-tabs"
          onMouseDown={handleTabsMouseDown}
          onMouseLeave={handleTabsMouseLeave}
          onMouseUp={handleTabsMouseUp}
          onMouseMove={handleTabsMouseMove}
        >
          {data.sections.map((sec, idx) => (
            <button
              key={sec.id}
              className={`ts-section-tab ${activeSectionIdx === idx ? 'active' : ''}`}
              onClick={() => setActiveSectionIdx(idx)}
            >
              <span className="ts-tab-num">{idx + 1}/{data.sections.length}</span>
              <span className="ts-tab-title">{sec.title}</span>
            </button>
          ))}
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
                <p className="ts-instruction">{activeSection.instruction}</p>
              </div>


              {/* Render Dialogue Completion Inline Text */}
              {activeSection.type === 'dialogue-completion' && activeSection.dialogue && (
                <div className="ts-dialogue-completion-container" style={{ margin: '20px 0', padding: '15px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                  {activeSection.dialogue.map((turn, tIdx) => {
                    const elements = parseInlineBlanks(turn.text, activeSection)
                    return (
                      <div key={tIdx} className="ts-dialogue-turn" style={{ margin: '8px 0', lineHeight: '1.6' }}>
                        <strong className="ts-speaker" style={{ color: '#4b5563', marginRight: '8px' }}>{turn.speaker}:</strong>
                        <span className="ts-turn-text">{elements}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Render Cloze Passage Inline Text */}
              {(activeSection.type === 'cloze-passage' || activeSection.type === 'cloze-passage-wordbank') && activeSection.passage && (
                <div className="ts-cloze-passage-container" style={{ margin: '20px 0', padding: '15px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px', lineHeight: '2.2', fontSize: '1.05em' }}>
                  {parseInlineBlanks(activeSection.passage, activeSection)}
                </div>
              )}

              {/* Render Reading/True-False Passage */}
              {(activeSection.type === 'reading-comprehension' || activeSection.type === 'true-false' || activeSection.type === 'fill-in-the-blank-wordbank') && activeSection.passage && (
                <div className="ts-reading-comprehension-passage" style={{ margin: '20px 0', padding: '20px', background: '#fcfcfc', borderLeft: '4px solid #3b82f6', borderRadius: '4px', lineHeight: '1.8', fontSize: '1.05em', fontStyle: 'italic', color: '#374151' }}>
                  {renderPassage(activeSection.passage)}
                </div>
              )}

              {/* Questions List */}
              <div className="ts-questions-list">
                {activeSection.questions.map((q, qIdx) => {
                  // For inline questions, don't show the feedback cards before submission
                  if ((activeSection.type === 'cloze-passage' || activeSection.type === 'cloze-passage-wordbank' || activeSection.type === 'dialogue-completion') && !submitted) {
                    return null
                  }
                  return renderQuestion(q, activeSection, qIdx)
                })}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="ts-footer-actions" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {!submitted ? (
              activeSectionIdx < data.sections.length - 1 ? (
                <>
                  {activeSectionIdx > 0 && (
                    <button
                      className="ts-submit-btn ts-prev-btn"
                      onClick={() => setActiveSectionIdx(prev => prev - 1)}
                      style={{ maxWidth: '80px' }}
                    >
                      &lt;
                    </button>
                  )}
                  <button
                    className="ts-submit-btn ts-next-btn"
                    onClick={() => setActiveSectionIdx(prev => prev + 1)}
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
                      onClick={() => setActiveSectionIdx(prev => prev - 1)}
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
        <div className="ts-modal-overlay">
          <div className="ts-modal-card">
            <h2 className="ts-modal-title">Ready to Begin?</h2>
            {remainingAttempts > 0 ? (
              <>
                <p className="ts-modal-text">
                  This is your <strong>{getOrdinal(6 - remainingAttempts)}</strong> attempt today. You have a maximum of <strong>5</strong> attempts daily.
                </p>
                <p className="ts-modal-subtext">Are you ready to start the test?</p>
                <div className="ts-modal-buttons">
                  <button className="ts-modal-btn yes" onClick={handleStartTest}>Yes, start!</button>
                  <button className="ts-modal-btn no" onClick={() => navigate('/dashboard')}>No, go back</button>
                </div>
              </>
            ) : (
              <>
                <p className="ts-modal-text">
                  You have <strong>no attempts</strong> left today. Please come back tomorrow!
                </p>
                <div className="ts-modal-buttons">
                  <button className="ts-modal-btn back" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                  {isAdmin && (
                    <button className="ts-modal-btn yes" style={{ backgroundColor: '#10b981', color: '#fff' }} onClick={handleResetAttempts}>
                      Reset Attempts (Admin)
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showConfirmSubmitModal && (
        <div className="ts-modal-overlay">
          <div className="ts-modal-card">
            <h2 className="ts-modal-title">Confirm Submission</h2>
            <p className="ts-modal-text">
              Scores of 70 to 89 earn 1 coin; scores of 90 and above earn 2 coins.
            </p>
            <p className="ts-modal-subtext">Proceed to check?</p>
            <div className="ts-modal-buttons">
              <button className="ts-modal-btn yes" onClick={() => {
                setShowConfirmSubmitModal(false)
                handleSubmit()
              }}>Yes</button>
              <button className="ts-modal-btn no" onClick={() => setShowConfirmSubmitModal(false)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
