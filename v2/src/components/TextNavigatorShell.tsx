import { useState, useEffect, useMemo } from 'react'
import { MindMapShell } from './MindMapShell'
import './TextNavigatorShell.css'

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
}

type TextNavigatorData = SingleSectionData | MultiSectionData

function isSingleSection(data: TextNavigatorData): data is SingleSectionData {
  return 'tree' in data && 'section' in data
}

interface TextNavigatorShellProps {
  data: TextNavigatorData
  textbook: string
  unit: string
  practiceId?: string
}

interface TnPrintTreeColProps {
  badge: string
  tree: any
  lang: 'en' | 'cn'
}

function TnPrintTreeNode({ node, lang, depth = 0 }: { node: any; lang: 'en' | 'cn'; depth?: number }) {
  if (!node) return null

  const isEn = lang === 'en'
  const rawText = isEn ? (node.text || '') : (node.cn || node.text || '')

  // If speaker is defined and we are in EN mode (and text doesn't already start with speaker):
  const speakerPrefix = isEn && node.speaker && !rawText.toLowerCase().startsWith(node.speaker.toLowerCase() + ':')
    ? `${node.speaker}: `
    : ''

  const children = Array.isArray(node.children) ? node.children : []
  const hasChildren = children.length > 0
  const isGiven = !!node.is_given

  return (
    <div className={`tn-tree-node-item depth-${depth}`}>
      <div className={`tn-tree-node-pill level-${depth} ${hasChildren ? 'has-children' : 'is-leaf'} ${isGiven ? 'is-given' : ''}`}>
        {node.emoji && <span className="tn-tree-emoji">{node.emoji}</span>}
        <span className="tn-tree-text">
          {speakerPrefix && <strong className="tn-tree-speaker">{speakerPrefix}</strong>}
          {isGiven && <span className="tn-print-given-tag">[已给出] </span>}
          {rawText}
        </span>
      </div>

      {hasChildren && (
        <div className="tn-tree-branches">
          {children.map((childNode: any, cIdx: number) => (
            <TnPrintTreeNode
              key={childNode.id || `c-${depth}-${cIdx}`}
              node={childNode}
              lang={lang}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TnPrintTreeCol({ badge, tree, lang }: TnPrintTreeColProps) {
  if (!tree) return null

  return (
    <div className={`tn-print-col lang-${lang}`}>
      <div className="tn-print-col-header">
        <span className={`tn-print-badge lang-${lang}`}>{badge}</span>
      </div>
      <div className="tn-print-tree-container">
        <TnPrintTreeNode node={tree} lang={lang} depth={0} />
      </div>
    </div>
  )
}

export function TextNavigatorShell({ data, textbook, unit, practiceId }: TextNavigatorShellProps) {
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
      ...(isSingleSection(data) ? { writingPrompt: data.writingPrompt, tts: data.tts } : {}),
    }
  }, [data, sections, activeIdx])

  const handleSelectChange = (val: number) => {
    setActiveIdx(val)
    localStorage.setItem(storageKey, String(val))
  }

  // Header controls with Section Select + Print Button
  const headerSlot = (
    <div className="tn-header-controls">
      {sections.length > 1 ? (
        <div className="tn-select-container">
          <select
            value={activeIdx}
            size={dropdownSize}
            onChange={(e) => handleSelectChange(Number(e.target.value))}
            onBlur={() => setDropdownSize(1)}
            className="tn-model-select"
            style={{ height: dropdownSize > 1 ? 'auto' : '32px' }}
          >
            {sections.map((sec, idx) => (
              <option key={sec.section} value={idx} style={{ background: '#1e293b', color: '#fff', padding: '4px 8px' }}>
                [{idx + 1}/{sections.length}] {sec.section}
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
        className="tn-print-btn no-print"
        onClick={() => window.print()}
        title="Print All Sections Translation Sheet (打印全文双语对照折叠练习单)"
      >
        🖨️
      </button>
    </div>
  )

  return (
    <>
      <MindMapShell
        key={`tn-${activeIdx}`}
        data={mindMapData}
        textbook={textbook}
        unit={unit}
        practiceId={practiceId}
        isWritingMap={false}
        headerSlot={headerSlot}
      />

      {/* Printable Sheet for All Sections */}
      <div className="tn-print-sheet">
        <div className="tn-print-header">
          <h2 className="tn-print-title">
            {data.part}: Text Navigator
          </h2>
          <span className="tn-print-subtitle">
            {data.level} · 双语课文
          </span>
        </div>

        <div className="tn-print-sections-list">
          {sections.map((sec, sIdx) => (
            <div key={sec.section || sIdx} className="tn-print-section-item">
              <div className="tn-print-section-divider">
                <span className="tn-print-sec-badge">
                  [{sIdx + 1}/{sections.length}] {sec.section}
                </span>
              </div>
              <div className="tn-print-grid-cols">
                {/* Left Column: English */}
                <TnPrintTreeCol
                  badge={`[${sIdx + 1}] ${sec.section} — English`}
                  tree={sec.tree}
                  lang="en"
                />
                {/* Right Column: Chinese */}
                <TnPrintTreeCol
                  badge={`[${sIdx + 1}] ${sec.section} — 中文`}
                  tree={sec.tree}
                  lang="cn"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
