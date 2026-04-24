import { useState, useEffect } from 'react'
import { useSession } from './lib/auth'
import { Link, useLocation } from 'react-router-dom'
import './Dashboard.css'

const PRACTICE_TYPE_ICONS: Record<string, string> = {
  'Vocab Master': '📚',
  'Spelling Hero': '✏️',
  'Sentence Architect': '🏗️',
  'Recall Map': '🗺️',
  'Writing Map': '📝',
}

const TEXTBOOK_EMOJIS: Record<string, string> = {
  A3A: '🌱', A3B: '🌿',
  A5A: '🌸', A5B: '🌺',
  A6B: '🌟',
  A7A: '🚀', A7B: '🛸',
  A8B: '🎓',
}

function getTextbookEmoji(tb: string) {
  for (const key of Object.keys(TEXTBOOK_EMOJIS)) {
    if (tb.toUpperCase().includes(key)) return TEXTBOOK_EMOJIS[key]
  }
  return '📖'
}

const LS_KEY = 'ep-last-units'

function getLastUnit(tb: string): string | undefined {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}')[tb] } catch { return undefined }
}

function saveLastUnit(tb: string, unit: string) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    localStorage.setItem(LS_KEY, JSON.stringify({ ...map, [tb]: unit }))
  } catch {}
}

