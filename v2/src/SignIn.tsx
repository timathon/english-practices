import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signIn } from './lib/auth'

export function SignIn() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasLoggedInUsers, setHasLoggedInUsers] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('logged_in_users')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasLoggedInUsers(true)
        }
      }
    } catch (e) {}
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const isEmail = usernameOrEmail.includes('@')

    const options = {
      password,
      fetchOptions: {
        onError(ctx: any) {
          setError(ctx.error.message)
          setLoading(false)
        },
        onSuccess() {
          window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/dashboard`
        }
      }
    }

    if (isEmail) {
      await signIn.email({ email: usernameOrEmail, ...options })
    } else {
      await signIn.username({ username: usernameOrEmail, ...options })
    }
  }

  return (
    <div style={{ 
      maxWidth: 400, 
      margin: '40px auto', 
      padding: '30px 24px', 
      border: '1px solid var(--border, #ccc)', 
      borderRadius: 16, 
      background: 'var(--card-bg, #fff)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '1.75rem', color: 'var(--text-h, #333)', fontWeight: 'bold' }}>TextbookPass</h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text, #666)' }}>同步派 English Learning Portal</p>
      </div>
      
      {error && (
        <div style={{ 
          color: 'var(--accent, #d73a49)', 
          marginBottom: 16, 
          padding: '10px 12px', 
          background: 'rgba(215, 58, 73, 0.08)', 
          border: '1px solid rgba(215, 58, 73, 0.2)', 
          borderRadius: 8, 
          fontSize: '0.85rem' 
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input 
          type="text" 
          placeholder="Email or Username" 
          value={usernameOrEmail} 
          onChange={e => setUsernameOrEmail(e.target.value)} 
          required 
          style={{ 
            padding: 12, 
            borderRadius: 8, 
            border: '1px solid var(--border, #ccc)', 
            background: 'var(--bg, #fff)', 
            color: 'var(--text-h, #333)' 
          }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ 
            padding: 12, 
            borderRadius: 8, 
            border: '1px solid var(--border, #ccc)', 
            background: 'var(--bg, #fff)', 
            color: 'var(--text-h, #333)' 
          }}
        />
        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            padding: 12, 
            background: loading ? '#ccc' : 'var(--accent, #0366d6)', 
            color: 'white', 
            border: 'none', 
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        {hasLoggedInUsers && (
          <Link 
            to="/switch-user" 
            style={{ 
              textAlign: 'center', 
              marginTop: 10, 
              display: 'block', 
              color: 'var(--tab-active-text, #0366d6)',
              fontSize: '0.9rem',
              textDecoration: 'underline'
            }}
          >
            Switch to an existing account
          </Link>
        )}
      </form>
    </div>
  )
}

