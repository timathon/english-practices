import React from 'react'
import { CountdownRing } from '../CountdownRing'
import { ProgressBar } from './ProgressBar'
import './ActiveHeader.css'

interface ActiveHeaderProps {
    onClose: () => void
    countdownTimer?: {
        secondsLeft: number
        totalSeconds: number
        isRunning: boolean
    }
    invisibleMode: boolean
    queue: any[]
    currentIndex: number
    scoreLog: any[]
    showFeedback: boolean
    isRedemption: boolean
    currentQuestion: any
    prefix: string
}

export const ActiveHeader: React.FC<ActiveHeaderProps> = ({
    onClose,
    countdownTimer,
    invisibleMode,
    queue,
    currentIndex,
    scoreLog,
    showFeedback,
    isRedemption,
    currentQuestion,
    prefix
}) => {
    return (
        <div className="practice-active-header">
            <div className="practice-header-left-col">
                <button className={`${prefix}-close-btn`} onClick={onClose}>✕</button>
                {!invisibleMode && countdownTimer && (
                    <div className="practice-timer-wrapper">
                        <CountdownRing
                            secondsLeft={countdownTimer.secondsLeft}
                            totalSeconds={countdownTimer.totalSeconds}
                            isRunning={countdownTimer.isRunning}
                        />
                    </div>
                )}
            </div>
            <div className="practice-header-right-col">
                <ProgressBar
                    queue={queue}
                    currentIndex={currentIndex}
                    scoreLog={scoreLog}
                    showFeedback={showFeedback}
                    isRedemption={isRedemption}
                    currentQuestion={currentQuestion}
                    prefix={prefix}
                />
            </div>
        </div>
    )
}
