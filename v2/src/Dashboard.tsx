import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSession, API_URL } from './lib/auth'
import { Link, useLocation } from 'react-router-dom'
import { cache } from './lib/cache'
import { PetDashboardWidget } from './components/PetDashboardWidget'
import { getTextbookEmoji } from './lib/textbooks'
import { mistakeService, type Mistake } from './lib/mistakeService'
import { MistakeReviewer } from './components/MistakeReviewer'
import './Dashboard.css'

export function useHorizontalScrollRef() {
  const elRef = useRef<HTMLDivElement | null>(null)

  return useCallback((el: HTMLDivElement | null) => {
    if (el) {
      elRef.current = el
      if ((el as any).__horizontalScrollCleanup) return

      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return
        const prevScrollLeft = el.scrollLeft
        el.scrollLeft += e.deltaY
        if (el.scrollLeft !== prevScrollLeft) {
          e.preventDefault()
        }
      }

      let isDown = false
      let startX = 0
      let scrollLeft = 0
      let hasDragged = false

      const onPointerDown = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return
        isDown = true
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
        startX = e.clientX
        scrollLeft = el.scrollLeft
        hasDragged = false
      }

      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        if (!isDown) return
        isDown = false
        el.style.cursor = 'grab'
        el.style.userSelect = ''
        
        try {
          if (el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId)
          }
        } catch {}
        
        if (hasDragged) {
          e.preventDefault()
          e.stopPropagation()
          // Ensure hasDragged is reset after event propagation completes
          setTimeout(() => {
            hasDragged = false
          }, 50)
        }
      }

      const onPointerMove = (e: PointerEvent) => {
        if (!isDown || e.pointerType !== 'mouse') return
        const dx = e.clientX - startX
        const walk = dx * 1.5
        
        if (Math.abs(dx) > 10 && !hasDragged) {
          hasDragged = true
          try {
            el.setPointerCapture(e.pointerId)
          } catch {}
        }

        if (hasDragged) {
          e.preventDefault()
          el.scrollLeft = scrollLeft - walk
        }
      }

      const onClick = (e: MouseEvent) => {
        if (hasDragged) {
          e.preventDefault()
          e.stopPropagation()
          hasDragged = false
        }
      }

      el.addEventListener('wheel', onWheel, { passive: false })
      el.addEventListener('pointerdown', onPointerDown)
      el.addEventListener('pointerup', onPointerUp, true)
      el.addEventListener('pointermove', onPointerMove)
      el.addEventListener('click', onClick, true)

      el.style.cursor = 'grab'

      ;(el as any).__horizontalScrollCleanup = () => {
        el.removeEventListener('wheel', onWheel)
        el.removeEventListener('pointerdown', onPointerDown)
        el.removeEventListener('pointerup', onPointerUp, true)
        el.removeEventListener('pointermove', onPointerMove)
        el.removeEventListener('click', onClick, true)
      }
    } else {
      if (elRef.current && (elRef.current as any).__horizontalScrollCleanup) {
        ;(elRef.current as any).__horizontalScrollCleanup()
        delete (elRef.current as any).__horizontalScrollCleanup
      }
      elRef.current = null
    }
  }, [])
}

const PRACTICE_TYPE_ICONS: Record<string, string> = {
  'Vocab Master': '🔥',
  'Spelling Hero': '✏️',
  'Sentence Architect': '🏗️',
  'Recall Map': '🗺️',
  'Writing Map': '📝',
}

const translatePracticeName = (name: string): string => {
  const norm = name.trim();
  if (norm.startsWith('Text Navigator')) {
    if (norm === 'Text Navigator 2 Start Up') return '阅读导航2 Start Up';
    if (norm === 'Text Navigator 3 Speed Up') return '阅读导航3 Speed Up';
    return norm.replace('Text Navigator', '阅读导航');
  }
  if (norm.startsWith('Writing Map')) {
    if (norm === 'Writing Map Model 1') return '写作导图 Model 1';
    if (norm === 'Writing Map Model 2') return '写作导图 Model 2';
    return norm.replace('Writing Map', '写作导图');
  }
  if (norm.startsWith('Passage Decoder')) {
    if (norm.toLowerCase().endsWith('w')) return '*练习册翻译*';
    return '课文翻译';
  }
  const map: Record<string, string> = {
    'Recall Map': '单元总览',
    'Vocab Guide': '词汇导学',
    'Vocab Master': '词汇大师',
    'Spelling Hero': '拼写达人',
    'Grammar Wizard': '语法向导',
    'Sentence Architect': '句子架构师',
  };
  return map[norm] || map[norm.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')] || norm;
};

function FadingPracticeName({ name, showChinese }: { name: string; showChinese: boolean }) {
  const cnName = translatePracticeName(name);
  return (
    <span className="db-practice-name-grid">
      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
        {name}
      </span>
      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
        {cnName}
      </span>
    </span>
  );
}

function FadingMistakeBadge({ type, showChinese }: { type: string; showChinese: boolean }) {
  const formatted = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const cnName = translatePracticeName(formatted);
  return (
    <span className="db-mistake-type-badge-grid">
      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
        {formatted}
      </span>
      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
        {cnName}
      </span>
    </span>
  );
}


const LS_KEY = 'ep-last-units'

function getLastUnit(tb: string): string | undefined {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}')[tb] } catch { return undefined }
}

function saveLastUnit(tb: string, unit: string) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    localStorage.setItem(LS_KEY, JSON.stringify({ ...map, [tb]: unit }))
  } catch { }
}

