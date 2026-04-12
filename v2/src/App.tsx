import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { SignIn } from './SignIn'
import { Dashboard } from './Dashboard'
import { ManageUsers } from './ManageUsers'
import { PracticeShell } from './components/PracticeShell'
import { useSession, signOut, signIn } from './lib/auth'
import './App.css'

function Navigation({ session }: { session: any }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div ref={menuRef} className="nav-container">
      <button 
        className="nav-btn"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
        </svg>
      </button>
      
      {isMenuOpen && (
        <div className="nav-menu">
          <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/">Home</Link>
          {!session ? (
            <>
              <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/signin">Sign In</Link>
              <a 
                className="nav-item danger"
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
              >
                  Admin Login
              </a>
            </>
          ) : (
            <>
              <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/dashboard">Dashboard</Link>
              {session.user.role === 'admin' && (
                  <Link className="nav-item danger" onClick={() => setIsMenuOpen(false)} to="/admin/manage-users">Manage Users</Link>
              )}
              <div className="nav-divider"></div>
              <div className="nav-user-info">
                Logged in as <strong>{session.user.username || session.user.email}</strong>
              </div>
              <button 
                className="nav-item danger"
                onClick={async () => {
                  setIsMenuOpen(false);
                  await signOut()
                  window.location.href = '/v2/signin'
                }}
                style={{ background: 'none', border: 'none', width: '100%', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const { data: session, isPending } = useSession()

  if (isPending) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <BrowserRouter basename="/v2">
      <Navigation session={session} />
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Routes>
          <Route path="/" element={
            <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              <h1>Welcome to English Practices V2</h1>
              <p>This is the new interactive platform. Ask your teacher for an account!</p>
            </div>
          } />
          <Route path="/signin" element={<div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}><SignIn /></div>} />
          <Route path="/admin-login" element={<div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}><SignIn /></div>} />
          <Route path="/dashboard" element={
            <div style={{ background: 'var(--page-bg)', flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexGrow: 1 }}>
                <Dashboard />
              </div>
            </div>
          } />
          <Route path="/practice/:id" element={<PracticeShell />} />
          <Route path="/admin/manage-users" element={<div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}><ManageUsers /></div>} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
