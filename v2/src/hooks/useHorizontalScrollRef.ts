import { useRef, useCallback } from 'react'

export function useHorizontalScrollRef() {
  const elRef = useRef<HTMLDivElement | null>(null)

  return useCallback((el: HTMLDivElement | null) => {
    if (el) {
      elRef.current = el
      if ((el as any).__horizontalScrollCleanup) return

      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return
        const prevScrollLeft = el.scrollLeft
        el.scrollLeft += e.deltaY
        if (el.scrollLeft !== prevScrollLeft) {
          e.preventDefault()
        }
      }

      let isDown = false
      let startX = 0
      let scrollLeft = 0
      let hasDragged = false

      const onPointerDown = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return
        isDown = true
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
        startX = e.clientX
        scrollLeft = el.scrollLeft
        hasDragged = false
      }

      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        if (!isDown) return
        isDown = false
        el.style.cursor = 'grab'
        el.style.userSelect = ''
        
        try {
          if (el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId)
          }
        } catch {}
        
        if (hasDragged) {
          e.preventDefault()
          e.stopPropagation()
          // Ensure hasDragged is reset after event propagation completes
          setTimeout(() => {
            hasDragged = false
          }, 50)
        }
      }

      const onPointerMove = (e: PointerEvent) => {
        if (!isDown || e.pointerType !== 'mouse') return
        const dx = e.clientX - startX
        const walk = dx * 1.5
        
        if (Math.abs(dx) > 10 && !hasDragged) {
          hasDragged = true
          try {
            el.setPointerCapture(e.pointerId)
          } catch {}
        }

        if (hasDragged) {
          e.preventDefault()
          el.scrollLeft = scrollLeft - walk
        }
      }

      const onClick = (e: MouseEvent) => {
        if (hasDragged) {
          e.preventDefault()
          e.stopPropagation()
          hasDragged = false
        }
      }

      el.addEventListener('wheel', onWheel, { passive: false })
      el.addEventListener('pointerdown', onPointerDown)
      el.addEventListener('pointerup', onPointerUp, true)
      el.addEventListener('pointermove', onPointerMove)
      el.addEventListener('click', onClick, true)

      el.style.cursor = 'grab'

      ;(el as any).__horizontalScrollCleanup = () => {
        el.removeEventListener('wheel', onWheel)
        el.removeEventListener('pointerdown', onPointerDown)
        el.removeEventListener('pointerup', onPointerUp, true)
        el.removeEventListener('pointermove', onPointerMove)
        el.removeEventListener('click', onClick, true)
      }
    } else {
      if (elRef.current && (elRef.current as any).__horizontalScrollCleanup) {
        ;(elRef.current as any).__horizontalScrollCleanup()
        delete (elRef.current as any).__horizontalScrollCleanup
      }
      elRef.current = null
    }
  }, [])
}
