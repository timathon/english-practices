import React from 'react'
import type { Section, HighlightedSentence } from './TestSheetTypes'
import {
  isAnswerCorrect,
  cleanOptionText,
  renderFormattedInlineText
} from './testSheetUtils'

interface TestSheetInteractivePassageProps {
  passageText: string
  highlightedSentence: HighlightedSentence | null
  setHighlightedSentence: React.Dispatch<React.SetStateAction<HighlightedSentence | null>>
}

export function TestSheetInteractivePassage({
  passageText,
  highlightedSentence,
  setHighlightedSentence
}: TestSheetInteractivePassageProps) {
  const lines = passageText.split('\n')
  const renderedBlocks: React.ReactNode[] = []
  
  let inTable = false
  let tableHeaders: string[] = []
  let tableRows: string[][] = []

  const renderInlineFormatting = (text: string) => {
    return renderFormattedInlineText(text)
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
          <div key={`html-${i}`} className="ts-html-passage-block" dangerouslySetInnerHTML={{ __html: rawHtml }} style={{ margin: '15px 0', width: '100%', overflowX: 'auto' }} />
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

  return <>{renderedBlocks}</>
}

interface TestSheetInlineBlanksPassageProps {
  text: string
  section: Section
  userAnswers: Record<string, string | number | boolean>
  submitted: boolean
  handleAnswerChange: (qId: string, value: string | number | boolean, section?: Section) => void
}

export function TestSheetInlineBlanksPassage({
  text,
  section,
  userAnswers,
  submitted,
  handleAnswerChange
}: TestSheetInlineBlanksPassageProps) {
  const lines = text.split('\n')
  const renderedBlocks: React.ReactNode[] = []

  let inTable = false
  let tableHeaders: string[] = []
  let tableRows: string[][] = []

  const parseLineContent = (lineText: string) => {
    const trimmed = lineText.trim()
    if (trimmed.startsWith('[HTML:') && trimmed.endsWith(']')) {
      const rawHtml = trimmed.slice(6, -1)
      return <div key="html-block" className="ts-html-passage-block" style={{ width: '100%', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: rawHtml }} />
    }
    const parts = lineText.split(/(\[\d+\])/g)
    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/)
      if (match) {
        const blankNum = parseInt(match[1], 10)
        const q = section.questions.find(item => item.blankIndex === blankNum)
        if (!q) return part

        const isClozeIndex = section.type === 'cloze-passage'
        const isUserCorrect = isAnswerCorrect(userAnswers[q.id], q.answer, section.type, q.type)

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
                (section.options || section.wordbank)?.map((opt, optIdx) => {
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

      // Parse inline formatting (**bold** and <u>underline</u>) for non-blank text
      return <span key={`text-${index}`}>{renderFormattedInlineText(part)}</span>
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

  return <>{renderedBlocks}</>
}
