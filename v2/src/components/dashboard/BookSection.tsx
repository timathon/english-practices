import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useHorizontalScrollRef } from '../../hooks/useHorizontalScrollRef'
import { getTextbookEmoji } from '../../lib/textbooks'
import { 
  PRACTICE_TYPE_ICONS, 
  getLastUnit, 
  saveLastUnit,
  translateTextbookName
} from '../../lib/dashboardUtils'
import { FadingPracticeName } from './DashboardShared'

export function BookSection({ tb, units, records, initialUnit, initialPage, showChinese, isTestdrive, onResetTestdrive }: { tb: string; units: Record<string, any[]>; records: any[]; initialUnit?: string; initialPage?: string; showChinese: boolean; isTestdrive?: boolean; onResetTestdrive?: () => void }) {
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
  const isCGiu = tb === 'C-GIU'

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

  const cgiuGroups = isCGiu
    ? Array.from(new Set(unitKeys.map(key => {
        const firstPractice = (units[key] || [])[0];
        if (firstPractice) {
          const match = firstPractice.id.match(/^C-GIU_([a-zA-Z0-9-]+)_/i);
          if (match) return match[1];
        }
        return 'c-giu-1-10';
      }))).sort()
    : []

  const [activeCgiuGroup, setActiveCgiuGroup] = useState<string>(() => {
    if (!isCGiu) return ''
    if (activeUnit) {
      const firstPractice = (units[activeUnit] || [])[0];
      if (firstPractice) {
        const match = firstPractice.id.match(/^C-GIU_([a-zA-Z0-9-]+)_/i);
        if (match) return match[1];
      }
    }
    return cgiuGroups[0] || ''
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

  const handleCgiuGroupChange = (group: string) => {
    setActiveCgiuGroup(group)
    const firstUnitForGroup = unitKeys.find(key => {
      const firstPractice = (units[key] || [])[0];
      if (firstPractice) {
        const match = firstPractice.id.match(/^C-GIU_([a-zA-Z0-9-]+)_/i);
        return match && match[1] === group;
      }
      return false;
    })
    if (firstUnitForGroup) {
      handleUnitChange(firstUnitForGroup)
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
    if (isCGiu && activeUnit) {
      const firstPractice = (units[activeUnit] || [])[0];
      if (firstPractice) {
        const match = firstPractice.id.match(/^C-GIU_([a-zA-Z0-9-]+)_/i);
        const group = match ? match[1] : '';
        if (group && group !== activeCgiuGroup) {
          setActiveCgiuGroup(group)
        }
      }
    }
  }, [activeUnit, isCGiu, activeCgiuGroup])

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
        : isCGiu
          ? unitKeys.filter(unit => {
              const firstPractice = (units[unit] || [])[0];
              if (firstPractice) {
                const match = firstPractice.id.match(/^C-GIU_([a-zA-Z0-9-]+)_/i);
                return match && match[1] === activeCgiuGroup;
              }
              return false;
            })
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
        {isTestdrive && onResetTestdrive && (
          <button 
            className="db-book-change-btn"
            onClick={onResetTestdrive}
            style={{
              padding: '4px 0',
              width: '85px',
              fontSize: '0.72rem',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px',
              overflow: 'hidden'
            }}
          >
            <span className="db-title-grid">
              <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                Change Book
              </span>
              <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                更换教材
              </span>
            </span>
          </button>
        )}
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

        {isCGiu && (
          <div ref={lettersScrollRef} className="db-letters-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '2px' }}>
            {cgiuGroups.map(group => (
              <button
                key={group}
                onClick={() => handleCgiuGroupChange(group)}
                className={`db-tab-btn ${activeCgiuGroup === group ? 'active' : ''}`}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderBottom: activeCgiuGroup === group ? '2px solid var(--tab-active-text)' : '2px solid transparent',
                  background: activeCgiuGroup === group ? 'var(--accent-bg)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeCgiuGroup === group ? 'bold' : 'normal',
                  color: activeCgiuGroup === group ? 'var(--tab-active-text)' : 'var(--tab-text)',
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
                {group.replace(/^c-giu-/i, '')}
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

              // Collapse multiple separate TN files into a single dashboard entry
              const tnGroupItems: any[] = textNavigatorItems.length > 1
                ? [{
                    ...textNavigatorItems[0],
                    type: 'text-navigator',
                    _tnSiblingIds: textNavigatorItems.slice(1).map((i: any) => i.id),
                    content: {
                      level: textNavigatorItems[0].content?.level,
                      part: textNavigatorItems[0].content?.part,
                      sections: textNavigatorItems.map((i: any) => ({
                        section: i.content?.section ?? i.type,
                        tree: i.content?.tree ?? {},
                      }))
                    }
                  }]
                : textNavigatorItems;

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
                { title: '3. Text Navigators & Passage Decoders', items: [...tnGroupItems, ...passageDecoderItems] },
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
                      const isTN = p.type.toLowerCase().includes('text-navigator');

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
                      } else if (isTN) {
                        // Multi-section format: { sections: [{section, tree}] }; single: { tree, section }
                        const tnSections: { section: string }[] = p.content?.sections ?? (p.content?.tree ? [{ section: p.content.section }] : []);
                        total = tnSections.length;
                        let sumMax = 0;
                        for (const sec of tnSections) {
                          const secRecords = records.filter((r: any) => r.unit === `${p.id} (${sec.section})` && !r.unfinished);
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

                      const cleanType = p.type.replace(/^p\d+-p\d+-/i, '').replace(/^p\d+-/i, '').toLowerCase();
                      const isTest = cleanType === 'test' || cleanType.endsWith('-test');
                      let highestGrade = null;
                      if (isTest) {
                        const testRecords = records.filter((r: any) => r.unit === `${p.id} (Test Sheet)` && !r.unfinished);
                        if (testRecords.length > 0) {
                          const highestScore = Math.max(...testRecords.map((r: any) => r.score));
                          highestGrade = getGrade(highestScore);
                        }
                      }

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
                            state={p._tnSiblingIds ? { tnSiblingIds: p._tnSiblingIds } : undefined}
                            className="db-practice-link"
                            onClick={() => {
                              sessionStorage.setItem('last-active-textbook', p.textbook);
                              sessionStorage.setItem('last-active-unit', p.unit);
                              const pageStart = matchPageStart(p.type); // Helper needed or imported
                              if (pageStart) {
                                sessionStorage.setItem('last-active-page', pageStart);
                              }
                            }}
                          >
                            <span className="db-practice-icon">{getIcon(p.type)}</span>
                            <span className="db-practice-name">
                              <FadingPracticeName name={formatType(p.type)} showChinese={showChinese} />
                            </span>
                            {(isVM || isSH || isSA || isGW || isPD || isTN) && total > 0 && (
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
                            {isTest && highestGrade && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', opacity: 0.9 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '18px', width: '20px', background: 'var(--text-h)', color: 'var(--bg)', borderRadius: '4px', fontWeight: 'bold' }}>
                                  {highestGrade}
                                </span>
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

function matchPageStart(type: string) {
  const match = type.match(/^p\d+/i)
  return match ? match[0].toUpperCase() : ''
}
