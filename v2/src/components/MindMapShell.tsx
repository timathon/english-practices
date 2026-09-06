import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { audioCache } from '../lib/audioCache'
import { petService } from '../lib/petService'
import { PronunciationModal } from './PronunciationModal'
import './MindMapShell.css'

import type { Node, MindMapShellProps } from './mind-map/MindMapTypes'
import {
  PUBLIC_URL_BASE,
  getAudioUrl,
  getMaxDepth,
  findNode,
  buildSpeakerColorMap,
} from './mind-map/mindMapUtils'
import { QuestionModal, WritingPromptModal } from './mind-map/MindMapModals'
import { MindMapHeader } from './mind-map/MindMapHeader'
import { MindMapSliders } from './mind-map/MindMapSliders'
import { MindMapNodeView } from './mind-map/MindMapNodeView'

export type { Node, MindMapData, MindMapShellProps } from './mind-map/MindMapTypes'

export function MindMapShell({ data, textbook, unit, practiceId, isWritingMap, headerSlot }: MindMapShellProps) {
  const enableAudio = !isWritingMap || !!data.tts
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
  const [isMobile, setIsMobile] = useState(false)
  const [isCnMode, setIsCnMode] = useState(false)
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false)
  const [tempEnNodeId, setTempEnNodeId] = useState<string | null>(null)
  const tempEnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Map each unique speaker in dialogue order to guaranteed distinct color themes
  const speakerColorMap = useMemo(() => buildSpeakerColorMap(data.tree), [data.tree])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (tempEnTimeoutRef.current) clearTimeout(tempEnTimeoutRef.current)
    }
  }, [])

  const showEnglishTemporarily = (nodeId: string) => {
    if (tempEnTimeoutRef.current) {
      clearTimeout(tempEnTimeoutRef.current)
      tempEnTimeoutRef.current = null
    }

    if (tempEnNodeId === nodeId) {
      setTempEnNodeId(null)
    } else {
      setTempEnNodeId(nodeId)
      tempEnTimeoutRef.current = setTimeout(() => {
        setTempEnNodeId(null)
        tempEnTimeoutRef.current = null
      }, 5000)
    }
  }

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

  const ttsBy = data?.tts?.by
  const resolveAudioUrl = useCallback((text: string) => {
    return getAudioUrl(text, textbook, ttsBy)
  }, [textbook, ttsBy])

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
  }, [data.tree])

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
    const audioUrl = resolveAudioUrl(node.text)

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
      const audioUrl = resolveAudioUrl(node.text)

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
  }, [resolveAudioUrl])

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

    let active = true

    const playNext = async () => {
      if (currentPlayIndex < 0 || currentPlayIndex >= playAllQueue.length) {
        if (active) stopPlayAll()
        return
      }

      const node = playAllQueue[currentPlayIndex]
      scrollToNode(node.id, true)
      await playNodeAudioAsync(node)

      if (active && isPlayingAll) {
        setCurrentPlayIndex(prev => prev + 1)
      }
    }

    playNext()

    return () => {
      active = false
      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
        activeAudioRef.current = null
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
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
    if (enableAudio && showAllMode === 3) {
      const visible = collectVisibleNodes(treeData)
      visible.forEach(n => {
        if (!n || !n.text) return
        const url = resolveAudioUrl(n.text)
        if (url) audioCache.preloadAndSync(url)
      })
    }
  }, [enableAudio, showAllMode, treeData, collectVisibleNodes, resolveAudioUrl])

  // Question Modal Helpers
  const showQuestionModal = (node: Node, event?: React.MouseEvent) => {
    if (event) event.stopPropagation()
    setQuestionNode(node)
    setUserAnswer(null)
    setShowFeedback(false)
    closeActions()
  }

  // Preload SFX
  useEffect(() => {
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`)
    audioCache.preloadAndSync(`${PUBLIC_URL_BASE}/ep/sfx/error.mp3`)
  }, [])

  const playSfx = useCallback(async (isCorrect: boolean) => {
    const url = isCorrect
      ? `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
      : `${PUBLIC_URL_BASE}/ep/sfx/error.mp3`
    try {
      const blob = await audioCache.cacheAudio(url)
      if (!blob) return
      const blobUrl = URL.createObjectURL(blob)
      const a = new Audio(blobUrl)
      a.onended = () => URL.revokeObjectURL(blobUrl)
      a.play().catch(console.error)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleCheckAnswer = (choice: boolean) => {
    if (!questionNode) return
    setUserAnswer(choice)
    setShowFeedback(true)
    const isCorrect = choice === questionNode.answer
    playSfx(isCorrect)
    if (isCorrect) {
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
        if (isCnMode) return
        e.preventDefault()
        setShowAllMode(prev => {
          const next = Math.max(0, prev - 1)
          updateMode(next)
          return next
        })
      } else if (e.code === 'KeyD') {
        if (isCnMode) return
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
  }, [nextStep, prevStep, questionNode, showPromptModal, isCnMode])

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

  const handleNodeClick = (node: Node, allChildrenFull: boolean) => {
    if (isCnMode) {
      if (node.state === 'full' || node.state === 'keywords') {
        showEnglishTemporarily(node.id)
      } else if (allChildrenFull) {
        toggleCollapse(node.id)
        setActiveNodeId(node.id)
      }
      return
    }

    if (node.state === 'full') {
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
  }

  const handleToggleTooltip = (nodeId: string, type: 'cn' | 'notes') => {
    setVisibleTooltipType(prev => prev?.nodeId === nodeId && prev.type === type ? null : { nodeId, type })
    refreshActionsTimeout()
  }

  return (
    <div className="mm-shell">
      {/* Header */}
      <MindMapHeader
        isWritingMap={isWritingMap}
        part={data.part}
        level={data.level}
        section={data.section}
        textbook={textbook}
        unit={unit}
        headerSlot={headerSlot}
        enableAudio={enableAudio}
        hasWritingPrompt={Boolean(data.writingPrompt)}
        showAllMode={showAllMode}
        maxDepthVisible={maxDepthVisible}
        maxTreeDepth={maxTreeDepth}
        isPlayingAll={isPlayingAll}
        isMobile={isMobile}
        layoutOrientation={layoutOrientation}
        currentStepIndex={currentStepIndex}
        totalActionSteps={actionSteps.length}
        isCnMode={isCnMode}
        onShowPromptModal={() => setShowPromptModal(true)}
        onTogglePlayAll={startPlayAll}
        onToggleLayout={toggleLayoutOrientation}
        onReset={resetMap}
        onPrevStep={prevStep}
        onNextStep={nextStep}
        onToggleCnMode={() => setIsCnMode(!isCnMode)}
        onOpenEvalModal={() => setIsEvalModalOpen(true)}
      />

      {/* Sliders Overlay */}
      <MindMapSliders
        showAllMode={showAllMode}
        maxDepthVisible={maxDepthVisible}
        maxTreeDepth={maxTreeDepth}
        isCnMode={isCnMode}
        onUpdateMode={updateMode}
        onUpdateDepth={updateDepth}
      />

      {/* Main Mindmap Area */}
      <main className={`mm-container ${layoutOrientation === 'vertical' ? 'vertical-layout' : ''}`} ref={containerRef}>
        <MindMapNodeView
          node={treeData}
          depth={0}
          showAllMode={showAllMode}
          maxDepthVisible={maxDepthVisible}
          collapsedNodes={collapsedNodes}
          activeNodeId={activeNodeId}
          activeActionsNodeId={activeActionsNodeId}
          visibleTooltipType={visibleTooltipType}
          playingNodeId={playingNodeId}
          tempEnNodeId={tempEnNodeId}
          isCnMode={isCnMode}
          enableAudio={enableAudio}
          speakerColorMap={speakerColorMap}
          onNodeClick={handleNodeClick}
          onPlayNodeAudio={playNodeAudio}
          onToggleTooltip={handleToggleTooltip}
          onShowQuestionModal={showQuestionModal}
        />
      </main>

      {/* Question Modal */}
      <QuestionModal
        node={questionNode}
        userAnswer={userAnswer}
        showFeedback={showFeedback}
        onClose={() => setQuestionNode(null)}
        onAnswer={handleCheckAnswer}
      />

      {/* Writing Prompt Modal */}
      <WritingPromptModal
        isOpen={showPromptModal}
        writingPrompt={data.writingPrompt}
        onClose={() => setShowPromptModal(false)}
      />

      <PronunciationModal
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        tree={data.tree}
        sectionName={data.section}
        practiceId={practiceId || `${textbook}-${unit}`}
      />
    </div>
  )
}
