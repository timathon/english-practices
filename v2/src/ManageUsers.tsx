import React, { useState, useEffect } from 'react'
import { useSession } from './lib/auth'

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

  const fetchUsers = async () => {
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + '/api/admin/users', { credentials: 'include' })
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

  useEffect(() => {
    if ((session?.user as any)?.role === 'admin') {
      fetchUsers()
      fetchTextbooks()
    }
  }, [session])

  if (!session) return <div>Please login.</div>
  if ((session.user as any).role !== 'admin') return <div>Unauthorized. Admin access required.</div>

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + '/api/admin/users', {
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
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + `/api/admin/users/${id}`, {
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
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + `/api/admin/users/${id}/textbooks`, {
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
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + `/api/admin/users/${id}/password`, {
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
                    <td style={{ padding: 10 }}>{u.username}</td>
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
    </div>
  )
}
