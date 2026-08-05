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



    const processPendingSyncs = useCallback(async () => {
        const pendingList = cache.getPendingSyncs();
        if (!pendingList || pendingList.length === 0) return;

        for (const item of pendingList) {
            try {
                if (item.recordId) {
                    const res = await fetch(`${API_URL}/api/records/${item.recordId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            unit: item.unit,
                            score: item.score,
                            unfinished: item.unfinished
                        })
                    });
                    if (res.ok) {
                        cache.removePendingSync(item.recordId);
                    }
                } else {
                    const res = await fetch(`${API_URL}/api/records`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            unit: item.unit,
                            score: item.score,
                            unfinished: item.unfinished
                        })
                    });
                    const j = await res.json();
                    if (j.success && j.id) {
                        cache.removePendingSync(item.tempId);
                        cache.updateRecord({ id: j.id, unit: item.unit, score: item.score, unfinished: item.unfinished });
                    }
                }
            } catch (e) {
                // Network still failing, keep in pending sync queue
                break;
            }
        }
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

        // Always update local cache immediately so score is never lost UI-side
        const currentTargetId = activeRecordId || (recordIdPromiseRef.current ? null : null);
        const tempId = currentTargetId || `temp_${Date.now()}`;
        cache.updateRecord({
            id: currentTargetId || tempId,
            unit: unitName,
            score: scorePercent,
            unfinished: !isFinished,
            createdAt: nowIso,
            updatedAt: nowIso
        } as any);
        setPracticeRecords([...(cache.getRecords() || [])]);

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
                    cache.removePendingSync(activeRecordId)
                } else {
                    cache.addPendingSync({ tempId, recordId: activeRecordId, unit: unitName, score: scorePercent, unfinished: !isFinished, timestamp: nowIso })
                }
            } else if (recordIdPromiseRef.current) {
                let recordId: string | null = null;
                try {
                    recordId = await recordIdPromiseRef.current
                } catch (err) {}

                if (recordId) {
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
                        cache.removePendingSync(recordId)
                    } else {
                        cache.addPendingSync({ tempId, recordId, unit: unitName, score: scorePercent, unfinished: !isFinished, timestamp: nowIso })
                    }
                } else {
                    cache.addPendingSync({ tempId, recordId: null, unit: unitName, score: scorePercent, unfinished: !isFinished, timestamp: nowIso })
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
                        setPracticeRecords([...(cache.getRecords() || [])])
                        cache.removePendingSync(tempId)
                        return j.id as string
                    }
                    throw new Error("Failed to create record")
                })()

                recordIdPromiseRef.current = postPromise
                await postPromise
            }
        } catch (e) {
            console.warn("Network issue while syncing record, queued in offline pending syncs", e)
            cache.addPendingSync({
                tempId,
                recordId: activeRecordId,
                unit: unitName,
                score: scorePercent,
                unfinished: !isFinished,
                timestamp: nowIso
            })
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
