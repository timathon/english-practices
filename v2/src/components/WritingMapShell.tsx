import { useState, useEffect, useMemo } from 'react'
import { MindMapShell } from './MindMapShell'
import './WritingMapShell.css'

interface SingleSectionData {
  level: string
  part: string
  section: string
  tree: any
  writingPrompt?: string
  tts?: { by: string }
}

interface MultiSectionData {
  level: string
  part: string
  sections: { section: string; tree: any }[]
  writingPrompt?: string
  tts?: { by: string }
}

type WritingMapData = SingleSectionData | MultiSectionData

function isSingleSection(data: WritingMapData): data is SingleSectionData {
  return 'tree' in data && 'section' in data
}

interface WritingMapShellProps {
  data: WritingMapData
  textbook: string
  unit: string
}

interface PrintTreeColProps {
  badge: string
  badgeType: 'basic' | 'adv'
  tree: any
  lang: 'en' | 'cn'
}

function inlineFormat(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '__BR_TAG__')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/__BR_TAG__/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/_{4,}/g, '<span class="wm-print-blank">________________</span>')
}

function splitPromptColumns(md: string): string[] {
  if (!md) return []
  const parts = md
    .split(/<!--\s*col(?:umn)?\s*-->|===col===|---col---/i)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [md]
}

function renderMarkdownToHtml(md: string): string {
  if (!md) return ''
  const lines = md.trim().split(/\r?\n/)
  const htmlParts: string[] = []

  let inTable = false
  let tableRows: string[][] = []
  let inBlockquote = false
  let quoteLines: string[] = []
  let inList = false
  let listItems: string[] = []
  let listType: 'ul' | 'ol' = 'ul'

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return
    let tableHtml = '<table class="wm-print-table">'
    if (tableRows.length > 0) {
      tableHtml += '<thead><tr>'
      tableRows[0].forEach((cell) => {
        tableHtml += `<th>${inlineFormat(cell)}</th>`
      })
      tableHtml += '</tr></thead>'

      if (tableRows.length > 1) {
        tableHtml += '<tbody>'
        for (let i = 1; i < tableRows.length; i++) {
          tableHtml += '<tr>'
          tableRows[i].forEach((cell) => {
            tableHtml += `<td>${inlineFormat(cell)}</td>`
          })
          tableHtml += '</tr>'
        }
        tableHtml += '</tbody>'
      }
    }
    tableHtml += '</table>'
    htmlParts.push(tableHtml)
    tableRows = []
    inTable = false
  }

  const flushQuote = () => {
    if (!inBlockquote || quoteLines.length === 0) return
    htmlParts.push(`<blockquote class="wm-print-quote">${quoteLines.map((l) => inlineFormat(l)).join('<br/>')}</blockquote>`)
    quoteLines = []
    inBlockquote = false
  }

  const flushList = () => {
    if (!inList || listItems.length === 0) return
    const tag = listType
    htmlParts.push(`<${tag} class="wm-print-list">${listItems.map((item) => `<li>${inlineFormat(item)}</li>`).join('')}</${tag}>`)
    listItems = []
    inList = false
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      flushTable()
      flushQuote()
      flushList()
      continue
    }

    // Markdown Table Row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed)) {
        continue
      }
      flushQuote()
      flushList()
      inTable = true
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
      tableRows.push(cells)
      continue
    } else {
      flushTable()
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushList()
      inBlockquote = true
      quoteLines.push(trimmed.replace(/^>\s*/, ''))
      continue
    } else {
      flushQuote()
    }

    // Ordered List
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (inList && listType !== 'ol') flushList()
      inList = true
      listType = 'ol'
      listItems.push(olMatch[2])
      continue
    }

    // Unordered List
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (ulMatch) {
      if (inList && listType !== 'ul') flushList()
      inList = true
      listType = 'ul'
      listItems.push(ulMatch[1])
      continue
    }

    flushList()

    // Headings
    if (trimmed.startsWith('### ')) {
      htmlParts.push(`<h4>${inlineFormat(trimmed.slice(4))}</h4>`)
    } else if (trimmed.startsWith('## ')) {
      htmlParts.push(`<h3>${inlineFormat(trimmed.slice(3))}</h3>`)
    } else if (trimmed.startsWith('# ')) {
      htmlParts.push(`<h2>${inlineFormat(trimmed.slice(2))}</h2>`)
    } else {
      htmlParts.push(`<p>${inlineFormat(trimmed)}</p>`)
    }
  }

  flushTable()
  flushQuote()
  flushList()

  return htmlParts.join('')
}

