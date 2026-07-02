import React from 'react'

interface ProgressBarProps {
    queue: any[]
    currentIndex: number
    scoreLog: any[]
    showFeedback: boolean
    isRedemption: boolean
    currentQuestion: any
    prefix: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    queue,
    currentIndex,
    scoreLog,
    showFeedback,
    isRedemption,
    currentQuestion,
    prefix
}) => {
    return (
        <div className={`${prefix}-progress-container`}>
            {queue.map((_, i) => {
                const isActive = (!isRedemption && i === currentIndex && !showFeedback) || 
                                 (isRedemption && currentQuestion && currentQuestion.originalIndex === i && !showFeedback);
                return (
                    <div
                        key={i}
                        className={`${prefix}-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`}
                    />
                )
            })}
        </div>
    )
}
