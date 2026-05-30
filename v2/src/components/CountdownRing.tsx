import './CountdownRing.css'

interface CountdownRingProps {
    secondsLeft: number
    totalSeconds: number
    isRunning: boolean
}

export function CountdownRing({ secondsLeft, totalSeconds, isRunning }: CountdownRingProps) {
    const radius = 14
    const circumference = 2 * Math.PI * radius
    const fraction = 1 - secondsLeft / totalSeconds // 0 at start, 1 at end
    const dashOffset = circumference * fraction

    let strokeColor = '#58cc02' // green
    if (secondsLeft <= 3) strokeColor = '#ff4b4b' // red
    else if (secondsLeft <= 5) strokeColor = '#ffc800' // yellow

    const isUrgent = secondsLeft <= 3 && isRunning

    return (
        <div className={`countdown-ring-wrapper${isUrgent ? ' urgent' : ''}`}>
            <svg className="countdown-ring-svg" viewBox="0 0 36 36">
                <circle
                    className="countdown-ring-bg"
                    cx="18" cy="18" r={radius}
                />
                <circle
                    className="countdown-ring-fg"
                    cx="18" cy="18" r={radius}
                    stroke={strokeColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                />
            </svg>
            <div className="countdown-ring-text">
                {secondsLeft}
            </div>
        </div>
    )
}
