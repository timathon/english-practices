import { useState, useEffect, useRef, useMemo } from 'react'
import './ReadingExpressionShell.css'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { usePracticeRecords } from '../hooks/usePracticeRecords'
import { API_URL } from '../lib/auth'
import { cache } from '../lib/cache'
import { trialsTracker } from '../lib/trialsTracker'
import { audioCache } from '../lib/audioCache'
import md5 from 'md5'
import { ArticleReadingModal } from './cloze/ArticleReadingModal'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string) => {
  const hash = md5(sentence);
  return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

interface Thinking {
  keywords?: string[]
  method?: string
  rule?: string
}

interface YBQuestion {
  id: string
  q_index: number
  question_type: string
  prompt: string
  prompt_cn?: string
  target_sentence_index?: number
  thinking?: Thinking
  standard_answer: string
  word_blocks?: string[]
  options?: string[]
  answer?: number
  explanation?: string
}

interface YBChallenge {
  id: string
  title: string
  icon: string
  article_type?: string
  summary?: string
  passage: string[] | string[][]
  passage_cn?: string[] | string[][]
  questions: YBQuestion[]
}

interface ReadingExpressionData {
  level: string
  title: string
  practiceType: string
  storageSuffix?: string
  challenges: YBChallenge[]
}

interface PoolWord {
  id: number
  text: string
  selected: boolean
}

interface SelectedWord {
  poolId: number
  text: string
}

export function ReadingExpressionShell({ data, practiceId, unit, textbook }: { data: ReadingExpressionData; practiceId: string; unit: string; textbook: string }) {
  const challenges = data?.challenges || []
  const [activeChallengeIndex, setActiveChallengeIndex] = useState<number | null>(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0)
  const [invisibleMode, setInvisibleMode] = useState<boolean>(false)
  const [historyModal, setHistoryModal] = useState<{ title: string; logs: any[] } | null>(null)

  // Step state for Q1-Q3 (1: Pick keywords, 2: Locate sentence, 3: Check pronoun transform, 4: Sentence architect)
  const [subStep, setSubStep] = useState<number>(1)
  const [viewingStep, setViewingStep] = useState<number | null>(null)
  const [isStepVerified, setIsStepVerified] = useState<boolean>(false)
  const [stepError, setStepError] = useState<string | null>(null)

  // Step 1: Keywords selection
  const [keywordOptions, setKeywordOptions] = useState<string[]>([])
  const [keywordAnswerIdx, setKeywordAnswerIdx] = useState<number>(0)
  const [selectedKeywordIdx, setSelectedKeywordIdx] = useState<number | null>(null)

  // Step 2: Sentence location
  const [userPickedSentenceIdx, setUserPickedSentenceIdx] = useState<number | null>(null)

  // Step 3: Pronoun transform check
  const [pronounNeededAnswer, setPronounNeededAnswer] = useState<boolean>(false)
  const [userPronounAnswer, setUserPronounAnswer] = useState<boolean | null>(null)

  // Step 4: Sentence architect word blocks
  const [wordPool, setWordPool] = useState<PoolWord[]>([])
  const [userSelection, setUserSelection] = useState<SelectedWord[]>([])

  // Completion state
  const [isQuestionFinished, setIsQuestionFinished] = useState<boolean>(false)
  const [challengeScores, setChallengeScores] = useState<Record<number, boolean>>({})
  const [isChallengeCompleted, setIsChallengeCompleted] = useState<boolean>(false)
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false)

  const activeChallenge = activeChallengeIndex !== null ? challenges[activeChallengeIndex] : null
  const currentQuestion = activeChallenge ? activeChallenge.questions[activeQuestionIndex] : null

  // Flatten sentences for indexing and compatibility
  const flatPassageSentences = useMemo<string[]>(() => {
    if (!activeChallenge?.passage) return []
    if (Array.isArray(activeChallenge.passage[0])) {
      return (activeChallenge.passage as string[][]).flat()
    }
    return activeChallenge.passage as string[]
  }, [activeChallenge])

  // Group sentences into paragraphs for rendering
  const passageParagraphs = useMemo<string[][]>(() => {
    if (!activeChallenge?.passage) return []
    if (Array.isArray(activeChallenge.passage[0])) {
      return activeChallenge.passage as string[][]
    }
    return [activeChallenge.passage as string[]]
  }, [activeChallenge])

  // Article reading & translation modal state
  const [translationModalOpen, setTranslationModalOpen] = useState<boolean>(false)
  const [selectedModalChallenge, setSelectedModalChallenge] = useState<YBChallenge | null>(null)
  const [revealedTranslationIndex, setRevealedTranslationIndex] = useState<number | null>(null)
  const [highlightedSentenceIndex, setHighlightedSentenceIndex] = useState<number | null>(null)
  const [playingSentenceIdx, setPlayingSentenceIdx] = useState<number | null>(null)
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(false)
  const autoPlayNextRef = useRef<boolean>(false)
  const modalSentenceRefs = useRef<{ [idx: number]: HTMLElement | null }>({})
  const sentenceAudioRef = useRef<HTMLAudioElement | null>(null)
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const stopSentenceAudio = () => {
    if (sentenceAudioRef.current) {
      sentenceAudioRef.current.pause()
      sentenceAudioRef.current = null
    }
    setPlayingSentenceIdx(null)
  }

  // Active section adapter for ArticleReadingModal (either active challenge in progress or modal preview)
  const readingModalSection = useMemo(() => {
    const target = activeChallenge || selectedModalChallenge
    if (!target) return null

    const flatSentences = Array.isArray(target.passage[0])
      ? (target.passage as string[][]).flat()
      : (target.passage as string[])

    const flatCn = target.passage_cn
      ? (Array.isArray(target.passage_cn[0]) ? (target.passage_cn as string[][]).flat() : (target.passage_cn as string[]))
      : []

    return {
      title: target.title,
      icon: target.icon,
      filled_text: flatSentences,
      filled_text_cn: flatCn,
      questions: target.questions.map(q => ({
        ...q,
        sentence_index: q.target_sentence_index
      }))
    }
  }, [activeChallenge, selectedModalChallenge])

  const playSentenceAudio = async (text: string, idx: number) => {
    if (!text || !textbook) return

    if (playingSentenceIdx === idx && sentenceAudioRef.current) {
      stopSentenceAudio()
      return
    }

    if (sentenceAudioRef.current) {
      sentenceAudioRef.current.pause()
      sentenceAudioRef.current = null
    }

    const cleanText = text
      .replace(/<[^>]+>/g, '')
      .replace(/\s*[(（][\u4e00-\u9fa5\s/、]+[)）]/g, '')
      .replace(/^#+\s*/, '')
      .trim()
    const url = getAudioUrl(cleanText, textbook)
    setPlayingSentenceIdx(idx)
    setHighlightedSentenceIndex(idx)

    const allSentences = readingModalSection?.filled_text || flatPassageSentences

    try {
      const blob = await audioCache.cacheAudio(url)
      if (blob) {
        const audio = new Audio(URL.createObjectURL(blob))
        sentenceAudioRef.current = audio
        audio.onended = () => {
          if (autoPlayNextRef.current && idx + 1 < allSentences.length) {
            const nextIdx = idx + 1
            const nextSent = allSentences[nextIdx]
            playSentenceAudio(nextSent, nextIdx)
          } else {
            setPlayingSentenceIdx(null)
          }
        }
        audio.play().catch(e => {
          console.warn('Failed to play sentence audio:', e)
          setPlayingSentenceIdx(null)
        })
      } else {
        setPlayingSentenceIdx(null)
      }
    } catch (e) {
      console.warn('Play sentence audio error:', e)
      setPlayingSentenceIdx(null)
    }
  }

  const toggleTranslation = (idx: number) => {
    if (revealedTranslationIndex === idx) {
      setRevealedTranslationIndex(null)
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current)
        translationTimeoutRef.current = null
      }
    } else {
      setRevealedTranslationIndex(idx)
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current)
      translationTimeoutRef.current = setTimeout(() => {
        setRevealedTranslationIndex(null)
      }, 5000)
    }
  }

  const { practiceRecords, setPracticeRecords, getStats } = usePracticeRecords({ practiceId })
  const passageScrollRef = useRef<HTMLDivElement | null>(null)

  // Helper to extract key words STRICTLY from the question prompt itself
  const generateKeywordOptions = (q: YBQuestion) => {
    const rawPrompt = q.prompt.replace(/[?.,!]/g, '').trim()

    // 1. Remove standard wh- question lead-ins to extract the core subject / verb phrase predicate
    // e.g. "How long is the history of Hunan dishes" -> core phrase "history of Hunan dishes"
    // e.g. "What are Hunan dishes well-known for" -> "Hunan dishes, well-known"
    // e.g. "Who invented a new way of writing" -> "invented, new way of writing"
    const leadInPattern = /^(how long is|how long was|how long did|how long does|how many\s+[a-z]+ (did|does|do|is|are)|why did|why does|why do|why is|why are|what is|what was|what are|what were|what did|what does|what do|where is|where was|where did|who is|who was|who did|can the|could the|did the|does the|is the|are the)\s+/i
    
    let subjectPhrase = rawPrompt.replace(leadInPattern, '').trim()
    if (!subjectPhrase) subjectPhrase = rawPrompt

    // Build the cleanest, most natural keyword phrase(s)
    // Core content entities, e.g. "history of Hunan dishes" or "history, Hunan dishes"
    const cleanTokens = subjectPhrase.split(/\s+of\s+|\s+for\s+|\s+to\s+/i)
    const entityKeywords = cleanTokens.length > 1 ? cleanTokens.join(', ') : subjectPhrase
    const correctFinal = entityKeywords || subjectPhrase

    // Generate 2 realistic, distinct distractors that students might mistake as the focus:
    // Distractor 1: Interrogative / question words only (e.g. "How long", "Why", "What")
    const questionWordMatch = rawPrompt.match(/^(how long|how many|why|what|where|when|who|can|did|does|is|are)\b/i)
    const distractor1 = questionWordMatch ? `${questionWordMatch[0]}` : 'the author, main point'

    // Distractor 2: Secondary / generic words or tail fragment
    const words = subjectPhrase.split(/\s+/)
    const distractor2 = words.length > 1 ? words[words.length - 1] : 'the whole story'

    // Ensure 3 distinct, high-quality options
    const rawOptions = [correctFinal, distractor1, distractor2]
    const uniqueOptions = Array.from(new Set(rawOptions.map(s => s.trim()))).filter(Boolean)

    // Fallback if set collapsed
    if (uniqueOptions.length < 3) {
      uniqueOptions.push('the background, passage')
    }

    const finalOptions = uniqueOptions.slice(0, 3).sort(() => Math.random() - 0.5)
    setKeywordOptions(finalOptions)
    setKeywordAnswerIdx(finalOptions.indexOf(correctFinal))
  }

  // Helper to detect if pronoun transform is needed
  const detectPronounTransform = (q: YBQuestion, passage: string[]): boolean => {
    const targetIdx = q.target_sentence_index ?? -1
    const rawTargetSent = targetIdx >= 0 && targetIdx < passage.length ? passage[targetIdx] : ''
    const targetSent = rawTargetSent.replace(/<[^>]+>/g, '')
    
    // Check if original sentence has first-person pronouns
    const hasFirstPerson = /\b(I|me|my|mine|we|us|our|ours)\b/i.test(targetSent)
    // And standard answer uses third-person
    const hasThirdPerson = /\b(he|him|his|she|her|hers|they|them|their)\b/i.test(q.standard_answer)
    
    return q.question_type === 'pronoun_transform' || (hasFirstPerson && hasThirdPerson)
  }

  // Initialize Word Pool for Step 4 (including proper ending punctuation)
  const initWordPool = (q: YBQuestion) => {
    const rawAnswer = q.standard_answer.trim()
    // Extract ending punctuation if any (default to '.' if absent)
    const punctMatch = rawAnswer.match(/([.!?])$/)
    const endPunct = punctMatch ? punctMatch[1] : '.'

    // Split words without ending punctuation
    const wordsOnly = rawAnswer.replace(/[.!?]$/, '').trim().split(/\s+/)

    // Word tokens for building the sentence, explicitly adding the end punctuation as a chip
    const cleanTokens = [...wordsOnly, endPunct]

    // Punctuation noise if needed
    const extraPunct = endPunct === '.' ? '?' : '.'
    const noise = (q.word_blocks || [])
      .filter(w => !cleanTokens.includes(w) && w !== '.' && w !== '?')
      .slice(0, 3)

    const combined = [...cleanTokens, extraPunct, ...noise].sort(() => Math.random() - 0.5)

    const pool = combined.map((word, idx) => ({
      id: idx,
      text: word,
      selected: false
    }))
    setWordPool(pool)
    setUserSelection([])
  }

  // Load question and set up sub-steps
  useEffect(() => {
    if (!currentQuestion || !activeChallenge) return

    setSubStep(1)
    setViewingStep(null)
    setIsStepVerified(false)
    setStepError(null)
    setUserPickedSentenceIdx(null)
    setSelectedKeywordIdx(null)
    setUserPronounAnswer(null)
    setIsQuestionFinished(false)

    // Setup Step 1 options
    generateKeywordOptions(currentQuestion)
    // Setup Step 3 rule
    setPronounNeededAnswer(detectPronounTransform(currentQuestion, flatPassageSentences))
    // Setup Step 4 pool
    initWordPool(currentQuestion)
  }, [activeQuestionIndex, activeChallengeIndex])

  const handleSelectChallenge = (c: any) => {
    if (!invisibleMode) {
      const stats = getStats(c.title)
      if (stats.todayBest === 100) return
      const hasConsumed = trialsTracker.consumeTrial(practiceId, c.id)
      if (!hasConsumed) return
    }

    const idx = challenges.findIndex(item => item.id === c.id || item.title === c.title)
    setActiveChallengeIndex(idx >= 0 ? idx : 0)
    setActiveQuestionIndex(0)
    setChallengeScores({})
    setIsChallengeCompleted(false)
  }

  // Advance to next sub-step after user verification
  const handleNextSubStep = () => {
    setIsStepVerified(false)
    setStepError(null)
    setSubStep(prev => prev + 1)
  }

  // Step 1: Verify Keywords
  const handleVerifyStep1 = () => {
    if (selectedKeywordIdx === null) return
    if (selectedKeywordIdx === keywordAnswerIdx) {
      setStepError(null)
      setIsStepVerified(true)
    } else {
      setStepError('关键词选择有误，请注意题干中的疑问词与核心名词/实体！')
    }
  }

  // Step 2: Sentence Click in Passage
  const handleSentenceClickInPassage = (sIdx: number) => {
    if (subStep !== 2 || isStepVerified) return
    setUserPickedSentenceIdx(sIdx)
    const el = document.getElementById(`yb-sent-${sIdx}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleVerifyStep2 = () => {
    if (!currentQuestion) return
    if (userPickedSentenceIdx === null) {
      setStepError('请先在左侧短文中点击选中包含答案信息的句子！')
      return
    }

    const expectedIdx = currentQuestion.target_sentence_index
    // Allow direct match or adjacent context match
    if (expectedIdx !== undefined && Math.abs(userPickedSentenceIdx - expectedIdx) <= 0) {
      setStepError(null)
      setIsStepVerified(true)
    } else {
      setStepError('定位句偏差较大，请结合第1步关键词在短文中准确定位！')
    }
  }

  // Step 3: Verify Pronoun Transform
  const handleVerifyStep3 = () => {
    if (userPronounAnswer === null) return
    if (userPronounAnswer === pronounNeededAnswer) {
      setStepError(null)
      setIsStepVerified(true)
    } else {
      setStepError(
        pronounNeededAnswer 
          ? '答错了。原句中包含第一人称（如 I/my/we），题目问及第三方时需要转换为第三人称（he/she/they）！'
          : '答错了。原文或题干已是客观陈述/第三人称，直接引用或概括即可，不需要人称转换。'
      )
    }
  }

  // Step 4: Sentence Architect Word Pool Logic
  const handleSelectWord = (word: PoolWord) => {
    if (word.selected || isQuestionFinished) return
    setUserSelection(prev => [...prev, { poolId: word.id, text: word.text }])
    setWordPool(prev => prev.map(w => w.id === word.id ? { ...w, selected: true } : w))
  }

  const handleRemoveWord = (item: SelectedWord) => {
    if (isQuestionFinished) return
    setUserSelection(prev => prev.filter(w => w.poolId !== item.poolId))
    setWordPool(prev => prev.map(w => w.id === item.poolId ? { ...w, selected: false } : w))
  }

  const handleVerifyStep4 = () => {
    if (!currentQuestion) return
    // Join tokens taking care of punctuation attachment (e.g. "word ." -> "word.")
    let userStr = ''
    userSelection.forEach((w) => {
      if (/^[.,!?;:]$/.test(w.text)) {
        userStr += w.text
      } else {
        userStr = userStr ? `${userStr} ${w.text}` : w.text
      }
    })

    const cleanUser = userStr.trim().toLowerCase()
    const cleanTarget = currentQuestion.standard_answer.trim().toLowerCase()

    // Must match exact sentence including punctuation
    const isMatched = cleanUser === cleanTarget

    if (isMatched) {
      setStepError(null)
      setIsQuestionFinished(true)
      setChallengeScores(prev => ({ ...prev, [activeQuestionIndex]: true }))
    } else {
      setStepError('组句顺序、标点或选词有误，请仔细核对语法结构与标点符号！')
    }
  }

  const handleNextQuestion = () => {
    if (!activeChallenge) return
    if (activeQuestionIndex < activeChallenge.questions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1)
    } else {
      const totalQ = activeChallenge.questions.length
      const correctCount = Object.values(challengeScores).filter(Boolean).length
      const finalScore = Math.round((correctCount / totalQ) * 100)

      setIsChallengeCompleted(true)
      saveChallengeScore(finalScore)
    }
  }

  const saveChallengeScore = async (score: number) => {
    if (!activeChallenge) return
    try {
      const unitKey = `${practiceId} (${activeChallenge.title})`
      const res = await fetch(`${API_URL}/api/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          unit: unitKey,
          score,
          unfinished: false
        })
      })
      const j = await res.json()
      if (j.success && j.id) {
        const newRecord = {
          id: j.id,
          unit: unitKey,
          score,
          unfinished: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any
        cache.updateRecord(newRecord)
        setPracticeRecords(prev => [newRecord, ...prev])
      }
    } catch (e) {
      console.error('Failed to sync reading-expression score:', e)
    }
  }

  const mappedChallenges = challenges.map(c => {
    const rawType = c.article_type || ''
    const badgeChar = rawType ? rawType.charAt(0) : (c.title?.includes('说明') ? '说' : (c.title?.includes('记叙') ? '记' : '文'))
    const isShuo = badgeChar === '说'
    return {
      ...c,
      id: c.id,
      title: c.title,
      icon: (
        <span
          className={`yb-type-badge ${isShuo ? 'shuo' : 'ji'}`}
          title={c.article_type || ''}
        >
          {badgeChar}
        </span>
      )
    }
  })

  return (
    <div className={`yb-shell-container ${activeChallengeIndex !== null ? 'active-mode' : ''}`}>
      {activeChallengeIndex === null ? (
        <div className="yb-screen">
          <ShellHeader
            title={data?.title || '阅读与表达'}
            level={data?.level || 'Grade 10'}
            textbook={textbook}
            unit={unit}
            prefix="cloze"
          />

          <InvisibleModeCheckbox
            checked={invisibleMode}
            onChange={setInvisibleMode}
          />

          <ChallengeCardGrid
            challenges={mappedChallenges}
            onStart={handleSelectChallenge}
            onShowHistory={(c) => {
              const stats = getStats(c.title)
              setHistoryModal({
                title: `TODAY - ${c.title}`,
                logs: stats.todayLogs
              })
            }}
            getRemainingTrials={(cId) => trialsTracker.getRemainingTrials(practiceId, cId)}
            getChallengeStatsText={(c) => {
              const stats = getStats(c.title)
              return {
                today: `${stats.todayRuns} Runs | Best: ${stats.todayBest}%`,
                lifetime: `${stats.lifeRuns} Runs | Best: ${stats.lifeBest}%`,
                isTodayBestHigh: stats.todayBest >= 70
              }
            }}
            isLockedToday={(c) => getStats(c.title).todayBest === 100}
            isTitleClickable={(c) => {
              const stats = getStats(c.title)
              return stats.todayBest === 100 || stats.lifeBest === 100
            }}
            onTitleClick={(c) => {
              const originalChallenge = challenges.find((item) => item.id === c.id) || c
              setSelectedModalChallenge(originalChallenge)
              setRevealedTranslationIndex(null)
              setHighlightedSentenceIndex(null)
              setPlayingSentenceIdx(null)
              setTranslationModalOpen(true)
            }}
            flickeringId={null}
            prefix="cloze"
            invisibleMode={invisibleMode}
            onResetTrials={(cId) => {
              trialsTracker.resetTrials(practiceId, cId)
              setPracticeRecords([...practiceRecords])
            }}
          />

          {historyModal && (
            <ShellHistoryModal
              title={historyModal.title}
              onClose={() => setHistoryModal(null)}
              logs={historyModal.logs}
              prefix="cloze"
            />
          )}
        </div>
      ) : isChallengeCompleted ? (
        <div className="yb-complete-screen">
          <div className="yb-complete-card">
            <div className="yb-complete-icon">🎉</div>
            <h2>完成篇章练习！</h2>
            <p className="yb-complete-summary">
              你已完成《{activeChallenge?.title}》的全部阅读与表达题目。
            </p>
            <div className="yb-complete-score">
              得分: {Math.round((Object.values(challengeScores).filter(Boolean).length / (activeChallenge?.questions.length || 1)) * 100)}%
            </div>
            <div className="yb-complete-actions">
              <div className="yb-complete-section primary-action">
                <button
                  className="yb-btn"
                  style={{ background: '#059669', color: '#ffffff' }}
                  onClick={() => {
                    setRevealedTranslationIndex(null)
                    setTranslationModalOpen(true)
                  }}
                >
                  📖 文章翻译与朗读
                </button>
              </div>
              <div className="yb-complete-section secondary-actions">
                <button className="yb-btn primary" onClick={() => handleSelectChallenge(activeChallenge)}>
                  再练一次
                </button>
                <button className="yb-btn" onClick={() => setActiveChallengeIndex(null)}>
                  返回篇章列表
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="yb-active-workspace">
          <header className="yb-active-header">
            <button className="yb-close-btn" onClick={() => setActiveChallengeIndex(null)} title="返回列表">
              ✕
            </button>
            <div
              className={`yb-active-title ${activeChallenge?.summary ? 'has-summary' : ''}`}
              onClick={() => {
                if (activeChallenge?.summary) setShowSummaryModal(true)
              }}
              title={activeChallenge?.summary ? '点击查看短文导读与背景' : undefined}
            >
              {activeChallenge?.title}
              {activeChallenge?.summary && <span className="yb-title-hint-badge">📖 导读</span>}
            </div>
            <div className="yb-active-progress">
              题号 {activeQuestionIndex + 1} / {activeChallenge?.questions.length || 0}
            </div>
          </header>

          <div className="yb-split-viewport">
            {/* Left: Reading Passage Viewport */}
            <div className="yb-passage-pane" ref={passageScrollRef}>
              <div className="yb-passage-content">
                {(() => {
                  let globalSentIdx = 0
                  return passageParagraphs.map((paraSentences, pIdx) => (
                    <p key={pIdx} className="yb-passage-paragraph">
                      {paraSentences.map((sentence) => {
                        const sIdx = globalSentIdx++
                        const isUserPicked = userPickedSentenceIdx === sIdx
                        const isFinalTarget = isQuestionFinished && currentQuestion?.target_sentence_index === sIdx
                        const isPreviousTarget = !isFinalTarget && activeChallenge?.questions
                          .slice(0, activeQuestionIndex)
                          .some(q => q.target_sentence_index === sIdx)

                        return (
                          <span
                            key={sIdx}
                            id={`yb-sent-${sIdx}`}
                            onClick={() => handleSentenceClickInPassage(sIdx)}
                            className={`yb-sentence ${isFinalTarget ? 'target-highlight' : ''} ${isPreviousTarget ? 'previous-target-dimmed' : ''} ${isUserPicked ? 'user-selected' : ''}`}
                            title={subStep === 2 ? '点击选中此句作为定位句' : undefined}
                            dangerouslySetInnerHTML={{ __html: sentence + ' ' }}
                          />
                        )
                      })}
                    </p>
                  ))
                })()}
              </div>
            </div>

            {/* Right: Step-by-Step Interactive Question Pane */}
            <div className="yb-question-pane">
              {/* Step indicator bar */}
              <div className="yb-step-flow-bar">
                {[
                  { num: 1, label: '找关键词' },
                  { num: 2, label: '定位关键句' },
                  { num: 3, label: '人称转换判断' },
                  { num: 4, label: '连词成句' }
                ].map((s) => {
                  const isDone = subStep > s.num || (s.num === 4 && isQuestionFinished)
                  const isCurrent = subStep === s.num && !isQuestionFinished
                  const isSelected = (viewingStep ?? subStep) === s.num
                  const isClickable = isDone || s.num === subStep

                  const statusClass = isCurrent
                    ? 'status-current'
                    : isDone
                    ? 'status-done'
                    : 'status-unavailable'
                  const selectedClass = isSelected ? 'is-selected' : ''

                  return (
                    <div
                      key={s.num}
                      className={`yb-flow-step ${statusClass} ${selectedClass} ${isClickable ? 'clickable' : ''}`}
                      onClick={() => {
                        if (s.num === subStep) {
                          setViewingStep(null)
                        } else if (isDone) {
                          setViewingStep(s.num)
                        }
                      }}
                      title={isDone ? `点击查看第 ${s.num} 步详情（只读回顾）` : undefined}
                    >
                      <span className="yb-flow-num">{s.num}</span>
                      <span className="yb-flow-label">{s.label}</span>
                    </div>
                  )
                })}
              </div>

              <div className="yb-question-prompt">
                <span className="yb-q-num">Q{activeQuestionIndex + 1}.</span> {currentQuestion?.prompt}
              </div>

              {/* Step 1: Pick Keywords */}
              {(viewingStep ?? subStep) === 1 && (
                <div className="yb-step-box">
                  <div className="yb-step-header">
                    <span className="yb-step-badge">步骤 1</span>
                    <span>审题：题干核心关键词</span>
                    {viewingStep !== null && viewingStep !== subStep && (
                      <span className="yb-step-readonly-tag">（回顾已完成步骤）</span>
                    )}
                  </div>
                  <div className="yb-step-options">
                    {keywordOptions.map((opt, idx) => {
                      const isSelected = selectedKeywordIdx === idx
                      const isCorrect = (isStepVerified || subStep > 1) && idx === keywordAnswerIdx
                      const isWrong = !isStepVerified && subStep === 1 && stepError && isSelected
                      const isReadOnly = viewingStep !== null && viewingStep !== subStep

                      return (
                        <div
                          key={idx}
                          className={`yb-step-opt-card ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''} ${(isStepVerified || isReadOnly) ? 'disabled' : ''}`}
                          onClick={() => {
                            if (!isStepVerified && !isReadOnly) {
                              setSelectedKeywordIdx(idx)
                              setStepError(null)
                            }
                          }}
                        >
                          <span className="yb-step-marker">{String.fromCharCode(65 + idx)}.</span>
                          <span>{opt}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="yb-step-check-row">
                    {viewingStep !== null && viewingStep !== subStep ? (
                      <button
                        className="yb-step-btn next-step-btn"
                        onClick={() => setViewingStep(null)}
                      >
                        返回当前步骤 ({subStep}) ➔
                      </button>
                    ) : isStepVerified ? (
                      <button
                        className="yb-step-btn next-step-btn"
                        onClick={handleNextSubStep}
                      >
                        下一步 ➔
                      </button>
                    ) : (
                      <button
                        className="yb-step-btn"
                        disabled={selectedKeywordIdx === null}
                        onClick={handleVerifyStep1}
                      >
                        确认关键词 ➔
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Locate in Passage */}
              {(viewingStep ?? subStep) === 2 && (
                <div className="yb-step-box">
                  <div className="yb-step-header">
                    <span className="yb-step-badge">步骤 2</span>
                    <span>定位：找出答案依据所在的句子</span>
                    {viewingStep !== null && viewingStep !== subStep && (
                      <span className="yb-step-readonly-tag">（回顾已完成步骤）</span>
                    )}
                  </div>
                  <div className={`yb-locator-status ${(userPickedSentenceIdx !== null || subStep > 2) ? 'picked' : ''} ${(isStepVerified || subStep > 2) ? 'verified' : ''}`}>
                    {userPickedSentenceIdx !== null ? (
                      <div>
                        <strong>{(isStepVerified || subStep > 2) ? '✓ 定位正确：' : '已选原句：'}</strong>
                        <span dangerouslySetInnerHTML={{ __html: flatPassageSentences[userPickedSentenceIdx] || '' }} />
                      </div>
                    ) : (
                      <span>👈 请在左侧段落中直接点击选中目标句子</span>
                    )}
                  </div>
                  <div className="yb-step-check-row">
                    {viewingStep !== null && viewingStep !== subStep ? (
                      <button
                        className="yb-step-btn next-step-btn"
                        onClick={() => setViewingStep(null)}
                      >
                        返回当前步骤 ({subStep}) ➔
                      </button>
                    ) : isStepVerified ? (
                      <button
                        className="yb-step-btn next-step-btn"
                        onClick={handleNextSubStep}
                      >
                        下一步 ➔
                      </button>
                    ) : (
                      <button
                        className="yb-step-btn"
                        disabled={userPickedSentenceIdx === null}
                        onClick={handleVerifyStep2}
                      >
                        确认定位句 ➔
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Check Pronoun Transformation */}
              {(viewingStep ?? subStep) === 3 && (
                <div className="yb-step-box">
                  <div className="yb-step-header">
                    <span className="yb-step-badge">步骤 3</span>
                    <span>考法：作答时是否需要进行人称转换？</span>
                    {viewingStep !== null && viewingStep !== subStep && (
                      <span className="yb-step-readonly-tag">（回顾已完成步骤）</span>
                    )}
                  </div>
                  <div className="yb-step-options">
                    {(() => {
                      const isReadOnly = viewingStep !== null && viewingStep !== subStep
                      return (
                        <>
                          <div
                            className={`yb-step-opt-card ${userPronounAnswer === true ? 'selected' : ''} ${(isStepVerified || subStep > 3) && pronounNeededAnswer === true ? 'correct' : ''} ${(isStepVerified || isReadOnly) ? 'disabled' : ''}`}
                            onClick={() => {
                              if (!isStepVerified && !isReadOnly) {
                                setUserPronounAnswer(true)
                                setStepError(null)
                              }
                            }}
                          >
                            <span className="yb-step-marker">A.</span>
                            <span>需要人称转换（原文为第一人称 I/my/we，回答需调整为第三人称 he/she/they）</span>
                          </div>
                          <div
                            className={`yb-step-opt-card ${userPronounAnswer === false ? 'selected' : ''} ${(isStepVerified || subStep > 3) && pronounNeededAnswer === false ? 'correct' : ''} ${(isStepVerified || isReadOnly) ? 'disabled' : ''}`}
                            onClick={() => {
                              if (!isStepVerified && !isReadOnly) {
                                setUserPronounAnswer(false)
                                setStepError(null)
                              }
                            }}
                          >
                            <span className="yb-step-marker">B.</span>
                            <span>不需要人称转换（人称一致或为客观陈述短语，无需代词变形）</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  <div className="yb-step-check-row">
                    {viewingStep !== null && viewingStep !== subStep ? (
                      <button
                        className="yb-step-btn next-step-btn"
                        onClick={() => setViewingStep(null)}
                      >
                        返回当前步骤 ({subStep}) ➔
                      </button>
                    ) : isStepVerified ? (
                      <button
                        className="yb-step-btn next-step-btn"
                        onClick={handleNextSubStep}
                      >
                        下一步 ➔
                      </button>
                    ) : (
                      <button
                        className="yb-step-btn"
                        disabled={userPronounAnswer === null}
                        onClick={handleVerifyStep3}
                      >
                        确认考法 ➔
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Sentence Architect (连词成句) */}
              {(viewingStep ?? subStep) === 4 && (
                <div className="yb-step-box">
                  <div className="yb-step-header">
                    <span className="yb-step-badge">步骤 4</span>
                    <span>连词成句：拼装最终规范英文答句</span>
                    {viewingStep !== null && viewingStep !== subStep && (
                      <span className="yb-step-readonly-tag">（回顾已完成步骤）</span>
                    )}
                  </div>

                  {/* Built sentence bar */}
                  <div className="sa-answer-area">
                    {userSelection.length === 0 ? (
                      <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>点击下方词块连词成句...</span>
                    ) : (
                      userSelection.map((item, idx) => (
                        <button
                          key={idx}
                          className="sa-word-btn-answer"
                          onClick={() => handleRemoveWord(item)}
                          title="点击退回词块"
                        >
                          {item.text}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Word pool */}
                  {!isQuestionFinished && (
                    <div className="sa-word-pool">
                      {wordPool.map((word) => (
                        <button
                          key={word.id}
                          disabled={word.selected}
                          className={`sa-word-btn ${word.selected ? 'selected' : ''}`}
                          onClick={() => handleSelectWord(word)}
                        >
                          {word.text}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isQuestionFinished && (
                    <div className="yb-step-check-row">
                      <button
                        className="yb-step-btn"
                        disabled={userSelection.length === 0}
                        onClick={handleVerifyStep4}
                      >
                        核对答句 ➔
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step Error Alert */}
              {stepError && (
                <div className="yb-step-alert error">
                  ⚠️ {stepError}
                </div>
              )}

              {/* Question Success Banner */}
              {isQuestionFinished && (
                <div className="yb-feedback-panel correct">
                  <div className="yb-feedback-title">
                    🎉 恭喜完成本题全流程！
                  </div>
                  {currentQuestion?.prompt_cn && (
                    <div className="yb-feedback-prompt-cn">
                      <strong>题干翻译：</strong>
                      <span>{currentQuestion.prompt_cn}</span>
                    </div>
                  )}
                  <div>
                    <strong>标准参考答案：</strong>
                    <span className="yb-std-answer">{currentQuestion?.standard_answer}</span>
                  </div>
                  {currentQuestion?.explanation && (
                    <div style={{ marginTop: '0.35rem', color: '#475569' }}>
                      <strong>解析：</strong>{currentQuestion.explanation}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              {isQuestionFinished && (
                <div className="yb-footer-actions">
                  <button onClick={handleNextQuestion} className="yb-submit-btn next">
                    {activeQuestionIndex < (activeChallenge?.questions.length || 0) - 1 ? '下一题 ➔' : '查看篇章成绩 🏆'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 导读 Modal */}
          {showSummaryModal && (
            <div className="yb-modal-overlay" onClick={() => setShowSummaryModal(false)}>
              <div className="yb-modal-card" onClick={e => e.stopPropagation()}>
                <div className="yb-modal-header">
                  <div className="yb-modal-title">
                    <span>📖 短文导读</span>
                    {activeChallenge?.article_type && (
                      <span className="yb-badge-tag">{activeChallenge.article_type}</span>
                    )}
                  </div>
                  <button className="yb-close-btn" onClick={() => setShowSummaryModal(false)}>✕</button>
                </div>
                <div className="yb-modal-body">
                  <div className="yb-modal-article-title">{activeChallenge?.title}</div>
                  <div className="yb-modal-summary-text">
                    {activeChallenge?.summary || '暂无导读内容'}
                  </div>
                </div>
                <div className="yb-modal-footer">
                  <button className="yb-btn primary" onClick={() => setShowSummaryModal(false)}>
                    我知道了
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 文章翻译与朗读 Modal */}
      <ArticleReadingModal
        isOpen={translationModalOpen}
        activeSection={readingModalSection}
        onClose={() => {
          if (sentenceAudioRef.current) sentenceAudioRef.current.pause()
          if (translationTimeoutRef.current) {
            clearTimeout(translationTimeoutRef.current)
            translationTimeoutRef.current = null
          }
          setPlayingSentenceIdx(null)
          setRevealedTranslationIndex(null)
          setHighlightedSentenceIndex(null)
          setTranslationModalOpen(false)
          setSelectedModalChallenge(null)
        }}
        revealedTranslationIndex={revealedTranslationIndex}
        toggleTranslation={toggleTranslation}
        highlightedSentenceIndex={highlightedSentenceIndex}
        setHighlightedSentenceIndex={setHighlightedSentenceIndex}
        playingSentenceIdx={playingSentenceIdx}
        playSentenceAudio={playSentenceAudio}
        autoPlayNext={autoPlayNext}
        setAutoPlayNext={setAutoPlayNext}
        autoPlayNextRef={autoPlayNextRef}
        modalSentenceRefs={modalSentenceRefs}
      />
    </div>
  )
}
