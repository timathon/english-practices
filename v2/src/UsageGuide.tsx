import { useState } from 'react'
import './UsageGuide.css'

export function UsageGuide() {
  const [activeTab, setActiveTab] = useState<'welcome' | 'vocab' | 'grammar' | 'mistakes' | 'pet'>('welcome')
  
  // State for Spelling Hero interactive demo
  const [spellingProgress, setSpellingProgress] = useState<string[]>([])
  const spellingOptions = ['b', 'oa', 't', 'ee', 'p']
  
  const handleSpellingClick = (chunk: string) => {
    if (spellingProgress.includes(chunk)) {
      setSpellingProgress(spellingProgress.filter(c => c !== chunk))
    } else {
      // Add in correct logical order for demo simplicity
      if (chunk === 'b' && spellingProgress.length === 0) {
        setSpellingProgress(['b'])
      } else if (chunk === 'oa' && spellingProgress.length === 1 && spellingProgress[0] === 'b') {
        setSpellingProgress(['b', 'oa'])
      } else if (chunk === 't' && spellingProgress.length === 2 && spellingProgress[1] === 'oa') {
        setSpellingProgress(['b', 'oa', 't'])
      }
    }
  }

  const resetSpelling = () => setSpellingProgress([])

  // State for Sentence Architect interactive demo
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const correctSentence = ['She', 'is', 'reading', 'a', 'book.']
  const noiseWords = ['are', 'read']

  const handleWordClick = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word))
    } else {
      setSelectedWords([...selectedWords, word])
    }
  }

  const resetSentence = () => setSelectedWords([])

  // State for Pet Companion interactive demo
  const [petLevel, setPetLevel] = useState(3)
  const [petExp, setPetExp] = useState(40)
  const [petHunger, setPetHunger] = useState(70)
  const [petEnergy, setPetEnergy] = useState(85)
  const [petActionText, setPetActionText] = useState('Happy to study with you!')

  const handleFeedPet = () => {
    setPetHunger(prev => Math.min(100, prev + 15))
    setPetExp(prev => {
      const nextExp = prev + 5
      if (nextExp >= 100) {
        setPetLevel(l => l + 1)
        setPetActionText('⭐ Level Up! Your companion is evolving!')
        return 0
      }
      setPetActionText('😋 Yummy! Phonics cookies are delicious!')
      return nextExp
    })
  }

  const handlePlayPet = () => {
    setPetEnergy(prev => Math.max(10, prev - 10))
    setPetHunger(prev => Math.max(10, prev - 5))
    setPetExp(prev => {
      const nextExp = prev + 15
      if (nextExp >= 100) {
        setPetLevel(l => l + 1)
        setPetActionText('⭐ Level Up! Your companion is evolving!')
        return 0
      }
      setPetActionText('🎮 Wheee! Learning grammar is fun!')
      return nextExp
    })
  }

  return (
    <div className="ug-container">
      {/* Premium Header */}
      <div className="ug-header">
        <div className="ug-header-content">
          <h2 className="ug-title">Game Manual</h2>
          <p className="ug-subtitle">
            Welcome to the interactive companion manual. Learn how to master reading, vocabulary, spelling, and grammar rules using the tailored study tools in the v2 app.
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="ug-layout">
        {/* Navigation Sidebar */}
        <div className="ug-sidebar">
          <button 
            className={`ug-sidebar-btn ${activeTab === 'welcome' ? 'active' : ''}`}
            onClick={() => setActiveTab('welcome')}
          >
            <span className="icon">👋</span>
            <span>Quick Start</span>
          </button>
          
          <button 
            className={`ug-sidebar-btn ${activeTab === 'vocab' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocab')}
          >
            <span className="icon">📚</span>
            <span>Vocabulary & Phonics</span>
          </button>

          <button 
            className={`ug-sidebar-btn ${activeTab === 'grammar' ? 'active' : ''}`}
            onClick={() => setActiveTab('grammar')}
          >
            <span className="icon">🏗️</span>
            <span>Sentences & Grammar</span>
          </button>

          <button 
            className={`ug-sidebar-btn ${activeTab === 'mistakes' ? 'active' : ''}`}
            onClick={() => setActiveTab('mistakes')}
          >
            <span className="icon">📓</span>
            <span>Mistake Book</span>
          </button>

          <button 
            className={`ug-sidebar-btn ${activeTab === 'pet' ? 'active' : ''}`}
            onClick={() => setActiveTab('pet')}
          >
            <span className="icon">👾</span>
            <span>Virtual Pet Companion</span>
          </button>
        </div>

        {/* Dynamic Content Pane */}
        <div className="ug-content">
          {activeTab === 'welcome' && (
            <>
              <div>
                <h3 className="ug-section-title">🌟 Welcome to English Practices v2</h3>
                <p className="ug-section-intro">
                  This application is designed to convert standard curriculum textbook units into highly engaging, interactive cognitive tasks.
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card" onClick={() => setActiveTab('vocab')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📚</span>
                    <h4 className="ug-card-title">Vocabulary mastery</h4>
                  </div>
                  <p className="ug-card-desc">
                    Extract vocabulary lists, review standard UK pronunciation rules, practice phonics-based spelling, and take translation challenges.
                  </p>
                  <span className="ug-card-badge">3 Practice Types</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('grammar')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🏗️</span>
                    <h4 className="ug-card-title">Syntax & structure</h4>
                  </div>
                  <p className="ug-card-desc">
                    Deconstruct sentences block-by-block, identify grammar purposes and rules, verify comprehension questions, and build model essays.
                  </p>
                  <span className="ug-card-badge">4 Practice Types</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('mistakes')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📓</span>
                    <h4 className="ug-card-title">Mistake Book</h4>
                  </div>
                  <p className="ug-card-desc">
                    Review logged mistakes across all shell practices in real-time. Toggle solved filters, review single items, or review a whole unit dynamically.
                  </p>
                  <span className="ug-card-badge">Local-first sync</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('pet')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">👾</span>
                    <h4 className="ug-card-title">Gamified motivation</h4>
                  </div>
                  <p className="ug-card-desc">
                    Grow a virtual study pet! Earn experience and rewards by finishing assignments, and watch your companion react to your performance.
                  </p>
                  <span className="ug-card-badge">Interactive Widget</span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-h)' }}>📈 Navigating the Dashboard</h4>
                <ul className="ug-list">
                  <li className="ug-list-item">
                    <strong>Weekly Activity Tracker:</strong> Displays a high-fidelity combined bar-and-line chart showing your practice frequency and score trends.
                  </li>
                  <li className="ug-list-item">
                    <strong>Practice History Tab:</strong> Review exact timestamps, duration spent, and scores of completed exercises for any textbook.
                  </li>
                  <li className="ug-list-item">
                    <strong>Book Sections:</strong> Switch between units of a textbook and see your progress visualizer, including color-coded completion badges.
                  </li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'vocab' && (
            <>
              <div>
                <h3 className="ug-section-title">📚 Vocabulary & Phonics Tools</h3>
                <p className="ug-section-intro">
                  Master phonetic sounds, spelling chunks, and semantic usage through three primary practice structures.
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📖</span>
                    <h4 className="ug-card-title">Vocab Guide</h4>
                  </div>
                  <p className="ug-card-desc">
                    A study sheet extracted from unit vocabulary. It details the page source, standard UK IPA, syllable categories (e.g. VCe, Closed), phoneme comparisons (distractor pairs), and creative Chinese mnemonics (memorization hooks).
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🔥</span>
                    <h4 className="ug-card-title">Vocab Master</h4>
                  </div>
                  <p className="ug-card-desc">
                    A challenge of 10-question tests spanning three categories: Cloze (fill-in-the-blanks with contextual hints for ambiguous items), Chinese-to-English translation, and English-to-Chinese selection.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">⚡</span>
                    <h4 className="ug-card-title">Spelling Hero</h4>
                  </div>
                  <p className="ug-card-desc">
                    Interactive spelling puzzles. Single-syllable words are split into grapheme phonics chunks (e.g., b-oa-t), whereas multi-syllable words are split by syllables (e.g., an-i-mal).
                  </p>
                </div>
              </div>

              {/* Interactive Phonics Spelling Demo */}
              <div className="ug-demo-block">
                <h4 className="ug-demo-title">🎮 Spelling Hero Demo: Build the word "boat"</h4>
                <div className="ug-demo-window">
                  <div className="ug-preview-spelling">
                    {spellingProgress.length > 0 ? spellingProgress.join(' ') : '✏️ _ _ _'}
                  </div>
                  <div className="ug-preview-word-chunks">
                    {spellingOptions.map((opt, i) => (
                      <button 
                        key={i} 
                        className={`ug-chunk-btn ${spellingProgress.includes(opt) ? 'selected' : ''}`}
                        onClick={() => handleSpellingClick(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    {spellingProgress.length === 3 ? (
                      <span style={{ color: 'var(--tab-active-text)', fontWeight: 'bold' }}>🎉 Correct! Phonics chunks combined!</span>
                    ) : spellingProgress.length > 0 ? (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>Select the next chunk in order...</span>
                    ) : (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>Click chunks below to spell the word.</span>
                    )}
                    {spellingProgress.length > 0 && (
                      <button 
                        onClick={resetSpelling} 
                        style={{ marginLeft: 12, padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'grammar' && (
            <>
              <div>
                <h3 className="ug-section-title">🏗️ Sentences & Grammar Tools</h3>
                <p className="ug-section-intro">
                  Explore unit structure, grammar rules, reading passages, and writing models with modern UI frameworks.
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🗺️</span>
                    <h4 className="ug-card-title">Recall Map</h4>
                  </div>
                  <p className="ug-card-desc">
                    A hierarchical mindmap outlining unit stories into memory keys, categorizing key vocabulary parts-of-speech, and displaying core grammar structures for study.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧱</span>
                    <h4 className="ug-card-title">Sentence Architect</h4>
                  </div>
                  <p className="ug-card-desc">
                    Reconstruct key sentences from individual word blocks. You must filter out decoy "noise" blocks and arrange the blocks correctly. It recognizes natural variations in word order.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧙‍♂️</span>
                    <h4 className="ug-card-title">Grammar Wizard</h4>
                  </div>
                  <p className="ug-card-desc">
                    Multiple-choice quiz challenges verifying rules in five cognitive layers: Purpose, Definition, Formation, Usage, and Differentiation. Includes detailed Chinese explanations.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧭</span>
                    <h4 className="ug-card-title">Text Navigator</h4>
                  </div>
                  <p className="ug-card-desc">
                    An interactive path builder that breaks down reading passages sentence-by-sentence. Integrates true/false grammar checks, vocabulary notes, and keyword prompts.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📖</span>
                    <h4 className="ug-card-title">Passage Decoder</h4>
                  </div>
                  <p className="ug-card-desc">
                    Deconstruct reading passages or dialogues sentence-by-sentence. Read the English lines and pick the correct translation from three options with subtle traps.
                  </p>
                </div>
              </div>

              {/* Interactive Sentence Architect Demo */}
              <div className="ug-demo-block">
                <h4 className="ug-demo-title">🎮 Sentence Architect Demo: Arrange blocks to build "She is reading a book."</h4>
                <div className="ug-demo-window">
                  <div style={{ minHeight: 40, borderBottom: '1px dashed var(--border)', paddingBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedWords.length > 0 ? (
                      selectedWords.map((w, i) => (
                        <span key={i} className="ug-word-block" onClick={() => handleWordClick(w)}>
                          {w}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text)', fontStyle: 'italic', fontSize: '0.85rem' }}>Arrange blocks from the tray...</span>
                    )}
                  </div>

                  <div className="ug-preview-blocks">
                    {correctSentence.map((w, i) => (
                      <button 
                        key={i} 
                        className="ug-word-block" 
                        disabled={selectedWords.includes(w)} 
                        onClick={() => handleWordClick(w)}
                      >
                        {w}
                      </button>
                    ))}
                    {noiseWords.map((w, i) => (
                      <button 
                        key={`n-${i}`} 
                        className="ug-word-block noise" 
                        disabled={selectedWords.includes(w)}
                        onClick={() => handleWordClick(w)}
                        title="Decoy noise block!"
                      >
                        {w}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    {JSON.stringify(selectedWords) === JSON.stringify(correctSentence) ? (
                      <span style={{ color: 'var(--tab-active-text)', fontWeight: 'bold' }}>🎉 Correct! Structure matches exactly.</span>
                    ) : selectedWords.some(w => noiseWords.includes(w)) ? (
                      <span style={{ color: '#cb2431', fontWeight: 'bold' }}>⚠️ Oops! You included a decoy block. Click it to remove.</span>
                    ) : selectedWords.length > 0 ? (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>Keep building...</span>
                    ) : (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>Avoid red decoy blocks. Click blocks in the tray.</span>
                    )}
                    {selectedWords.length > 0 && (
                      <button 
                        onClick={resetSentence} 
                        style={{ marginLeft: 12, padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'mistakes' && (
            <>
              <div>
                <h3 className="ug-section-title">📓 Mistake Book (错题本)</h3>
                <p className="ug-section-intro">
                  A premium local-first review equipment that automatically logs questions you answered incorrectly across any practice shell.
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">⚡</span>
                    <h4 className="ug-card-title">Real-time Logging</h4>
                  </div>
                  <p className="ug-card-desc">
                    Any incorrect attempt is immediately saved in the browser's local cache so there is zero gameplay lag, and synced to the secure Cloudflare D1 database.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">✅</span>
                    <h4 className="ug-card-title">Solved Question Marker</h4>
                  </div>
                  <p className="ug-card-desc">
                    When you review a mistake and answer it correctly, it is marked as solved and can be filtered out. It is not permanently deleted, letting you re-practice later.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🔄</span>
                    <h4 className="ug-card-title">Show/Hide Filter</h4>
                  </div>
                  <p className="ug-card-desc">
                    Toggle the "Show resolved" switch in the sidebar to review all past mistakes or hide solved ones to keep your practice book clean.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">✏️</span>
                    <h4 className="ug-card-title">Quick Review</h4>
                  </div>
                  <p className="ug-card-desc">
                    Launch "Quick Review All" or "Review Unit" to go through your active mistakes. Correct answers resolve the item, while wrong answers recycle it to the back.
                  </p>
                </div>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-h)' }}>💡 Pro-Tip for Reviewing</h4>
                <ul className="ug-list">
                  <li className="ug-list-item">
                    <strong>Individual Review:</strong> Use the "Review" button next to any specific card to inspect or practice it. Solved cards will display a "Review Again" option.
                  </li>
                  <li className="ug-list-item">
                    <strong>Audio Feedbacks:</strong> Correct answers in review session automatically trigger native TTS audio read-alouds to reinforce phonetic memory.
                  </li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'pet' && (
            <>
              <div>
                <h3 className="ug-section-title">👾 Virtual Study Pet Companion</h3>
                <p className="ug-section-intro">
                  A custom interactive companion that floats in the corner of your practice viewport and lives on your dashboard.
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🍩</span>
                    <h4 className="ug-card-title">Hunger levels</h4>
                  </div>
                  <p className="ug-card-desc">
                    Your pet consumes energy as time passes. Feed them Phonics Cookies and Vocabulary Cupcakes to restore hunger and keep them cheerful.
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">⚡</span>
                    <h4 className="ug-card-title">Study energy</h4>
                  </div>
                  <p className="ug-card-desc">
                    Completing challenges boosts your pet's energy and awards Experience Points (EXP). High scores grant bonus multipliers!
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧬</span>
                    <h4 className="ug-card-title">Pet evolution</h4>
                  </div>
                  <p className="ug-card-desc">
                    Once the EXP bar hits 100%, your pet levels up. Higher levels change their look and unlock funny moods or positive feedback triggers.
                  </p>
                </div>
              </div>

              {/* Interactive Pet Demo */}
              <div className="ug-demo-block">
                <h4 className="ug-demo-title">🎮 Pet Companion Demo: Feed or play to earn EXP</h4>
                <div className="ug-demo-window">
                  <div className="ug-pet-preview-container">
                    <div className="ug-pet-avatar-wrapper">
                      🐱
                    </div>

                    <div className="ug-pet-stats">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-h)' }}>Level {petLevel} Study Kitty</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>EXP: {petExp}%</span>
                      </div>
                      
                      {/* EXP Bar */}
                      <div className="ug-pet-bar-outer" style={{ height: 8 }}>
                        <div className="ug-pet-bar-inner" style={{ width: `${petExp}%`, background: 'var(--accent)' }} />
                      </div>

                      {/* Hunger */}
                      <div className="ug-pet-stat-row">
                        <span className="ug-pet-stat-label">🍩 Hunger:</span>
                        <div className="ug-pet-bar-outer">
                          <div className="ug-pet-bar-inner" style={{ width: `${petHunger}%`, background: '#22c55e' }} />
                        </div>
                        <span style={{ width: 34, fontSize: '0.8rem', textAlign: 'right' }}>{petHunger}%</span>
                      </div>

                      {/* Energy */}
                      <div className="ug-pet-stat-row">
                        <span className="ug-pet-stat-label">⚡ Energy:</span>
                        <div className="ug-pet-bar-outer">
                          <div className="ug-pet-bar-inner" style={{ width: `${petEnergy}%`, background: '#f59e0b' }} />
                        </div>
                        <span style={{ width: 34, fontSize: '0.8rem', textAlign: 'right' }}>{petEnergy}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <p style={{ fontStyle: 'italic', color: 'var(--accent)', fontSize: '0.9rem', marginBottom: 12 }}>
                      {petActionText}
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button 
                        className="ug-sidebar-btn" 
                        onClick={handleFeedPet} 
                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }}
                      >
                        🍪 Feed Phonics Cookie (+5 EXP)
                      </button>
                      <button 
                        className="ug-sidebar-btn" 
                        onClick={handlePlayPet} 
                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }}
                        disabled={petEnergy <= 10}
                      >
                        🎮 Study Grammar (+15 EXP)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