function BookSection({ tb, units, records, initialUnit, initialPage, showChinese }: { tb: string; units: Record<string, any[]>; records: any[]; initialUnit?: string; initialPage?: string; showChinese: boolean }) {
  const lettersScrollRef = useHorizontalScrollRef()
  const unitsScrollRef = useHorizontalScrollRef()
  const unitsContainerRef = useRef<HTMLDivElement | null>(null)

  const setUnitsScrollRef = useCallback((el: HTMLDivElement | null) => {
    unitsScrollRef(el)
    unitsContainerRef.current = el
  }, [unitsScrollRef])
  const unitKeys = Object.keys(units).sort((a, b) => {
    const isStdA = /^[UM]\d+/i.test(a.trim())
    const isStdB = /^[UM]\d+/i.test(b.trim())
    if (isStdA && !isStdB) return -1
    if (!isStdA && isStdB) return 1
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })
  const isRazB = tb === 'RAZ-B'
  const isBThink1 = tb === 'B-THINK1' || tb === 'B-Think1'
  const isBNce2 = tb === 'B-NCE2' || tb === 'B-Nce2'

  const getNce2Unit = (lessonName: string): string => {
    const match = lessonName.match(/^L(\d+)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= 1 && num <= 24) return "U1"
      if (num >= 25 && num <= 48) return "U2"
      if (num >= 49 && num <= 72) return "U3"
      if (num >= 73 && num <= 96) return "U4"
    }
    return "U1"
  }

  const formatUnitDisplay = (unitName: string) => {
    const escapedTb = tb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const prefixReg = new RegExp(`^${escapedTb}\\b`, 'i')
    if (prefixReg.test(unitName)) {
      return unitName.replace(prefixReg, '').trim()
    }
    return unitName
  }

  const getPageStart = (p: any) => {
    const match = p.type.match(/^p\d+/i)
    return match ? match[0].toUpperCase() : ''
  }

  const [activeUnit, setActiveUnit] = useState<string>(() => {
    // Priority: router-state (just navigated back) > localStorage > first unit
    if (initialUnit && unitKeys.includes(initialUnit)) { saveLastUnit(tb, initialUnit); return initialUnit }
    const stored = getLastUnit(tb)
    if (stored && unitKeys.includes(stored)) return stored
    return unitKeys[0] || ''
  })

  const letters = isRazB
    ? Array.from(new Set(unitKeys.map(key => key.trim().charAt(0).toUpperCase()))).sort()
    : []

  const [activeLetter, setActiveLetter] = useState<string>(() => {
    if (!isRazB) return ''
    return activeUnit ? activeUnit.trim().charAt(0).toUpperCase() : (letters[0] || '')
  })

  const nce2Units = isBNce2
    ? Array.from(new Set(unitKeys.map(key => getNce2Unit(key)))).sort()
    : []

  const [activeNce2Unit, setActiveNce2Unit] = useState<string>(() => {
    if (!isBNce2) return ''
    return activeUnit ? getNce2Unit(activeUnit) : 'U1'
  })

  const pageStarts = isBThink1
    ? Array.from(new Set((units[activeUnit] || []).map(p => getPageStart(p)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    : []

  const [activePageStart, setActivePageStart] = useState<string>(() => {
    if (!isBThink1) return ''
    const activeUnitItems = units[activeUnit] || []
    const starts = Array.from(new Set(activeUnitItems.map(p => getPageStart(p)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    if (initialPage && starts.includes(initialPage)) {
      return initialPage
    }
    return starts[0] || ''
  })

  const handleUnitChange = (unit: string) => {
    setActiveUnit(unit)
    saveLastUnit(tb, unit)
  }

  const handleLetterChange = (letter: string) => {
    setActiveLetter(letter)
    const firstUnitForLetter = unitKeys.find(key => key.trim().charAt(0).toUpperCase() === letter)
    if (firstUnitForLetter) {
      handleUnitChange(firstUnitForLetter)
    }
  }

  const handleNce2UnitChange = (u: string) => {
    setActiveNce2Unit(u)
    const firstLesson = unitKeys.find(key => getNce2Unit(key) === u)
    if (firstLesson) {
      handleUnitChange(firstLesson)
    }
  }

  useEffect(() => {
    if (!units[activeUnit] && unitKeys.length > 0) {
      handleUnitChange(unitKeys[0])
    }
  }, [units, activeUnit, unitKeys])

  useEffect(() => {
    if (isRazB && activeUnit) {
      const letter = activeUnit.trim().charAt(0).toUpperCase()
      if (letter && letter !== activeLetter) {
        setActiveLetter(letter)
      }
    }
  }, [activeUnit, isRazB, activeLetter])

  useEffect(() => {
    if (isBNce2 && activeUnit) {
      const u = getNce2Unit(activeUnit)
      if (u && u !== activeNce2Unit) {
        setActiveNce2Unit(u)
      }
    }
  }, [activeUnit, isBNce2, activeNce2Unit])

  useEffect(() => {
    if (isBThink1 && activeUnit) {
      const activeUnitItems = units[activeUnit] || []
      const starts = Array.from(new Set(activeUnitItems.map(p => getPageStart(p)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      if (starts.length > 0 && !starts.includes(activePageStart)) {
        setActivePageStart(starts[0])
      }
    }
  }, [activeUnit, isBThink1, units, activePageStart])

  if (unitKeys.length === 0) return null

  const items = (units[activeUnit] || [])
    .filter((p: any) => !isBThink1 || getPageStart(p) === activePageStart)
    .sort((a: any, b: any) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }))

  const level2Tabs = isBThink1
    ? pageStarts
    : isRazB
      ? unitKeys.filter(unit => unit.trim().charAt(0).toUpperCase() === activeLetter)
      : isBNce2
        ? unitKeys.filter(unit => getNce2Unit(unit) === activeNce2Unit)
        : unitKeys

  const activeLevel2Tab = isBThink1 ? activePageStart : activeUnit

  useEffect(() => {
    const timer = setTimeout(() => {
      if (unitsContainerRef.current) {
        const activeBtn = unitsContainerRef.current.querySelector('.db-tab-btn.active') as HTMLElement
        if (activeBtn) {
          const container = unitsContainerRef.current
          const left = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2)
          container.scrollTo({ left, behavior: 'smooth' })
        }
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [activeLevel2Tab])

  const handleLevel2TabChange = (val: string) => {
    if (isBThink1) {
      setActivePageStart(val)
    } else {
      handleUnitChange(val)
    }
  }

  return (
    <section className="db-book" id={`book-${tb}`}>
      <div className="db-book-header">
        <span className="db-book-emoji">{getTextbookEmoji(tb)}</span>
        <h3 className="db-book-title">{tb}</h3>
        <span className="db-book-count">{unitKeys.length} units</span>
      </div>

      <div>
        {isRazB && (
          <div ref={lettersScrollRef} className="db-letters-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '2px' }}>
            {letters.map(letter => (
              <button
                key={letter}
                onClick={() => handleLetterChange(letter)}
                className={`db-tab-btn ${activeLetter === letter ? 'active' : ''}`}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderBottom: activeLetter === letter ? '2px solid var(--tab-active-text)' : '2px solid transparent',
                  background: activeLetter === letter ? 'var(--accent-bg)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeLetter === letter ? 'bold' : 'normal',
                  color: activeLetter === letter ? 'var(--tab-active-text)' : 'var(--tab-text)',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px'
                }}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {isBThink1 && (
          <div ref={lettersScrollRef} className="db-letters-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '2px' }}>
            {unitKeys.map(unit => (
              <button
                key={unit}
                onClick={() => handleUnitChange(unit)}
                className={`db-tab-btn ${activeUnit === unit ? 'active' : ''}`}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderBottom: activeUnit === unit ? '2px solid var(--tab-active-text)' : '2px solid transparent',
                  background: activeUnit === unit ? 'var(--accent-bg)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeUnit === unit ? 'bold' : 'normal',
                  color: activeUnit === unit ? 'var(--tab-active-text)' : 'var(--tab-text)',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px'
                }}
              >
                {unit}
              </button>
            ))}
          </div>
        )}

        {isBNce2 && (
          <div ref={lettersScrollRef} className="db-letters-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '2px' }}>
            {nce2Units.map(u => (
              <button
                key={u}
                onClick={() => handleNce2UnitChange(u)}
                className={`db-tab-btn ${activeNce2Unit === u ? 'active' : ''}`}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderBottom: activeNce2Unit === u ? '2px solid var(--tab-active-text)' : '2px solid transparent',
                  background: activeNce2Unit === u ? 'var(--accent-bg)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeNce2Unit === u ? 'bold' : 'normal',
                  color: activeNce2Unit === u ? 'var(--tab-active-text)' : 'var(--tab-text)',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px'
                }}
              >
                {u}
              </button>
            ))}
          </div>
        )}

        <div ref={setUnitsScrollRef} className="db-units-tabs" style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
          {level2Tabs.map(tabVal => (
            <button
              key={tabVal}
              onClick={() => handleLevel2TabChange(tabVal)}
              className={`db-tab-btn ${activeLevel2Tab === tabVal ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderBottom: activeLevel2Tab === tabVal ? '3px solid var(--tab-active-text)' : '3px solid transparent',
                background: activeLevel2Tab === tabVal ? 'var(--card-bg)' : 'transparent',
                cursor: 'pointer',
                fontWeight: activeLevel2Tab === tabVal ? 'bold' : 'normal',
                color: activeLevel2Tab === tabVal ? 'var(--tab-active-text)' : 'var(--tab-text)',
                borderRadius: '5px 5px 0 0',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {formatUnitDisplay(tabVal)}
            </button>
          ))}
        </div>

        <div className="db-unit-card">
          <div key={isBThink1 ? `${activeUnit}-${activePageStart}` : activeUnit} className="db-unit-body">
            {(() => {
              const recallMapItems = items
                .filter((p: any) => p.type.toLowerCase().includes('recall-map'))
                .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

              const getVocabPriority = (type: string) => {
                const t = type.toLowerCase();
                if (t.includes('vocab-guide')) return 1;
                if (t.includes('vocab-master')) return 2;
                if (t.includes('spelling-hero')) return 3;
                return 4;
              };
              const vocabItems = items
                .filter((p: any) => p.type.toLowerCase().includes('vocab') || p.type.toLowerCase().includes('spelling'))
                .sort((a: any, b: any) => {
                  const pA = getVocabPriority(a.type);
                  const pB = getVocabPriority(b.type);
                  if (pA !== pB) return pA - pB;
                  return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
                });

              const textNavigatorItems = items
                .filter((p: any) => p.type.toLowerCase().includes('text-navigator'))
                .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

              const passageDecoderItems = items
                .filter((p: any) => p.type.toLowerCase().includes('passage-decoder'))
                .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

              const writingMapItems = items
                .filter((p: any) => p.type.toLowerCase().includes('writing-map'))
                .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

              const sentenceArchitectItems = items
                .filter((p: any) => p.type.toLowerCase().includes('sentence-architect'))
                .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

              const grammarWizardItems = items
                .filter((p: any) => p.type.toLowerCase().includes('grammar-wizard'))
                .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

              const matchedIds = new Set([
                ...recallMapItems.map((p: any) => p.id),
                ...vocabItems.map((p: any) => p.id),
                ...textNavigatorItems.map((p: any) => p.id),
                ...passageDecoderItems.map((p: any) => p.id),
                ...writingMapItems.map((p: any) => p.id),
                ...sentenceArchitectItems.map((p: any) => p.id),
                ...grammarWizardItems.map((p: any) => p.id)
              ]);
              const otherItems = items.filter((p: any) => !matchedIds.has(p.id));

              const groups = [
                { title: '1. Recall Map', items: recallMapItems },
                { title: '2. Vocabulary & Spelling', items: vocabItems },
                { title: '3. Text Navigators & Passage Decoders', items: [...textNavigatorItems, ...passageDecoderItems] },
                { title: '4. Sentence & Grammar', items: [...grammarWizardItems, ...sentenceArchitectItems] },
                { title: '5. Writing Maps', items: writingMapItems },
                { title: 'Other Practices', items: otherItems }
              ].filter(g => g.items.length > 0);

              const getIcon = (typeStr: string) => {
                const t = typeStr.toLowerCase();
                if (t.includes('vocab-guide')) return '📚';
                if (t.includes('vocab-master')) return '🔥';
                if (t.includes('vocab')) return '📚';
                if (t.includes('spelling')) return '✏️';
                if (t.includes('sentence')) return '🏗️';
                if (t.includes('recall')) return '🗺️';
                if (t.includes('writing')) return '📝';
                if (t.includes('text-navigator')) return '🧭';
                if (t.includes('grammar-wizard')) return '🧙‍♂️';
                if (t.includes('passage-decoder')) return '📖';
                return PRACTICE_TYPE_ICONS[typeStr] ?? '▶️';
              };

              const formatType = (t: string) => t.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

              return groups.map((group, idx) => (
                <div key={group.title} className="db-practice-group">
                  {idx > 0 && <div style={{ height: '1px', background: 'var(--border)', margin: '12px 16px', opacity: 0.6 }} />}
                  <ul className="db-practice-list">
                    {group.items.map((p: any) => {
                      let doneCount = 0;
                      let total = 0;
                      let avg = 0;
                      const isVM = p.type.toLowerCase().includes('vocab-master');
                      const isSH = p.type.toLowerCase().includes('spelling-hero');
                      const isSA = p.type.toLowerCase().includes('sentence-architect');
                      const isGW = p.type.toLowerCase().includes('grammar-wizard');
                      const isPD = p.type.toLowerCase().includes('passage-decoder');

                      if ((isVM || isSA || isGW) && p.content?.challenges) {
                        total = p.content.challenges.length;
                        let sumMax = 0;
                        for (const chal of p.content.challenges) {
                          const chalRecords = records.filter((r: any) => r.unit === `${p.id} (${chal.title})` && !r.unfinished);
                          if (chalRecords.length > 0) {
                            doneCount++;
                            sumMax += Math.max(...chalRecords.map((r: any) => r.score));
                          }
                        }
                        if (doneCount > 0) avg = Math.round(sumMax / doneCount);
                      } else if (isPD && p.content?.sections) {
                        total = p.content.sections.length;
                        let sumMax = 0;
                        for (const sec of p.content.sections) {
                          const secRecords = records.filter((r: any) => r.unit === `${p.id} (${sec.title})` && !r.unfinished);
                          if (secRecords.length > 0) {
                            doneCount++;
                            sumMax += Math.max(...secRecords.map((r: any) => r.score));
                          }
                        }
                        if (doneCount > 0) avg = Math.round(sumMax / doneCount);
                      }


                      if (isSH && p.content?.spelling_words) {
                        const wordCount = p.content.spelling_words.length;
                        total = Math.ceil((wordCount * 2) / 10);
                        let sumMax = 0;
                        for (let i = 1; i <= total; i++) {
                          const chalRecords = records.filter((r: any) => r.unit === `${p.id} (Challenge ${i})` && !r.unfinished);
                          if (chalRecords.length > 0) {
                            doneCount++;
                            sumMax += Math.max(...chalRecords.map((r: any) => r.score));
                          }
                        }
                        if (doneCount > 0) {
                          avg = Math.round(sumMax / doneCount);
                        } else {
                          try {
                            const raw = localStorage.getItem(`sh-stats-${p.id}`);
                            if (raw) {
                              const allStats = JSON.parse(raw);
                              let sumBest = 0;
                              for (let i = 1; i <= total; i++) {
                                const s = allStats[`ch-${i}`];
                                if (s && s.lifetime.attempts > 0) {
                                  doneCount++;
                                  sumBest += s.lifetime.best;
                                }
                              }
                              if (doneCount > 0) avg = Math.round(sumBest / doneCount);
                            }
                          } catch { }
                        }
                      }

                      const getGrade = (a: number) => {
                        if (a >= 100) return 'S';
                        if (a >= 90) return 'A';
                        if (a >= 80) return 'B';
                        if (a >= 70) return 'C';
                        return 'F';
                      };

                      const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
                      const getProgressColor = (p: number) => {
                        if (p <= 20) return '#f97316';
                        if (p <= 40) return '#f59e0b';
                        if (p <= 60) return '#eab308';
                        if (p <= 80) return '#84cc16';
                        return '#22c55e';
                      };

                      return (
                        <li key={p.id}>
                          <Link 
                            to={`/practice/${p.id}`} 
                            className="db-practice-link"
                            onClick={() => {
                              sessionStorage.setItem('last-active-textbook', p.textbook);
                              sessionStorage.setItem('last-active-unit', p.unit);
                              const pageStart = getPageStart(p);
                              if (pageStart) {
                                sessionStorage.setItem('last-active-page', pageStart);
                              }
                            }}
                          >
                            <span className="db-practice-icon">{getIcon(p.type)}</span>
                            <span className="db-practice-name">
                              <FadingPracticeName name={formatType(p.type)} showChinese={showChinese} />
                            </span>
                            {(isVM || isSH || isSA || isGW || isPD) && total > 0 && (
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', opacity: 0.9 }}
                                title={doneCount > 0 ? `Completed ${doneCount} practices out of ${total}. Average score ${avg}% (grade ${getGrade(avg)})` : `Completed 0 practices out of ${total}.`}
                              >
                                <div style={{ position: 'relative', width: '48px', height: '18px', background: 'var(--code-bg)', borderRadius: '4px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percent}%`, background: getProgressColor(percent), opacity: 0.4, transition: 'width 0.3s ease, background-color 0.3s ease' }} />
                                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {doneCount}/{total}
                                  </div>
                                </div>
                                {doneCount > 0 && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '18px', width: '20px', background: 'var(--text-h)', color: 'var(--bg)', borderRadius: '4px', fontWeight: 'bold' }}>
                                    {getGrade(avg)}
                                  </span>
                                )}
                              </div>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </section>
  )
}

import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const practicesDoneText = data.breakdown 
      ? `Practices Done: ${data.count} (${data.breakdown})`
      : `Practices Done: ${data.count}`;
    
    return (
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        color: 'var(--text-h)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(12px)',
        padding: '10px 14px',
        fontSize: '0.8rem',
        textAlign: 'left'
      }}>
        <p style={{ color: 'var(--text)', fontWeight: 600, margin: '0 0 4px 0' }}>{label}</p>
        <p style={{ color: 'var(--text-h)', margin: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--tab-active-text)' }} />
          {practicesDoneText}
        </p>
        <p style={{ color: 'var(--text-h)', margin: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--accent)', boxSizing: 'border-box' }} />
          Avg Score: {data.avgScore}%
        </p>
      </div>
    );
  }
  return null;
};

export function Dashboard({ showChinese = false }: { showChinese?: boolean }) {
  const historyScrollRef = useHorizontalScrollRef()
  const { data: session } = useSession()
  const location = useLocation()
  const returnState = location.state as { textbook?: string; unit?: string; page?: string } | null
  const targetTextbook = returnState?.textbook || sessionStorage.getItem('last-active-textbook') || ''
  const targetUnit = returnState?.unit || sessionStorage.getItem('last-active-unit') || ''
  const targetPage = returnState?.page || sessionStorage.getItem('last-active-page') || ''

  const [practices, setPractices] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [activeTodayBook, setActiveTodayBook] = useState<string>('')
  const [historyOffset, setHistoryOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'textbooks' | 'mistakes'>('textbooks')
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [activeMistakeReview, setActiveMistakeReview] = useState<Mistake[] | null>(null)
  const [activeMistakeBook, setActiveMistakeBook] = useState<string>('')
  const [activeMistakeUnit, setActiveMistakeUnit] = useState<string>('')
  const [showResolved, setShowResolved] = useState(false)

  const unresolvedMistakes = useMemo(() => mistakes.filter(m => !m.resolved), [mistakes])
  const unresolvedCount = unresolvedMistakes.length

  const getDayLabel = (offset: number) => {
    if (offset === 0) return 'Today'
    if (offset === 1) return 'Yesterday'
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const fetchedUserIdRef = useRef<string | null>(null)
  const userId = session?.user?.id

  useEffect(() => {
    if (userId && fetchedUserIdRef.current !== userId) {
      fetchedUserIdRef.current = userId

      const cachedPractices = cache.getPractices()
      if (cachedPractices) {
        setPractices(cachedPractices)
        setLoading(false)
      } else {
        setLoading(true)
        fetch(API_URL + '/api/practices', { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              cache.setPractices(data)
              setPractices(data)
            }
            setLoading(false)
          })
          .catch(e => {
            console.error(e)
            setLoading(false)
          })
      }

      const cachedRecords = cache.getRecords()
      if (cachedRecords) {
        setRecords(cachedRecords)
      } else {
        fetch(API_URL + '/api/records', { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              cache.setRecords(data)
              setRecords(data)
            }
          })
          .catch(console.error)
      }

      // Load mistakes
      mistakeService.syncFromServer(userId).then(synced => {
        setMistakes(synced)
      })
    }
  }, [userId])

  useEffect(() => {
    if (!loading && targetTextbook) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`book-${targetTextbook}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sessionStorage.removeItem('last-active-textbook');
          sessionStorage.removeItem('last-active-unit');
          sessionStorage.removeItem('last-active-page');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, targetTextbook]);

  const handleCloseReviewer = () => {
    setActiveMistakeReview(null);
    if (userId) {
      setMistakes(mistakeService.getMistakes(userId));
    }
  };

  const handleDeleteMistake = (id: string) => {
    if (userId && window.confirm("Are you sure you want to delete this mistake?")) {
      mistakeService.removeMistake(userId, id);
      mistakeService.syncToServer(userId);
      setMistakes(mistakeService.getMistakes(userId));
    }
  };

  const groupedMistakes = useMemo(() => {
    const visibleMistakes = showResolved ? mistakes : mistakes.filter(m => !m.resolved);
    return visibleMistakes.reduce<Record<string, Record<string, Mistake[]>>>((acc, m) => {
      const tb = m.textbook || 'Other';
      const un = m.unit || 'General';
      if (!acc[tb]) acc[tb] = {};
      if (!acc[tb][un]) acc[tb][un] = [];
      acc[tb][un].push(m);
      return acc;
    }, {});
  }, [mistakes, showResolved]);

  const mistakeBooks = Object.keys(groupedMistakes).sort();
  const effectiveMistakeBook = mistakeBooks.includes(activeMistakeBook) ? activeMistakeBook : (mistakeBooks[0] || '');
  const mistakeUnits = effectiveMistakeBook ? Object.keys(groupedMistakes[effectiveMistakeBook]).sort() : [];
  const effectiveMistakeUnit = mistakeUnits.includes(activeMistakeUnit) ? activeMistakeUnit : (mistakeUnits[0] || '');

  // group: textbook -> unit -> practices[]
  const grouped: Record<string, Record<string, any[]>> = practices.reduce((acc, p) => {
    // Skip C-GIU General unit or GENERAL textbook
    if ((p.textbook === 'C-GIU' && p.unit === 'General') || p.textbook === 'GENERAL') {
      return acc
    }
    if (!acc[p.textbook]) acc[p.textbook] = {}
    if (!acc[p.textbook][p.unit]) acc[p.textbook][p.unit] = []
    acc[p.textbook][p.unit].push(p)
    return acc
  }, {})

  if (!session) return (
    <div className="db-empty">Please sign in to view your dashboard.</div>
  )

  const getLast7DaysStats = (records: any[]) => {
    const stats = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayRecords = records.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate >= d && rDate < nextDay;
      });

      const count = dayRecords.length;
      const avgScore = count > 0
        ? Math.round(dayRecords.reduce((acc, r) => acc + (parseFloat(r.score) || 0), 0) / count)
        : 0;

      const bookCounts: Record<string, number> = {};
      dayRecords.forEach(r => {
        const match = r.unit.match(/^(.+?)\s\((.+)\)$/);
        let practiceId = r.unit;
        if (match) {
          practiceId = match[1];
        }
        const practice = practices.find(p => p.id === practiceId);
        const book = practice ? practice.textbook : 'Unknown';
        bookCounts[book] = (bookCounts[book] || 0) + 1;
      });

      const breakdown = Object.entries(bookCounts)
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
        .map(([book, cnt]) => `${book}-${cnt}`)
        .join(', ');

      stats.push({
        date: dateStr,
        count,
        avgScore,
        breakdown,
        columnClickArea: 100
      });
    }
    return stats;
  };
  const last7DaysStats = useMemo(() => getLast7DaysStats(records), [records, practices]);

  const handlePointClick = (...args: any[]) => {
    let data: any = null;
    let index: number = -1;
    if (args[0] && typeof args[0] === 'object' && 'date' in args[0]) {
      data = args[0];
    }
    if (typeof args[1] === 'number') {
      index = args[1];
    }
    if (index === -1 && data) {
      index = last7DaysStats.findIndex(s => s.date === data.date);
    }
    if (index >= 0 && index <= 6) {
      const offset = 6 - index;
      if (historyOffset !== offset) {
        setHistoryOffset(offset);
      }
    }
  };

  const handleChartInteraction = (state: any) => {
    if (!state) return;
    let index = state.activeTooltipIndex;
    if (typeof index !== 'number' && state.activeLabel) {
      index = last7DaysStats.findIndex(s => s.date === state.activeLabel);
    }
    if (typeof index === 'number' && index >= 0 && index <= 6) {
      const offset = 6 - index;
      if (historyOffset !== offset) {
        setHistoryOffset(offset);
      }
    }
  };

  const getTargetDateStr = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return d.toLocaleDateString()
  }
  const targetDateStr = getTargetDateStr(historyOffset);
  const parsedTodayRecords = records
    .filter(r => new Date(r.createdAt).toLocaleDateString() === targetDateStr)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(r => {
      const match = r.unit.match(/^(.+?)\s\((.+)\)$/);
      let practiceId = r.unit;
      let challengeTitle = '';
      if (match) {
        practiceId = match[1];
        challengeTitle = match[2];
      }
      const practice = practices.find(p => p.id === practiceId);
      const timeStarted = new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const timeUsedMs = r.updatedAt ? new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() : 0;
      const timeUsed = timeUsedMs > 0 ? (timeUsedMs < 60000 ? '<1 min' : Math.round(timeUsedMs / 60000) + ' mins') : '-';

      let practiceName = 'Unknown';
      if (practice) {
        const acronym = practice.type.split('-').map((w: string) => w.charAt(0).toUpperCase()).join('');
        const shortChallenge = challengeTitle.replace('Challenge ', '').split(':')[0].trim();
        practiceName = challengeTitle ? `${acronym}-${shortChallenge}` : acronym;
      }

      return {
        id: r.id,
        timeStarted,
        bookUnit: practice ? `${practice.textbook}-${practice.unit}` : 'Unknown',
        book: practice ? practice.textbook : 'Unknown',
        practiceName,
        score: r.score + '%',
        timeUsed
      };
    });

  const todayRecordsByBook = parsedTodayRecords.reduce<Record<string, typeof parsedTodayRecords>>((acc, r) => {
    const book = r.book || 'Unknown';
    if (!acc[book]) acc[book] = [];
    acc[book].push(r);
    return acc;
  }, {});

  const todayBookKeys = Object.keys(todayRecordsByBook).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const activeBook = todayBookKeys.includes(activeTodayBook) ? activeTodayBook : (todayBookKeys[0] || '');

  return (
    <div className="db-root">
      <div className="db-hero">
        <span className="db-wave">👋</span>
        <div>
          <h2 className="db-title">Welcome back, {session.user.name}!</h2>
          <p className="db-subtitle">Pick up where you left off <span style={{ fontSize: '0.65rem', opacity: 0.45, marginLeft: '6px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>v2026.06.12-11:58</span></p>
        </div>
      </div>

      <div className="db-books db-top-section">
        <PetDashboardWidget showChinese={showChinese} />
        <div className="db-top-right">
        <div className="db-stats">
          <h3 className="db-stats-title">
            <span className="db-title-grid">
              <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                Activity: Last 7 Days
              </span>
              <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                最近7天活动
              </span>
            </span>
          </h3>
          <div className="db-chart-card">
            <div className="db-chart-legend-left">
              <span className="db-chart-legend-bar" />
              <span>Practices Done</span>
            </div>
            <div className="db-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={last7DaysStats}
                  margin={{ top: 16, right: 12, bottom: 0, left: -8 }}
                  onClick={handleChartInteraction}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--tab-active-text)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="var(--tab-active-text)" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="date" stroke="var(--text)" fontSize={11}
                    tickLine={false} axisLine={false} dy={6}
                    tickFormatter={(value, index) => [1, 3, 5].includes(index) ? '' : value}
                  />
                  <XAxis
                    xAxisId="hidden"
                    dataKey="date"
                    hide
                  />
                  <YAxis
                    yAxisId="left" stroke="var(--text)" fontSize={11}
                    tickLine={false} axisLine={false} tickCount={5}
                    allowDecimals={false} width={28}
                  />
                  <YAxis
                    yAxisId="right" orientation="right" stroke="var(--text)"
                    fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v}%`} domain={[0, 100]} width={36}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--accent-bg)', radius: 4 }}
                    content={<CustomTooltip />}
                  />
                  <Area
                    yAxisId="right" type="monotone" dataKey="avgScore"
                    fill="url(#lineGlow)" stroke="none" tooltipType="none"
                  />
                  <Bar
                    yAxisId="left" dataKey="count" name="Practices Done"
                    fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={20}
                  />
                  <Line
                    yAxisId="right" type="monotone" dataKey="avgScore"
                    name="Avg Score" stroke="var(--accent)" strokeWidth={2.5}
                    dot={{ r: 3.5, fill: 'var(--card-bg)', strokeWidth: 2.5 }}
                    activeDot={{ r: 5.5, fill: 'var(--accent)', strokeWidth: 0 }}
                  />
                  <Bar
                    xAxisId="hidden"
                    yAxisId="right" dataKey="columnClickArea"
                    fill="transparent" barSize={40}
                    onClick={handlePointClick}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="db-chart-legend-right">
              <span className="db-chart-legend-dot" />
              <span>Avg Score</span>
            </div>
          </div>
        </div>

        <div className="db-stats db-stats-history">
          <div className="db-history-header">
            <h3 className="db-stats-title">
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  Practice History
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  练习历史
                </span>
              </span>
            </h3>
            <div className="db-history-nav">
              <button
                onClick={() => setHistoryOffset(prev => Math.min(6, prev + 1))}
                disabled={historyOffset === 6}
                className="db-history-nav-btn"
                title="Previous Day"
              >
                ←
              </button>
              <span className="db-history-nav-label">
                {getDayLabel(historyOffset)}
              </span>
              <button
                onClick={() => setHistoryOffset(prev => Math.max(0, prev - 1))}
                disabled={historyOffset === 0}
                className="db-history-nav-btn"
                title="Next Day"
              >
                →
              </button>
            </div>
          </div>
          {parsedTodayRecords.length > 0 ? (
            <div className="db-history-content">
              <div className="db-units-tabs" ref={historyScrollRef}>
                {todayBookKeys.map(book => (
                  <button
                    key={book}
                    onClick={() => setActiveTodayBook(book)}
                    className={`db-tab-btn ${activeBook === book ? 'active' : ''}`}
                  >
                    <span>{getTextbookEmoji(book)}</span>
                    <span>{book} ({todayRecordsByBook[book].length})</span>
                  </button>
                ))}
              </div>
              <div className="db-stats-table-container">
                <table className="db-stats-table">
                  <thead>
                    <tr>
                      <th>Started</th>
                      <th>Book-Unit</th>
                      <th>Practice</th>
                      <th>Score</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(todayRecordsByBook[activeBook] || []).map(r => (
                      <tr key={r.id}>
                        <td>{r.timeStarted}</td>
                        <td>{r.bookUnit}</td>
                        <td>{r.practiceName}</td>
                        <td>{r.score}</td>
                        <td>{r.timeUsed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="db-empty" style={{ padding: '20px' }}>
              No practices started {historyOffset === 0 ? 'today' : historyOffset === 1 ? 'yesterday' : `on ${getDayLabel(historyOffset)}`} yet.
            </div>
          )}
        </div>
      </div>
    </div>

      {loading ? (
        <div className="db-empty">Loading textbooks...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="db-empty">No textbooks assigned. Please contact your administrator.</div>
      ) : (
        <>
          <div className="db-view-tabs">
            <button
              className={`db-view-tab ${activeView === 'textbooks' ? 'active' : ''}`}
              onClick={() => setActiveView('textbooks')}
            >
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  🎯 Practice Library
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  🎯 练习库
                </span>
              </span>
            </button>
            <button
              className={`db-view-tab ${activeView === 'mistakes' ? 'active' : ''}`}
              onClick={() => setActiveView('mistakes')}
            >
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  📓 Mistake Book
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  📓 错题本
                </span>
              </span>
              {unresolvedCount > 0 && <span className="db-view-tab-badge">{unresolvedCount}</span>}
            </button>
          </div>

          {activeView === 'textbooks' ? (
            <div className="db-books">
              {Object.keys(grouped).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(tb => (
                <BookSection
                  key={tb}
                  tb={tb}
                  units={grouped[tb]}
                  records={records}
                  initialUnit={targetTextbook === tb ? targetUnit : undefined}
                  initialPage={targetTextbook === tb ? targetPage : undefined}
                  showChinese={showChinese}
                />
              ))}
            </div>
          ) : (
            <div className="db-mistakes-section">
              {mistakes.length === 0 ? (
                <div className="db-empty" style={{ background: 'var(--card-bg)', padding: '60px 20px', borderRadius: '16px' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>🎉</span>
                  <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px 0', fontSize: '1.25rem' }}>No Mistakes to Review!</h3>
                  <p style={{ color: 'var(--text)', margin: 0, fontSize: '0.9rem' }}>Great job! Your mistake collection is clean.</p>
                </div>
              ) : (
                <div className="db-mistakes-container">
                  {/* Sidebar: Books & Units */}
                  <div className="db-mistakes-sidebar">
                    <div className="db-mistakes-header-card">
                      <h3 className="db-mistakes-title">
                        <span className="db-title-grid">
                          <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                            📓 Mistake Book
                          </span>
                          <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                            📓 错题本
                          </span>
                        </span>
                      </h3>
                      <p className="db-mistakes-sub">You have {unresolvedCount} unresolved questions.</p>
                      <div className="db-mistakes-filter-control">
                        <label className="db-filter-switch">
                          <input
                            type="checkbox"
                            checked={showResolved}
                            onChange={(e) => setShowResolved(e.target.checked)}
                          />
                          <span className="db-filter-slider"></span>
                        </label>
                        <span className="db-filter-label">Show resolved</span>
                      </div>
                      <button
                        className="db-quick-review-btn"
                        disabled={unresolvedCount === 0}
                        onClick={() => setActiveMistakeReview(unresolvedMistakes)}
                      >
                        ⚡ Quick Review All
                      </button>
                    </div>

                    <div className="db-mistakes-nav">
                      <div className="db-mistakes-book-tabs">
                        {mistakeBooks.map(tb => (
                          <button
                            key={tb}
                            className={`db-mistakes-book-tab ${effectiveMistakeBook === tb ? 'active' : ''}`}
                            onClick={() => {
                              setActiveMistakeBook(tb);
                              setActiveMistakeUnit('');
                            }}
                          >
                            <span className="db-mistakes-book-name">{getTextbookEmoji(tb)} {tb}</span>
                            <span className="db-mistakes-count">{Object.values(groupedMistakes[tb]).flat().length}</span>
                          </button>
                        ))}
                      </div>

                      {effectiveMistakeBook && (
                        <div className="db-mistakes-unit-tabs">
                          {mistakeUnits.map(un => (
                            <button
                              key={un}
                              className={`db-mistakes-unit-tab ${effectiveMistakeUnit === un ? 'active' : ''}`}
                              onClick={() => setActiveMistakeUnit(un)}
                            >
                              <span className="db-mistakes-unit-name">{un}</span>
                              <span className="db-mistakes-count">{groupedMistakes[effectiveMistakeBook][un].length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content: List of Mistakes for selected Textbook-Unit */}
                  <div className="db-mistakes-content">
                    {effectiveMistakeBook && effectiveMistakeUnit ? (
                      <div className="db-mistakes-list-card">
                        <div className="db-mistakes-list-header">
                          <h4 style={{ margin: 0, color: 'var(--text-h)' }}>
                            {effectiveMistakeBook} - {effectiveMistakeUnit} ({groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].length})
                          </h4>
                          <button
                            className="db-unit-review-btn"
                            disabled={groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].filter(m => !m.resolved).length === 0}
                            onClick={() => setActiveMistakeReview(groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].filter(m => !m.resolved))}
                          >
                            ✏️ Review Unit
                          </button>
                        </div>
                        <div className="db-mistakes-list">
                          {groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].map((m) => (
                            <div key={m.id} className={`db-mistake-item-card ${m.resolved ? 'resolved' : ''}`}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="db-mistake-meta">
                                  <FadingMistakeBadge type={m.practiceType} showChinese={showChinese} />
                                  <span className="db-mistake-attempts">Attempts: {m.attemptsCount}</span>
                                  {m.resolved && <span className="db-mistake-resolved-badge">Solved</span>}
                                </div>
                                <div className="db-mistake-prompt">
                                  {m.practiceType === 'vocab-master' && <strong>{m.question.prompt}</strong>}
                                  {m.practiceType === 'grammar-wizard' && <span>{m.question.prompt}</span>}
                                  {m.practiceType.startsWith('passage-decoder') && (
                                    <>
                                      <div style={{ fontStyle: 'italic', color: 'var(--accent)', marginBottom: 4 }}>{m.question.en}</div>
                                      <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Select correct translation</div>
                                    </>
                                  )}
                                  {m.practiceType === 'sentence-architect' && (
                                    <>
                                      <div>{m.question.cn}</div>
                                      <div style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text)', marginTop: 4 }}>💡 {m.question.hint}</div>
                                    </>
                                  )}
                                  {m.practiceType === 'spelling-hero' && (
                                    <>
                                      <div>Spell the word for: <strong>{m.question.meaning}</strong></div>
                                      <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent)', marginTop: 4 }}>
                                        {m.question.chunks.map(() => '_').join(' ')}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="db-mistake-actions">
                                <button
                                  className="db-mistake-action-btn delete"
                                  title="Remove from Mistake Book"
                                  onClick={() => handleDeleteMistake(m.id)}
                                >
                                  🗑️
                                </button>
                                <button
                                  className="db-mistake-action-btn review"
                                  onClick={() => setActiveMistakeReview([m])}
                                >
                                  {m.resolved ? 'Review Again' : 'Review'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="db-empty" style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '16px' }}>Select a textbook and unit to view mistakes.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeMistakeReview && (
        <MistakeReviewer
          userId={userId}
          initialMistakes={activeMistakeReview}
          onClose={handleCloseReviewer}
        />
      )}

      {(session.user as any).role === 'admin' && (
        <div className="db-admin-panel">
          <span className="db-admin-icon">🛡️</span>
          <div>
            <p className="db-admin-heading">Admin Controls</p>
            <p className="db-admin-sub">Manage student accounts and assignments.</p>
          </div>
          <Link to="/admin/manage-users" className="db-admin-btn">Manage Students</Link>
        </div>
      )}
    </div>
  )
}
