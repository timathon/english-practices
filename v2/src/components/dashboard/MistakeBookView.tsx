import { getTextbookEmoji } from '../../lib/textbooks'
import { FadingMistakeBadge } from './DashboardShared'
import type { Mistake } from '../../lib/mistakeService'

interface MistakeBookViewProps {
  mistakes: Mistake[];
  showChinese: boolean;
  unresolvedCount: number;
  unlistedCount: number;
  showResolved: boolean;
  setShowResolved: (show: boolean) => void;
  activeMistakeBook: string;
  setActiveMistakeBook: (tb: string) => void;
  activeMistakeUnit: string;
  setActiveMistakeUnit: (unit: string) => void;
  groupedMistakes: Record<string, Record<string, Mistake[]>>;
  unresolvedMistakes: Mistake[];
  setActiveMistakeReview: (mistakes: Mistake[]) => void;
  handleDeleteMistake: (id: string) => void;
}

export function MistakeBookView({
  mistakes,
  showChinese,
  unresolvedCount,
  unlistedCount,
  showResolved,
  setShowResolved,
  activeMistakeBook,
  setActiveMistakeBook,
  activeMistakeUnit,
  setActiveMistakeUnit,
  groupedMistakes,
  unresolvedMistakes,
  setActiveMistakeReview,
  handleDeleteMistake
}: MistakeBookViewProps) {
  const mistakeBooks = Object.keys(groupedMistakes).sort();
  const effectiveMistakeBook = activeMistakeBook || (mistakeBooks.length > 0 ? mistakeBooks[0] : '');
  
  const mistakeUnits = effectiveMistakeBook ? Object.keys(groupedMistakes[effectiveMistakeBook]).sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }) : [];
  
  const effectiveMistakeUnit = activeMistakeUnit || (mistakeUnits.length > 0 ? mistakeUnits[0] : '');

  if (mistakes.length === 0) {
    return (
      <div className="db-mistakes-section">
        <div className="db-empty" style={{ background: 'var(--card-bg)', padding: '60px 20px', borderRadius: '16px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>🎉</span>
          <h3 style={{ color: 'var(--text-h)', margin: '0 0 8px 0', fontSize: '1.25rem' }}>No Mistakes to Review!</h3>
          <p style={{ color: 'var(--text)', margin: 0, fontSize: '0.9rem' }}>Great job! Your mistake collection is clean.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="db-mistakes-section">
      <div className="db-mistakes-container">
        {/* Sidebar: Books & Units */}
        <div className="db-mistakes-sidebar">
          <div className="db-mistakes-header-card">
            <h3 className="db-mistakes-title">
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  📓 Mistake Book
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  📓 错题本
                </span>
              </span>
            </h3>
            <p className="db-mistakes-sub">
              You have {unresolvedCount} unresolved questions.
              {unlistedCount > 0 && ` (${unlistedCount} unlisted)`}
            </p>
            <div className="db-mistakes-filter-control">
              <label className="db-filter-switch">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                />
                <span className="db-filter-slider"></span>
              </label>
              <span className="db-filter-label">Show resolved</span>
            </div>
            <button
              className="db-quick-review-btn"
              disabled={unresolvedCount === 0}
              onClick={() => setActiveMistakeReview(unresolvedMistakes)}
            >
              ⚡ Quick Review All
            </button>
          </div>

          <div className="db-mistakes-nav">
            <div className="db-mistakes-book-tabs">
              {mistakeBooks.map(tb => (
                <button
                  key={tb}
                  className={`db-mistakes-book-tab ${effectiveMistakeBook === tb ? 'active' : ''}`}
                  onClick={() => {
                    setActiveMistakeBook(tb);
                    setActiveMistakeUnit('');
                  }}
                >
                  <span className="db-mistakes-book-name">{getTextbookEmoji(tb)} {tb}</span>
                  <span className="db-mistakes-count">{Object.values(groupedMistakes[tb]).flat().length}</span>
                </button>
              ))}
            </div>

            {effectiveMistakeBook && (
              <div className="db-mistakes-unit-tabs">
                {mistakeUnits.map(un => (
                  <button
                    key={un}
                    className={`db-mistakes-unit-tab ${effectiveMistakeUnit === un ? 'active' : ''}`}
                    onClick={() => setActiveMistakeUnit(un)}
                  >
                    <span className="db-mistakes-unit-name">{un}</span>
                    <span className="db-mistakes-count">{groupedMistakes[effectiveMistakeBook][un].length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content: List of Mistakes for selected Textbook-Unit */}
        <div className="db-mistakes-content">
          {effectiveMistakeBook && effectiveMistakeUnit ? (
            <div className="db-mistakes-list-card">
              <div className="db-mistakes-list-header">
                <h4 style={{ margin: 0, color: 'var(--text-h)' }}>
                  {effectiveMistakeBook} - {effectiveMistakeUnit} ({groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].length})
                </h4>
                <button
                  className="db-unit-review-btn"
                  disabled={groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].filter(m => !m.resolved).length === 0}
                  onClick={() => setActiveMistakeReview(groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].filter(m => !m.resolved))}
                >
                  ✏️ Review Unit
                </button>
              </div>
              <div className="db-mistakes-list">
                {groupedMistakes[effectiveMistakeBook][effectiveMistakeUnit].map((m) => (
                  <div key={m.id} className={`db-mistake-item-card ${m.resolved ? 'resolved' : ''}`}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="db-mistake-meta">
                        <FadingMistakeBadge type={m.practiceType} showChinese={showChinese} />
                        <span className="db-mistake-attempts">Attempts: {m.attemptsCount}</span>
                        {m.resolved && <span className="db-mistake-resolved-badge">Solved</span>}
                      </div>
                      <div className="db-mistake-prompt">
                        {m.practiceType === 'vocab-master' && <strong>{m.question.prompt}</strong>}
                        {m.practiceType === 'grammar-wizard' && <span>{m.question.prompt}</span>}
                        {m.practiceType.startsWith('passage-decoder') && (
                          <>
                            <div style={{ fontStyle: 'italic', color: 'var(--accent)', marginBottom: 4 }}>{m.question.en}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Select correct translation</div>
                          </>
                        )}
                        {m.practiceType === 'sentence-architect' && (
                          <>
                            <div>{m.question.cn}</div>
                            <div style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text)', marginTop: 4 }}>💡 {m.question.hint}</div>
                          </>
                        )}
                        {m.practiceType === 'spelling-hero' && (
                          <>
                            <div>Spell the word for: <strong>{m.question.meaning}</strong></div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent)', marginTop: 4 }}>
                              {m.question.chunks.map(() => '_').join(' ')}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="db-mistake-actions">
                      <button
                        className="db-mistake-action-btn delete"
                        title="Remove from Mistake Book"
                        onClick={() => handleDeleteMistake(m.id)}
                      >
                        🗑️
                      </button>
                      <button
                        className="db-mistake-action-btn review"
                        onClick={() => setActiveMistakeReview([m])}
                      >
                        {m.resolved ? 'Review Again' : 'Review'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="db-empty" style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '16px' }}>Select a textbook and unit to view mistakes.</div>
          )}
        </div>
      </div>
    </div>
  );
}
