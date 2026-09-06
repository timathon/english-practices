import type { Node } from './MindMapTypes'

interface QuestionModalProps {
  node: Node | null
  userAnswer: boolean | null
  showFeedback: boolean
  onClose: () => void
  onAnswer: (choice: boolean) => void
}

export function QuestionModal({
  node,
  userAnswer,
  showFeedback,
  onClose,
  onAnswer,
}: QuestionModalProps) {
  if (!node) return null

  return (
    <div className="mm-modal-overlay" onClick={onClose}>
      <div className="mm-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="mm-modal-close" onClick={onClose}>×</button>
        <div className="mm-modal-body">
          <h3>True or False Statement</h3>
          <div className="mm-modal-statement">{node.statement}</div>
          <div className="mm-modal-choices">
            <button className="mm-choice-btn true" onClick={() => onAnswer(true)}>
              TRUE (正确)
            </button>
            <button className="mm-choice-btn false" onClick={() => onAnswer(false)}>
              FALSE (错误)
            </button>
          </div>
          
          {showFeedback && (
            <div className={`mm-modal-feedback ${userAnswer === node.answer ? 'correct' : 'incorrect'}`}>
              <div className="mm-feedback-heading">
                {userAnswer === node.answer ? "✅ Correct! (正确)" : "❌ Incorrect (错误)"}
              </div>
              <div className="mm-feedback-explanation">
                {node.explanation}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface WritingPromptModalProps {
  isOpen: boolean
  writingPrompt?: string
  onClose: () => void
}

export function WritingPromptModal({
  isOpen,
  writingPrompt,
  onClose,
}: WritingPromptModalProps) {
  if (!isOpen || !writingPrompt) return null

  const cleanPromptHtml = writingPrompt
    .replace(/(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2}(?:[一二三四五六七八九十0-9]+[、.．\s]*)?)?(?:例文|范文|参考范文|优秀范文|参考作文|Model\s*Essay|Sample\s*Essay|Sample\s*Answer|Sample\s*Writing|Example\s*Essay)(?:[:：\s*#\-]|$)[^]*$/i, '')
    .trim()
    .replace(/\n/g, '<br/>')

  return (
    <div className="mm-modal-overlay" onClick={onClose}>
      <div className="mm-modal-content prompt" onClick={(e) => e.stopPropagation()}>
        <button className="mm-modal-close" onClick={onClose}>×</button>
        <div className="mm-modal-body">
          <h3>Writing Task Prompt</h3>
          <div 
            className="mm-prompt-text"
            dangerouslySetInnerHTML={{ __html: cleanPromptHtml }}
          />
        </div>
      </div>
    </div>
  )
}
