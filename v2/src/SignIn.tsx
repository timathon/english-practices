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
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Sign In</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <input 
          type="text" 
          placeholder="Email or Username" 
          value={usernameOrEmail} 
          onChange={e => setUsernameOrEmail(e.target.value)} 
          required 
          style={{ padding: 10 }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ padding: 10 }}
        />
        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            padding: 10, 
            background: loading ? '#ccc' : '#0366d6', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
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

