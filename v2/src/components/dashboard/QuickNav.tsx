import React from 'react'

export function QuickNav({ showChinese }: { showChinese: boolean }) {
  return (
    <div className="db-quick-nav">
        {/* Mobile View SVG (3 Buttons) */}
        <svg 
          width="44" 
          height="124" 
          viewBox="0 0 44 124" 
          className="db-quick-nav-svg db-nav-mobile-only"
        >
          {/* Top Rectangle: Scroll to Top */}
          <g 
            className="db-nav-group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
          >
            <title>{showChinese ? "回到顶部" : "Go to top"}</title>
            <rect 
              x="2" 
              y="2" 
              width="40" 
              height="36" 
              rx="8" 
              className="db-nav-rect" 
            />
            <polyline 
              points="16 23 22 17 28 23" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              fill="none" 
              className="db-nav-icon"
            />
          </g>

          {/* Middle Rectangle: Scroll to Activity */}
          <g 
            className="db-nav-group"
            onClick={() => {
              const petEl = document.querySelector('.db-pet-widget-wrapper');
              if (petEl) {
                const rect = petEl.getBoundingClientRect();
                const targetTop = rect.bottom + window.scrollY;
                const isMobile = window.innerWidth < 920;
                if (isMobile) {
                  window.scrollTo({ top: targetTop, behavior: 'smooth' });
                } else {
                  const statsEl = document.querySelector('.db-top-right .db-stats');
                  if (statsEl) statsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <title>{showChinese ? "跳转到最近活动" : "Go to Activity"}</title>
            <rect 
              x="2" 
              y="44" 
              width="40" 
              height="36" 
              rx="8" 
              className="db-nav-rect" 
            />
            <line x1="16" y1="68" x2="16" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="db-nav-icon" />
            <line x1="22" y1="68" x2="22" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="db-nav-icon" />
            <line x1="28" y1="68" x2="28" y2="61" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="db-nav-icon" />
          </g>

          {/* Bottom Rectangle: Scroll to Practice Library */}
          <g 
            className="db-nav-group"
            onClick={() => {
              const topSec = document.querySelector('.db-top-section');
              if (topSec) {
                const rect = topSec.getBoundingClientRect();
                const targetTop = rect.bottom + window.scrollY;
                const isMobile = window.innerWidth < 920;
                if (isMobile) {
                  window.scrollTo({ top: targetTop, behavior: 'smooth' });
                } else {
                  const el = document.querySelector('.db-view-tabs');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <title>{showChinese ? "跳转到练习库" : "Go to Practice Library"}</title>
            <rect 
              x="2" 
              y="86" 
              width="40" 
              height="36" 
              rx="8" 
              className="db-nav-rect" 
            />
            <path d="M15 106 L22 106 L29 106" stroke="currentColor" strokeWidth="2" className="db-nav-icon" />
            <path d="M16 92 A 3 3 0 0 1 22 98 A 3 3 0 0 1 28 92" stroke="currentColor" strokeWidth="2.5" fill="none" className="db-nav-icon" />
          </g>
        </svg>

        {/* Desktop View SVG (2 Buttons, Middle Hidden) */}
        <svg 
          width="44" 
          height="82" 
          viewBox="0 0 44 82" 
          className="db-quick-nav-svg db-nav-desktop-only"
        >
          {/* Top Rectangle: Scroll to Top */}
          <g 
            className="db-nav-group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
          >
            <title>{showChinese ? "回到顶部" : "Go to top"}</title>
            <rect 
              x="2" 
              y="2" 
              width="40" 
              height="36" 
              rx="8" 
              className="db-nav-rect" 
            />
            <polyline 
              points="16 23 22 17 28 23" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              fill="none" 
              className="db-nav-icon"
            />
          </g>

          {/* Bottom Rectangle: Scroll to Practice Library */}
          <g 
            className="db-nav-group"
            onClick={() => {
              const el = document.querySelector('.db-view-tabs');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{ cursor: 'pointer' }}
          >
            <title>{showChinese ? "跳转到练习库" : "Go to Practice Library"}</title>
            <rect 
              x="2" 
              y="44" 
              width="40" 
              height="36" 
              rx="8" 
              className="db-nav-rect" 
            />
            <path d="M15 64 L22 64 L29 64" stroke="currentColor" strokeWidth="2" className="db-nav-icon" />
            <path d="M16 50 A 3 3 0 0 1 22 56 A 3 3 0 0 1 28 50" stroke="currentColor" strokeWidth="2.5" fill="none" className="db-nav-icon" />
          </g>
        </svg>
      </div>
  )
}
