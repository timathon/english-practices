import { useState, useEffect, useRef, useCallback } from 'react'
import { cache } from '../lib/cache'
import { API_URL } from '../lib/auth'

interface UsePracticeRecordsProps {
    practiceId: string;
}

export function usePracticeRecords({ practiceId }: UsePracticeRecordsProps) {
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)

    const loadRecords = useCallback(async () => {
        try {
            const cached = cache.getRecords()
            if (cached) {
                setPracticeRecords(cached)
            }
            const res = await fetch(API_URL + '/api/records', { credentials: 'include' })
            const json = await res.json()
            if (Array.isArray(json)) {
                cache.setRecords(json)
                setPracticeRecords(json)
            }
        } catch (e) {
            console.error("Failed to load records in usePracticeRecords", e)
        }
    }, [practiceId])

    useEffect(() => {
        loadRecords()
    }, [loadRecords])

    const syncRecord = useCallback(async (challengeTitle: string, scorePercent: number, isFinished: boolean) => {
        try {
            const unitName = `${practiceId} (${challengeTitle})`
            
            if (activeRecordId) {
                const res = await fetch(`${API_URL}/api/records/${activeRecordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: unitName,
                        score: scorePercent,
                        unfinished: !isFinished
                    })
                })
                const j = await res.json()
                if (j.success) {
                    cache.updateRecord({
                        id: activeRecordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    })
                    setPracticeRecords([...(cache.getRecords() || [])])
                }
            } else if (recordIdPromiseRef.current) {
                const recordId = await recordIdPromiseRef.current
                const res = await fetch(`${API_URL}/api/records/${recordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: unitName,
                        score: scorePercent,
                        unfinished: !isFinished
                    })
                })
                const j = await res.json()
                if (j.success) {
                    cache.updateRecord({
                        id: recordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    })
                    setPracticeRecords([...(cache.getRecords() || [])])
                }
            } else {
                const postPromise = (async () => {
                    const res = await fetch(`${API_URL}/api/records`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            unit: unitName,
                            score: scorePercent,
                            unfinished: !isFinished
                        })
                    })
                    const j = await res.json()
                    if (j.success && j.id) {
                        setActiveRecordId(j.id)
                        cache.updateRecord({
                            id: j.id,
                            unit: unitName,
                            score: scorePercent,
                            unfinished: !isFinished,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        } as any)
                        setPracticeRecords([...(cache.getRecords() || [])])
                        return j.id as string
                    }
                    throw new Error("Failed to create record")
                })()

                recordIdPromiseRef.current = postPromise
                await postPromise
            }
        } catch (e) {
            console.error("Failed to sync record in usePracticeRecords", e)
        }
    }, [practiceId, activeRecordId])

    const getStats = useCallback((challengeTitle: string) => {
        const u = `${practiceId} (${challengeTitle})`
        const logs = practiceRecords.filter(r => r.unit === u && !r.unfinished)

        const todayStr = new Date().toLocaleDateString()
        const todayLogs = logs.filter(r => new Date(r.createdAt).toLocaleDateString() === todayStr)

        const todayBest = todayLogs.length > 0 ? Math.max(...todayLogs.map(t => t.score)) : 0
        const lifeBest = logs.length > 0 ? Math.max(...logs.map(t => t.score)) : 0

        return {
            todayRuns: todayLogs.length,
            todayBest,
            lifeRuns: logs.length,
            lifeBest,
            todayLogs,
            lifeLogs: logs
        }
    }, [practiceId, practiceRecords])

    return {
        practiceRecords,
        setPracticeRecords,
        activeRecordId,
        setActiveRecordId,
        recordIdPromiseRef,
        loadRecords,
        syncRecord,
        getStats
    }
}
