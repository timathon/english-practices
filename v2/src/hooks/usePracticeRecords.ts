import { useState, useEffect, useRef, useCallback } from 'react'
import { cache } from '../lib/cache'
import { API_URL } from '../lib/auth'
import { syncQueue } from '../lib/syncQueue'

interface UsePracticeRecordsProps {
    practiceId: string;
}

export function usePracticeRecords({ practiceId }: UsePracticeRecordsProps) {
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)

    const processPendingSyncs = useCallback(async () => {
        await syncQueue.processQueue(false);
    }, []);

    const loadRecords = useCallback(async () => {
        try {
            const cached = cache.getRecords()
            if (cached && cached.length > 0) {
                setPracticeRecords(cached)
            }
            await processPendingSyncs()
            const res = await fetch(API_URL + '/api/records', { credentials: 'include' })
            const json = await res.json()
            if (Array.isArray(json)) {
                cache.setRecords(json)
                setPracticeRecords(json)
            }
        } catch (e) {
            console.warn("Failed to load records in usePracticeRecords (offline mode)", e)
            const cached = cache.getRecords()
            if (cached) setPracticeRecords(cached)
        }
    }, [practiceId, processPendingSyncs])

    useEffect(() => {
        loadRecords()
        const handleOnline = () => { processPendingSyncs(); }
        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [loadRecords, processPendingSyncs])

    const syncRecord = useCallback(async (challengeTitle: string, scorePercent: number, isFinished: boolean) => {
        const unitName = `${practiceId} (${challengeTitle})`
        const nowIso = new Date().toISOString()

        try {
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
                        unit: unitName,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: nowIso
                    })
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
                        unit: unitName,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: nowIso
                    })
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
                            createdAt: nowIso,
                            updatedAt: nowIso
                        } as any)
                        return j.id as string
                    }
                    throw new Error("Failed to create record")
                })()

                recordIdPromiseRef.current = postPromise
                await postPromise
            }
            setPracticeRecords([...(cache.getRecords() || [])])
        } catch (e) {
            console.warn("Failed to sync record", e)
            setPracticeRecords([...(cache.getRecords() || [])])
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
