import { useState, useEffect, useRef, useCallback } from 'react'
import md5 from 'md5'
import { Link } from 'react-router-dom'
import { audioCache } from '../lib/audioCache'
import { petService } from '../lib/petService'
import './MindMapShell.css'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev"

interface Node {
  id: string
  text: string
  emoji: string
  cn?: string
  notes?: string
  statement?: string
  answer?: boolean
  explanation?: string
  keywords?: string
  highlight?: string
  state?: 'hidden' | 'empty' | 'emoji' | 'keywords' | 'full'
  children?: Node[]
}

interface MindMapShellProps {
  data: {
    level: string
    part: string
    section: string
    tree: Node
    writingPrompt?: string
  }
  textbook: string
  unit: string
  isWritingMap: boolean
}

export function MindMapShell({ data, textbook, unit, isWritingMap }: MindMapShellProps) {
  const [treeData, setTreeData] = useState<Node>(() => JSON.parse(JSON.stringify(data.tree)))
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [actionSteps, setActionSteps] = useState<(() => void)[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())
  const [showAllMode, setShowAllMode] = useState(3) // 0: manual, 1: emoji, 2: keywords, 3: full
  const [savedCollapsedNodes, setSavedCollapsedNodes] = useState<Set<string> | null>(null)
  const [layoutOrientation, setLayoutOrientation] = useState<'horizontal' | 'vertical'>(() => {
    return (localStorage.getItem('mm-layout-orientation') as 'horizontal' | 'vertical') || 'horizontal'
  })

  const toggleLayoutOrientation = () => {
    const next = layoutOrientation === 'horizontal' ? 'vertical' : 'horizontal'
    setLayoutOrientation(next)
    localStorage.setItem('mm-layout-orientation', next)
  }
  
  // Depth logic
  const [maxDepthVisible, setMaxDepthVisible] = useState(5)
  const [maxTreeDepth, setMaxTreeDepth] = useState(0)

  // Actions overlay
  const [activeActionsNodeId, setActiveActionsNodeId] = useState<string | null>(null)
  const [visibleTooltipType, setVisibleTooltipType] = useState<{ nodeId: string; type: 'cn' | 'notes' } | null>(null)
  const actionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Question Modal
  const [questionNode, setQuestionNode] = useState<Node | null>(null)
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Prompt Modal
  const [showPromptModal, setShowPromptModal] = useState(false)

  // Audio Playback
  const [playingNodeId, setPlayingNodeId] = useState<string | null>(null)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const [playAllQueue, setPlayAllQueue] = useState<Node[]>([])
  const [currentPlayIndex, setCurrentPlayIndex] = useState(-1)
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate audio URL for a node
  const getAudioUrl = useCallback((text: string) => {
    const hash = md5(text)
    return `${PUBLIC_URL_BASE}/ep/${textbook.toLowerCase()}/${hash}.mp3`
  }, [textbook])

  // Get max depth of tree
  const getMaxDepth = useCallback((node: Node, currentDepth = 0): number => {
    if (!node.children || node.children.length === 0) return currentDepth
    return Math.max(...node.children.map(child => getMaxDepth(child, currentDepth + 1)))
  }, [])

  // Node helper
  const findNode = useCallback((root: Node, id: string): Node | null => {
    if (root.id === id) return root
    if (root.children) {
      for (const child of root.children) {
        const found = findNode(child, id)
        if (found) return found
      }
    }
    return null
  }, [])

  // Auto scroll to active/playing node
  const scrollToNode = useCallback((nodeId: string | null, isPlaying = false) => {
    setTimeout(() => {
      const activeEl = document.getElementById(isPlaying ? `playing-${nodeId}` : `node-${nodeId}`)
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
  }, [])

  // Build steps sequence dynamically
  useEffect(() => {
    const steps: (() => void)[] = []
    const tempTree = JSON.parse(JSON.stringify(data.tree))

    const generateSteps = (node: Node) => {
      if (!node.children || node.children.length === 0) return

      // STEP A: Show empty structure boxes
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

      // STEP B: Progressively reveal each child
      node.children.forEach(child => {
        // Reveal Emoji
        steps.push(() => {
          setTreeData(prev => {
            const newTree = JSON.parse(JSON.stringify(prev))
            const target = findNode(newTree, child.id)
            if (target) target.state = 'emoji'
            return newTree
          })
          setActiveNodeId(child.id)
        })

        // Reveal Keywords (if exist)
        if (child.keywords) {
          steps.push(() => {
            setTreeData(prev => {
              const newTree = JSON.parse(JSON.stringify(prev))
              const target = findNode(newTree, child.id)
              if (target) target.state = 'keywords'
              return newTree
            })
            setActiveNodeId(child.id)
          })
        }

        // Reveal Full Sentence
        steps.push(() => {
          setTreeData(prev => {
            const newTree = JSON.parse(JSON.stringify(prev))
            const target = findNode(newTree, child.id)
            if (target) target.state = 'full'
            return newTree
          })
          setActiveNodeId(child.id)
        })

        // Recurse down
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

    const depth = getMaxDepth(data.tree)
    setMaxTreeDepth(depth)
    setMaxDepthVisible(depth)

    // Show all in full mode on load
    setShowAllMode(3)
    const fullTree = JSON.parse(JSON.stringify(tempTree))
    const setAllFull = (node: Node) => {
      node.state = 'full'
      if (node.children) node.children.forEach(setAllFull)
    }
    setAllFull(fullTree)
    setTreeData(fullTree)
  }, [data.tree, getMaxDepth, findNode])

  // Replay steps up to targetIndex on a cloned tree
  const applyStepsUpTo = (targetIndex: number, overrideInitialTree?: Node) => {
    const root = overrideInitialTree || JSON.parse(JSON.stringify(data.tree))
    
    // Set initially hidden
    const setAllHidden = (node: Node) => {
      node.state = 'hidden'
      if (node.children) node.children.forEach(setAllHidden)
    }
    setAllHidden(root)

    let currentTree = root
    let currentActiveId = root.id

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

    // Root step is always first
    if (targetIndex > 0) {
      currentTree.state = 'full'
      currentActiveId = currentTree.id
    }

    let stepsCount = 1
    const traverse = (node: Node) => {
      if (stepsCount >= targetIndex) return
      if (!node.children || node.children.length === 0) return

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
        // Keywords step
        if (child.keywords) {
          stepsCount++
          if (stepsCount <= targetIndex) {
            mutateNode(currentTree, child.id, 'keywords')
            currentActiveId = child.id
          }
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

    traverse(root)

    setTreeData(currentTree)
    setCurrentStepIndex(targetIndex)
    setActiveNodeId(currentActiveId)
    scrollToNode(currentActiveId)
  }

  // Navigation handlers
  const nextStep = useCallback(() => {
    if (showAllMode > 0) {
      updateMode(0)
      return
    }
    if (currentStepIndex < actionSteps.length) {
      applyStepsUpTo(currentStepIndex + 1)
    }
  }, [currentStepIndex, actionSteps.length, showAllMode])

  const prevStep = useCallback(() => {
    if (showAllMode > 0) {
      updateMode(0)
      return
    }
    if (currentStepIndex > 1) {
      applyStepsUpTo(currentStepIndex - 1)
    }
  }, [currentStepIndex, showAllMode])

  // Mode Slider Handler
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
        if (val === 1) {
          node.state = 'emoji'
        } else if (val === 2) {
          node.state = node.keywords ? 'keywords' : 'full'
        } else {
          node.state = 'full'
        }
        if (node.children) node.children.forEach(setAll)
      }
      setAll(newTree)
      return newTree
    })
  }

  // Depth Slider Handler
  const updateDepth = (val: number) => {
    setMaxDepthVisible(val)
    if (isPlayingAll) {
      stopPlayAll()
    }
  }

  // Reset Map
  const resetMap = () => {
    updateMode(0)
    setCollapsedNodes(new Set())
    applyStepsUpTo(0)
  }

  // Collapse/Expand node
  const toggleCollapse = (id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Node action timers
  const refreshActionsTimeout = () => {
    if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current)
    actionsTimeoutRef.current = setTimeout(() => {
      setActiveActionsNodeId(null)
      setVisibleTooltipType(null)
    }, 4000)
  }

  const closeActions = () => {
    if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current)
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    setActiveActionsNodeId(null)
    setVisibleTooltipType(null)
  }

  // Play node audio
  const playNodeAudio = async (node: Node, event?: React.MouseEvent) => {
    if (event) event.stopPropagation()
    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
      activeAudioRef.current = null
    }

    setPlayingNodeId(node.id)
    const audioUrl = getAudioUrl(node.text)

    try {
      const blob = await audioCache.cacheAudio(audioUrl)
      if (blob) {
        const localUrl = URL.createObjectURL(blob)
        const audio = new Audio(localUrl)
        activeAudioRef.current = audio
        audio.onended = () => {
          setPlayingNodeId(null)
          URL.revokeObjectURL(localUrl)
        }
        audio.onerror = () => {
          speakTTS(node.text)
        }
        audio.play().catch(speakTTS.bind(null, node.text))
      } else {
        speakTTS(node.text)
      }
    } catch {
      speakTTS(node.text)
    }
  }

  // Speak fallback using browser Speech Synthesis
  const speakTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-GB'
      utterance.onend = () => setPlayingNodeId(null)
      utterance.onerror = () => setPlayingNodeId(null)
      window.speechSynthesis.speak(utterance)
    } else {
      setPlayingNodeId(null)
    }
  }

  // Sequential Play All
  const collectVisibleNodes = useCallback((node: Node, depth = 0, list: Node[] = []): Node[] => {
    if (node.state === 'hidden' || depth > maxDepthVisible) return list
    if (node.state !== 'empty') {
      list.push(node)
    }
    if (node.children && depth < maxDepthVisible && !collapsedNodes.has(node.id)) {
      node.children.forEach(child => collectVisibleNodes(child, depth + 1, list))
    }
    return list
  }, [maxDepthVisible, collapsedNodes])

  const playNodeAudioAsync = useCallback((node: Node): Promise<void> => {
    return new Promise(async (resolve) => {
      setPlayingNodeId(node.id)
      const audioUrl = getAudioUrl(node.text)

      const handleSpeechSynthesis = () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(node.text)
          utterance.lang = 'en-GB'
          utterance.onend = () => {
            setPlayingNodeId(null)
            resolve()
          }
          utterance.onerror = () => {
            setPlayingNodeId(null)
            resolve()
          }
          window.speechSynthesis.speak(utterance)
        } else {
          setPlayingNodeId(null)
          resolve()
        }
      }

      try {
        const blob = await audioCache.cacheAudio(audioUrl)
        if (blob) {
          const localUrl = URL.createObjectURL(blob)
          const audio = new Audio(localUrl)
          activeAudioRef.current = audio
          audio.onended = () => {
            setPlayingNodeId(null)
            URL.revokeObjectURL(localUrl)
            resolve()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(localUrl)
            handleSpeechSynthesis()
          }
          audio.play().catch(() => {
            URL.revokeObjectURL(localUrl)
            handleSpeechSynthesis()
          })
        } else {
          handleSpeechSynthesis()
        }
      } catch {
        handleSpeechSynthesis()
      }
    })
  }, [getAudioUrl])

  const stopPlayAll = useCallback(() => {
    setIsPlayingAll(false)
    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
      activeAudioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setPlayingNodeId(null)
  }, [])

  useEffect(() => {
    if (!isPlayingAll) return

    const playNext = async () => {
      if (currentPlayIndex < 0 || currentPlayIndex >= playAllQueue.length) {
        stopPlayAll()
        return
      }

      const node = playAllQueue[currentPlayIndex]
      scrollToNode(node.id, true)
      await playNodeAudioAsync(node)

      if (isPlayingAll) {
        setCurrentPlayIndex(prev => prev + 1)
      }
    }

    playNext()
  }, [isPlayingAll, currentPlayIndex, playAllQueue, playNodeAudioAsync, stopPlayAll, scrollToNode])

  const startPlayAll = () => {
    if (isPlayingAll) {
      stopPlayAll()
      return
    }

    const queue = collectVisibleNodes(treeData)
    if (queue.length === 0) return

    setPlayAllQueue(queue)
    setCurrentPlayIndex(0)
    setIsPlayingAll(true)
  }

  // Preload visible audio files in Sentence mode
  useEffect(() => {
    if (showAllMode === 3) {
      const visible = collectVisibleNodes(treeData)
      visible.forEach(n => {
        const url = getAudioUrl(n.text)
        audioCache.preloadAndSync(url)
      })
    }
  }, [showAllMode, treeData, collectVisibleNodes, getAudioUrl])

  // Question Modal Helpers
  const showQuestionModal = (node: Node, event?: React.MouseEvent) => {
    if (event) event.stopPropagation()
    setQuestionNode(node)
    setUserAnswer(null)
    setShowFeedback(false)
    closeActions()
  }

  const handleCheckAnswer = (choice: boolean) => {
    if (!questionNode) return
    setUserAnswer(choice)
    setShowFeedback(true)
    if (choice === questionNode.answer) {
      petService.awardCorrectAnswer()
    }
  }

  // Keyboard Navigation Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (questionNode || showPromptModal) return // Disable shortcuts while modals are active

      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault()
        nextStep()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        prevStep()
      } else if (e.code === 'KeyA') {
        e.preventDefault()
        setShowAllMode(prev => {
          const next = Math.max(0, prev - 1)
          updateMode(next)
          return next
        })
      } else if (e.code === 'KeyD') {
        e.preventDefault()
        setShowAllMode(prev => {
          const next = Math.min(3, prev + 1)
          updateMode(next)
          return next
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextStep, prevStep, questionNode, showPromptModal])

  // Click outside listener to close inline overlays
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.mm-node-box') && !target.closest('.mm-action-btn')) {
        closeActions()
      }
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  // Recursive Tree Render Engine
  const renderNode = (node: Node, depth = 0): React.ReactNode => {
    const state = node.state || 'hidden'
    if (state === 'hidden') return null
    if (showAllMode > 0 && depth > maxDepthVisible) return null

    const hasChildren = node.children && node.children.length > 0
    const isCollapsed = collapsedNodes.has(node.id)
    const isDepthLimited = showAllMode > 0 && depth >= maxDepthVisible
    
    const allChildrenFull = hasChildren && node.children!.every(c => c.state === 'full' || c.state === 'keywords')
    const hideChildren = (isCollapsed && allChildrenFull) || (isDepthLimited && hasChildren)

    // Parse Highlight words
    let displayedText: React.ReactNode = node.text
    if (state === 'full' && node.highlight) {
      const highlights = Array.from(new Set(node.highlight.split(',').map(s => s.trim()).filter(Boolean)))

      // Escape regex helper
      const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }

      // Sort highlights by length descending to match longer phrases first
      const sortedHighlights = [...highlights].sort((a: any, b: any) => (b as string).length - (a as string).length)

      const patterns = sortedHighlights.map((h: any) => {
        const hStr = h as string
        if (hStr.includes('...')) {
          const parts = hStr.split('...').map(p => p.trim())
          return parts.map(escapeRegExp).join('.*?')
        } else {
          return `\\b${escapeRegExp(hStr)}\\b`
        }
      })

      const combinedRegex = new RegExp(`(${patterns.join('|')})`, 'gi')
      const textWithHighlights = node.text.replace(combinedRegex, '||HIGHLIGHT||$1||ENDHIGHLIGHT||')

      // Convert back to JSX array
      const textParts = textWithHighlights.split(/(\|\|HIGHLIGHT\|\|.*?\|\|ENDHIGHLIGHT\|\|)/g)
      displayedText = textParts.map((part, idx) => {
        if (part.startsWith('||HIGHLIGHT||') && part.endsWith('||ENDHIGHLIGHT||')) {
          const actualText = part.slice(13, -16)
          return <span key={idx} className="mm-highlight">{actualText}</span>
        }
        return part
      })
    }

    const visibleChildren = hasChildren && !hideChildren
      ? node.children!
          .map(child => ({ child, el: renderNode(child, depth + 1) }))
          .filter(item => item.el !== null)
      : []

    const isActionsActive = activeActionsNodeId === node.id
    const isPlaying = playingNodeId === node.id

    return (
      <div className="mm-node-wrapper" key={node.id}>
        <div 
          id={isPlaying ? `playing-${node.id}` : `node-${node.id}`}
          className={`mm-node-box ${state} level-${depth} ${allChildrenFull ? 'collapsible' : ''} ${activeNodeId === node.id ? 'active' : ''} ${isPlaying ? 'playing' : ''} ${isActionsActive ? 'actions-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            
            if (state === 'full') {
              if (activeActionsNodeId === node.id) {
                closeActions()
              } else {
                setActiveActionsNodeId(node.id)
                refreshActionsTimeout()
              }
            } else if (allChildrenFull) {
              toggleCollapse(node.id)
              setActiveNodeId(node.id)
            }
          }}
        >
          {state === 'emoji' && <span className="mm-node-content-emoji">{node.emoji}</span>}
          {state === 'keywords' && (
            <>
              <span className="mm-node-content-emoji">{node.emoji}</span>
              <span className="mm-node-content-keywords">{node.keywords}</span>
            </>
          )}
          {state === 'full' && (
            <>
              <span className="mm-node-content-emoji">{node.emoji}</span>
              <span className="mm-node-content-text">{displayedText}</span>
            </>
          )}

          {hideChildren && node.state !== 'empty' && (
            <span className="mm-collapsed-indicator" title="Hidden nodes">+{node.children?.length}</span>
          )}

          {/* Action Overlay */}
          {state === 'full' && isActionsActive && (
            <div className="mm-node-actions" onClick={(e) => e.stopPropagation()}>
              <button 
                className="mm-action-btn" 
                onClick={(e) => { playNodeAudio(node, e); refreshActionsTimeout(); }}
                title="Play Audio"
              >
                🔊
              </button>

              {node.cn && (
                <button 
                  className="mm-action-btn" 
                  onClick={() => {
                    setVisibleTooltipType(prev => prev?.nodeId === node.id && prev.type === 'cn' ? null : { nodeId: node.id, type: 'cn' })
                    refreshActionsTimeout()
                  }}
                  title="Translation"
                >
                  CN
                  {visibleTooltipType?.nodeId === node.id && visibleTooltipType.type === 'cn' && (
                    <span className="mm-tooltip visible">{node.cn}</span>
                  )}
                </button>
              )}

              {node.notes && (
                <button 
                  className="mm-action-btn" 
                  onClick={() => {
                    setVisibleTooltipType(prev => prev?.nodeId === node.id && prev.type === 'notes' ? null : { nodeId: node.id, type: 'notes' })
                    refreshActionsTimeout()
                  }}
                  title="Notes"
                >
                  💡
                  {visibleTooltipType?.nodeId === node.id && visibleTooltipType.type === 'notes' && (
                    <span className="mm-tooltip visible">{node.notes}</span>
                  )}
                </button>
              )}

              {node.statement && (
                <button 
                  className="mm-action-btn" 
                  onClick={(e) => showQuestionModal(node, e)}
                  title="Question"
                >
                  ❓
                </button>
              )}
            </div>
          )}
        </div>

        {visibleChildren.length > 0 && (
          <div className="mm-children-container">
            {visibleChildren.map(({ child, el }) => (
              <div className="mm-child-row" key={child.id}>
                {el}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mm-shell">
      {/* Header */}
      <header className="mm-header">
        <div className="mm-header-left">
          <Link to="/dashboard" state={{ textbook, unit }} className="mm-home-link" title="Back (返回)">🏠</Link>
          <div className="mm-header-titles">
            <h1>
              {isWritingMap ? "Writing Map" : "Text Navigator"}: {data.part} 
              <span className="mm-section-title"> {data.section}</span>
            </h1>
            <p>{data.level}</p>
          </div>
        </div>

        <div className="mm-controls">
          {isWritingMap && data.writingPrompt && (
            <button className="mm-ctrl-btn prompt" onClick={() => setShowPromptModal(true)} title="Writing Prompt (写作要求)">📝</button>
          )}
          {showAllMode === 3 && maxDepthVisible === maxTreeDepth && (
            <button className="mm-ctrl-btn play-all" onClick={startPlayAll} title={isPlayingAll ? "Stop Play All (停止播放)" : "Play All (顺序播放)"}>
              {isPlayingAll ? "⏹️" : "🔊"}
            </button>
          )}
          {showAllMode === 3 && maxDepthVisible === maxTreeDepth && <div className="mm-btn-separator" />}
          <button 
            className="mm-ctrl-btn layout-toggle" 
            onClick={toggleLayoutOrientation} 
            title={layoutOrientation === 'horizontal' ? "Switch to Vertical Layout (切换至垂直布局)" : "Switch to Horizontal Layout (切换至水平布局)"}
          >
            {layoutOrientation === 'horizontal' ? "📋" : "🌳"}
          </button>
          <button className="mm-ctrl-btn" onClick={resetMap} title="Reset (重置)">🔄</button>
          <button className="mm-ctrl-btn" onClick={prevStep} disabled={currentStepIndex <= 1 || showAllMode > 0} title="Previous Step (上一步)">◀️</button>
          <button className="mm-ctrl-btn next" onClick={nextStep} disabled={(currentStepIndex >= actionSteps.length && showAllMode === 0) || showAllMode > 0} title="Next Step (下一步)">▶️</button>
        </div>

        <div className="mm-progress-container">
          <div className="mm-progress-bar" style={{ width: `${actionSteps.length > 0 ? (currentStepIndex / actionSteps.length) * 100 : 0}%` }} />
        </div>
      </header>

      {/* Sliders Overlay */}
      <div className="mm-sliders-wrapper">
        <div className="mm-slider-container">
          <div className="mm-slider-labels">
            <span className={showAllMode === 0 ? 'active' : ''} onClick={() => updateMode(0)}>Manual</span>
            <span className={showAllMode === 1 ? 'active' : ''} onClick={() => updateMode(1)}>Emoji</span>
            <span className={showAllMode === 2 ? 'active' : ''} onClick={() => updateMode(2)}>Key Words</span>
            <span className={showAllMode === 3 ? 'active' : ''} onClick={() => updateMode(3)}>Sentence</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="3" 
            step="1" 
            value={showAllMode} 
            onChange={(e) => updateMode(parseInt(e.target.value))} 
            className="mm-range-slider"
          />
        </div>

        {showAllMode > 0 && (
          <div className="mm-slider-container depth">
            <div className="mm-slider-labels">
              {Array.from({ length: maxTreeDepth + 1 }).map((_, idx) => (
                <span 
                  key={idx} 
                  className={maxDepthVisible === idx ? 'active' : ''} 
                  onClick={() => updateDepth(idx)}
                >
                  L{idx}
                </span>
              ))}
            </div>
            <input 
              type="range" 
              min="0" 
              max={maxTreeDepth} 
              step="1" 
              value={maxDepthVisible} 
              onChange={(e) => updateDepth(parseInt(e.target.value))} 
              className="mm-range-slider"
            />
          </div>
        )}
      </div>

      {/* Main Mindmap Area */}
      <main className={`mm-container ${layoutOrientation === 'vertical' ? 'vertical-layout' : ''}`} ref={containerRef}>
        {renderNode(treeData)}
      </main>

      {/* Question Modal */}
      {questionNode && (
        <div className="mm-modal-overlay" onClick={() => setQuestionNode(null)}>
          <div className="mm-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="mm-modal-close" onClick={() => setQuestionNode(null)}>×</button>
            <div className="mm-modal-body">
              <h3>True or False Statement</h3>
              <div className="mm-modal-statement">{questionNode.statement}</div>
              <div className="mm-modal-choices">
                <button className="mm-choice-btn true" onClick={() => handleCheckAnswer(true)}>
                  TRUE (正确)
                </button>
                <button className="mm-choice-btn false" onClick={() => handleCheckAnswer(false)}>
                  FALSE (错误)
                </button>
              </div>
              
              {showFeedback && (
                <div className={`mm-modal-feedback ${userAnswer === questionNode.answer ? 'correct' : 'incorrect'}`}>
                  <div className="mm-feedback-heading">
                    {userAnswer === questionNode.answer ? "✅ Correct! (正确)" : "❌ Incorrect (错误)"}
                  </div>
                  <div className="mm-feedback-explanation">
                    {questionNode.explanation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Writing Prompt Modal */}
      {showPromptModal && data.writingPrompt && (
        <div className="mm-modal-overlay" onClick={() => setShowPromptModal(false)}>
          <div className="mm-modal-content prompt" onClick={(e) => e.stopPropagation()}>
            <button className="mm-modal-close" onClick={() => setShowPromptModal(false)}>×</button>
            <div className="mm-modal-body">
              <h3>Writing Task Prompt</h3>
              <div 
                className="mm-prompt-text"
                dangerouslySetInnerHTML={{ __html: data.writingPrompt.replace(/\n/g, '<br/>') }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
