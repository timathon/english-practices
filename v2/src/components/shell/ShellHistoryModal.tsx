import React from 'react'

interface ShellHistoryModalProps {
    title: string
    onClose: () => void
    prefix: string
    children?: React.ReactNode
    logs?: any[]
}

export const ShellHistoryModal: React.FC<ShellHistoryModalProps> = ({
    title,
    onClose,
    prefix,
    children,
    logs
}) => {
    return (
        <div className={`${prefix}-modal-overlay`} onClick={onClose}>
            <div className={`${prefix}-modal-content`} onClick={e => e.stopPropagation()}>
                {prefix === 'sh' ? (
                    <>
                        <div className="sh-modal-header">
                            <h3 className="sh-modal-title">{title}</h3>
                            <button className="sh-modal-close" onClick={onClose}>✕</button>
                        </div>
                        {children}
                    </>
                ) : (
                    <>
                        <h3 className="vm-modal-title">{title}</h3>
                        {logs && logs.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                        ) : (
                            <ul className="vm-history-list">
                                {logs && logs.map((log: any, i: number) => {
                                    const d = new Date(log.createdAt);
                                    const isUnfinished = log.unfinished ? ' (Unfinished)' : '';
                                    const now = new Date();
                                    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    const logMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                    const diffDays = Math.round((todayMidnight.getTime() - logMidnight.getTime()) / 86400000);
                                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    let dateLabel: string;
                                    if (diffDays === 0) dateLabel = title.startsWith('LIFETIME') ? 'Today ' + timeStr : timeStr;
                                    else if (diffDays === 1) dateLabel = 'Yesterday ' + timeStr;
                                    else if (diffDays <= 6) dateLabel = diffDays + ' days ago ' + timeStr;
                                    else dateLabel = d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                                    return (
                                        <li key={log.id || i} className="vm-history-item">
                                            <span className="vm-history-date">{dateLabel}</span>
                                            <span className="vm-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                {log.score}%{isUnfinished}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <button className="vm-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={onClose}>Close</button>
                    </>
                )}
            </div>
        </div>
    )
}
