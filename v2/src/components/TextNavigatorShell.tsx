import { useState } from 'react'
import { MindMapShell } from './MindMapShell'

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
}

export function TextNavigatorShell({ data, textbook, unit }: TextNavigatorShellProps) {
  // Normalize both formats into a unified sections array
  const sections: { section: string; tree: any }[] = isSingleSection(data)
    ? [{ section: data.section, tree: data.tree }]
    : data.sections

  const [activeIdx, setActiveIdx] = useState(0)
  const activeSection = sections[activeIdx]

  // Build the data object MindMapShell expects
  const mindMapData: SingleSectionData = {
    level: data.level,
    part: data.part,
    section: activeSection.section,
    tree: activeSection.tree,
    ...(isSingleSection(data) ? { writingPrompt: data.writingPrompt, tts: data.tts } : {}),
  }

  // Tab bar — only rendered when there are multiple sections, passed into MindMapShell header
  const tabBar = sections.length > 1 ? (
    <div style={{
      display: 'flex',
      gap: '4px',
      overflowX: 'auto',
      alignItems: 'flex-end',
      height: '100%',
      paddingBottom: '2px',
    }}>
      {sections.map((sec, idx) => (
        <button
          key={sec.section}
          onClick={() => setActiveIdx(idx)}
          style={{
            padding: '4px 14px',
            border: 'none',
            borderBottom: idx === activeIdx
              ? '2px solid var(--accent, #6366f1)'
              : '2px solid transparent',
            background: idx === activeIdx
              ? 'rgba(255,255,255,0.08)'
              : 'transparent',
            color: idx === activeIdx
              ? 'var(--text-h, #fff)'
              : 'var(--text-muted, #aaa)',
            fontWeight: idx === activeIdx ? 700 : 400,
            fontSize: '0.78rem',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          {sec.section}
        </button>
      ))}
    </div>
  ) : undefined

  return (
    <MindMapShell
      key={`tn-${activeIdx}`}
      data={mindMapData}
      textbook={textbook}
      unit={unit}
      isWritingMap={false}
      headerSlot={tabBar}
    />
  )
}
