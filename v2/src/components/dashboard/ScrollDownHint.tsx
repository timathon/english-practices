import React, { useState, useEffect } from 'react'

export function ScrollDownHint() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      
      const atBottom = scrollTop + windowHeight >= documentHeight - 100
      const isScrollable = documentHeight > windowHeight + 200
      
      setIsVisible(!atBottom && isScrollable)
    }

    window.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    const timer = setTimeout(checkScroll, 500)
    
    return () => {
      window.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      clearTimeout(timer)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="db-scroll-down-hint" onClick={() => window.scrollBy({ top: window.innerHeight * 0.6, behavior: 'smooth' })}>
      <svg width="30" height="45" viewBox="0 0 30 45">
        <path d="M4 6 L15 17 L26 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="hint-arrow-1" />
        <path d="M4 18 L15 29 L26 18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="hint-arrow-2" />
        <path d="M4 30 L15 41 L26 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="hint-arrow-3" />
      </svg>
    </div>
  )
}
