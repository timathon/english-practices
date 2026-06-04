import { useState, useEffect, useMemo } from 'react'
import { API_URL } from '../lib/auth'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'
import './IrregularVerbsModal.css'

interface Verb {
  infinitive: string;
  past_simple: string;
  past_participle: string;
  cn: string;
  pattern: string;
  group: string;
  memorization_hook: string;
}

interface IrregularVerbsModalProps {
  onClose: () => void;
}

export function IrregularVerbsModal({ onClose }: IrregularVerbsModalProps) {
  const [verbs, setVerbs] = useState<Verb[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPattern, setSelectedPattern] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')

  useEffect(() => {
    // Fetch General irregular-verbs practice
    fetch(API_URL + `/api/practices/GENERAL_irregular-verbs`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
          setLoading(false)
        } else {
          let content = data.content
          if (data.isEncrypted && typeof content === 'string') {
            try {
              content = decryptContent(content, OBSCURE_KEY)
            } catch (decErr) {
              console.error("Decryption failed:", decErr)
              setError("Failed to decrypt irregular verbs data.")
              setLoading(false)
              return
            }
          }
          
          if (Array.isArray(content)) {
            // Sort alphabetically by infinitive
            const sorted = [...content].sort((a: Verb, b: Verb) => 
              a.infinitive.localeCompare(b.infinitive, 'en', { sensitivity: 'base' })
            )
            setVerbs(sorted)
          } else {
            setError("Invalid verbs data format.")
          }
          setLoading(false)
        }
      })
      .catch(e => {
        console.error(e)
        setError("Failed to connect to the server: " + e.message)
        setLoading(false)
      })
  }, [])

  // Extract unique patterns and groups dynamically
  const uniquePatterns = useMemo(() => {
    const set = new Set(verbs.map(v => v.pattern))
    return Array.from(set).sort()
  }, [verbs])

  const uniqueGroups = useMemo(() => {
    const set = new Set(verbs.map(v => v.group))
    return Array.from(set).sort()
  }, [verbs])

  // Filtered verbs
  const filteredVerbs = useMemo(() => {
    return verbs.filter(v => {
      const matchesSearch = 
        v.infinitive.toLowerCase().includes(search.toLowerCase()) ||
        v.past_simple.toLowerCase().includes(search.toLowerCase()) ||
        v.past_participle.toLowerCase().includes(search.toLowerCase()) ||
        v.cn.includes(search);
      
      const matchesPattern = !selectedPattern || v.pattern === selectedPattern;
      const matchesGroup = !selectedGroup || v.group === selectedGroup;

      return matchesSearch && matchesPattern && matchesGroup;
    });
  }, [verbs, search, selectedPattern, selectedGroup])

  return (
    <div className="iv-modal-overlay" onClick={onClose}>
      <div className="iv-modal-content" onClick={e => e.stopPropagation()}>
        <div className="iv-modal-header">
          <h3 className="iv-modal-title">📘 Irregular Verbs List (不规则动词表)</h3>
          <button className="iv-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="iv-filters-row">
          <input
            type="text"
            className="iv-search-input"
            placeholder="Search verbs or Chinese..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="iv-filter-select"
            value={selectedPattern}
            onChange={e => setSelectedPattern(e.target.value)}
          >
            <option value="">All Patterns</option>
            {uniquePatterns.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            className="iv-filter-select"
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
          >
            <option value="">All Groups</option>
            {uniqueGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {!loading && !error && (
            <div className="iv-stats-badge">
              Showed {filteredVerbs.length} of {verbs.length} verbs
            </div>
          )}
        </div>

        <div className="iv-table-area">
          {loading && (
            <div className="iv-state-container">
              <div className="iv-spinner"></div>
              <div>Retrieving irregular verbs from database...</div>
            </div>
          )}

          {error && (
            <div className="iv-state-container" style={{ color: '#d73a49' }}>
              <div>⚠️ Error loading irregular verbs.</div>
              <div style={{ marginTop: 8, fontSize: '0.85rem' }}>{error}</div>
            </div>
          )}

          {!loading && !error && filteredVerbs.length === 0 && (
            <div className="iv-state-container">
              <div>🔍 No irregular verbs matched your filters.</div>
            </div>
          )}

          {!loading && !error && filteredVerbs.length > 0 && (
            <table className="iv-table">
              <thead>
                <tr>
                  <th>Infinitive</th>
                  <th>Past Simple</th>
                  <th>Past Participle</th>
                  <th>Meaning</th>
                  <th>Pattern</th>
                  <th>Group</th>
                  <th>Mnemonic (助记)</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerbs.map((v, i) => (
                  <tr key={i}>
                    <td className="iv-verb-cell" style={{ color: 'var(--accent, #0366d6)' }}>{v.infinitive}</td>
                    <td className="iv-verb-cell">{v.past_simple}</td>
                    <td className="iv-verb-cell">{v.past_participle}</td>
                    <td style={{ fontWeight: 500 }}>{v.cn}</td>
                    <td>
                      <span className="iv-pat-badge">{v.pattern}</span>
                    </td>
                    <td>
                      <span className="iv-group-badge">{v.group}</span>
                    </td>
                    <td className="iv-hook-text">{v.memorization_hook}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
