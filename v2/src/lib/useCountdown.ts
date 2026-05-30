import { useState, useRef, useCallback, useEffect } from 'react'

interface UseCountdownOptions {
    onExpire?: () => void
}

export function useCountdown(totalSeconds: number, options?: UseCountdownOptions) {
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
    const [isRunning, setIsRunning] = useState(false)
    const intervalRef = useRef<number | null>(null)
    const onExpireRef = useRef(options?.onExpire)
    const secondsLeftRef = useRef(totalSeconds)
    const expiredRef = useRef(false)

    // Keep callback ref fresh
    useEffect(() => {
        onExpireRef.current = options?.onExpire
    }, [options?.onExpire])

    const clearTimer = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }, [])

    const pause = useCallback(() => {
        setIsRunning(false)
        clearTimer()
    }, [clearTimer])

    const startInterval = useCallback(() => {
        clearTimer()
        intervalRef.current = window.setInterval(() => {
            secondsLeftRef.current -= 1
            const next = secondsLeftRef.current
            setSecondsLeft(next)
            if (next <= 0) {
                clearTimer()
                setIsRunning(false)
                if (!expiredRef.current) {
                    expiredRef.current = true
                    onExpireRef.current?.()
                }
            }
        }, 1000)
    }, [clearTimer])

    const resume = useCallback(() => {
        if (secondsLeftRef.current <= 0) return
        expiredRef.current = false
        setIsRunning(true)
        startInterval()
    }, [startInterval])

    const reset = useCallback((newTotal?: number) => {
        clearTimer()
        const t = newTotal ?? totalSeconds
        secondsLeftRef.current = t
        expiredRef.current = false
        setSecondsLeft(t)
        setIsRunning(true)
        // Start immediately after reset
        intervalRef.current = window.setInterval(() => {
            secondsLeftRef.current -= 1
            const next = secondsLeftRef.current
            setSecondsLeft(next)
            if (next <= 0) {
                clearTimer()
                setIsRunning(false)
                if (!expiredRef.current) {
                    expiredRef.current = true
                    onExpireRef.current?.()
                }
            }
        }, 1000)
    }, [totalSeconds, clearTimer])

    // Cleanup on unmount
    useEffect(() => {
        return () => clearTimer()
    }, [clearTimer])

    const fraction = 1 - secondsLeft / totalSeconds // 0 at start, 1 at end
    const isExpired = secondsLeft <= 0

    return { secondsLeft, isRunning, isExpired, fraction, pause, resume, reset }
}
