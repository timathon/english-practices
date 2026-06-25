import { useState, useEffect } from 'react'
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

export function WritingMapShell({ data, textbook, unit }: WritingMapShellProps) {
  // Normalize both formats into a unified sections array
  const sections: { section: string; tree: any }[] = isSingleSection(data)
    ? [{ section: data.section, tree: data.tree }]
    : data.sections

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

  const activeSection = sections[activeIdx]

  // Build the data object MindMapShell expects
  const mindMapData: SingleSectionData = {
    level: data.level,
    part: data.part,
    section: activeSection.section,
    tree: activeSection.tree,
    writingPrompt: data.writingPrompt,
    tts: data.tts,
  }

  const handleSelectChange = (val: number) => {
    setActiveIdx(val)
    localStorage.setItem(storageKey, String(val))
  }

  // Dropdown select — only rendered when there are multiple sections, passed into MindMapShell header
  const dropdown = sections.length > 1 ? (
    <div style={{ position: 'relative', display: 'inline-block', width: '200px', height: '32px', margin: '4px 0' }}>
      <select
        value={activeIdx}
        size={dropdownSize}
        onChange={(e) => handleSelectChange(Number(e.target.value))}
        onBlur={() => setDropdownSize(1)}
        style={{
          padding: '6px 12px',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          background: '#1e293b',
          color: '#fff',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          position: 'absolute',
          top: '0',
          left: '0',
          zIndex: 100,
          height: dropdownSize > 1 ? 'auto' : '32px',
        }}
      >
        {sections.map((sec, idx) => (
          <option key={sec.section} value={idx} style={{ background: '#1e293b', color: '#fff', padding: '4px 8px' }}>
            {sec.section}
          </option>
        ))}
      </select>
    </div>
  ) : undefined

  return (
    <MindMapShell
      key={`wm-${activeIdx}`}
      data={mindMapData}
      textbook={textbook}
      unit={unit}
      isWritingMap={true}
      headerSlot={dropdown}
    />
  )
}
