import { useState } from 'react'
import { signUp } from './lib/auth'

export function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    await signUp.email({
      name,
      email,
      password,
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message)
        },
        onSuccess() {
          window.location.href = '/v2/dashboard'
        }
      }
    })
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Sign Up</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <input 
          type="text" 
          placeholder="Name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
          style={{ padding: 10 }}
        />
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
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
        <button type="submit" style={{ padding: 10, background: '#28a745', color: 'white', border: 'none', borderRadius: 4 }}>
          Sign Up
        </button>
      </form>
    </div>
  )
}
