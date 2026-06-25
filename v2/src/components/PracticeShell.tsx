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
        const allIds = [id!, ...tnSiblingIds]
        Promise.all(
            allIds.map(pid =>
                fetch(API_URL + `/api/practices/${pid}`, { credentials: 'include' }).then(r => r.json())
            )
        ).then(results => {
            const [main, ...siblings] = results
            if (main.error) { setError(main.error); return }
            try {
                const mainData = decrypt(main)
                if (siblings.length > 0 && (mainData.type?.toLowerCase().includes('text-navigator') || mainData.type?.toLowerCase().includes('writing-map'))) {
                    const siblingData = siblings.map(decrypt)
                    const allItems = [mainData, ...siblingData]
                    mainData.content = {
                        level: mainData.content?.level,
                        part: mainData.content?.part,
                        writingPrompt: mainData.content?.writingPrompt,
                        tts: mainData.content?.tts,
                        sections: allItems.map((item: any) => ({
                            section: item.content?.section ?? item.type,
                            tree: item.content?.tree ?? {},
                        }))
                    }
                }
                setPractice(mainData)
            } catch (e: any) {
                setError(e.message)
            }
        }).catch(e => setError(e.message))
    }, [id, tnSiblingIds.join(',')])

    
    if (error) return <div className="practice-error">Error: {error}</div>
    if (!practice) return <div className="practice-loading">Loading...</div>
    
    const cleanType = practice.type.replace(/^p\d+-p\d+-/i, '').replace(/^p\d+-/i, '');
    
    if (cleanType === 'vocab-master') {
        return <VocabMasterShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'recall-map') {
        return <RecallMapShell data={practice.content} textbook={practice.textbook} unit={practice.unit} />
    }

    if (cleanType === 'vocab-guide') {
        return <VocabGuideShell data={practice.content} practiceId={practice.id} textbook={practice.textbook} unit={practice.unit} />
    }

    if (cleanType === 'spelling-hero') {
        return <SpellingHeroShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'sentence-architect') {
        return <SentenceArchitectShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'grammar-wizard') {
        return <GrammarWizardShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType.startsWith('passage-decoder')) {
        return <PassageDecoderShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'test' || cleanType.startsWith('test') || cleanType.endsWith('-test')) {
        return <TestSheetShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
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