function PrintTreeCol({ badge, badgeType, tree, lang }: PrintTreeColProps) {
  if (!tree) return null

  const rootText = lang === 'en' ? (tree.text || '') : (tree.cn || tree.text || '')
  const paragraphs = Array.isArray(tree.children) ? tree.children : []

  return (
    <div className={`wm-print-col ${badgeType}`}>
      <div className="wm-print-col-header">
        <span className={`wm-print-badge ${badgeType}`}>{badge}</span>
      </div>

      <div className="wm-print-tree-container">
        {/* Root Node */}
        <div className="wm-tree-node-pill root">
          {tree.emoji && <span className="wm-tree-emoji">{tree.emoji}</span>}
          <span className="wm-tree-text">{rootText}</span>
        </div>

        {/* Paragraphs and sentences */}
        {paragraphs.length > 0 && (
          <div className="wm-tree-branches">
            {paragraphs.map((pNode: any, pIdx: number) => {
              const pText = lang === 'en' ? (pNode.text || '') : (pNode.cn || pNode.text || '')
              const sentences = Array.isArray(pNode.children) ? pNode.children : []

              return (
                <div key={pNode.id || `p-${pIdx}`} className="wm-tree-para-group">
                  <div className="wm-tree-node-pill para">
                    {pNode.emoji && <span className="wm-tree-emoji">{pNode.emoji}</span>}
                    <span className="wm-tree-text">{pText}</span>
                  </div>

                  {sentences.length > 0 && (
                    <div className="wm-tree-sentence-branches">
                      {sentences.map((sNode: any, sIdx: number) => {
                        const sText = lang === 'en' ? (sNode.text || '') : (sNode.cn || sNode.text || '')
                        const isGiven = !!sNode.is_given
                        return (
                          <div key={sNode.id || `s-${sIdx}`} className="wm-tree-sentence-item">
                            <div className={`wm-tree-node-pill sentence ${isGiven ? 'is-given' : ''}`}>
                              {sNode.emoji && <span className="wm-tree-emoji">{sNode.emoji}</span>}
                              <span className="wm-tree-text">
                                {isGiven && <span className="wm-print-given-tag">[已给出] </span>}
                                {sText}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function WritingMapShell({ data, textbook, unit }: WritingMapShellProps) {
  // Normalize both formats into a unified sections array
  const sections = useMemo((): { section: string; tree: any }[] => {
    return isSingleSection(data)
      ? [{ section: data.section, tree: data.tree }]
      : data.sections
  }, [data])

  const storageKey = `active-section-${textbook}-${unit}`
  const [activeIdx, setActiveIdx] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const idx = Number(saved)
      if (idx >= 0 && idx < sections.length) {
        return idx
      }
    }
    return 0
  })

  const [dropdownSize, setDropdownSize] = useState(1)

  useEffect(() => {
    if (sections.length > 1) {
      setDropdownSize(sections.length)
      const timer = setTimeout(() => {
        setDropdownSize(1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [sections.length])

  // Build the data object MindMapShell expects
  const mindMapData = useMemo((): SingleSectionData => {
    const activeSection = sections[activeIdx] || sections[0]
    return {
      level: data.level,
      part: data.part,
      section: activeSection.section,
      tree: activeSection.tree,
      writingPrompt: data.writingPrompt,
      tts: data.tts,
    }
  }, [data, sections, activeIdx])

  const handleSelectChange = (val: number) => {
    setActiveIdx(val)
    localStorage.setItem(storageKey, String(val))
  }

  // Identify basic and advanced sections for printing
  const basicSection = useMemo(() => {
    return sections.find(s => /basic|model 1|基础/i.test(s.section)) || sections[0]
  }, [sections])

  const advSection = useMemo(() => {
    return sections.find(s => /adv|model 2|高级|进阶/i.test(s.section)) || (sections.length > 1 ? sections[1] : sections[0])
  }, [sections])

  // Header controls with Model Select + Print Button
  const headerSlot = (
    <div className="wm-header-controls">
      {sections.length > 1 ? (
        <div className="wm-select-container">
          <select
            value={activeIdx}
            size={dropdownSize}
            onChange={(e) => handleSelectChange(Number(e.target.value))}
            onBlur={() => setDropdownSize(1)}
            className="wm-model-select"
            style={{ height: dropdownSize > 1 ? 'auto' : '32px' }}
          >
            {sections.map((sec, idx) => (
              <option key={sec.section} value={idx} style={{ background: '#1e293b', color: '#fff', padding: '4px 8px' }}>
                {sec.section}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', padding: '6px 0' }}>
          {sections[0]?.section || (data as SingleSectionData).section}
        </span>
      )}

      <button
        type="button"
        className="wm-print-btn no-print"
        onClick={() => window.print()}
        title="Print 4-Section Writing Tree Sheet (打印写作思维树)"
      >
        🖨️
      </button>
    </div>
  )

  const promptText = data.writingPrompt || (data as any).writing_prompt || (data as any).prompt || ''
  const promptColumns = useMemo(() => {
    const cols = splitPromptColumns(promptText)
    return cols.map((c) => renderMarkdownToHtml(c))
  }, [promptText])

  return (
    <>
      <MindMapShell
        key={`wm-${activeIdx}`}
        data={mindMapData}
        textbook={textbook}
        unit={unit}
        isWritingMap={true}
        headerSlot={headerSlot}
      />

      {/* 1-Page A4 Landscape Printable Sheet: Upper Prompt + Lower 4 Models */}
      <div className="wm-print-sheet">
        <div className="wm-print-header">
          <h2 className="wm-print-title">
            {data.part}: Writing Map Models
          </h2>
          <span className="wm-print-subtitle">
            {data.level} · 写作任务与范文思维导图
          </span>
        </div>

        {/* Upper Section: Writing Task Prompt with Separator Columns Support */}
        <div className="wm-print-upper-prompt">
          <div className="wm-print-prompt-header">
            <span className="wm-print-prompt-badge">📝 Writing Task Prompt (写作要求)</span>
          </div>
          {promptColumns.length > 1 ? (
            <div
              className="wm-print-prompt-grid"
              style={{
                gridTemplateColumns: `repeat(${Math.min(promptColumns.length, 4)}, 1fr)`,
              }}
            >
              {promptColumns.map((colHtml, cIdx) => (
                <div
                  key={`p-col-${cIdx}`}
                  className="wm-print-prompt-col"
                  dangerouslySetInnerHTML={{ __html: colHtml }}
                />
              ))}
            </div>
          ) : (
            <div
              className="wm-print-prompt-content"
              dangerouslySetInnerHTML={{
                __html:
                  promptColumns[0] ||
                  '<p>Please refer to the unit writing guidelines and study the following basic and advanced model structures.</p>',
              }}
            />
          )}
        </div>

        {/* Lower Section: 4 Model Trees */}
        <div className="wm-print-lower-models">
          <div className="wm-print-grid-cols">
            {/* Section 1: Basic Model in English */}
            <PrintTreeCol
              badge="1. Basic Model (EN)"
              badgeType="basic"
              tree={basicSection?.tree}
              lang="en"
            />

            {/* Section 2: Advanced Model in English */}
            <PrintTreeCol
              badge="2. Advanced Model (EN)"
              badgeType="adv"
              tree={advSection?.tree}
              lang="en"
            />

            {/* Section 3: Advanced Model in Chinese */}
            <PrintTreeCol
              badge="3. Advanced Model (CN)"
              badgeType="adv"
              tree={advSection?.tree}
              lang="cn"
            />

            {/* Section 4: Basic Model in Chinese */}
            <PrintTreeCol
              badge="4. Basic Model (CN)"
              badgeType="basic"
              tree={basicSection?.tree}
              lang="cn"
            />
          </div>
        </div>
      </div>
    </>
  )
}
