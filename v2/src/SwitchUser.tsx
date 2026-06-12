import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSession, signOut, authClient, API_URL } from './lib/auth'

interface LoggedInUser {
  userId: string;
  username: string;
  name: string;
  role: string;
  token: string;
}

export function SwitchUser() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<LoggedInUser[]>([])
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  const [invalidTokens, setInvalidTokens] = useState<Set<string>>(new Set())
  const [validating, setValidating] = useState(true)
  const activeToken = localStorage.getItem('active_session_token')
  // Track invalid tokens to clean up when the user navigates away
  const invalidTokensRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let parsedUsers: LoggedInUser[] = []
    try {
      const stored = localStorage.getItem('logged_in_users')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          parsedUsers = parsed
          setUsers(parsed)
        }
      }
    } catch (e) {
      console.error('Failed to read logged_in_users', e)
    }

    // Validate tokens of non-active users
    const othersToValidate = parsedUsers.filter(
      u => u.token !== activeToken && u.userId !== session?.user?.id
    )

    if (othersToValidate.length === 0) {
      setValidating(false)
      return
    }

    let cancelled = false
    const validate = async () => {
      const dead = new Set<string>()
      await Promise.all(
        othersToValidate.map(async (u) => {
          try {
            const res = await fetch(API_URL + '/api/me', {
              credentials: 'include',
              headers: { 'Authorization': `Bearer ${u.token}` }
            })
            if (!res.ok) dead.add(u.token)
          } catch {
            dead.add(u.token)
          }
        })
      )
      if (!cancelled) {
        setInvalidTokens(dead)
        invalidTokensRef.current = dead
        setValidating(false)
      }
    }
    validate()
    return () => { cancelled = true }
  }, [session])

  // Clean up invalid tokens from localStorage when unmounting (navigating away)
  useEffect(() => {
    return () => {
      const dead = invalidTokensRef.current
      if (dead.size > 0) {
        try {
          const stored = localStorage.getItem('logged_in_users')
          if (stored) {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((u: any) => !dead.has(u.token))
              localStorage.setItem('logged_in_users', JSON.stringify(cleaned))
            }
          }
        } catch (e) {
          console.error('Failed to clean up invalid users', e)
        }
      }
    }
  }, [])

  const handleSwitch = async (token: string) => {
    // Don't allow switching to an invalid/expired session
    if (invalidTokens.has(token)) return

    const targetUser = users.find(u => u.token === token)
    setSwitchingTo(targetUser ? targetUser.name : 'another account')
    try {
      await authClient.multiSession.setActive({
        sessionToken: token
      })
      localStorage.setItem('active_session_token', token)
      // Full page reload to reset all client states and cache
      window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/dashboard`
    } catch (e) {
      setSwitchingTo(null)
      console.error('Failed to switch active session:', e)
    }
  }

  const handleRemove = async (e: React.MouseEvent, tokenToRemove: string) => {
    e.stopPropagation() // prevent switching on click
    
    if (!window.confirm('Are you sure you want to log out and remove this account from this device?')) {
      return
    }

    // Also remove from invalid set if present
    setInvalidTokens(prev => {
      const next = new Set(prev)
      next.delete(tokenToRemove)
      invalidTokensRef.current = next
      return next
    })

    const updatedUsers = users.filter(u => u.token !== tokenToRemove)
    setUsers(updatedUsers)
    localStorage.setItem('logged_in_users', JSON.stringify(updatedUsers))

    // If we are removing the active user, we need to sign them out
    if (activeToken === tokenToRemove) {
      localStorage.removeItem('active_session_token')
      try {
        await signOut()
      } catch (e) {
        console.error(e)
      }
      
      if (updatedUsers.length > 0) {
        // Auto switch to next user
        setSwitchingTo(updatedUsers[0].name)
        try {
          await authClient.multiSession.setActive({
            sessionToken: updatedUsers[0].token
          })
        } catch (err) {
          console.error('Failed to set next active session on removal:', err)
        }
        localStorage.setItem('active_session_token', updatedUsers[0].token)
        window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/dashboard`
      } else {
        window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/signin`
      }
    }
  }

  const handleAddNew = () => {
    // Temporarily clear active session token so the sign-in page doesn't think we are already logged in
    localStorage.removeItem('active_session_token')
    window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/signin`
  }

  if (switchingTo) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        fontFamily: 'var(--sans)',
        color: 'var(--text-h)',
        gap: '16px'
      }}>
        {/* Simple elegant CSS spinner */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent, #aa3bff)',
          animation: 'ep-spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes ep-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>Switching to {switchingTo}...</span>
      </div>
    )
  }

  // Get user role display emoji
  const getRoleEmoji = (role: string) => {
    if (role === 'admin') return '🛡️'
    return '🎓'
  }

  const otherUsers = users.filter(u => u.token !== activeToken && u.userId !== session?.user?.id)

  return (
    <div style={{
      maxWidth: '650px',
      margin: '40px auto',
      padding: '24px',
      boxSizing: 'border-box',
      fontFamily: 'var(--sans)'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '32px'
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 700,
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, var(--tab-active-text, #0366d6), var(--accent, #aa3bff))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block'
        }}>
          Switch Account
        </h2>
        <p style={{
          color: 'var(--text)',
          fontSize: '0.95rem',
          margin: 0
        }}>
          Select an account to continue or sign in to another one.
        </p>
      </div>

      {session?.user && (
        <div style={{
          background: 'var(--accent-bg, rgba(170, 59, 255, 0.05))',
          border: '1px solid var(--accent-border, rgba(170, 59, 255, 0.2))',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '24px',
          textAlign: 'center',
          fontSize: '0.95rem',
          color: 'var(--text-h)'
        }}>
          You are currently logged in as <strong>{session.user.name}</strong> (@{session.user.username || session.user.email})
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {otherUsers.map(u => {
          const isExpired = invalidTokens.has(u.token)
          const isCheckingTokens = validating
          return (
            <div
              key={u.userId}
              onClick={() => !isExpired && !isCheckingTokens && handleSwitch(u.token)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: '16px',
                background: isExpired ? 'var(--code-bg, #f0f0f0)' : 'var(--card-bg, #ebf3fb)',
                border: '2px solid transparent',
                cursor: isExpired || isCheckingTokens ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow)',
                position: 'relative',
                overflow: 'hidden',
                opacity: isExpired ? 0.5 : 1,
                filter: isExpired ? 'grayscale(0.8)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isExpired && !isCheckingTokens) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Avatar Badge */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--border, #ccc)',
                  color: 'var(--text-h)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {getRoleEmoji(u.role)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontWeight: 600,
                      color: isExpired ? 'var(--text)' : 'var(--text-h)',
                      fontSize: '1.05rem'
                    }}>
                      {u.name}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: u.role === 'admin' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(3, 102, 214, 0.15)',
                      color: u.role === 'admin' ? '#22c55e' : 'var(--tab-active-text)',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {u.role}
                    </span>
                    {isExpired && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#dc2626',
                        fontWeight: 'bold'
                      }}>
                        SESSION EXPIRED
                      </span>
                    )}
                  </div>
                  <span style={{
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    display: 'block',
                    marginTop: '2px'
                  }}>
                    @{u.username}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={(e) => handleRemove(e, u.token)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d73a49',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  title="Remove account from device"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffeef0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}

        {/* Add Account Card — only show if under the 3-user limit */}
        {users.length < 3 && (
          <div
            onClick={handleAddNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '18px',
              borderRadius: '16px',
              border: '2px dashed var(--border)',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--tab-active-text, #0366d6)',
              transition: 'all 0.2s ease',
              fontWeight: 600
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--tab-active-text)'
              e.currentTarget.style.background = 'rgba(3, 102, 214, 0.03)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>+</span> Log In to Another Account
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        {session ? (
          <Link
            to="/dashboard"
            style={{
              color: 'var(--text)',
              fontSize: '0.9rem',
              textDecoration: 'underline'
            }}
          >
            Back to Dashboard
          </Link>
        ) : (
          <Link
            to="/signin"
            style={{
              color: 'var(--text)',
              fontSize: '0.9rem',
              textDecoration: 'underline'
            }}
          >
            Back to Login Screen
          </Link>
        )}
      </div>
    </div>
  )
}
