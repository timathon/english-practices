import React from 'react'
import type { TestSheetData } from './TestSheetTypes'
import {
  renderFormattedInlineText,
  renderPromptText,
  formatOptionWithLetter
} from './testSheetUtils'

interface TestSheetPrintViewProps {
  data: TestSheetData
}

export function TestSheetPrintView({ data }: TestSheetPrintViewProps) {
  const renderPrintPassage = (passageText: string, isCloze: boolean = false) => {
    const lines = passageText.split('\n')
    const renderedBlocks: React.ReactNode[] = []
    
    let inTable = false
    let tableHeaders: string[] = []
    let tableRows: string[][] = []

    const parseLine = (lineText: string) => {
      const trimmed = lineText.trim()
      if (trimmed.startsWith('[HTML:') && trimmed.endsWith(']')) {
        const rawHtml = trimmed.slice(6, -1)
        return <div key="html" className="ts-print-html-block" dangerouslySetInnerHTML={{ __html: rawHtml }} />
      }

      if (isCloze) {
        const parts = lineText.split(/(\[\d+\])/g)
        return parts.map((part, index) => {
          const match = part.match(/^\[(\d+)\]$/)
          if (match) {
            const blankNum = match[1]
            return <span key={index} className="ts-print-blank"> ___({blankNum})___ </span>
          }
          return <span key={`text-${index}`}>{renderFormattedInlineText(part)}</span>
        })
      }

      return renderFormattedInlineText(lineText)
    }

    const flushTable = (key: string | number) => {
      if (tableRows.length > 0 || tableHeaders.length > 0) {
        renderedBlocks.push(
          <div key={`table-${key}`} className="ts-print-table-wrapper">
            <table className="ts-print-table">
              {tableHeaders.length > 0 && (
                <thead>
                  <tr>
                    {tableHeaders.map((h, i) => (
                      <th key={i}>{parseLine(h)}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{parseLine(cell)}</td>
                    ))}
                  </tr>
                ))}
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
        if (inTable) flushTable(i)
        if (line) {
          if (line.startsWith('[HTML:') && line.endsWith(']')) {
            const rawHtml = line.slice(6, -1)
            renderedBlocks.push(
              <div key={`html-${i}`} className="ts-print-html-block" dangerouslySetInnerHTML={{ __html: rawHtml }} />
            )
            continue
          }
          if (line.startsWith('#')) {
            const match = line.match(/^(#+)\s*(.*)$/)
            if (match) {
              renderedBlocks.push(
                <div key={`h-${i}`} className="ts-print-passage-heading">
                  {renderFormattedInlineText(match[2])}
                </div>
              )
              continue
            }
          }
          renderedBlocks.push(
            <p key={`p-${i}`} className="ts-print-passage-p">
              {parseLine(line)}
            </p>
          )
        }
      }
    }

    if (inTable) flushTable('end')
    return renderedBlocks
  }

  return (
    <div className="ts-print-document">
      <div className="ts-print-header">
        <div className="ts-print-title-group">
          <h1 className="ts-print-title">{data.title}</h1>
          <span className="ts-print-subtitle">({data.level})</span>
        </div>
        <div className="ts-print-meta-info">
          <span>姓名: ____________</span>
          <span>班级: ____________</span>
          <span>学号: ____________</span>
          <span>得分: ____________</span>
        </div>
      </div>

      <div className="ts-print-columns">
        {data.sections.map((sec, sIdx) => (
          <section key={sec.id || sIdx} className="ts-print-section">
            <div className="ts-print-section-header">
              <div className="ts-print-sec-title">
                {sec.title}
              </div>
              {sec.instruction && (
                <div className="ts-print-sec-instruction">{sec.instruction}</div>
              )}
            </div>

            {/* Wordbank or Matching options if present */}
            {(sec.wordbank || sec.options) && sec.type !== 'dialogue-completion' && (
              <div className="ts-print-box">
                <div className="ts-print-box-title">【 {sec.type === 'matching' || sec.type === 'definition-matching' ? '匹配备选选项 / Options' : '词汇备选框 / Word Bank'} 】</div>
                <div className="ts-print-wordbank-list">
                  {(sec.options || sec.wordbank)?.map((w, wIdx) => (
                    <span key={wIdx} className="ts-print-word-item">{formatOptionWithLetter(w, wIdx)}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Dialogue completion options if present */}
            {sec.type === 'dialogue-completion' && sec.options && sec.options.length > 0 && (
              <div className="ts-print-box">
                <div className="ts-print-box-title">【 补全对话备选选项 / Options 】</div>
                <div className="ts-print-dialogue-options-grid">
                  {sec.options.map((opt, oIdx) => (
                    <div key={oIdx} className="ts-print-dialogue-opt-item">
                      {formatOptionWithLetter(opt, oIdx)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dialogue body */}
            {sec.type === 'dialogue-completion' && sec.dialogue && (
              <div className="ts-print-dialogue">
                {sec.dialogue.map((turn, tIdx) => {
                  const parts = turn.text.split(/(\[\d+\])/g)
                  return (
                    <div key={tIdx} className="ts-print-dialogue-turn">
                      <strong>{turn.speaker}: </strong>
                      <span>
                        {parts.map((p, pIdx) => {
                          const m = p.match(/^\[(\d+)\]$/)
                          if (m) {
                            return <span key={pIdx} className="ts-print-blank"> ___({m[1]})___ </span>
                          }
                          return <span key={pIdx}>{renderFormattedInlineText(p)}</span>
                        })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Passage for cloze or reading */}
            {sec.passage && (
              <div className="ts-print-passage">
                {renderPrintPassage(sec.passage, sec.type === 'cloze-passage' || sec.type === 'cloze-passage-wordbank')}
              </div>
            )}

            {/* Cloze questions options list */}
            {sec.type === 'cloze-passage' && (
              <div className="ts-print-cloze-questions">
                {sec.questions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="ts-print-cloze-q-row">
                    <span className="ts-print-q-num">({q.blankIndex || qIdx + 1})</span>
                    <div className="ts-print-options-grid">
                      {q.options?.map((opt, oIdx) => (
                        <span key={oIdx} className="ts-print-option-item">
                          {formatOptionWithLetter(opt, oIdx)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* General questions list for other types */}
            {sec.type !== 'cloze-passage' && sec.type !== 'cloze-passage-wordbank' && sec.type !== 'dialogue-completion' && (
              <div className="ts-print-questions-list">
                {sec.questions.map((q, qIdx) => {
                  if (sec.type === 'multiple-choice' || (sec.type === 'reading-comprehension' && q.type === 'multiple-choice')) {
                    return (
                      <div key={q.id || qIdx} className="ts-print-q-card">
                        <div className="ts-print-q-prompt">
                          <span className="ts-print-q-prefix">( &nbsp;&nbsp;&nbsp; ) {qIdx + 1}.</span> {renderPromptText(q.prompt)}
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="ts-print-options-grid">
                            {q.options.map((opt, oIdx) => (
                              <span key={oIdx} className="ts-print-option-item">
                                {formatOptionWithLetter(opt, oIdx)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  if (sec.type === 'fill-in-the-blank-wordbank') {
                    return (
                      <div key={q.id || qIdx} className="ts-print-q-card">
                        <div className="ts-print-q-prompt">
                          <span className="ts-print-q-prefix">{qIdx + 1}.</span>{' '}
                          {renderPromptText(q.prompt?.replace(/_{2,}/g, ' _______________ '))}
                        </div>
                      </div>
                    )
                  }

                  if (sec.type === 'definition-matching' || sec.type === 'matching' || sec.type === 'true-false') {
                    return (
                      <div key={q.id || qIdx} className="ts-print-q-card">
                        <div className="ts-print-q-prompt">
                          <span className="ts-print-q-prefix">( &nbsp;&nbsp;&nbsp; ) {qIdx + 1}.</span> {renderPromptText(q.prompt)}
                        </div>
                      </div>
                    )
                  }

                  if (sec.type === 'put-words-in-order') {
                    return (
                      <div key={q.id || qIdx} className="ts-print-q-card">
                        <div className="ts-print-q-prompt">
                          <span className="ts-print-q-prefix">{qIdx + 1}.</span> [ {q.prompt} ]
                        </div>
                        <div className="ts-print-answer-line">答: ________________________________________________________________</div>
                      </div>
                    )
                  }

                  if (sec.type === 'fill-in-the-blank-firstletter') {
                    return (
                      <div key={q.id || qIdx} className="ts-print-q-card">
                        <div className="ts-print-q-prompt">
                          <span className="ts-print-q-prefix">{qIdx + 1}.</span> {renderPromptText(q.prompt)}
                        </div>
                      </div>
                    )
                  }

                  // Default or Short Answer
                  return (
                    <div key={q.id || qIdx} className="ts-print-q-card">
                      <div className="ts-print-q-prompt">
                        <span className="ts-print-q-prefix">{qIdx + 1}.</span> {renderPromptText(q.prompt)}
                      </div>
                      <div className="ts-print-answer-line">答: ________________________________________________________________</div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
