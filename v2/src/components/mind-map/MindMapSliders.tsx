interface MindMapSlidersProps {
  showAllMode: number
  maxDepthVisible: number
  maxTreeDepth: number
  isCnMode: boolean
  onUpdateMode: (mode: number) => void
  onUpdateDepth: (depth: number) => void
}

export function MindMapSliders({
  showAllMode,
  maxDepthVisible,
  maxTreeDepth,
  isCnMode,
  onUpdateMode,
  onUpdateDepth,
}: MindMapSlidersProps) {
  return (
    <div className="mm-sliders-wrapper">
      <div className={`mm-slider-container ${isCnMode ? 'disabled' : ''}`}>
        <div className="mm-slider-labels">
          <span className={showAllMode === 0 ? 'active' : ''} onClick={() => !isCnMode && onUpdateMode(0)}>Manual</span>
          <span className={showAllMode === 1 ? 'active' : ''} onClick={() => !isCnMode && onUpdateMode(1)}>Emoji</span>
          <span className={showAllMode === 2 ? 'active' : ''} onClick={() => !isCnMode && onUpdateMode(2)}>Key Words</span>
          <span className={showAllMode === 3 ? 'active' : ''} onClick={() => !isCnMode && onUpdateMode(3)}>Sentence</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="3" 
          step="1" 
          value={showAllMode} 
          onChange={(e) => onUpdateMode(parseInt(e.target.value))} 
          className="mm-range-slider"
          disabled={isCnMode}
        />
      </div>

      {showAllMode > 0 && (
        <div className={`mm-slider-container depth ${isCnMode ? 'disabled' : ''}`}>
          <div className="mm-slider-labels">
            {Array.from({ length: maxTreeDepth + 1 }).map((_, idx) => (
              <span 
                key={idx} 
                className={maxDepthVisible === idx ? 'active' : ''} 
                onClick={() => !isCnMode && onUpdateDepth(idx)}
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
            onChange={(e) => onUpdateDepth(parseInt(e.target.value))} 
            className="mm-range-slider"
            disabled={isCnMode}
          />
        </div>
      )}
    </div>
  )
}
