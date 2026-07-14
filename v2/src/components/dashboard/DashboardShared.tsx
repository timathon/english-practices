import { translatePracticeName } from '../../lib/dashboardUtils'
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function FadingPracticeName({ name, showChinese, finishedCount, onCountClick }: { name: string; showChinese: boolean; finishedCount?: number; onCountClick?: (e: React.MouseEvent) => void }) {
  const cnName = translatePracticeName(name);
  const countBadge = finishedCount !== undefined && finishedCount > 0 ? (
    <span 
      onClick={onCountClick}
      className="test-attempts-count-badge"
      style={{
        cursor: 'pointer',
        background: 'var(--tab-active-text)',
        color: 'var(--bg)',
        borderRadius: '10px',
        padding: '1px 6px',
        fontSize: '0.62rem',
        fontWeight: 'bold',
        marginLeft: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        pointerEvents: 'auto'
      }}
    >
      {finishedCount}
    </span>
  ) : null;

  return (
    <span className="db-practice-name-grid">
      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"} style={{ display: 'inline-flex', alignItems: 'center' }}>
        {name}
        {countBadge}
      </span>
      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"} style={{ display: 'inline-flex', alignItems: 'center' }}>
        {cnName}
        {countBadge}
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
        {data.totalDuration !== undefined && (
          <p style={{ color: 'var(--text-h)', margin: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#e67e22' }} />
            Time Used: {data.totalDuration} {data.totalDuration === 1 ? 'min' : 'mins'}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function ActivityChart({
  last7DaysStats,
  handleChartInteraction,
  handlePointClick
}: {
  last7DaysStats: any[];
  handleChartInteraction: (state: any) => void;
  handlePointClick: (...args: any[]) => void;
}) {
  return (
    <div className="db-chart-card">
      <div className="db-chart-legend-left">
        <span className="db-chart-legend-bar" />
        <span className="db-chart-legend-bar" style={{ backgroundColor: '#e67e22', marginTop: '4px' }} />
        <span>Practices & Time (m)</span>
      </div>
      <div className="db-chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={last7DaysStats}
            margin={{ top: 16, right: 12, bottom: 0, left: -8 }}
            onClick={handleChartInteraction}
          >
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--tab-active-text)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--tab-active-text)" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="durationBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e67e22" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#e67e22" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="date" stroke="var(--text)" fontSize={11}
              tickLine={false} axisLine={false} dy={6}
              tickFormatter={(value, index) => [1, 3, 5].includes(index) ? '' : value}
            />
            <XAxis
              xAxisId="hidden"
              dataKey="date"
              hide
            />
            <YAxis
              yAxisId="left" stroke="var(--text)" fontSize={11}
              tickLine={false} axisLine={false} tickCount={5}
              allowDecimals={false} width={28}
            />
            <YAxis
              yAxisId="right" orientation="right" stroke="var(--text)"
              fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v}%`} domain={[0, 100]} width={36}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-bg)', radius: 4 }}
              content={<CustomTooltip />}
            />
            <Area
              yAxisId="right" type="monotone" dataKey="avgScore"
              fill="url(#lineGlow)" stroke="none" tooltipType="none"
            />
            <Bar
              yAxisId="left" dataKey="count" name="Practices Done"
              fill="url(#barGrad)" radius={[4, 4, 0, 0]} barSize={10}
            />
            <Bar
              yAxisId="left" dataKey="totalDuration" name="Time Used"
              fill="url(#durationBarGrad)" radius={[4, 4, 0, 0]} barSize={10}
            />
            <Line
              yAxisId="right" type="monotone" dataKey="avgScore"
              name="Avg Score" stroke="var(--accent)" strokeWidth={2.5}
              dot={{ r: 3.5, fill: 'var(--card-bg)', strokeWidth: 2.5 }}
              activeDot={{ r: 5.5, fill: 'var(--accent)', strokeWidth: 0 }}
            />
            <Bar
              xAxisId="hidden"
              yAxisId="right" dataKey="columnClickArea"
              fill="transparent" barSize={40}
              onClick={handlePointClick}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="db-chart-legend-right">
        <span className="db-chart-legend-dot" />
        <span>Avg Score</span>
      </div>
    </div>
  );
}
