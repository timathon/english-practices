import { getTextbookEmoji } from '../../lib/textbooks'
import { translateTextbookName } from '../../lib/dashboardUtils'

export function TestdriveSelector({ username, books, onSelect }: { username?: string, books: Record<string, Record<string, any[]>>, onSelect: (tb: string) => void, showChinese: boolean }) {
  let sortedBooks = Object.keys(books).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  
  const isTest0 = username === 'test0';
  if (isTest0) {
    const allowed = ['A5B', 'A6B', 'A7A', 'B-NCE2', 'RAZ-B'];
    sortedBooks = sortedBooks.filter(tb => allowed.includes(tb));
  }

  return (
    <div className="db-overlay-wrapper">
      <div className="db-lockdown-card db-testdrive-card">
        <h2 className="db-lockdown-title" style={{ fontSize: '2rem' }}>
          欢迎体验同步派！
        </h2>
        <p className="db-lockdown-text" style={{ marginBottom: '30px' }}>
          {isTest0 
            ? '请选择一本教材开始你的体验。'
            : '请选择一本教材开始你的 20 分钟体验。'
          }
        </p>
        <div className="db-testdrive-grid">
          {sortedBooks.map(tb => (
            <button
              key={tb}
              onClick={() => onSelect(tb)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px',
                color: 'var(--text-h)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ fontSize: '1.5rem' }}>{getTextbookEmoji(tb)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>
                  {tb} <span style={{ fontSize: '0.9em', opacity: 0.8, marginLeft: '4px', fontWeight: 'normal' }}>
                      ({translateTextbookName(tb)})
                    </span>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{Object.keys(books[tb]).length} 单元</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
