import { useState, useEffect } from 'react'
import './IrregularVerbsModal.css'

interface DebugModalProps {
  onClose: () => void;
}

export function DebugModal({ onClose }: DebugModalProps) {
  const [viewport, setViewport] = useState({
    innerWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    innerHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    outerWidth: typeof window !== 'undefined' ? window.outerWidth : 0,
    outerHeight: typeof window !== 'undefined' ? window.outerHeight : 0,
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    availWidth: typeof window !== 'undefined' ? window.screen.availWidth : 0,
    availHeight: typeof window !== 'undefined' ? window.screen.availHeight : 0,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    orientation: typeof window !== 'undefined' && window.screen.orientation ? window.screen.orientation.type : 'unknown',
    visualViewportWidth: typeof window !== 'undefined' && window.visualViewport ? Math.round(window.visualViewport.width) : null,
    visualViewportHeight: typeof window !== 'undefined' && window.visualViewport ? Math.round(window.visualViewport.height) : null,
    visualViewportScale: typeof window !== 'undefined' && window.visualViewport ? Number(window.visualViewport.scale.toFixed(2)) : null,
  })

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const updateMetrics = () => {
      setViewport({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        devicePixelRatio: Number(window.devicePixelRatio.toFixed(2)),
        orientation: window.screen.orientation ? window.screen.orientation.type : (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
        visualViewportWidth: window.visualViewport ? Math.round(window.visualViewport.width) : null,
        visualViewportHeight: window.visualViewport ? Math.round(window.visualViewport.height) : null,
        visualViewportScale: window.visualViewport ? Number(window.visualViewport.scale.toFixed(2)) : null,
      })
    }

    window.addEventListener('resize', updateMetrics)
    window.addEventListener('orientationchange', updateMetrics)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateMetrics)
    }

    return () => {
      window.removeEventListener('resize', updateMetrics)
      window.removeEventListener('orientationchange', updateMetrics)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateMetrics)
      }
    }
  }, [])

  const handleCopy = () => {
    const summary = [
      `Viewport: ${viewport.innerWidth} x ${viewport.innerHeight} (CSS px)`,
      `Screen: ${viewport.screenWidth} x ${viewport.screenHeight} (DPR: ${viewport.devicePixelRatio})`,
      `Physical Resolution: ${Math.round(viewport.screenWidth * viewport.devicePixelRatio)} x ${Math.round(viewport.screenHeight * viewport.devicePixelRatio)} px`,
      `Orientation: ${viewport.orientation}`,
      `User Agent: ${navigator.userAgent}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`
    ].join('\n')

    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const physicalWidth = Math.round(viewport.screenWidth * viewport.devicePixelRatio)
  const physicalHeight = Math.round(viewport.screenHeight * viewport.devicePixelRatio)

  return (
    <div className="iv-modal-overlay" onClick={onClose}>
      <div
        className="iv-modal-content"
        style={{ maxWidth: 640 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="iv-modal-header">
          <h3 className="iv-modal-title">🛠️ Debug & Diagnostics (调试诊断)</h3>
          <button className="iv-modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Display / Viewport Section */}
          <div style={{ background: 'var(--bg, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-h, #0f172a)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📱</span>
                <span>Display & Viewport (视口与屏幕尺寸)</span>
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border, #cbd5e1)',
                  background: 'var(--card-bg, #ffffff)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: copied ? '#10b981' : 'var(--text, #475569)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {copied ? '✓ Copied' : '📋 Copy Info'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>CSS Viewport</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent, #3b82f6)', marginTop: 2 }}>
                  {viewport.innerWidth} × {viewport.innerHeight}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>window.innerWidth / Height</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Physical Screen</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {physicalWidth} × {physicalHeight}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>DPR {viewport.devicePixelRatio}x ({viewport.screenWidth}×{viewport.screenHeight})</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Orientation</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', marginTop: 3 }}>
                  {viewport.orientation}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Ratio: {(viewport.innerWidth / (viewport.innerHeight || 1)).toFixed(2)}</div>
              </div>

              {viewport.visualViewportWidth && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Visual Viewport</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {viewport.visualViewportWidth} × {viewport.visualViewportHeight}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Scale: {viewport.visualViewportScale}</div>
                </div>
              )}
            </div>
          </div>

          {/* 2. System & Client Environment */}
          <div style={{ background: 'var(--bg, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-h, #0f172a)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚙️</span>
              <span>Environment & Client (运行环境)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                <span style={{ color: '#64748b' }}>App Build Version:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>v261015-0125</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Network Status:</span>
                <span style={{ fontWeight: 600, color: navigator.onLine ? '#10b981' : '#dc2626' }}>
                  {navigator.onLine ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Touch Supported:</span>
                <span style={{ fontWeight: 600 }}>
                  {'ontouchstart' in window || navigator.maxTouchPoints > 0 ? `Yes (${navigator.maxTouchPoints} pts)` : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                <span style={{ color: '#64748b' }}>User Agent:</span>
                <div style={{ fontSize: '0.74rem', color: '#334155', fontFamily: 'monospace', wordBreak: 'break-all', background: '#fff', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  {navigator.userAgent}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
