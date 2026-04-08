import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { SignIn } from './SignIn'
import { Dashboard } from './Dashboard'
import { ManageUsers } from './ManageUsers'
import { PracticeShell } from './components/PracticeShell'
import { useSession, signOut, signIn } from './lib/auth'

function App() {
  const { data: session, isPending } = useSession()

  if (isPending) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <BrowserRouter basename="/v2">
      <nav style={{ padding: 10, display: 'flex', gap: 15, background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>Home</Link>
        {!session ? (
          <>
            <Link to="/signin" style={{ textDecoration: 'none', color: '#0366d6' }}>Sign In</Link>
            <a 
              href="/v2/admin-login" 
              onClick={async (e) => {
                  if (import.meta.env.DEV) {
                      e.preventDefault();
                      await signIn.username({
                          username: 'adminx',
                          password: 'adminy'
                      })
                      window.location.href = '/v2/dashboard'
                  }
              }} 
              style={{ textDecoration: 'none', color: '#8b0000', marginLeft: 'auto' }}
            >
                Admin
            </a>
          </>
        ) : (
          <>
            <Link to="/dashboard" style={{ textDecoration: 'none', color: '#0366d6' }}>Dashboard</Link>
            {session.user.role === 'admin' && (
                <Link to="/admin/manage-users" style={{ textDecoration: 'none', color: '#8b0000' }}>Manage Users</Link>
            )}
            <button 
              onClick={async () => {
                await signOut()
                window.location.href = '/v2/signin'
              }}
              style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}
            >
              Sign Out
            </button>
            <span style={{ marginLeft: 'auto', color: '#666' }}>Logged in as {session.user.username || session.user.email}</span>
          </>
        )}
      </nav>
      <div style={{ padding: 20 }}>
        <Routes>
          <Route path="/" element={
            <div>
              <h1>Welcome to English Practices V2</h1>
              <p>This is the new interactive platform. Ask your teacher for an account!</p>
            </div>
          } />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/admin-login" element={<SignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice/:id" element={<PracticeShell />} />
          <Route path="/admin/manage-users" element={<ManageUsers />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
