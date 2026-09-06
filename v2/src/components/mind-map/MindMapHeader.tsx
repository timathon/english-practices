import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface MindMapHeaderProps {
  isWritingMap: boolean
  part: string
  level: string
  section: string
  textbook: string
  unit: string
  headerSlot?: ReactNode
  enableAudio: boolean
  hasWritingPrompt: boolean
  showAllMode: number
  maxDepthVisible: number
  maxTreeDepth: number
  isPlayingAll: boolean
  isMobile: boolean
  layoutOrientation: 'horizontal' | 'vertical'
  currentStepIndex: number
  totalActionSteps: number
  isCnMode: boolean
  onShowPromptModal: () => void
  onTogglePlayAll: () => void
  onToggleLayout: () => void
  onReset: () => void
  onPrevStep: () => void
  onNextStep: () => void
  onToggleCnMode: () => void
  onOpenEvalModal: () => void
}

export function MindMapHeader({
  isWritingMap,
  part,
  level,
  section,
  textbook,
  unit,
  headerSlot,
  enableAudio,
  hasWritingPrompt,
  showAllMode,
  maxDepthVisible,
  maxTreeDepth,
  isPlayingAll,
  isMobile,
  layoutOrientation,
  currentStepIndex,
  totalActionSteps,
  isCnMode,
  onShowPromptModal,
  onTogglePlayAll,
  onToggleLayout,
  onReset,
  onPrevStep,
  onNextStep,
  onToggleCnMode,
  onOpenEvalModal,
}: MindMapHeaderProps) {
  const isPlayAllEligible = enableAudio && showAllMode === 3 && maxDepthVisible === maxTreeDepth

  return (
    <header className="mm-header">
      <div className="mm-header-left">
        <Link to="/dashboard" state={{ textbook, unit }} className="mm-home-link" title="Back (返回)">🏠</Link>
        <div className="mm-header-titles">
          <h1>
            {isWritingMap ? "Writing Map" : "Text Navigator"}: {part} 
            <span className="mm-section-title"> {level}</span>
          </h1>
          {headerSlot ? (
            <div className="mm-header-slot" style={{ display: 'flex', overflow: 'visible', position: 'relative' }}>
              {headerSlot}
            </div>
          ) : (
            <p>{section}</p>
          )}
        </div>
      </div>

      <div className="mm-controls">
        {isWritingMap && hasWritingPrompt && (
          <button className="mm-ctrl-btn prompt" onClick={onShowPromptModal} title="Writing Prompt (写作要求)">📝</button>
        )}
        {isPlayAllEligible && (
          <button className="mm-ctrl-btn play-all" onClick={onTogglePlayAll} title={isPlayingAll ? "Stop Play All (停止播放)" : "Play All (顺序播放)"}>
            {isPlayingAll ? "⏹️" : "🔊"}
          </button>
        )}
        {isPlayAllEligible && !isMobile && <div className="mm-btn-separator" />}
        {!isMobile && (
          <button 
            className="mm-ctrl-btn layout-toggle" 
            onClick={onToggleLayout} 
            title={layoutOrientation === 'horizontal' ? "Switch to Vertical Layout (切换至垂直布局)" : "Switch to Horizontal Layout (切换至水平布局)"}
          >
            {layoutOrientation === 'horizontal' ? "📋" : "🌳"}
          </button>
        )}
        <button className="mm-ctrl-btn" onClick={onReset} title="Reset (重置)">🔄</button>
        <button className="mm-ctrl-btn" onClick={onPrevStep} disabled={currentStepIndex <= 1 || showAllMode > 0} title="Previous Step (上一步)">◀️</button>
        <button className="mm-ctrl-btn next" onClick={onNextStep} disabled={(currentStepIndex >= totalActionSteps && showAllMode === 0) || showAllMode > 0} title="Next Step (下一步)">▶️</button>
        <button 
          className="mm-ctrl-btn cn-toggle" 
          onClick={onToggleCnMode} 
          title={isCnMode ? "Switch to English (切换至英文)" : "Switch to Chinese (切换至中文)"}
          style={{
            color: 'var(--tab-active-text)',
            backgroundColor: 'rgba(var(--tab-active-text-rgb, 79, 70, 229), 0.1)',
            borderColor: 'var(--tab-active-text)'
          }}
        >
          {isCnMode ? "EN" : "CN"}
        </button>
        <button
          className="mm-ctrl-btn eval-toggle"
          onClick={onOpenEvalModal}
          title="Reading Pronunciation Evaluation (朗读发音评测)"
          style={{
            color: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderColor: '#38bdf8'
          }}
        >
          🎙️
        </button>
      </div>

      <div className="mm-progress-container">
        <div className="mm-progress-bar" style={{ width: `${totalActionSteps > 0 ? (currentStepIndex / totalActionSteps) * 100 : 0}%` }} />
      </div>
    </header>
  )
}
