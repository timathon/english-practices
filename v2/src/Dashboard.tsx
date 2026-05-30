import { useState, useEffect, useRef } from 'react'
import { useSession, API_URL } from './lib/auth'
import { Link, useLocation } from 'react-router-dom'
import { cache } from './lib/cache'
import { PetDashboardWidget } from './components/PetDashboardWidget'
import { getTextbookEmoji } from './lib/textbooks'
import './Dashboard.css'

const PRACTICE_TYPE_ICONS: Record<string, string> = {
  'Vocab Master': '📚',
  'Spelling Hero': '✏️',
  'Sentence Architect': '🏗️',
  'Recall Map': '🗺️',
  'Writing Map': '📝',
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

function BookSection({ tb, units, records, initialUnit }: { tb: string; units: Record<string, any[]>; records: any[]; initialUnit?: string }) {
  const unitKeys = Object.keys(units).sort((a, b) => {
    const isStdA = /^[UM]\d+/i.test(a.trim())
    const isStdB = /^[UM]\d+/i.test(b.trim())
    if (isStdA && !isStdB) return -1
    if (!isStdA && isStdB) return 1
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })
  const isRazB = tb === 'RAZ-B'
  const isBThink1 = tb === 'B-THINK1' || tb === 'B-Think1'

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

  const pageStarts = isBThink1
    ? Array.from(new Set((units[activeUnit] || []).map(p => getPageStart(p)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    : []

  const [activePageStart, setActivePageStart] = useState<string>(() => {
    if (!isBThink1) return ''
    const activeUnitItems = units[activeUnit] || []
    const starts = Array.from(new Set(activeUnitItems.map(p => getPageStart(p)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
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
      : unitKeys

  const activeLevel2Tab = isBThink1 ? activePageStart : activeUnit

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
          <div className="db-letters-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '2px' }}>
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
          <div className="db-letters-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '2px' }}>
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

        <div className="db-units-tabs" style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
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
                if (t.includes('spelling-hero')) return 2;
                if (t.includes('vocab-master')) return 3;
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
                ...writingMapItems.map((p: any) => p.id),
                ...sentenceArchitectItems.map((p: any) => p.id),
                ...grammarWizardItems.map((p: any) => p.id)
              ]);
              const otherItems = items.filter((p: any) => !matchedIds.has(p.id));

              const groups = [
                { title: '1. Recall Map', items: recallMapItems },
                { title: '2. Vocabulary & Spelling', items: vocabItems },
                { title: '3. Text Navigators', items: textNavigatorItems },
                { title: '4. Sentence & Grammar', items: [...grammarWizardItems, ...sentenceArchitectItems] },
                { title: '5. Writing Maps', items: writingMapItems },
                { title: 'Other Practices', items: otherItems }
              ].filter(g => g.items.length > 0);

              const getIcon = (typeStr: string) => {
                const t = typeStr.toLowerCase();
                if (t.includes('vocab')) return '📚';
                if (t.includes('spelling')) return '✏️';
                if (t.includes('sentence')) return '🏗️';
                if (t.includes('recall')) return '🗺️';
                if (t.includes('writing')) return '📝';
                if (t.includes('text-navigator')) return '🧭';
                if (t.includes('grammar-wizard')) return '🧙‍♂️';
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
                            }}
                          >
                            <span className="db-practice-icon">{getIcon(p.type)}</span>
                            <span className="db-practice-name">{formatType(p.type)}</span>
                            {(isVM || isSH || isSA || isGW) && total > 0 && (
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

export function Dashboard() {
  const { data: session } = useSession()
  const location = useLocation()
  const returnState = location.state as { textbook?: string; unit?: string } | null
  const targetTextbook = returnState?.textbook || sessionStorage.getItem('last-active-textbook') || ''
  const targetUnit = returnState?.unit || sessionStorage.getItem('last-active-unit') || ''

  const [practices, setPractices] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [activeTodayBook, setActiveTodayBook] = useState<string>('')
  const [historyOffset, setHistoryOffset] = useState(0)
  const [loading, setLoading] = useState(true)

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
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, targetTextbook]);

  // group: textbook -> unit -> practices[]
  const grouped: Record<string, Record<string, any[]>> = practices.reduce((acc, p) => {
    // Skip C-GIU General unit
    if (p.textbook === 'C-GIU' && p.unit === 'General') {
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
        ? Math.round(dayRecords.reduce((acc, r) => acc + r.score, 0) / count)
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
        breakdown
      });
    }
    return stats;
  };
  const last7DaysStats = getLast7DaysStats(records);

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
          <p className="db-subtitle">Pick up where you left off <span style={{ fontSize: '0.65rem', opacity: 0.45, marginLeft: '6px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>v2026.05.30-21:06</span></p>
        </div>
      </div>

      <div className="db-books db-top-section">
        <PetDashboardWidget />
        <div className="db-top-right">
        <div className="db-stats db-stats-history">
          <div className="db-history-header">
            <h3 className="db-stats-title">Practice History</h3>
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
              <div className="db-units-tabs">
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

        <div className="db-stats">
          <h3 className="db-stats-title">Recent 7 Days Activity</h3>
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
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="db-chart-legend-right">
              <span className="db-chart-legend-dot" />
              <span>Avg Score</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {loading ? (
        <div className="db-empty">Loading textbooks...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="db-empty">No textbooks assigned. Please contact your administrator.</div>
      ) : (
        <>
          <div className="db-divider">
            <span className="db-divider-line" />
            <h3 className="db-divider-title">Textbooks ({Object.keys(grouped).length})</h3>
            <span className="db-divider-line" />
          </div>
          <div className="db-books">
            {Object.keys(grouped).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(tb => (
              <BookSection
                key={tb}
                tb={tb}
                units={grouped[tb]}
                records={records}
                initialUnit={targetTextbook === tb ? targetUnit : undefined}
              />
            ))}
          </div>
        </>
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
