import React from 'react'

interface ChallengeCardGridProps {
    challenges: any[]
    onStart: (challenge: any) => void
    onShowHistory: (challenge: any) => void
    getRemainingTrials: (cId: string) => number
    getChallengeStatsText: (c: any) => { today: string; lifetime: string; isTodayBestHigh?: boolean }
    isLockedToday: (c: any) => boolean
    flickeringId: string | null
    prefix: string
}

export const ChallengeCardGrid: React.FC<ChallengeCardGridProps> = ({
    challenges,
    onStart,
    onShowHistory,
    getRemainingTrials,
    getChallengeStatsText,
    isLockedToday,
    flickeringId,
    prefix
}) => {
    return (
        <div className={`${prefix}-challenge-grid`}>
            {challenges.map((c: any) => {
                const rem = getRemainingTrials(c.id);
                const stats = getChallengeStatsText(c);
                const lockedToday = isLockedToday(c);
                const isOutOfAttempts = rem === 0;

                return (
                    <div
                        key={c.id}
                        id={`${prefix}-card-${c.id}`}
                        className={`${prefix}-challenge-card ${flickeringId === c.id ? 'flicker-active' : ''}`}
                    >
                        <div className={`${prefix}-card-header`}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{c.icon}</span>
                                <h3 className={`${prefix}-card-title`} style={{ marginRight: '8px' }}>{c.title}</h3>
                                <div style={{ fontSize: '0.7rem', color: 'rgb(153, 153, 153)', marginTop: '2px' }}>
                                    {rem} / 5 attempts left
                                </div>
                            </div>
                            <button
                                className={`${prefix}-start-btn`}
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
                                            : {}
                                }
                            >
                                {lockedToday ? 'LOCKED 🔒' : isOutOfAttempts ? (prefix === 'sh' ? 'LIMIT' : 'OUT OF ATTEMPTS') : 'START'}
                            </button>
                        </div>
                        <div className={`${prefix}-card-stats`}>
                            <div
                                className={`${prefix}-stat-row`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => onShowHistory(c)}
                            >
                                <span className={`${prefix}-stat-label`}>TODAY</span>
                                <span
                                    className={`${prefix}-stat-val`}
                                    style={stats.isTodayBestHigh ? { color: '#10b981', fontWeight: 'bold' } : {}}
                                >
                                    {stats.today}
                                </span>
                            </div>
                            <div
                                className={`${prefix}-stat-row`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => onShowHistory(c)}
                            >
                                <span className={`${prefix}-stat-label`}>LIFETIME</span>
                                <span className={`${prefix}-stat-val`}>{stats.lifetime}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
