import React from 'react';
import { KeyRound } from 'lucide-react';

interface AuthScreenProps {
  passcode: string;
  setPasscode: (val: string) => void;
  authError: string;
  handleLogin: (e: React.FormEvent) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  passcode,
  setPasscode,
  authError,
  handleLogin,
}) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top, #1e293b, #0b0f19)' }}>
      <form onSubmit={handleLogin} style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59,130,246,0.1)', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>
          <KeyRound size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>TTS Studio Access</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Enter passcode to unlock remote TTS pipeline</p>
        
        <input
          type="password"
          placeholder="Enter passcode"
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem', padding: '0.75rem' }}
          required
        />

        {authError && <div style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}

        <button
          type="submit"
          style={{ width: '100%', padding: '0.75rem', background: 'var(--accent-primary)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}
        >
          Unlock Studio
        </button>
      </form>
    </div>
  );
};
