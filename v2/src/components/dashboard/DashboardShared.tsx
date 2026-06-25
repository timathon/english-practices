import { translatePracticeName } from '../../lib/dashboardUtils'

export function FadingPracticeName({ name, showChinese }: { name: string; showChinese: boolean }) {
  const cnName = translatePracticeName(name);
  return (
    <span className="db-practice-name-grid">
      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
        {name}
      </span>
      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
        {cnName}
      </span>
    </span>
  );
}

export function FadingMistakeBadge({ type, showChinese }: { type: string; showChinese: boolean }) {
  const formatted = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const cnName = translatePracticeName(formatted);
  return (
    <span className="db-mistake-type-badge-grid">
      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
        {formatted}
      </span>
      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
        {cnName}
      </span>
    </span>
  );
}

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const practicesDoneText = data.breakdown 
      ? `Practices Done: ${data.count} (${data.breakdown})`
      : `Practices Done: ${data.count}`;
    
    return (
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        color: 'var(--text-h)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(12px)',
        padding: '10px 14px',
        fontSize: '0.8rem',
        textAlign: 'left'
      }}>
        <p style={{ color: 'var(--text)', fontWeight: 600, margin: '0 0 4px 0' }}>{label}</p>
        <p style={{ color: 'var(--text-h)', margin: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--tab-active-text)' }} />
          {practicesDoneText}
        </p>
        <p style={{ color: 'var(--text-h)', margin: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--accent)', boxSizing: 'border-box' }} />
          Avg Score: {data.avgScore}%
        </p>
      </div>
    );
  }
  return null;
};
