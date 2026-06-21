import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

interface Question {
  id: string
  prompt: string
  answer: string | number
  options?: string[]
  translation?: string
  explanation?: string
}

interface Section {
  id: string
  title: string
  instruction: string
  type: 'fill-in-the-blank-wordbank' | 'fill-in-the-blank-firstletter' | 'multiple-choice' | string
  wordbank?: string[]
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
}

export function TestSheetShell({ data, practiceId, unit, textbook }: TestSheetShellProps) {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  // State
  const [showStartModal, setShowStartModal] = useState(true)
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false)
  const [activeSectionIdx, setActiveSectionIdx] = useState(0)

  const handleResetAttempts = () => {
    trialsTracker.resetTrials(practiceId, 'test-sheet')
    setRemainingAttempts(trialsTracker.getRemainingTrials(practiceId, 'test-sheet'))
  }
  const [userAnswers, setUserAnswers] = useState<Record<string, string | number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [gainedXp, setGainedXp] = useState(0)
  const [gainedLove, setGainedLove] = useState(0)
  const [gainedCoins, setGainedCoins] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState(() => trialsTracker.getRemainingTrials(practiceId, 'test-sheet'))
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const recordIdPromiseRef = useRef<Promise<string> | null>(null)
  const hasFinishedRef = useRef(false)

  // Preload SFX
  useEffect(() => {
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`)
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/error.mp3`)
  }, [])

  // Scroll to top when active section changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeSectionIdx])

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
        unfinished: !isFinished
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
  const handleAnswerChange = (qId: string, value: string | number, section?: Section) => {
    if (submitted) return
    setUserAnswers(prev => {
      const next = { ...prev, [qId]: value }
      if (section && typeof value === 'string' && value !== "") {
        section.questions.forEach(otherQ => {
          if (otherQ.id !== qId && next[otherQ.id] === value) {
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
        
        if (section.type === 'multiple-choice') {
          if (userAns !== undefined && Number(userAns) === Number(q.answer)) {
            correctCount++
          }
        } else {
          // String based fill-in-the-blank
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

  // Helper to check if a word from the word bank is currently chosen
  const isWordUsed = (word: string, currentSection: Section) => {
    return currentSection.questions.some(q => userAnswers[q.id] === word)
  }

  // Render question types dynamically
  const renderQuestion = (q: Question, section: Section, index: number) => {
    const isUserCorrect = section.type === 'multiple-choice'
      ? userAnswers[q.id] !== undefined && Number(userAnswers[q.id]) === Number(q.answer)
      : String(userAnswers[q.id] || '').trim().toLowerCase() === String(q.answer).trim().toLowerCase()

    switch (section.type) {
      case 'fill-in-the-blank-wordbank': {
        const parts = q.prompt.split(/______/)
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">
                {parts[0]}
                <select
                  className="ts-wordbank-select"
                  value={userAnswers[q.id] || ''}
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
                {parts[1]}
              </span>
            </div>

            {submitted && (
              <div className="ts-feedback-detail">
                {!isUserCorrect && (
                  <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{q.answer}</strong></p>
                )}
                {q.translation && <p className="ts-translation">🇨🇳 {q.translation}</p>}
                {q.explanation && <p className="ts-explanation">💡 {q.explanation}</p>}
              </div>
            )}
          </div>
        )
      }

      case 'fill-in-the-blank-firstletter': {
        const parts = q.prompt.split(/______/)
        return (
          <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
            <div className="ts-question-header">
              <span className="ts-question-num">{index + 1}.</span>
              <span className="ts-question-prompt">
                {parts[0]}
                <input
                  type="text"
                  className="ts-blank-input"
                  value={userAnswers[q.id] || ''}
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
                  <p className="ts-correct-ans-reveal">Correct answer: <strong className="ts-reveal-word">{q.answer}</strong></p>
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
              <span className="ts-question-prompt">{q.prompt}</span>
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
                    <span className="ts-option-text">{option}</span>
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

      default:
        return (
          <div key={q.id} className="ts-question-card">
            <p>Unsupported question type: {section.type}</p>
          </div>
        )
    }
  }

  const activeSection = data.sections[activeSectionIdx]

  return (
    <div className="ts-shell-container">
      {/* Header bar */}
      <header className="ts-header">
        <div className="ts-header-nav">
          <Link to="/dashboard" className="ts-home-btn">🏠</Link>
          <div className="ts-title-wrapper">
            <h1>{data.title}</h1>
            <h2>{data.level}</h2>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="ts-layout">
        {/* Navigation sidebar */}
        <aside className="ts-sidebar">
          <h3>Test Sections</h3>
          <div className="ts-section-tabs">
            {data.sections.map((sec, idx) => (
              <button
                key={sec.id}
                className={`ts-section-tab ${activeSectionIdx === idx ? 'active' : ''}`}
                onClick={() => setActiveSectionIdx(idx)}
              >
                <span className="ts-tab-num">{idx + 1}</span>
                <span className="ts-tab-title">{sec.title}</span>
              </button>
            ))}
          </div>

          {submitted && (
            <div className="ts-score-summary">
              <h4>Graded Result</h4>
              <div className="ts-score-badge" style={{ borderColor: score >= 60 ? '#10b981' : '#ef4444' }}>
                <span className="ts-score-num" style={{ color: score >= 60 ? '#10b981' : '#ef4444' }}>{score}%</span>
              </div>
              <button className="ts-retry-btn" onClick={handleRetry}>Try Again</button>
            </div>
          )}
        </aside>

        {/* Content sheet */}
        <main className="ts-sheet-paper">
          {activeSection && (
            <div className="ts-section-view">
              <div className="ts-section-header">
                <h2>{activeSection.title}</h2>
                <p className="ts-instruction">{activeSection.instruction}</p>
              </div>

              {/* Word Bank Area */}
              {activeSection.type === 'fill-in-the-blank-wordbank' && activeSection.wordbank && (
                <div className="ts-wordbank-pool">
                  {activeSection.wordbank.map(word => {
                    const isUsed = isWordUsed(word, activeSection)
                    return (
                      <span key={word} className={`ts-wordbank-chip ${isUsed ? 'used' : ''}`}>
                        {word}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Questions List */}
              <div className="ts-questions-list">
                {activeSection.questions.map((q, qIdx) => renderQuestion(q, activeSection, qIdx))}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="ts-footer-actions">
            {!submitted ? (
              activeSectionIdx < data.sections.length - 1 ? (
                <button
                  className="ts-submit-btn ts-next-btn"
                  onClick={() => setActiveSectionIdx(prev => prev + 1)}
                >
                  Next Section
                </button>
              ) : (
                <button
                  className="ts-submit-btn"
                  onClick={() => setShowConfirmSubmitModal(true)}
                >
                  Submit Test
                </button>
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
