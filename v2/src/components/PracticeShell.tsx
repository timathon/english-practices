import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL } from '../lib/auth'
import { VocabMasterShell } from './VocabMasterShell'
import { RecallMapShell } from './RecallMapShell'
import { VocabGuideShell } from './VocabGuideShell'
import { SpellingHeroShell } from './SpellingHeroShell'
import { MindMapShell } from './MindMapShell'
import { SentenceArchitectShell } from './SentenceArchitectShell'
import { GrammarWizardShell } from './GrammarWizardShell'
import { PassageDecoderShell } from './PassageDecoderShell'


// Render practice components based on type
export function PracticeShell() {
    const { id } = useParams()
    const [practice, setPractice] = useState<any>(null)
    const [error, setError] = useState('')
    
    useEffect(() => {
        fetch(API_URL + `/api/practices/${id}`, { credentials: 'include' })
           .then(res => res.json())
           .then(data => {
               if (data.error) setError(data.error)
               else setPractice(data)
           })
           .catch(e => setError(e.message))
    }, [id])
    
    if (error) return <div className="practice-error">Error: {error}</div>
    if (!practice) return <div className="practice-loading">Loading...</div>
    
    const cleanType = practice.type.replace(/^p\d+-p\d+-/i, '').replace(/^p\d+-/i, '');
    
    if (cleanType === 'vocab-master') {
        return <VocabMasterShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'recall-map') {
        return <RecallMapShell data={practice.content} />
    }

    if (cleanType === 'vocab-guide') {
        return <VocabGuideShell data={practice.content} practiceId={practice.id} textbook={practice.textbook} />
    }

    if (cleanType === 'spelling-hero') {
        return <SpellingHeroShell data={practice.content} practiceId={practice.id} textbook={practice.textbook} />
    }

    if (cleanType === 'sentence-architect') {
        return <SentenceArchitectShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'grammar-wizard') {
        return <GrammarWizardShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (cleanType === 'passage-decoder') {
        return <PassageDecoderShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }


    if (cleanType.startsWith('text-navigator') || cleanType.startsWith('writing-map')) {
        const isWritingMap = cleanType.startsWith('writing-map')
        return <MindMapShell data={practice.content} textbook={practice.textbook} isWritingMap={isWritingMap} />
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
