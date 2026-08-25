import type React from 'react'
import type { Question, Section } from './TestSheetTypes'
import {
  isAnswerCorrect,
  renderPromptText,
  cleanOptionText,
  formatOptionWithLetter,
  parseWordBlocks,
  formatSentenceFromBlocks
} from './testSheetUtils'

interface TestSheetQuestionItemProps {
  q: Question
  section: Section
  index: number
  submitted: boolean
  userAnswers: Record<string, string | number | boolean>
  selectedBlocksMap: Record<string, number[]>
  setSelectedBlocksMap: React.Dispatch<React.SetStateAction<Record<string, number[]>>>
  handleAnswerChange: (qId: string, value: string | number | boolean, section?: Section) => void
}

export function TestSheetQuestionItem({
  q,
  section,
  index,
  submitted,
  userAnswers,
  selectedBlocksMap,
  setSelectedBlocksMap,
  handleAnswerChange
}: TestSheetQuestionItemProps) {
  const isUserCorrect = isAnswerCorrect(userAnswers[q.id], q.answer, section.type, q.type)

  switch (section.type) {
    case 'fill-in-the-blank-wordbank': {
      const promptText = q.prompt || ''
      const parts = promptText.split(/_{2,}/)
      return (
        <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
          <div className="ts-question-header">
            <span className="ts-question-num">{index + 1}.</span>
            <span className="ts-question-prompt">
              {parts.map((part, pIdx) => (
                <span key={pIdx}>
                  {renderPromptText(part)}
                  {pIdx < parts.length - 1 && (
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
                  )}
                </span>
              ))}
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

    case 'matching':
    case 'definition-matching': {
      const optionsList = section.options || section.wordbank || []
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
              <option value="">-- Choose Option --</option>
              {optionsList.map((opt, optIdx) => {
                const usingQIdx = section.questions.findIndex(otherQ => String(userAnswers[otherQ.id]) === String(opt))
                const showSuffix = usingQIdx !== -1 && section.questions[usingQIdx].id !== q.id
                const suffix = showSuffix ? ` (${usingQIdx + 1})` : ''
                return (
                  <option key={optIdx} value={opt}>
                    {formatOptionWithLetter(opt, optIdx)}{suffix}
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
      const promptText = q.prompt || ''
      const parts = promptText.split(/_{2,}/)
      const currentAnsRaw = String(userAnswers[q.id] || '')
      const currentAnswersList = currentAnsRaw.includes('|||')
        ? currentAnsRaw.split('|||')
        : (parts.length - 1 > 1 ? currentAnsRaw.split(' ') : [currentAnsRaw])

      const handleBlankChange = (blankIdx: number, val: string) => {
        if (parts.length - 1 === 1) {
          handleAnswerChange(q.id, val)
        } else {
          const nextList = []
          for (let b = 0; b < parts.length - 1; b++) {
            nextList.push(b === blankIdx ? val : (currentAnswersList[b] || ''))
          }
          handleAnswerChange(q.id, nextList.join('|||'))
        }
      }

      return (
        <div key={q.id} className={`ts-question-card ${submitted ? (isUserCorrect ? 'correct' : 'wrong') : ''}`}>
          <div className="ts-question-header">
            <span className="ts-question-num">{index + 1}.</span>
            <span className="ts-question-prompt">
              {parts.map((part, pIdx) => {
                const val = currentAnswersList[pIdx] || ''
                return (
                  <span key={pIdx}>
                    {renderPromptText(part)}
                    {pIdx < parts.length - 1 && (
                      <input
                        type="text"
                        className="ts-blank-input"
                        value={val}
                        disabled={submitted}
                        onChange={(e) => handleBlankChange(pIdx, e.target.value)}
                        placeholder="type here..."
                      />
                    )}
                  </span>
                )
              })}
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
