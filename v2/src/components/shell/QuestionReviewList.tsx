import React, { useEffect, useRef } from 'react'
import './QuestionReviewList.css'

export interface QuestionResultItem {
    id?: string | number
    prompt: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    extraInfo?: string
}

export function getEncouragementMessage(score: number): { title: string; subtitle?: string } {
    if (score === 100) return { title: "🎉 Outstanding! Perfect Score!" }
    if (score >= 80) return { title: "🌟 Great Job! Keep It Up!" }
    if (score >= 60) return { title: "👍 Well Done! Good Effort!" }
    return { title: "💪 Keep Practicing! You'll Get It!" }
}

interface QuestionReviewListProps {
    items: QuestionResultItem[]
    maxHeight?: string | number
}

export const QuestionReviewList: React.FC<QuestionReviewListProps> = ({
    items,
    maxHeight = 290
}) => {
    const listRef = useRef<HTMLDivElement>(null)
    const userInteractedRef = useRef(false)

    useEffect(() => {
        if (!items || items.length === 0) return

        const el = listRef.current
        if (!el) return

        // Reset scroll position and user interaction state for new review sessions
        userInteractedRef.current = false
        el.scrollTop = 0

        let animationFrameId: number
        let timeoutId: number

        // Wait 1.2s initially before starting auto-scroll
        timeoutId = window.setTimeout(() => {
            let exactScrollTop = 0

            const step = () => {
                if (userInteractedRef.current || !el) return

                const maxScroll = el.scrollHeight - el.clientHeight
                if (maxScroll <= 0 || el.scrollTop >= maxScroll - 1) {
                    return // Reached bottom or no overflow
                }

                // Scroll slowly (~0.6px per frame at 60fps ≈ 36px/sec)
                exactScrollTop += 0.6
                el.scrollTop = exactScrollTop

                animationFrameId = requestAnimationFrame(step)
            }

            animationFrameId = requestAnimationFrame(step)
        }, 1200)

        const handleUserInteraction = () => {
            userInteractedRef.current = true
            if (animationFrameId) cancelAnimationFrame(animationFrameId)
            if (timeoutId) clearTimeout(timeoutId)
        }

        el.addEventListener('wheel', handleUserInteraction, { passive: true })
        el.addEventListener('touchstart', handleUserInteraction, { passive: true })
        el.addEventListener('pointerdown', handleUserInteraction, { passive: true })
        el.addEventListener('mousedown', handleUserInteraction, { passive: true })

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId)
            if (timeoutId) clearTimeout(timeoutId)
            el.removeEventListener('wheel', handleUserInteraction)
            el.removeEventListener('touchstart', handleUserInteraction)
            el.removeEventListener('pointerdown', handleUserInteraction)
            el.removeEventListener('mousedown', handleUserInteraction)
        }
    }, [items])

    if (!items || items.length === 0) return null

    return (
        <div 
            className="q-review-container" 
            style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
        >
            <div className="q-review-header">
                <span>Question Review ({items.filter(i => i.isCorrect).length}/{items.length})</span>
            </div>
            <div className="q-review-list" ref={listRef}>
                {items.map((item, idx) => (
                    <div 
                        key={item.id ?? idx} 
                        className={`q-review-item ${item.isCorrect ? 'correct' : 'wrong'}`}
                    >
                        <div className="q-review-item-header">
                            <span className="q-review-badge">#{idx + 1}</span>
                            <span className="q-review-prompt">{item.prompt}</span>
                            <span className="q-review-status-icon">
                                {item.isCorrect ? '✅' : '❌'}
                            </span>
                        </div>

                        <div className="q-review-body">
                            <div className="q-review-answer-row">
                                <span className="q-review-label">Your answer:</span>
                                <span className={`q-review-ans-val ${item.isCorrect ? 'correct-val' : 'wrong-val'}`}>
                                    {item.userAnswer || <span className="q-review-empty">(No answer)</span>}
                                </span>
                            </div>

                            {!item.isCorrect && (
                                <div className="q-review-answer-row">
                                    <span className="q-review-label">Correct answer:</span>
                                    <span className="q-review-ans-val correct-val highlight">
                                        {item.correctAnswer}
                                    </span>
                                </div>
                            )}

                            {item.extraInfo && (
                                <div className="q-review-extra">
                                    {item.extraInfo}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
