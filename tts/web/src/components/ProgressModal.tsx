import React from 'react';
import { Scissors, Upload } from 'lucide-react';

export interface ProgressModalData {
  open: boolean;
  type: 'cutting' | 'uploading';
  current: number;
  total: number;
  currentText: string;
  cancelRequested?: boolean;
}

interface ProgressModalProps {
  modal: ProgressModalData;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({ modal }) => {
  if (!modal.open) return null;

  const percentage = modal.total > 0 ? Math.min(100, Math.round((modal.current / modal.total) * 100)) : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        width: '90%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        textAlign: 'center'
      }}>
        {/* Modal Icon and Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: modal.type === 'cutting' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: modal.type === 'cutting' ? '#818cf8' : 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: modal.type === 'cutting' ? '0 0 20px rgba(99,102,241,0.25)' : '0 0 20px rgba(16,185,129,0.25)'
          }}>
            {modal.type === 'cutting' ? (
              <Scissors size={28} className="spin" style={{ animationDuration: '3s' }} />
            ) : (
              <Upload size={28} className="bounce" />
            )}
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            {modal.type === 'cutting' ? 'Cutting Audio Slices...' : 'Uploading to Cloudflare R2...'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {modal.type === 'cutting' 
              ? 'Trimming silence, encoding MP3 slices, and generating local previews.'
              : 'Transferring encoded MP3s directly to Cloudflare R2 bucket storage.'}
          </p>
        </div>

        {/* Progress Bar Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: 'var(--text-secondary)'
          }}>
            <span>Progress: {modal.current} / {modal.total}</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {percentage}%
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '10px',
            background: 'var(--bg-input)',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: modal.type === 'cutting' 
                ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                : 'linear-gradient(90deg, #10b981, #06b6d4)',
              borderRadius: '999px',
              transition: 'width 0.15s ease-out'
            }} />
          </div>
        </div>

        {/* Current Item Preview */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          textAlign: 'left'
        }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Currently Processing ({modal.current} of {modal.total})
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            "{modal.currentText || 'Preparing...'}"
          </div>
        </div>
      </div>
    </div>
  );
};
