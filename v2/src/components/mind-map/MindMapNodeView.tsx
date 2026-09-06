import React from 'react'
import type { Node, SpeakerColorTheme } from './MindMapTypes'
import { escapeRegExp } from './mindMapUtils'

interface MindMapNodeViewProps {
  node: Node
  depth?: number
  showAllMode: number
  maxDepthVisible: number
  collapsedNodes: Set<string>
  activeNodeId: string | null
  activeActionsNodeId: string | null
  visibleTooltipType: { nodeId: string; type: 'cn' | 'notes' } | null
  playingNodeId: string | null
  tempEnNodeId: string | null
  isCnMode: boolean
  enableAudio: boolean
  speakerColorMap: Map<string, SpeakerColorTheme>
  onNodeClick: (node: Node, allChildrenFull: boolean) => void
  onPlayNodeAudio: (node: Node, e: React.MouseEvent) => void
  onToggleTooltip: (nodeId: string, type: 'cn' | 'notes') => void
  onShowQuestionModal: (node: Node, e: React.MouseEvent) => void
}

export function MindMapNodeView({
  node,
  depth = 0,
  showAllMode,
  maxDepthVisible,
  collapsedNodes,
  activeNodeId,
  activeActionsNodeId,
  visibleTooltipType,
  playingNodeId,
  tempEnNodeId,
  isCnMode,
  enableAudio,
  speakerColorMap,
  onNodeClick,
  onPlayNodeAudio,
  onToggleTooltip,
  onShowQuestionModal,
}: MindMapNodeViewProps): React.ReactElement | null {
  const state = node.state || 'hidden'
  if (state === 'hidden') return null
  if (showAllMode > 0 && depth > maxDepthVisible) return null

  const hasChildren = Boolean(node.children && node.children.length > 0)
  const isCollapsed = collapsedNodes.has(node.id)
  const isDepthLimited = showAllMode > 0 && depth >= maxDepthVisible

  const allChildrenFull = Boolean(hasChildren && node.children!.every(c => c.state === 'full' || c.state === 'keywords'))
  const hideChildren = (isCollapsed && allChildrenFull) || (isDepthLimited && hasChildren)

  const isShowingTempEn = tempEnNodeId === node.id

  const getSpeakerStyle = (speaker?: string) => {
    if (!speaker) return {}
    const theme = speakerColorMap.get(speaker)
    if (!theme) return {}
    return {
      color: theme.color,
      backgroundColor: theme.bg,
      borderColor: theme.border,
    }
  }

  // Parse Highlight words
  let displayedText: React.ReactNode = (isCnMode && !isShowingTempEn) ? (node.cn || node.text) : node.text
  if ((!isCnMode || isShowingTempEn) && state === 'full' && node.highlight) {
    const highlights = Array.from(new Set(node.highlight.split(',').map(s => s.trim()).filter(Boolean)))
    const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length)

    const patterns = sortedHighlights.map((hStr) => {
      if (hStr.includes('...')) {
        const parts = hStr.split('...').map(p => p.trim())
        return parts.map(escapeRegExp).join('.*?')
      } else {
        return `\\b${escapeRegExp(hStr)}\\b`
      }
    })

    const combinedRegex = new RegExp(`(${patterns.join('|')})`, 'gi')
    const textWithHighlights = node.text.replace(combinedRegex, '||HIGHLIGHT||$1||ENDHIGHLIGHT||')
    const textParts = textWithHighlights.split(/(\|\|HIGHLIGHT\|\|.*?\|\|ENDHIGHLIGHT\|\|)/g)

    displayedText = textParts.map((part, idx) => {
      if (part.startsWith('||HIGHLIGHT||') && part.endsWith('||ENDHIGHLIGHT||')) {
        const actualText = part.slice(13, -16)
        return <span key={idx} className="mm-highlight">{actualText}</span>
      }
      return part
    })
  }

  if (node.speaker && (!isCnMode || isShowingTempEn)) {
    displayedText = (
      <>
        <strong className="mm-node-speaker" style={getSpeakerStyle(node.speaker)}>{node.speaker}</strong>
        {displayedText}
      </>
    )
  }

  const isActionsActive = activeActionsNodeId === node.id
  const isPlaying = playingNodeId === node.id
  const isGiven = !!node.is_given

  return (
    <div className="mm-node-wrapper" key={node.id}>
      <div 
        id={isPlaying ? `playing-${node.id}` : `node-${node.id}`}
        className={`mm-node-box ${state} level-${depth} ${allChildrenFull ? 'collapsible' : ''} ${activeNodeId === node.id ? 'active' : ''} ${isPlaying ? 'playing' : ''} ${(isActionsActive && !isCnMode) ? 'actions-active' : ''} ${isGiven ? 'is-given' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onNodeClick(node, allChildrenFull)
        }}
      >
        {state === 'emoji' && <span className="mm-node-content-emoji">{node.emoji}</span>}
        {state === 'keywords' && (
          <>
            <span className="mm-node-content-emoji">{node.emoji}</span>
            <span className="mm-node-content-keywords">
              {isCnMode && !isShowingTempEn ? (
                <>
                  {isGiven && <span className="mm-given-badge">已给出</span>}
                  {node.cn || node.text}
                </>
              ) : (
                <>
                  {isGiven && <span className="mm-given-badge">已给出</span>}
                  {node.speaker && <strong className="mm-node-speaker" style={getSpeakerStyle(node.speaker)}>{node.speaker}</strong>}
                  {isShowingTempEn ? node.text : node.keywords}
                </>
              )}
            </span>
          </>
        )}
        {state === 'full' && (
          <>
            <span className="mm-node-content-emoji">{node.emoji}</span>
            <span className="mm-node-content-text">
              {isGiven && <span className="mm-given-badge">已给出</span>}
              {displayedText}
            </span>
          </>
        )}

        {hideChildren && node.state !== 'empty' && (
          <span className="mm-collapsed-indicator" title="Hidden nodes">+{node.children?.length}</span>
        )}

        {/* Action Overlay */}
        {state === 'full' && isActionsActive && !isCnMode && (
          <div className="mm-node-actions" onClick={(e) => e.stopPropagation()}>
            {enableAudio && (
              <button 
                className="mm-action-btn" 
                onClick={(e) => onPlayNodeAudio(node, e)}
                title="Play Audio"
              >
                🔊
              </button>
            )}

            {node.cn && (
              <button 
                className="mm-action-btn" 
                onClick={() => onToggleTooltip(node.id, 'cn')}
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
                onClick={() => onToggleTooltip(node.id, 'notes')}
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
                onClick={(e) => onShowQuestionModal(node, e)}
                title="Question"
              >
                ❓
              </button>
            )}
          </div>
        )}
      </div>

      {hasChildren && !hideChildren && (
        <div className="mm-children-container">
          {node.children!.map((child) => (
            <div className="mm-child-row" key={child.id}>
              <MindMapNodeView
                node={child}
                depth={depth + 1}
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
                onNodeClick={onNodeClick}
                onPlayNodeAudio={onPlayNodeAudio}
                onToggleTooltip={onToggleTooltip}
                onShowQuestionModal={onShowQuestionModal}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
