import { useState, useEffect } from 'react'
import { useSession } from './lib/auth'
import { Link } from 'react-router-dom'
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

export function Dashboard() {
  const { data: session } = useSession()
  const [practices, setPractices] = useState<any[]>([])

  useEffect(() => {
    if (session) {
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + '/api/practices', { credentials: 'include' })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setPractices(data) })
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

  return (
    <div className="db-root">
      <div className="db-hero">
        <span className="db-wave">👋</span>
        <div>
          <h2 className="db-title">Welcome back, {session.user.name}!</h2>
          <p className="db-subtitle">Pick up where you left off</p>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="db-empty">No textbooks assigned. Please contact your administrator.</div>
      ) : (
        <div className="db-books">
          {Object.keys(grouped).sort().map(tb => (
            <section key={tb} className="db-book">
              <div className="db-book-header">
                <span className="db-book-emoji">{getTextbookEmoji(tb)}</span>
                <h3 className="db-book-title">{tb}</h3>
                <span className="db-book-count">{Object.keys(grouped[tb]).length} units</span>
              </div>

              <div className="db-units">
                {Object.keys(grouped[tb]).sort().map(unit => {
                  const items: any[] = grouped[tb][unit].sort((a, b) => a.title.localeCompare(b.title))
                  return (
                    <div key={unit} className="db-unit-card">
                      {/* Folder tab */}
                      <div className="db-unit-tab">{unit}</div>
                      {/* Card body */}
                      <div className="db-unit-body">
                        <ul className="db-practice-list">
                          {items.map((p: any) => (
                            <li key={p.id}>
                              <Link to={`/practice/${p.id}`} className="db-practice-link">
                                <span className="db-practice-icon">
                                  {PRACTICE_TYPE_ICONS[p.type] ?? '▶️'}
                                </span>
                                <span className="db-practice-name">{p.title}</span>
                                <span className="db-practice-badge">{p.type}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {session.user.role === 'admin' && (
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
