import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { VocabMasterShell } from './VocabMasterShell'
import { RecallMapShell } from './RecallMapShell'

export function PracticeShell() {
    const { id } = useParams()
    const [practice, setPractice] = useState<any>(null)
    const [error, setError] = useState('')
    
    useEffect(() => {
        fetch((import.meta.env.VITE_API_URL || 'http://localhost:8787') + `/api/practices/${id}`, { credentials: 'include' })
           .then(res => res.json())
           .then(data => {
               if (data.error) setError(data.error)
               else setPractice(data)
           })
           .catch(e => setError(e.message))
    }, [id])
    
    if (error) return <div className="practice-error">Error: {error}</div>
    if (!practice) return <div className="practice-loading">Loading...</div>
    
    if (practice.type === 'vocab-master') {
        return <VocabMasterShell data={practice.content} practiceId={practice.id} unit={practice.unit} textbook={practice.textbook} />
    }

    if (practice.type === 'recall-map') {
        return <RecallMapShell data={practice.content} practiceId={practice.id} />
    }
    
    return (
        <div style={{ padding: 20 }}>
            <h2>{practice.title}</h2>
            <div style={{ background: '#ffebee', padding: 20, borderRadius: 8, color: '#c62828', marginBottom: 20 }}>
                <strong>Component Not Ready</strong><br />
                The interactive shell wrapper for type <code>{practice.type}</code> has not been built yet.
            </div>
            <pre style={{ background: '#f5f5f5', padding: 15, borderRadius: 8, overflow: 'auto' }}>
                {JSON.stringify(practice.content, null, 2)}
            </pre>
        </div>
    )
}
