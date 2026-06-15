import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { SignIn } from './SignIn'
import { Dashboard } from './Dashboard'
import { ManageUsers } from './ManageUsers'
import { UsageGuide } from './UsageGuide'
import { PracticeShell } from './components/PracticeShell'
import { PetFloatingCompanion } from './components/PetFloatingCompanion'
import { useSession, signOut, authClient } from './lib/auth'
import { petService } from './lib/petService'
import { SwitchUser } from './SwitchUser'
import { IrregularVerbsModal } from './components/IrregularVerbsModal'
import { SchulteGame } from './components/SchulteGame'
// Memory card matching game
import { CardMatchGame } from './components/CardMatchGame'
import './App.css'

function Navigation({ session, showChinese, onCycleComplete }: { session: any; showChinese: boolean; onCycleComplete?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isIrregularVerbsOpen, setIsIrregularVerbsOpen] = useState(false);
  const [delayedClosed, setDelayedClosed] = useState(false);
  const [hasLoggedInUsers, setHasLoggedInUsers] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('logged_in_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasLoggedInUsers(true);
        } else {
          setHasLoggedInUsers(false);
        }
      } else {
        setHasLoggedInUsers(false);
      }
    } catch (e) {
      setHasLoggedInUsers(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isMenuOpen) {
      setDelayedClosed(false);
    } else {
      setDelayedClosed(true);
      const timer = setTimeout(() => {
        setDelayedClosed(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen]);

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
        className={`nav-btn${isMenuOpen || delayedClosed ? ' active' : ''}`}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle navigation menu"
        style={{ position: 'relative' }}
      >
        {session && (
          <svg className="nav-btn-progress-ring" viewBox="0 0 80 80">
            {/* Background ring */}
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="var(--border)"
              strokeWidth="3.2"
              opacity="0.3"
            />
            {/* Progress ring */}
            <circle
              key={showChinese ? "drain" : "fill"}
              cx="40" cy="40" r="34"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.2"
              strokeLinecap="round"
              className={showChinese ? "nav-progress-circle-drain" : "nav-progress-circle-fill"}
              transform="rotate(-90 40 40)"
              onAnimationEnd={onCycleComplete}
            />
          </svg>
        )}
        <svg className="nav-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 1, position: 'relative' }}>
          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
        </svg>
      </button>
      
      {isMenuOpen && (
        <div className="nav-menu">
          <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/">Home</Link>
          {!session ? (
            <>
              <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/signin">Sign In</Link>
              {hasLoggedInUsers && (
                <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/switch-user">Switch User</Link>
              )}
            </>
          ) : (
            <>
              <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/dashboard">Dashboard</Link>
              <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/manual">Game Manual</Link>
              <Link className="nav-item" onClick={() => setIsMenuOpen(false)} to="/switch-user">Switch User</Link>
              {(session.user as any).role === 'admin' && (
                  <Link className="nav-item danger" onClick={() => setIsMenuOpen(false)} to="/admin/manage-users">Manage Users</Link>
              )}
              <div className="nav-divider"></div>
              <div className="nav-section-title" style={{ padding: '4px 14px', fontSize: '0.75rem', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reference (参考)</div>
              <button 
                className="nav-item" 
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsIrregularVerbsOpen(true);
                }}
                style={{ background: 'none', border: 'none', width: '100%', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                📘 Irregular Verbs
              </button>
              <div className="nav-divider"></div>
              <div className="nav-user-info">
                Logged in as <strong>{session.user.username || session.user.email}</strong>
              </div>
              <button 
                className="nav-item danger"
                onClick={async () => {
                  setIsMenuOpen(false);
                  
                  const currentToken = localStorage.getItem('active_session_token');
                  let loggedInUsers = [];
                  try {
                    loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
                  } catch (e) {}
                  
                  if (Array.isArray(loggedInUsers)) {
                    loggedInUsers = loggedInUsers.filter((u: any) => u.token !== currentToken);
                    localStorage.setItem('logged_in_users', JSON.stringify(loggedInUsers));
                  }
                  localStorage.removeItem('active_session_token');
                  
                  try {
                    await signOut();
                  } catch (e) {
                    console.error(e);
                  }

                  if (loggedInUsers.length > 0) {
                    try {
                      await authClient.multiSession.setActive({
                        sessionToken: loggedInUsers[0].token
                      })
                    } catch (err) {
                      console.error('Failed to set next active session on sign out:', err)
                    }
                    localStorage.setItem('active_session_token', loggedInUsers[0].token);
                    window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/dashboard`;
                  } else {
                    window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/signin`;
                  }
                }}
                style={{ background: 'none', border: 'none', width: '100%', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </>
          )}
          <div className="nav-divider"></div>
          <div style={{ textAlign: 'center', padding: '8px 14px 4px 14px', fontSize: '0.75rem', color: '#444', fontFamily: 'inherit' }}>
            v260615-2312
          </div>
        </div>
      )}
      {isIrregularVerbsOpen && (
        <IrregularVerbsModal onClose={() => setIsIrregularVerbsOpen(false)} />
      )}
    </div>
  );
}

function App() {
  const { data: session, isPending } = useSession()
  const [showChinese, setShowChinese] = useState(false);

  useEffect(() => {
    if (!session) return;

    // Initial sync
    petService.syncWithServer();

    let lastSyncTime = Date.now();
    const handleSyncTrigger = () => {
      const now = Date.now();
      if (now - lastSyncTime > 15000) {
        lastSyncTime = now;
        petService.syncWithServer();
        window.dispatchEvent(new CustomEvent('ep-trigger-sync'));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncTrigger();
      }
    };

    window.addEventListener('focus', handleSyncTrigger);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleSyncTrigger);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);



  if (isPending) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.slice(0, -1) || ''}>
      <Navigation session={session} showChinese={showChinese} onCycleComplete={() => setShowChinese(prev => !prev)} />
      {session && <PetFloatingCompanion />}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Routes>
          <Route path="/" element={
            session ? <Navigate to="/dashboard" replace /> : <Navigate to="/signin" replace />
          } />
          <Route path="/signin" element={<div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}><SignIn /></div>} />
          <Route path="/admin-login" element={<div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}><SignIn /></div>} />
          <Route path="/dashboard" element={
            <div style={{ background: 'var(--page-bg)', flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexGrow: 1 }}>
                <Dashboard showChinese={showChinese} />
              </div>
            </div>
          } />
          <Route path="/manual" element={
            <div style={{ background: 'var(--page-bg)', flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexGrow: 1 }}>
                <UsageGuide />
              </div>
            </div>
          } />
          <Route path="/practice/:id" element={<PracticeShell />} />
          <Route path="/games/schulte" element={
            <div style={{ background: 'var(--page-bg)', flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexGrow: 1 }}>
                <SchulteGame />
              </div>
            </div>
          } />
          <Route path="/games/card-match" element={
            <div style={{ background: 'var(--page-bg)', flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexGrow: 1 }}>
                <CardMatchGame showChinese={showChinese} />
              </div>
            </div>
          } />
          <Route path="/switch-user" element={
            <div style={{ background: 'var(--page-bg)', flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexGrow: 1 }}>
                <SwitchUser />
              </div>
            </div>
          } />
          <Route path="/admin/manage-users" element={<div style={{ padding: 20, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}><ManageUsers /></div>} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
