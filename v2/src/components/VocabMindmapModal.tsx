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
  side: 'left' | 'right' | 'center'
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
  // Bilateral Tree Layout Algorithm (XMind / Whimsical Style)
  // Evenly divides main branches into Left Wing and Right Wing.
  // Computes precise bounding heights to prevent any overlap.
  // -------------------------------------------------------------
  const layout = useMemo(() => {
    const items: LayoutItem[] = []
    const branches = tree.children || []

    // Root at (0, 0)
    items.push({
      id: tree.id,
      node: tree,
      depth: 0,
      branchIndex: -1,
      side: 'center',
      x: 0,
      y: 0,
      parentX: 0,
      parentY: 0,
      isCollapsed: false,
      hasChildren: branches.length > 0,
    })

    if (branches.length === 0) return items

    // Split branches: Left Wing and Right Wing
    // e.g. 6 branches -> right: [0, 1, 2], left: [3, 4, 5]
    const half = Math.ceil(branches.length / 2)
    const rightBranches = branches.slice(0, half)
    const leftBranches = branches.slice(half)

    const ROW_HEIGHT = 84 // Ample vertical height per row so cards never overlap
    const COL_GAP = 300   // Clean horizontal clearance between levels

    // Helper: calculate total leaf slots a node occupies
    const getLeafSpan = (node: Node): number => {
      if (collapsedNodes.has(node.id) || !node.children || node.children.length === 0) {
        return 1
      }
      return node.children.reduce((acc, c) => acc + getLeafSpan(c), 0)
    }

    // Layout a single wing (left or right)
    const layoutWing = (wingBranches: Node[], side: 'left' | 'right', branchOffset: number) => {
      const dir = side === 'right' ? 1 : -1

      // 1. Calculate total height of this entire wing
      const wingSpans = wingBranches.map(b => getLeafSpan(b))
      const totalWingSpan = wingSpans.reduce((a, b) => a + b, 0)
      let currentY = - (totalWingSpan * ROW_HEIGHT) / 2

      wingBranches.forEach((bNode, bLocalIdx) => {
        const bIdx = branchOffset + bLocalIdx
        const bSpan = wingSpans[bLocalIdx]
        const bCenterY = currentY + (bSpan * ROW_HEIGHT) / 2
        const bX = dir * COL_GAP
        const isBCollapsed = collapsedNodes.has(bNode.id)
        const bHasChildren = Boolean(bNode.children && bNode.children.length > 0)

        items.push({
          id: bNode.id,
          node: bNode,
          depth: 1,
          branchIndex: bIdx,
          side,
          x: bX,
          y: bCenterY,
          parentX: 0,
          parentY: 0,
          isCollapsed: isBCollapsed,
          hasChildren: bHasChildren,
        })

        if (!isBCollapsed && bHasChildren) {
          // Layout depth 2 (words) branching outward from the primary branch
          const childCount = bNode.children!.length
          const arcSpread = Math.min(childCount * 55, 380)
          const startArcY = bCenterY - arcSpread / 2

          bNode.children!.forEach((cNode, cIdx) => {
            const cCenterY = childCount === 1 ? bCenterY : startArcY + (cIdx / (childCount - 1)) * arcSpread
            // Fan out horizontally in an outward arc
            const progress = (cIdx / Math.max(childCount - 1, 1)) - 0.5 // -0.5 to 0.5
            const arcOffsetX = dir * (240 + Math.abs(progress) * 40)
            const cX = bX + arcOffsetX
            const isCCollapsed = collapsedNodes.has(cNode.id)
            const cHasChildren = Boolean(cNode.children && cNode.children.length > 0)

            items.push({
              id: cNode.id,
              node: cNode,
              depth: 2,
              branchIndex: bIdx,
              side,
              x: cX,
              y: cCenterY,
              parentX: bX,
              parentY: bCenterY,
              isCollapsed: isCCollapsed,
              hasChildren: cHasChildren,
            })

            if (!isCCollapsed && cHasChildren) {
              // Layout depth 3 (sub-words)
              const subCount = cNode.children!.length
              const subSpread = Math.min(subCount * 50, 180)
              const subStartY = cCenterY - subSpread / 2

              cNode.children!.forEach((sNode, sIdx) => {
                const sCenterY = subCount === 1 ? cCenterY : subStartY + (sIdx / (subCount - 1)) * subSpread
                const sX = cX + dir * 180

                items.push({
                  id: sNode.id,
                  node: sNode,
                  depth: 3,
                  branchIndex: bIdx,
                  side,
                  x: sX,
                  y: sCenterY,
                  parentX: cX,
                  parentY: cCenterY,
                  isCollapsed: false,
                  hasChildren: false,
                })
              })
            }
          })
        }

        currentY += bSpan * ROW_HEIGHT
      })
    }

    // Execute bilateral layout
    layoutWing(rightBranches, 'right', 0)
    layoutWing(leftBranches, 'left', half)

    return items
  }, [tree, collapsedNodes])

  // Generate Smooth S-Curve (Bezier) between parent and child in horizontal layout
  const makeCubicCurve = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1
    const cp1x = x1 + dx * 0.55
    const cp1y = y1
    const cp2x = x1 + dx * 0.45
    const cp2y = y2
    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`
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
              {level && <span className="vmm-sub">{level} · 双向发散脑图</span>}
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
          <div className="vmm-canvas-hint">💡 左右双向自然展开 · 鼠标拖动画布自由平移 · 滚轮缩放</div>

          <div
            className="vmm-canvas-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Connecting Vines */}
            <svg className="vmm-vines-layer">
              {layout.map((item) => {
                if (item.depth === 0) return null
                const theme = BRANCH_PALETTES[item.branchIndex % BRANCH_PALETTES.length]
                // Start from the edge of the root pill (depth 1) or parent
                const startX = item.depth === 1 ? (item.side === 'right' ? 75 : -75) : item.parentX
                const startY = item.parentY
                const endX = item.x
                const endY = item.y
                const pathD = makeCubicCurve(startX, startY, endX, endY)
                const strokeWidth = item.depth === 1 ? 3 : 2

                return (
                  <path
                    key={`vine-${item.id}`}
                    d={pathD}
                    fill="none"
                    stroke={theme.vine}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="vmm-organic-vine"
                    opacity={item.depth === 1 ? 0.9 : 0.7}
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
