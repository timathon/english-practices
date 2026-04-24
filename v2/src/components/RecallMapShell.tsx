import { useState, useEffect, useRef } from 'react'
import './RecallMapShell.css'

interface Node {
  id: string
  text: string
  emoji: string
  keywords?: string
  state?: 'hidden' | 'empty' | 'emoji' | 'keywords' | 'full'
  children?: Node[]
}

interface RecallMapShellProps {
  data: {
    level: string
    part: string
    tree: Node
  }
  practiceId: string
}

export function RecallMapShell({ data }: Omit<RecallMapShellProps, 'practiceId'>) {
  const [treeData, setTreeData] = useState<Node>(() => JSON.parse(JSON.stringify(data.tree)))
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [actionSteps, setActionSteps] = useState<(() => void)[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [showAllMode, setShowAllMode] = useState(0) // 0: manual, 1: emoji, 2: keywords/full
  const [savedCollapsedNodes, setSavedCollapsedNodes] = useState<Set<string> | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize steps
  useEffect(() => {
    const steps: (() => void)[] = []
    const tempTree = JSON.parse(JSON.stringify(data.tree))

    const generateSteps = (node: Node) => {
      if (!node.children || node.children.length === 0) return

      // STEP 1: Draw all empty boxes for this specific level
      steps.push(() => {
        setTreeData(prev => {
          const newTree = JSON.parse(JSON.stringify(prev))
          const target = findNode(newTree, node.id)
          if (target && target.children) {
            target.children.forEach((child: Node) => {
              if (child.state !== 'full' && child.state !== 'keywords' && child.state !== 'emoji') {
                child.state = 'empty'
              }
            })
          }
          return newTree
        })
        setActiveNodeId(node.children![0].id)
      })

      // STEP 2: For each child node, reveal Emoji -> Text -> Recurse
      node.children.forEach(child => {
        steps.push(() => {
          setTreeData(prev => {
            const newTree = JSON.parse(JSON.stringify(prev))
            const target = findNode(newTree, child.id)
            if (target) target.state = 'emoji'
            return newTree
          })
          setActiveNodeId(child.id)
        })

        steps.push(() => {
          setTreeData(prev => {
            const newTree = JSON.parse(JSON.stringify(prev))
            const target = findNode(newTree, child.id)
            if (target) target.state = 'full'
            return newTree
          })
          setActiveNodeId(child.id)
        })

        generateSteps(child)
      })
    }

    // Root initial step
    steps.push(() => {
        setTreeData(prev => {
            const newTree = JSON.parse(JSON.stringify(prev))
            newTree.state = 'full'
            return newTree
        })
        setActiveNodeId(tempTree.id)
    })

    generateSteps(tempTree)
    setActionSteps(() => steps)
    
    // Start with root visible if it was full in data or just run first step
    applyStepsUpTo(1)
  }, [data.tree])

  const findNode = (root: Node, id: string): Node | null => {
    if (root.id === id) return root
    if (root.children) {
      for (const child of root.children) {
        const found = findNode(child, id)
        if (found) return found
      }
    }
    return null
  }

  const applyStepsUpTo = (targetIndex: number) => {
    const newTree = JSON.parse(JSON.stringify(data.tree))
    newTree.state = 'hidden' // Reset root
    
    // We need a way to apply these steps synchronously to a local variable
    // Since steps are closures over setTreeData, we'll mimic the logic
    let currentTree = newTree
    let currentActiveId = newTree.id

    // Helper to find and mutate
    const mutateNode = (tree: Node, id: string, state: Node['state']) => {
        const node = findNode(tree, id)
        if (node) node.state = state
    }

    const setEmptyChildren = (tree: Node, id: string) => {
        const node = findNode(tree, id)
        if (node && node.children) {
            node.children.forEach(c => {
                if (!c.state || c.state === 'hidden') c.state = 'empty'
            })
        }
    }

    // Root step is always first in our built list
    if (targetIndex > 0) {
        currentTree.state = 'full'
        currentActiveId = currentTree.id
    }

    // Replay steps logic (this is a bit decoupled from the actual steps array but matches the generation logic)
    // Actually, a better way is to rebuild the tree by traversing up to the limit
    let stepsCount = 1
    const traverse = (node: Node) => {
        if (stepsCount >= targetIndex) return
        if (!node.children || node.children.length === 0) return

        // Empty boxes step
        stepsCount++
        if (stepsCount <= targetIndex) {
            setEmptyChildren(currentTree, node.id)
            currentActiveId = node.children[0].id
        }

        for (const child of node.children) {
            // Emoji step
            stepsCount++
            if (stepsCount <= targetIndex) {
                mutateNode(currentTree, child.id, 'emoji')
                currentActiveId = child.id
            }
            // Full step
            stepsCount++
            if (stepsCount <= targetIndex) {
                mutateNode(currentTree, child.id, 'full')
                currentActiveId = child.id
            }
            traverse(child)
        }
    }

    traverse(data.tree)

    setTreeData(currentTree)
    setCurrentStepIndex(targetIndex)
    setActiveNodeId(currentActiveId)
    renderScroll(currentActiveId)
  }

  const renderScroll = (nodeId: string | null) => {
    setTimeout(() => {
        const activeEl = document.getElementById(`node-${nodeId}`)
        const container = containerRef.current
        if (activeEl && container) {
            const containerRect = container.getBoundingClientRect()
            const activeRect = activeEl.getBoundingClientRect()
            const targetScrollTop = activeRect.top - containerRect.top + container.scrollTop - 100
            
            container.scrollTo({
                top: Math.max(0, targetScrollTop),
                left: container.scrollWidth,
                behavior: 'smooth'
            })
        }
    }, 50)
  }

  const nextStep = () => {
    if (showAllMode > 0) {
      updateMode(0)
      return
    }
    if (currentStepIndex < actionSteps.length) {
      applyStepsUpTo(currentStepIndex + 1)
    }
  }

  const prevStep = () => {
    if (showAllMode > 0) {
      updateMode(0)
      return
    }
    if (currentStepIndex > 1) {
      applyStepsUpTo(currentStepIndex - 1)
    }
  }

  const updateMode = (val: number) => {
    if (val === 0) {
      setShowAllMode(0)
      if (savedCollapsedNodes) {
        setCollapsedNodes(savedCollapsedNodes)
        setSavedCollapsedNodes(null)
      }
      applyStepsUpTo(currentStepIndex)
      return
    }

    if (showAllMode === 0) {
      setSavedCollapsedNodes(new Set(collapsedNodes))
    }
    setShowAllMode(val)
    setCollapsedNodes(new Set())


    setTreeData(prev => {
      const newTree = JSON.parse(JSON.stringify(prev))
      const setAll = (node: Node) => {
        if (val === 2 && node.keywords) node.state = 'keywords'
        else node.state = 'full'
        if (val === 1) node.state = 'emoji'
        
        if (node.children) node.children.forEach(setAll)
      }
      setAll(newTree)
      return newTree
    })
  }

  const toggleCollapse = (id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNode = (node: Node, depth: number = 0) => {
    const state = node.state || 'hidden'
    if (state === 'hidden') return null

    const hasChildren = node.children && node.children.length > 0
    const isCollapsed = collapsedNodes.has(node.id)
    
    // Filter and render children elements first to see if we have any visible children
    const visibleChildren = hasChildren && !isCollapsed 
      ? node.children!
          .map(child => ({ child, el: renderNode(child, depth + 1) }))
          .filter(item => item.el !== null)
      : []

    const allChildrenFull = hasChildren && node.children!.every(c => c.state === 'full' || c.state === 'keywords')
    const hideChildren = isCollapsed && allChildrenFull

    return (
      <div className="rm-node-wrapper" key={node.id}>
        <div 
          id={`node-${node.id}`}
          className={`rm-node-box ${state} level-${depth} ${allChildrenFull ? 'collapsible' : ''} ${activeNodeId === node.id ? 'active' : ''}`}
          onClick={(e) => {
            if (allChildrenFull) {
              e.stopPropagation()
              toggleCollapse(node.id)
              setActiveNodeId(node.id)
            }
          }}
        >
          {state === 'emoji' && <span className="rm-emoji">{node.emoji}</span>}
          {state === 'keywords' && (
            <>
              <span className="rm-emoji">{node.emoji}</span>
              <span className="rm-keywords">{node.keywords || node.text}</span>
            </>
          )}
          {state === 'full' && (
            <>
              <span className="rm-emoji">{node.emoji}</span>
              <span className="rm-text">{node.text}</span>
              {hideChildren && <span className="rm-collapsed-indicator">+{node.children?.length}</span>}
            </>
          )}
        </div>

        {visibleChildren.length > 0 && !hideChildren && (
          <div className="rm-children-container">
            {visibleChildren.map(({ child, el }) => (
              <div className="rm-child-row" key={child.id}>
                {el}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rm-shell">
      <header className="rm-header">
        <div className="rm-header-left">
          <button className="rm-back-btn" onClick={() => window.history.back()}>🏠</button>
          <div className="rm-titles">
            <h1>Recall Map: {data.part}</h1>
            <p>{data.level}</p>
          </div>
        </div>
        <div className="rm-controls">
          <button className="rm-ctrl-btn" onClick={() => applyStepsUpTo(1)}>🔄</button>
          <button className="rm-ctrl-btn" onClick={prevStep} disabled={currentStepIndex <= 1}>◀️</button>
          <button className="rm-ctrl-btn next" onClick={nextStep} disabled={currentStepIndex >= actionSteps.length && showAllMode === 0}>▶️</button>
        </div>
        <div className="rm-progress-bg">
          <div className="rm-progress-bar" style={{ width: `${(currentStepIndex / actionSteps.length) * 100}%` }} />
        </div>
      </header>

      <div className="rm-mode-slider">
        <div className="rm-mode-labels">
          <span className={showAllMode === 0 ? 'active' : ''} onClick={() => updateMode(0)}>Manual</span>
          <span className={showAllMode === 1 ? 'active' : ''} onClick={() => updateMode(1)}>Emoji</span>
          <span className={showAllMode === 2 ? 'active' : ''} onClick={() => updateMode(2)}>Full</span>
        </div>
        <input 
          type="range" 
          min="0" max="2" step="1" 
          value={showAllMode} 
          onChange={(e) => updateMode(parseInt(e.target.value))} 
        />
      </div>

      <main className="rm-container" ref={containerRef}>
        {renderNode(treeData)}
      </main>
    </div>
  )
}
