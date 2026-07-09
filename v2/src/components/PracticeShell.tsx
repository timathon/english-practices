import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { API_URL } from '../lib/auth'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'
import { VocabMasterShell } from './VocabMasterShell'
import { RecallMapShell } from './RecallMapShell'
import { VocabGuideShell } from './VocabGuideShell'
import { SpellingHeroShell } from './SpellingHeroShell'
import { TextNavigatorShell } from './TextNavigatorShell'
import { WritingMapShell } from './WritingMapShell'
import { SentenceArchitectShell } from './SentenceArchitectShell'
import { GrammarWizardShell } from './GrammarWizardShell'
import { PassageDecoderShell } from './PassageDecoderShell'
import { TestSheetShell } from './TestSheetShell'
import { AudioDetectiveShell } from './AudioDetectiveShell'
import { BugHunterShell } from './BugHunterShell'

import { practiceCache } from '../lib/practiceCache'
import { cache } from '../lib/cache'


// Render practice components based on type
export function PracticeShell() {
    const { id } = useParams()
    const location = useLocation()
    const tnSiblingIds: string[] = (location.state as any)?.tnSiblingIds || []
    const [practice, setPractice] = useState<any>(null)
    const [error, setError] = useState('')

    const decrypt = (data: any) => {
        if (data.isEncrypted && typeof data.content === 'string') {
            try {
                data.content = decryptContent(data.content, OBSCURE_KEY)
            } catch (decErr: any) {
                console.error('Decryption failed:', decErr)
                throw new Error('Failed to decrypt practice content.')
            }
        }
        return data
    }

    useEffect(() => {
        let active = true
        const controller = new AbortController()
        const { signal } = controller
        const isAudioDetective = id?.endsWith('-ad')
        const realMainId = isAudioDetective ? id!.replace(/-ad$/, '') : id!
        const allIds = [realMainId, ...tnSiblingIds]
        let currentRawDataStr = ''

        const processResults = (results: any[]) => {
            const [main, ...siblings] = results
            if (main.error) { setError(main.error); return null }
            try {
                const mainData = JSON.parse(JSON.stringify(main))
                const decryptedMain = decrypt(mainData)
                if (isAudioDetective) {
                    decryptedMain.type = 'audio-detective';
                    decryptedMain.title = 'Audio Detective';
                    decryptedMain.id = id; // keep original suffix so records save separately
                }
                if (siblings.length > 0 && (decryptedMain.type?.toLowerCase().includes('text-navigator') || decryptedMain.type?.toLowerCase().includes('writing-map'))) {
                    const validSiblings = siblings.filter(s => s && !s.error && s.content)
                    const siblingData = validSiblings.map(s => decrypt(JSON.parse(JSON.stringify(s))))
                    const allItems = [decryptedMain, ...siblingData]
                    decryptedMain.content = {
                        level: decryptedMain.content?.level,
                        part: decryptedMain.content?.part,
                        writingPrompt: decryptedMain.content?.writingPrompt,
                        tts: decryptedMain.content?.tts,
                        sections: allItems.map((item: any) => ({
                            section: item.content?.section ?? item.type,
                            tree: item.content?.tree ?? {},
                        }))
                    }
                }
                return decryptedMain
            } catch (e: any) {
                setError(e.message)
                return null
            }
        }

        const triggerPrefetchUnitPractices = async (mainPracticeData: any) => {
            if (!mainPracticeData || !mainPracticeData.textbook || !mainPracticeData.unit) return

            try {
                let allPractices = cache.getPractices()
                if (!allPractices) {
                    const res = await fetch(API_URL + '/api/practices', { credentials: 'include', signal })
                    const data = await res.json()
                    if (Array.isArray(data)) {
                        cache.setPractices(data)
                        allPractices = data
                    }
                }

                if (!allPractices || !Array.isArray(allPractices)) return

                const siblings = allPractices.filter(
                    (p: any) =>
                        p.textbook === mainPracticeData.textbook &&
                        p.unit === mainPracticeData.unit &&
                        p.id !== mainPracticeData.id &&
                        !allIds.includes(p.id)
                )

                const prefetchTask = async () => {
                    for (const sibling of siblings) {
                        if (!active) break
                        try {
                            const cached = await practiceCache.get(sibling.id)
                            if (!cached) {
                                const res = await fetch(API_URL + `/api/practices/${sibling.id}`, { credentials: 'include', signal })
                                const resData = await res.json()
                                if (resData && !resData.error) {
                                    await practiceCache.set(sibling.id, resData)
                                }
                            }
                        } catch (e) {
                            console.warn(`Failed to prefetch sibling practice ${sibling.id}:`, e)
                        }
                    }
                }

                if ('requestIdleCallback' in window) {
                    (window as any).requestIdleCallback(() => prefetchTask())
                } else {
                    setTimeout(prefetchTask, 1500)
                }
            } catch (err) {
                console.warn('Failed to resolve unit practices list:', err)
            }
        }

        // 1. Try to load from cache
        Promise.all(allIds.map(pid => practiceCache.get(pid))).then(cachedResults => {
            if (!active) return
            if (cachedResults.every(item => item !== null)) {
                currentRawDataStr = JSON.stringify(cachedResults)
                const processed = processResults(cachedResults)
                if (processed) {
                    setPractice(processed)
                    triggerPrefetchUnitPractices(processed)
                }
            }
        })

        // 2. Fetch from network in background/parallel and update cache
        Promise.all(
            allIds.map(pid =>
                fetch(API_URL + `/api/practices/${pid}`, { credentials: 'include', signal }).then(r => r.json())
            )
        ).then(async (fetchedResults) => {
            if (!active) return

            const [main] = fetchedResults
            if (main.error) {
                if (!currentRawDataStr) {
                    setError(main.error)
                }
                return
            }

            const fetchedStr = JSON.stringify(fetchedResults)
            if (fetchedStr !== currentRawDataStr) {
                currentRawDataStr = fetchedStr
                await Promise.all(allIds.map((pid, idx) => practiceCache.set(pid, fetchedResults[idx])))
                const processed = processResults(fetchedResults)
                if (processed) {
                    setPractice(processed)
                    triggerPrefetchUnitPractices(processed)
                }
            } else {
                const processed = processResults(fetchedResults)
                if (processed) {
                    triggerPrefetchUnitPractices(processed)
                }
            }
        }).catch(e => {
            if (!active || e.name === 'AbortError') return
            if (!currentRawDataStr) {
                setError(e.message)
            }
        })

        return () => {
            active = false
            controller.abort()
        }
    }, [id, tnSiblingIds.join(',')])


    if (error) return <div className="practice-error">Error: {error}</div>
    if (!practice) return <div className="practice-loading">Loading...</div>

    const cleanType = practice.type.replace(/^p\d+-p\d+-/i, '').replace(/^p\d+-/i, '');

    if (cleanType.startsWith('vocab-master')) {
        return <VocabMasterShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType.startsWith('recall-map')) {
        return <RecallMapShell data={practice.content} textbook={practice.textbook} unit={practice.unit} />
    }

    if (cleanType.startsWith('vocab-guide')) {
        return <VocabGuideShell data={practice.content} practiceId={practice.id} textbook={practice.textbook} unit={practice.unit} />
    }

    if (cleanType.startsWith('spelling-hero')) {
        return <SpellingHeroShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType.startsWith('sentence-architect')) {
        return <SentenceArchitectShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType.startsWith('grammar-wizard')) {
        return <GrammarWizardShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType.startsWith('passage-decoder')) {
        return <PassageDecoderShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType.startsWith('audio-detective')) {
        return <AudioDetectiveShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'test' || cleanType.startsWith('test') || cleanType.endsWith('-test')) {
        return <TestSheetShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'bug-hunter' || cleanType.endsWith('bug-hunter')) {
        return <BugHunterShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }


    if (cleanType.startsWith('text-navigator')) {
        return <TextNavigatorShell data={practice.content} textbook={practice.textbook} unit={practice.unit} />
    }

    if (cleanType.startsWith('writing-map')) {
        return <WritingMapShell data={practice.content} textbook={practice.textbook} unit={practice.unit} />
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>{practice.title}</h2>
            <div style={{ background: '#ffebee', padding: 20, borderRadius: 8, color: '#c62828', marginBottom: 20 }}>
                <strong>Component Not Ready</strong><br />
                The interactive shell wrapper for type <code>{practice.type}</code> (cleaned: <code>{cleanType}</code>) has not been built yet.
            </div>
            <pre style={{ background: '#f5f5f5', padding: 15, borderRadius: 8, overflow: 'auto' }}>
                {JSON.stringify(practice.content, null, 2)}
            </pre>
        </div>
    )
}