function BookSection({ tb, units, records, initialUnit }: { tb: string; units: Record<string, any[]>; records: any[]; initialUnit?: string }) {
  const unitKeys = Object.keys(units).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  const [activeUnit, setActiveUnit] = useState<string>(() => {
    // Priority: router-state (just navigated back) > localStorage > first unit
    if (initialUnit && unitKeys.includes(initialUnit)) { saveLastUnit(tb, initialUnit); return initialUnit }
    const stored = getLastUnit(tb)
    if (stored && unitKeys.includes(stored)) return stored
    return unitKeys[0] || ''
  })

  const handleUnitChange = (unit: string) => {
    setActiveUnit(unit)
    saveLastUnit(tb, unit)
  }

  useEffect(() => {
    if (!units[activeUnit] && unitKeys.length > 0) {
      handleUnitChange(unitKeys[0])
    }
  }, [units, activeUnit, unitKeys])

  if (unitKeys.length === 0) return null
  const items = units[activeUnit]?.sort((a: any, b: any) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })) || []

  return (
    <section className="db-book">
      <div className="db-book-header">
        <span className="db-book-emoji">{getTextbookEmoji(tb)}</span>
        <h3 className="db-book-title">{tb}</h3>
        <span className="db-book-count">{unitKeys.length} units</span>
      </div>

      <div>
        <div className="db-units-tabs" style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
          {unitKeys.map(unit => (
            <button 
              key={unit} 
              onClick={() => handleUnitChange(unit)}
              className={`db-tab-btn ${activeUnit === unit ? 'active' : ''}`}
              style={{ 
                padding: '6px 14px', 
                border: 'none', 
                borderBottom: activeUnit === unit ? '3px solid var(--tab-active-text)' : '3px solid transparent',
                background: activeUnit === unit ? 'var(--card-bg)' : 'transparent',
                cursor: 'pointer',
                fontWeight: activeUnit === unit ? 'bold' : 'normal',
                color: activeUnit === unit ? 'var(--tab-active-text)' : 'var(--tab-text)',
                borderRadius: '5px 5px 0 0',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {unit}
            </button>
          ))}
        </div>

        <div className="db-unit-card">
          <div key={activeUnit} className="db-unit-body">
            {(() => {
              const recallMapItems = items.filter((p: any) => p.type.toLowerCase().includes('recall-map'));
              const vocabItems = items.filter((p: any) => p.type.toLowerCase().includes('vocab') || p.type.toLowerCase().includes('spelling'));
              const textNavigatorItems = items.filter((p: any) => p.type.toLowerCase().includes('text-navigator'));
              const writingMapItems = items.filter((p: any) => p.type.toLowerCase().includes('writing-map'));
              const sentenceArchitectItems = items.filter((p: any) => p.type.toLowerCase().includes('sentence-architect'));
              
              const matchedIds = new Set([
                  ...recallMapItems.map((p: any) => p.id),
                  ...vocabItems.map((p: any) => p.id),
                  ...textNavigatorItems.map((p: any) => p.id),
                  ...writingMapItems.map((p: any) => p.id),
                  ...sentenceArchitectItems.map((p: any) => p.id)
              ]);
              const otherItems = items.filter((p: any) => !matchedIds.has(p.id));

              const groups = [
                  { title: '1. Recall Map', items: recallMapItems },
                  { title: '2. Vocabulary & Spelling', items: vocabItems },
                  { title: '3. Text Navigators', items: textNavigatorItems },
                  { title: '4. Sentence Architect', items: sentenceArchitectItems },
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

                      if (isVM && p.content?.challenges) {
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
                        } catch {}
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
                          <Link to={`/practice/${p.id}`} className="db-practice-link">
                            <span className="db-practice-icon">{getIcon(p.type)}</span>
                            <span className="db-practice-name">{formatType(p.type)}</span>
                            {(isVM || isSH) && total > 0 && (
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

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function Dashboard() {
  const { data: session } = useSession()
  const location = useLocation()
  const returnState = location.state as { textbook?: string; unit?: string } | null
  const [practices, setPractices] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      setLoading(true)
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + '/api/practices', { credentials: 'include' })
        .then(res => res.json())
        .then(data => { 
          if (Array.isArray(data)) setPractices(data)
          setLoading(false)
        })
        .catch(e => {
          console.error(e)
          setLoading(false)
        })
        
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + '/api/records', { credentials: 'include' })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setRecords(data) })
        .catch(console.error)
    }
  }, [session])

  // group: textbook -> unit -> practices[]
  const grouped: Record<string, Record<string, any[]>> = practices.reduce((acc, p) => {
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
  
      stats.push({
        date: dateStr,
        count,
        avgScore
      });
    }
    return stats;
  };
  const last7DaysStats = getLast7DaysStats(records);

  const todayStr = new Date().toLocaleDateString();
  const parsedTodayRecords = records
    .filter(r => new Date(r.createdAt).toLocaleDateString() === todayStr)
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
        const shortChallenge = challengeTitle.replace('Challenge ', '');
        practiceName = challengeTitle ? `${acronym}-${shortChallenge}` : acronym;
      }

      return {
        id: r.id,
        timeStarted,
        bookUnit: practice ? `${practice.textbook}-${practice.unit}` : 'Unknown',
        practiceName,
        score: r.score + '%',
        timeUsed
      };
    });

  return (
    <div className="db-root">
      <div className="db-hero">
        <span className="db-wave">👋</span>
        <div>
          <h2 className="db-title">Welcome back, {session.user.name}!</h2>
          <p className="db-subtitle">Pick up where you left off</p>
        </div>
      </div>

      {loading ? (
        <div className="db-empty">Loading textbooks...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="db-empty">No textbooks assigned. Please contact your administrator.</div>
      ) : (
        <div className="db-books">
          {Object.keys(grouped).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(tb => (
            <BookSection 
              key={tb} 
              tb={tb} 
              units={grouped[tb]} 
              records={records}
              initialUnit={returnState?.textbook === tb ? returnState.unit : undefined}
            />
          ))}
        </div>
      )}

      <div className="db-books" style={{ marginTop: '16px' }}>
        <div className="db-stats">
          <h3 className="db-stats-title">Today's Practices</h3>
        {parsedTodayRecords.length > 0 ? (
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
                {parsedTodayRecords.map(r => (
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
        ) : (
          <div className="db-empty" style={{ padding: '20px' }}>No practices started today yet.</div>
        )}
      </div>

      <div className="db-stats">
        <h3 className="db-stats-title">Recent 7 Days Activity</h3>
        <div style={{ width: '100%', height: 300, background: 'var(--card-bg)', borderRadius: '10px', padding: '20px 20px 10px 0', border: '1px solid var(--border)' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={last7DaysStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="var(--text)" fontSize={12} tickLine={false} axisLine={false} tickCount={5} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-h)' }}
                itemStyle={{ color: 'var(--text-h)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.85rem' }} />
              <Bar yAxisId="left" dataKey="count" name="Practices Done" fill="var(--tab-active-text)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="avgScore" name="Avg Score" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>

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
