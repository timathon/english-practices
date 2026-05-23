import React, { useState, useEffect } from 'react'
import { useSession, API_URL } from './lib/auth'
import { cache } from './lib/cache'
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './Dashboard.css'
import { getTextbookEmoji } from './Dashboard'

export function ManageUsers() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<any[]>([])
  const [textbooks, setTextbooks] = useState<string[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [editingTextbooks, setEditingTextbooks] = useState<Set<string>>(new Set())
  const [editingExpiry, setEditingExpiry] = useState<string>('')

  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [selectedUserRecords, setSelectedUserRecords] = useState<any[]>([])
  const [practices, setPractices] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [activeTodayBook, setActiveTodayBook] = useState<string>('')

  const fetchUsers = async () => {
    const res = await fetch(API_URL + '/api/admin/users', { credentials: 'include' })
    if (res.ok) {
        setUsers(await res.json())
    }
  }

  const fetchTextbooks = async () => {
    const res = await fetch(`${import.meta.env.BASE_URL.slice(0, -1) || ''}/textbooks.json`)
    if (res.ok) {
        setTextbooks(await res.json())
    }
  }

  const fetchAllPractices = async () => {
    const cached = cache.getPractices()
    if (cached) {
      setPractices(cached)
      return
    }
    const res = await fetch(API_URL + '/api/practices', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        cache.setPractices(data)
        setPractices(data)
      }
    }
  }

  const handleSelectUserForStats = async (user: any) => {
    setSelectedUser(user)
    setLoadingStats(true)
    try {
      const res = await fetch(API_URL + `/api/admin/users/${user.id}/records`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSelectedUserRecords(data)
      } else {
        alert("Failed to fetch user stats")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  const userId = session?.user?.id

  useEffect(() => {
    if (userId && (session?.user as any)?.role === 'admin') {
      fetchUsers()
      fetchTextbooks()
      fetchAllPractices()
    }
  }, [userId])

  if (!session) return <div>Please login.</div>
  if ((session.user as any).role !== 'admin') return <div>Unauthorized. Admin access required.</div>

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    const res = await fetch(API_URL + '/api/admin/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (data.user) {
        setMsg(`Success: Created user ${data.user.username}`)
        setUsername('')
        setPassword('')
        fetchUsers()
    } else {
        setMsg(`Error: ${JSON.stringify(data)}`)
    }
  }

  const handleRemoveUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    const res = await fetch(API_URL + `/api/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
       fetchUsers();
    } else {
       setMsg("Failed to remove user");
    }
  }

  const startEdit = (user: any) => {
      setEditingUserId(user.id)
      let tbs = user.textbooks || []
      if (typeof tbs === 'string') {
          try { tbs = JSON.parse(tbs) } catch { tbs = [] }
      }
      if (!Array.isArray(tbs)) tbs = []
      setEditingTextbooks(new Set(tbs))
      setEditingExpiry(user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toISOString().split('T')[0] : '')
  }

  const toggleTextbook = (tb: string) => {
      setEditingTextbooks(prev => {
          const next = new Set(prev)
          if (next.has(tb)) next.delete(tb)
          else next.add(tb)
          return next
      })
  }

  const saveUserAccess = async (id: string) => {
      const tbArray = Array.from(editingTextbooks)
      const res = await fetch(API_URL + `/api/admin/users/${id}/textbooks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
              textbooks: tbArray,
              subscriptionExpiry: editingExpiry || null
          })
      })
      if (res.ok) {
          setEditingUserId(null)
          fetchUsers()
      } else {
          alert('Failed to save access rights')
      }
  }

  const handleResetPassword = async (id: string) => {
      if (!newPassword || newPassword.length < 6) {
          alert('Password must be at least 6 characters');
          return;
      }
      const res = await fetch(API_URL + `/api/admin/users/${id}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ password: newPassword })
      })
      if (res.ok) {
          setResettingUserId(null)
          setNewPassword('')
          setMsg('Successfully reset password')
      } else {
          const err = await res.json()
          alert('Failed: ' + (err.error || 'Unknown error'))
      }
  }

  return (
    <div style={{ maxWidth: 800, margin: '20px auto' }}>
      <h2>Manage Users</h2>

      <div style={{ background: '#f9f9f9', padding: 20, marginBottom: 20, border: '1px solid #ccc', borderRadius: 8 }}>
        <h3>Add User</h3>
        {msg && <div style={{ color: msg.startsWith('Error') ? 'red' : 'green', marginBottom: 10 }}>{msg}</div>}
        <form onSubmit={handleAddUser} style={{ display: 'flex', gap: 10 }}>
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ padding: 8 }}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ padding: 8 }}
            />
            <button type="submit" style={{ padding: '8px 16px', background: '#0366d6', color: 'white', border: 'none', borderRadius: 4 }}>Add Student</button>
        </form>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: 10 }}>Username</th>
                <th style={{ padding: 10 }}>Role</th>
                <th style={{ padding: 10 }}>Textbooks</th>
                <th style={{ padding: 10 }}>Expiry</th>
                <th style={{ padding: 10 }}>Joined</th>
                <th style={{ padding: 10 }}>Actions</th>
            </tr>
        </thead>
        <tbody>
            {users.map(u => (
                <React.Fragment key={u.id}>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>
                        <button 
                            onClick={() => handleSelectUserForStats(u)}
                            title="Click to view practice stats"
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--accent, #aa3bff)', 
                                cursor: 'pointer', 
                                padding: 0, 
                                font: 'inherit', 
                                textDecoration: 'underline',
                                fontWeight: 'bold',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--tab-active-text)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--accent, #aa3bff)'}
                        >
                            {u.username}
                        </button>
                    </td>
                    <td style={{ padding: 10 }}>{u.role}</td>
                    <td style={{ padding: 10 }}>
                        {u.role === 'admin' ? (
                            <span style={{ fontSize: '0.9em', color: '#8b0000', fontWeight: 'bold' }}>All Access</span>
                        ) : (() => {
                            let tbs = u.textbooks || []
                            if (typeof tbs === 'string') {
                                try { tbs = JSON.parse(tbs) } catch { tbs = [] }
                            }
                            if (!Array.isArray(tbs)) tbs = []
                            const filtered = tbs.filter((t: string) => t && t !== '[' && t !== ']' && t !== ' ' && t !== ',')
                            return filtered.length > 0 ? (
                                <span style={{ fontSize: '0.9em', color: '#555' }}>{filtered.join(', ')}</span>
                            ) : (
                                <span style={{ fontSize: '0.9em', color: '#999', fontStyle: 'italic' }}>None</span>
                            )
                        })()}
                    </td>
                    <td style={{ padding: 10 }}>
                        {u.subscriptionExpiry ? (
                            <span style={{ 
                                color: new Date(u.subscriptionExpiry) < new Date() ? 'red' : 'inherit',
                                fontWeight: new Date(u.subscriptionExpiry) < new Date() ? 'bold' : 'normal'
                            }}>
                                {new Date(u.subscriptionExpiry).toLocaleDateString()}
                            </span>
                        ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>Lifetime</span>
                        )}
                    </td>
                    <td style={{ padding: 10 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: 10, display: 'flex', gap: 5 }}>
                        {u.role !== 'admin' ? (
                            <>
                                <button 
                                    onClick={() => {
                                        setResettingUserId(null)
                                        editingUserId === u.id ? setEditingUserId(null) : startEdit(u)
                                    }}
                                    style={{ padding: '4px 8px', background: '#e1e4e8', color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                                >
                                    {editingUserId === u.id ? 'Cancel' : 'Edit Access'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setEditingUserId(null)
                                        resettingUserId === u.id ? setResettingUserId(null) : setResettingUserId(u.id)
                                    }}
                                    style={{ padding: '4px 8px', background: '#e1e4e8', color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                                >
                                    {resettingUserId === u.id ? 'Cancel' : 'Reset Pwd'}
                                </button>
                                <button 
                                  onClick={() => handleRemoveUser(u.id)}
                                  style={{ padding: '4px 8px', background: 'red', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                >
                                  Remove
                                </button>
                            </>
                        ) : (
                            <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9em' }}>Built-in</span>
                        )}
                    </td>
                </tr>
                {editingUserId === u.id && (
                    <tr style={{ background: '#f5f8fa', borderBottom: '2px solid #ccc' }}>
                        <td colSpan={6} style={{ padding: '15px 20px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 10 }}>Select Accessible Textbooks:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 15 }}>
                                {textbooks.map(tb => (
                                    <label key={tb} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={editingTextbooks.has(tb)}
                                            onChange={() => toggleTextbook(tb)} 
                                        /> {tb}
                                    </label>
                                ))}
                            </div>

                            <div style={{ fontWeight: 'bold', marginBottom: 10 }}>Subscription Expiry:</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                                <input 
                                    type="date" 
                                    value={editingExpiry} 
                                    onChange={e => setEditingExpiry(e.target.value)}
                                    style={{ padding: 8 }}
                                />
                                <button 
                                    onClick={() => {
                                        const d = new Date()
                                        d.setDate(d.getDate() + 30)
                                        setEditingExpiry(d.toISOString().split('T')[0])
                                    }}
                                    style={{ padding: '6px 10px', background: '#0366d6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    +30 Days
                                </button>
                                <button 
                                    onClick={() => {
                                        const d = new Date()
                                        d.setDate(d.getDate() + 180)
                                        setEditingExpiry(d.toISOString().split('T')[0])
                                    }}
                                    style={{ padding: '6px 10px', background: '#0366d6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    +180 Days
                                </button>
                                <button 
                                    onClick={() => {
                                        const d = new Date()
                                        d.setDate(d.getDate() + 365)
                                        setEditingExpiry(d.toISOString().split('T')[0])
                                    }}
                                    style={{ padding: '6px 10px', background: '#0366d6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    +365 Days
                                </button>
                                <button 
                                    onClick={() => setEditingExpiry('')}
                                    style={{ padding: '6px 10px', background: '#fff', color: '#0366d6', border: '1px solid #0366d6', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Lifetime
                                </button>
                            </div>

                            <button 
                                onClick={() => saveUserAccess(u.id)}
                                style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                                Save Changes
                            </button>
                        </td>
                    </tr>
                )}
                {resettingUserId === u.id && (
                    <tr style={{ background: '#fff4f4', borderBottom: '2px solid #ccc' }}>
                        <td colSpan={6} style={{ padding: '15px 20px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 10 }}>Set New Password for {u.username}:</div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    style={{ padding: '8px' }}
                                />
                                <button 
                                    onClick={() => handleResetPassword(u.id)}
                                    style={{ padding: '6px 12px', background: '#d73a49', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                >
                                    Confirm Reset
                                </button>
                            </div>
                        </td>
                    </tr>
                )}
                </React.Fragment>
            ))}
        </tbody>
      </table>
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
          boxSizing: 'border-box'
        }}
        onClick={() => setSelectedUser(null)}
        >
          <div style={{
            background: 'var(--bg)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            width: '100%',
            maxWidth: '1080px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            boxSizing: 'border-box',
            position: 'relative',
            boxShadow: 'var(--shadow)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-h)', fontWeight: 'bold' }}>
                  Practice Stats: {selectedUser.username}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                  Registered on {new Date(selectedUser.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                style={{
                  background: 'var(--code-bg)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  color: 'var(--text-h)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            {loadingStats ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>Loading stats...</div>
            ) : (
              <div>
                <div className="db-books" style={{ gap: '30px', width: '100%', flexWrap: 'wrap' }}>
                  
                  {/* Today's Practices */}
                  <div className="db-stats" style={{ flex: '1 1 450px', maxWidth: '100%' }}>
                    <h3 className="db-stats-title">Today's Practices</h3>
                    {(() => {
                      const todayStr = new Date().toLocaleDateString();
                      const parsedTodayRecords = selectedUserRecords
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

                      return parsedTodayRecords.length > 0 ? (
                        <div>
                          <div className="db-units-tabs" style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
                            {todayBookKeys.map(book => (
                              <button
                                key={book}
                                onClick={() => setActiveTodayBook(book)}
                                className={`db-tab-btn ${activeBook === book ? 'active' : ''}`}
                                style={{
                                  padding: '6px 14px',
                                  border: 'none',
                                  borderBottom: activeBook === book ? '3px solid var(--tab-active-text)' : '3px solid transparent',
                                  background: activeBook === book ? 'var(--card-bg)' : 'transparent',
                                  cursor: 'pointer',
                                  fontWeight: activeBook === book ? 'bold' : 'normal',
                                  color: activeBook === book ? 'var(--tab-active-text)' : 'var(--tab-text)',
                                  borderRadius: '5px 5px 0 0',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>{getTextbookEmoji(book)}</span>
                                <span>{book} ({todayRecordsByBook[book].length})</span>
                              </button>
                            ))}
                          </div>
                          <div className="db-stats-table-container" style={{ borderRadius: '0 10px 10px 10px' }}>
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
                        <div className="db-empty" style={{ padding: '20px' }}>No practices started today yet.</div>
                      );
                    })()}
                  </div>

                  {/* Recent 7 Days Activity */}
                  <div className="db-stats" style={{ flex: '1 1 450px', maxWidth: '100%' }}>
                    <h3 className="db-stats-title">Recent 7 Days Activity</h3>
                    {(() => {
                      const getLast7DaysStats = (recs: any[]) => {
                        const stats = [];
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        for (let i = 6; i >= 0; i--) {
                          const d = new Date(today);
                          d.setDate(d.getDate() - i);

                          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                          const nextDay = new Date(d);
                          nextDay.setDate(nextDay.getDate() + 1);

                          const dayRecords = recs.filter(r => {
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
                      const last7DaysStats = getLast7DaysStats(selectedUserRecords);

                      return (
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
                                  contentStyle={{
                                    backgroundColor: 'var(--card-bg)',
                                    borderColor: 'var(--border)',
                                    borderRadius: '10px',
                                    color: 'var(--text-h)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                    backdropFilter: 'blur(12px)',
                                    padding: '10px 14px',
                                    fontSize: '0.8rem',
                                  }}
                                  labelStyle={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}
                                  itemStyle={{ color: 'var(--text-h)', padding: '2px 0' }}
                                  itemSorter={(item) => item.name === 'Practices Done' ? 1 : 2}
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
                      );
                    })()}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
