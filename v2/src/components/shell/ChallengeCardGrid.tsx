import React from 'react'
import './ChallengeCardGrid.css'
import { useSession } from '../../lib/auth'

interface ChallengeCardGridProps {
    challenges: any[]
    onStart: (challenge: any) => void
    onShowHistory: (challenge: any) => void
    getRemainingTrials: (cId: string) => number
    getChallengeStatsText: (c: any) => { today: string; lifetime: string; isTodayBestHigh?: boolean }
    isLockedToday: (c: any) => boolean
    flickeringId: string | null
    prefix: string
    invisibleMode?: boolean
    onResetTrials?: (cId: string) => void
    onTitleClick?: (challenge: any) => void
    isTitleClickable?: (challenge: any) => boolean
}

export const ChallengeCardGrid: React.FC<ChallengeCardGridProps> = ({
    challenges,
    onStart,
    onShowHistory,
    getRemainingTrials,
    getChallengeStatsText,
    isLockedToday,
    flickeringId,
    invisibleMode,
    prefix,
    onResetTrials,
    onTitleClick,
    isTitleClickable
}) => {
    const { data: session } = useSession()
    const isAdmin = (session?.user as any)?.role === 'admin' || session?.user?.email === 'admin@vibequizzing.com'
    return (
        <div className="shell-challenge-grid">
            {challenges.map((c: any) => {
                const rem = getRemainingTrials(c.id);
                const stats = getChallengeStatsText(c);
                const lockedToday = isLockedToday(c);
                const isOutOfAttempts = rem === 0;
                const canClickTitle = Boolean(isTitleClickable && isTitleClickable(c));

                return (
                    <div
                        key={c.id}
                        id={`${prefix}-card-${c.id}`}
                        className={`shell-challenge-card ${flickeringId === c.id ? 'flicker-active' : ''}`}
                        style={invisibleMode ? { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' } : {}}
                    >
                        <div className="shell-card-header">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{c.icon}</span>
                                <h3
                                    className={`shell-card-title ${canClickTitle ? 'clickable-title' : ''}`}
                                    style={{
                                        marginRight: '8px',
                                        cursor: canClickTitle ? 'pointer' : undefined,
                                        textDecoration: canClickTitle ? 'underline dotted' : undefined,
                                        textUnderlineOffset: canClickTitle ? '3px' : undefined
                                    }}
                                    title={canClickTitle ? '点击查看文章翻译与朗读' : undefined}
                                    onClick={(e) => {
                                        if (canClickTitle && onTitleClick) {
                                            e.stopPropagation();
                                            onTitleClick(c);
                                        }
                                    }}
                                >
                                    {c.title}
                                </h3>
                                <div style={{ fontSize: '0.7rem', color: 'rgb(153, 153, 153)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{rem} / 5 attempts left</span>
                                    {isAdmin && isOutOfAttempts && (
                                        <button
                                            type="button"
                                            title="Admin: Reset daily attempts"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onResetTrials) {
                                                    onResetTrials(c.id);
                                                }
                                            }}
                                            style={{
                                                background: '#fef3c7',
                                                border: '1px solid #fde68a',
                                                color: '#b45309',
                                                borderRadius: '4px',
                                                padding: '1px 5px',
                                                fontSize: '0.65rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                marginLeft: '4px'
                                            }}
                                        >
                                            🔄 Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button
                                className="shell-start-btn"
                                onClick={() => {
                                    if (!isOutOfAttempts) {
                                        onStart(c);
                                    }
                                }}
                                style={
                                    lockedToday 
                                        ? { backgroundColor: '#10b981', borderBottomColor: '#059669', color: '#fff' } 
                                        : isOutOfAttempts 
                                            ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } 
                                            : invisibleMode
                                                ? { backgroundColor: '#64748b', borderBottomColor: '#475569', color: '#fff' }
                                                : {}
                                }
                            >
                                {lockedToday ? 'LOCKED 🔒' : isOutOfAttempts ? (prefix === 'sh' ? 'LIMIT' : 'OUT OF ATTEMPTS') : 'START'}
                            </button>
                        </div>
                        <div className="shell-card-stats">
                            <div
                                className="shell-stat-row"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onShowHistory(c)}
                            >
                                <span className="shell-stat-label">TODAY</span>
                                <span
                                    className="shell-stat-val"
                                    style={stats.isTodayBestHigh ? { color: '#10b981', fontWeight: 'bold' } : {}}
                                >
                                    {stats.today}
                                </span>
                            </div>
                            <div
                                className="shell-stat-row"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onShowHistory(c)}
                            >
                                <span className="shell-stat-label">LIFETIME</span>
                                <span className="shell-stat-val">{stats.lifetime}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
