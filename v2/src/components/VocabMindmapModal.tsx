import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { Node } from './mind-map/MindMapTypes'
import { audioCache } from '../lib/audioCache'
import { getAudioUrl } from '../lib/practiceAudio'
import './VocabMindmapModal.css'

interface VocabMindmapModalProps {
  tree: Node
  title?: string
  level?: string
  textbook?: string
  isCf?: boolean
  onClose: () => void
}

type LangDisplayMode = 'both' | 'en' | 'cn'

export const BRANCH_PALETTES = [
  { name: 'sky', vine: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc', text: '#0369a1' },
  { name: 'amber', vine: '#d97706', bg: '#fffbeb', border: '#fcd34d', text: '#b45309' },
  { name: 'emerald', vine: '#059669', bg: '#f0fdf4', border: '#6ee7b7', text: '#047857' },
  { name: 'purple', vine: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd', text: '#6d28d9' },
  { name: 'rose', vine: '#e11d48', bg: '#fff1f2', border: '#fca5a5', text: '#be123c' },
  { name: 'teal', vine: '#0d9488', bg: '#f0fdfa', border: '#5eead4', text: '#0f766e' },
]

interface LayoutItem {
  id: string
  node: Node
  depth: number
  branchIndex: number
  side: 'center'
  x: number
  y: number
  parentX: number
  parentY: number
  isCollapsed: boolean
  hasChildren: boolean
}

export function VocabMindmapModal({
  tree,
  title = 'Vocabulary Mindmap',
  level,
  textbook,
  isCf,
  onClose,
}: VocabMindmapModalProps) {
  const [langMode, setLangMode] = useState<LangDisplayMode>('both')
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [playingNodeId, setPlayingNodeId] = useState<string | null>(null)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(0.85)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Canvas Hint auto-shrink after 5s, clicking emoji re-expands for 5s
  const [isHintExpanded, setIsHintExpanded] = useState<boolean>(true)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    hintTimerRef.current = setTimeout(() => {
      setIsHintExpanded(false)
    }, 5000)

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [])

  const handleHintClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    setIsHintExpanded(true)
    hintTimerRef.current = setTimeout(() => {
      setIsHintExpanded(false)
    }, 5000)
  }

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
    }
  }, [])

  const toggleCollapse = useCallback((nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCollapsedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const expandAll = () => setCollapsedNodes(new Set())
  const collapseAll = () => {
    const ids = new Set<string>()
    tree.children?.forEach((c) => ids.add(c.id))
    setCollapsedNodes(ids)
  }

  const cycleLangMode = () => {
    setLangMode((prev) => {
      if (prev === 'both') return 'en'
      if (prev === 'en') return 'cn'
      return 'both'
    })
  }

  // Audio Playback
  const playNodeAudio = async (node: Node, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!textbook || !node.text) return
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      setPlayingNodeId(node.id)
      const url = getAudioUrl(node.text, textbook, isCf)
      const blob = await audioCache.cacheAudio(url)
      if (blob) {
        const audio = new Audio(URL.createObjectURL(blob))
        currentAudioRef.current = audio
        audio.onended = () => {
          setPlayingNodeId(null)
          currentAudioRef.current = null
        }
        audio.onerror = () => {
          setPlayingNodeId(null)
          currentAudioRef.current = null
        }
        await audio.play()
      } else {
        setPlayingNodeId(null)
      }
    } catch (err) {
      console.error('Audio play error:', err)
      setPlayingNodeId(null)
    }
  }

  // State ref for latest zoom & pan to avoid stale closures in event listeners
  const transformRef = useRef<{ zoom: number; pan: { x: number; y: number } }>({
    zoom: 0.85,
    pan: { x: 0, y: 0 },
  })

  useEffect(() => {
    transformRef.current = { zoom, pan }
  }, [zoom, pan])

  // Native non-passive wheel listener for smooth Google-Maps style zoom anchored at pointer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const { zoom: currZoom, pan: currPan } = transformRef.current

      // Unscaled canvas coordinate currently directly under the mouse pointer
      const canvasX = (mouseX - (centerX + currPan.x)) / currZoom
      const canvasY = (mouseY - (centerY + currPan.y)) / currZoom

      // Smooth zoom factor based on deltaY
      const factor = Math.exp(-e.deltaY * 0.002)
      const nextZoom = Math.min(Math.max(currZoom * factor, 0.25), 3.5)

      // Calculate new pan so (canvasX, canvasY) stays precisely at (mouseX, mouseY)
      const nextPanX = mouseX - centerX - canvasX * nextZoom
      const nextPanY = mouseY - centerY - canvasY * nextZoom

      transformRef.current = { zoom: nextZoom, pan: { x: nextPanX, y: nextPanY } }
      setZoom(nextZoom)
      setPan({ x: nextPanX, y: nextPanY })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    panStartRef.current = { ...pan }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const resetView = () => {
    setZoom(0.85)
    setPan({ x: 0, y: 0 })
  }

  // -------------------------------------------------------------
  // Radial Flower Layout
  // Root = flower center, depth-1 branches = petals evenly spread on a ring.
  // An open branch becomes a sub-flower: its children ring around it
  // (leaving a gap facing the root), and the branch is pushed outward
  // so neighbouring sub-flowers do not overlap.
  // -------------------------------------------------------------
  const layout = useMemo(() => {
    const items: LayoutItem[] = []
    const branches = tree.children || []

    items.push({
      id: tree.id, node: tree, depth: 0, branchIndex: -1, side: 'center',
      x: 0, y: 0, parentX: 0, parentY: 0, isCollapsed: false, hasChildren: branches.length > 0,
    })
    if (branches.length === 0) return items

    const N = branches.length
    const CARD_W = 160, CARD_H = 48, BRANCH_W = 230 // approx unscaled card boxes
    const GAP = 25 // min gap between neighbouring flower elements

    type Local = { node: Node; depth: number; x: number; y: number; px: number; py: number; w: number }
    const isOpen = (n: Node) => !collapsedNodes.has(n.id) && Boolean(n.children?.length)
    const overlaps = (a: Local, b: Local) =>
      Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 8 && Math.abs(a.y - b.y) < CARD_H + 4

    // Build a sub-flower around (0,0): children on an ellipse (cards are wide),
    // sized compactly to prevent cards within the sub-flower from overlapping.
    const buildFlower = (b: Node, angle: number): { locals: Local[]; R: number } => {
      if (!isOpen(b)) {
        return {
          locals: [{ node: b, depth: 1, x: 0, y: 0, px: 0, py: 0, w: BRANCH_W }],
          R: BRANCH_W / 2,
        }
      }
      const kids = b.children!
      const count = kids.length
      const baseR = Math.max(130, ((count + 1) * 82) / (2 * Math.PI))
      let locals: Local[] = []

      for (let s = 1.0; s < 3.0; s += 0.05) {
        const rx = baseR * s * 1.2
        const ry = baseR * s * 0.85
        locals = [{ node: b, depth: 1, x: 0, y: 0, px: 0, py: 0, w: BRANCH_W }]
        kids.forEach((c, i) => {
          // n+1 evenly spaced slots; the slot facing the root stays empty for the stem
          const a = angle + Math.PI + ((i + 1) * 2 * Math.PI) / (kids.length + 1)
          const cx = Math.cos(a) * rx, cy = Math.sin(a) * ry
          locals.push({ node: c, depth: 2, x: cx, y: cy, px: 0, py: 0, w: CARD_W })
          if (isOpen(c)) {
            const subs = c.children!
            const subCount = subs.length
            const side = Math.cos(a) >= 0 ? 1 : -1
            const colGap = 190 // horizontal distance to column
            const rowGap = 62  // vertical distance between stacked cards

            subs.forEach((sNode, si) => {
              if (subCount === 1) {
                // Single child (e.g. sports field -> field, reading corner -> bookcase)
                const sx = cx + Math.cos(a) * 140
                const sy = cy + Math.sin(a) * 140
                locals.push({ node: sNode, depth: 3, x: sx, y: sy, px: cx, py: cy, w: CARD_W })
              } else {
                // Multiple children (e.g. floating school -> rainy season, sunlight, fresh air)
                // Clean vertical column offset outward with 62px line spacing so they never overlap
                const sx = cx + side * colGap
                const sy = cy + (si - (subCount - 1) / 2) * rowGap
                locals.push({ node: sNode, depth: 3, x: sx, y: sy, px: cx, py: cy, w: CARD_W })
              }
            })
          }
        })
        const clash = locals.some((p, i) => locals.some((q, j) => j > i && overlaps(p, q)))
        if (!clash) break
      }
      const R = Math.max(...locals.map((l) => Math.hypot(Math.abs(l.x) + l.w / 2, Math.abs(l.y) + CARD_H / 2)))
      return { locals, R }
    }

    const nominalAngles = branches.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / N)
    const flowers = branches.map((b, i) => buildFlower(b, nominalAngles[i]))

    const angles = [...nominalAngles]
    // Base distance: collapsed branches stay close to root (220px); open branches extend comfortably (340 - 520px)
    const dist = flowers.map((f, i) => {
      if (!isOpen(branches[i])) return 220
      return Math.max(340, Math.min(520, f.R * 0.88 + 80))
    })
    const centre = (i: number) => [Math.cos(angles[i]) * dist[i], Math.sin(angles[i]) * dist[i]]

    // Magnetic Repulsion (Same Pole): sub-flowers and collapsed petals repel each other
    // so they naturally adjust both radially and angularly based on their environment
    for (let iter = 0; iter < 100; iter++) {
      let anyClash = false
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const [bx_i, by_i] = centre(i)
          const [bx_j, by_j] = centre(j)
          if (Math.hypot(bx_i - bx_j, by_i - by_j) > flowers[i].R + flowers[j].R + GAP) continue

          let clashCount = 0
          flowers[i].locals.forEach((li) => {
            const ax = bx_i + li.x, ay = by_i + li.y
            flowers[j].locals.forEach((lj) => {
              const bx = bx_j + lj.x, by = by_j + lj.y
              const targetDx = (li.w + lj.w) / 2 + 18
              const targetDy = CARD_H + 12
              if (Math.abs(ax - bx) < targetDx && Math.abs(ay - by) < targetDy) {
                clashCount++
              }
            })
          })

          if (clashCount > 0) {
            anyClash = true
            // 1. Radial magnetic push: expand outward
            dist[i] += 12
            dist[j] += 12

            // 2. Angular magnetic push: adjacent petals part along the ring
            let angleDiff = nominalAngles[j] - nominalAngles[i]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

            const angularStep = 0.02 // ~1.15° per step
            if (angleDiff > 0) {
              angles[i] -= angularStep
              angles[j] += angularStep
            } else {
              angles[i] += angularStep
              angles[j] -= angularStep
            }
          }
        }
      }
      if (!anyClash) break
    }

    branches.forEach((bNode, bIdx) => {
      const [bX, bY] = centre(bIdx)
      items.push({
        id: bNode.id, node: bNode, depth: 1, branchIndex: bIdx, side: 'center',
        x: bX, y: bY, parentX: 0, parentY: 0,
        isCollapsed: collapsedNodes.has(bNode.id), hasChildren: Boolean(bNode.children?.length),
      })
      flowers[bIdx].locals.forEach((l) => {
        if (l.depth === 1) return
        items.push({
          id: l.node.id, node: l.node, depth: l.depth, branchIndex: bIdx, side: 'center',
          x: bX + l.x, y: bY + l.y, parentX: bX + l.px, parentY: bY + l.py,
          isCollapsed: collapsedNodes.has(l.node.id), hasChildren: Boolean(l.node.children?.length),
        })
      })
    })

    return items
  }, [tree, collapsedNodes])

  // Graceful organic stem between parent and child
  const makeStemCurve = (x1: number, y1: number, x2: number, y2: number, depth: number) => {
    const dx = x2 - x1
    const dy = y2 - y1
    if (depth === 1) {
      // Gentle, elegant floral stem from root to 1st-level petal
      // A subtle 4% organic bow keeps the stem supple and natural while staying
      // strictly within its own sector so it never crosses neighboring petals
      const mx = (x1 + x2) / 2 - dy * 0.04
      const my = (y1 + y2) / 2 + dx * 0.04
      return `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`
    }
    // Sub-flower stem from branch to child words
    const mx = (x1 + x2) / 2 - dy * 0.05
    const my = (y1 + y2) / 2 + dx * 0.05
    return `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`
  }

  return (
    <div className="vmm-overlay" onClick={onClose}>
      <div className="vmm-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <header className="vmm-header">
          <div className="vmm-header-titles">
            <span className="vmm-icon">🌳</span>
            <div>
              <h2>{title}</h2>
              {level && <span className="vmm-sub">{level} · 花朵脑图</span>}
            </div>
          </div>

          <div className="vmm-controls">
            {/* Lang Mode Switcher */}
            <button
              className="vmm-btn lang-btn"
              onClick={cycleLangMode}
              title="切换语言显示模式"
            >
              🌐 {langMode === 'both' && 'EN + CN (双语)'}
              {langMode === 'en' && 'English (纯英文)'}
              {langMode === 'cn' && '中文 (纯中文)'}
            </button>

            {/* Expand / Collapse All */}
            <button className="vmm-btn" onClick={expandAll} title="全部展开">🌱 展开全部</button>
            <button className="vmm-btn" onClick={collapseAll} title="折叠为主分支">🌿 折叠分支</button>

            {/* Zoom Controls */}
            <div className="vmm-zoom-pill">
              <button className="vmm-btn-icon" onClick={() => setZoom(z => Math.max(z / 1.2, 0.35))} title="缩小">-</button>
              <span className="vmm-zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="vmm-btn-icon" onClick={() => setZoom(z => Math.min(z * 1.2, 2.5))} title="放大">+</button>
              <button className="vmm-btn-icon reset" onClick={resetView} title="重置视角">🎯</button>
            </div>

            {/* Close Button */}
            <button className="vmm-btn close-btn" onClick={onClose} title="关闭">✕</button>
          </div>
        </header>

        {/* Bilateral Canvas Stage */}
        <div
          ref={containerRef}
          className={`vmm-canvas-stage ${isDragging ? 'dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <button
            type="button"
            className={`vmm-canvas-hint ${isHintExpanded ? 'expanded' : 'shrunk'}`}
            onClick={handleHintClick}
            onPointerDown={(e) => e.stopPropagation()}
            title={isHintExpanded ? '' : '显示操作提示'}
          >
            <span className="vmm-hint-icon">💡</span>
            <span className="vmm-hint-text">点击花瓣展开子花朵 · 鼠标拖动画布自由平移 · 滚轮缩放</span>
          </button>

          <div
            className="vmm-canvas-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Connecting Vines */}
            <svg
              className="vmm-vines-layer"
              viewBox="-4000 -4000 8000 8000"
              width="8000"
              height="8000"
            >
              {layout.map((item) => {
                if (item.depth === 0) return null
                const theme = BRANCH_PALETTES[item.branchIndex % BRANCH_PALETTES.length]
                const pathD = makeStemCurve(item.parentX, item.parentY, item.x, item.y, item.depth)
                const strokeWidth = item.depth === 1 ? 3.5 : item.depth === 2 ? 2.2 : 1.6

                return (
                  <path
                    key={`vine-${item.id}`}
                    d={pathD}
                    fill="none"
                    stroke={theme.vine}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className={`vmm-organic-vine depth-${item.depth}`}
                    opacity={item.depth === 1 ? 0.95 : 0.75}
                  />
                )
              })}
            </svg>

            {/* Nodes Layer */}
            <div className="vmm-nodes-layer">
              {layout.map((item) => {
                const isRoot = item.depth === 0
                const theme = item.branchIndex >= 0 ? BRANCH_PALETTES[item.branchIndex % BRANCH_PALETTES.length] : null
                const isPlaying = playingNodeId === item.id
                const isActive = activeNodeId === item.id

                return (
                  <div
                    key={item.id}
                    className={`vmm-radial-node-anchor depth-${item.depth} side-${item.side}`}
                    style={{
                      transform: `translate(${item.x}px, ${item.y}px)`,
                    }}
                  >
                    <div
                      className={`vmm-node-capsule ${isRoot ? 'is-root' : ''} depth-${item.depth} ${item.hasChildren ? 'has-children' : 'is-leaf'} ${item.isCollapsed ? 'is-collapsed' : ''} ${isPlaying ? 'is-playing' : ''} ${isActive ? 'is-active' : ''}`}
                      style={{
                        '--vine-color': theme ? theme.vine : '#6366f1',
                        '--node-bg': isRoot ? undefined : item.depth === 1 ? theme?.bg : '#ffffff',
                        '--node-border': isRoot ? undefined : theme?.border,
                        '--node-text': isRoot ? undefined : theme?.text,
                      } as React.CSSProperties}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveNodeId(item.id)
                        if (item.hasChildren && !isRoot) {
                          toggleCollapse(item.id, e)
                          // When opening a 1st level branch, smooth center it in the viewport
                          if (item.depth === 1 && item.isCollapsed) {
                            setPan({ x: -item.x, y: -item.y })
                          }
                        }
                      }}
                    >
                      {/* Node Emoji */}
                      {item.node.emoji && <span className="vmm-capsule-emoji">{item.node.emoji}</span>}

                      {/* Text and Meaning */}
                      <div className="vmm-capsule-text-col">
                        {langMode === 'both' ? (
                          <>
                            <span className="vmm-en-text">{item.node.text}</span>
                            {item.node.cn && <span className="vmm-cn-text">{item.node.cn}</span>}
                          </>
                        ) : langMode === 'en' ? (
                          <span className="vmm-en-text">{item.node.text}</span>
                        ) : (
                          <span className="vmm-cn-only">{item.node.cn || item.node.text}</span>
                        )}
                      </div>

                      {/* Pronunciation Audio Button */}
                      {item.node.text && !isRoot && (
                        <button
                          type="button"
                          className="vmm-capsule-audio-btn"
                          title="发音"
                          onClick={(e) => playNodeAudio(item.node, e)}
                        >
                          {isPlaying ? '🔊' : '🔈'}
                        </button>
                      )}

                      {/* Fold / Blossom Petal Badge */}
                      {item.hasChildren && !isRoot && (
                        <span
                          className={`vmm-fold-badge ${item.isCollapsed ? 'collapsed' : 'open'}`}
                          title={item.isCollapsed ? '点击展开分支' : '点击折叠'}
                          onClick={(e) => toggleCollapse(item.id, e)}
                        >
                          {item.isCollapsed ? `+${item.node.children?.length}` : '−'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
