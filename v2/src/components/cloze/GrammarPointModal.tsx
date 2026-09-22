import React from 'react';

interface GrammarPointModalProps {
    grammarPoint: {
        name: string;
        rule: string;
        example?: string;
    } | null;
    onClose: () => void;
}

export const GrammarPointModal: React.FC<GrammarPointModalProps> = ({ grammarPoint, onClose }) => {
    if (!grammarPoint) return null;

    return (
        <div className="cloze-modal-overlay" onClick={onClose}>
            <div className="cloze-modal-card" onClick={e => e.stopPropagation()}>
                <button className="cloze-modal-close" onClick={onClose}>✕</button>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.25rem' }}>
                    💡 {grammarPoint.name}
                </h3>
                <div style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#334155' }}>
                    <p style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                        <strong>考点规则：</strong><br />
                        {grammarPoint.rule}
                    </p>
                    {grammarPoint.example && (
                        <p style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #10b981', color: '#166534' }}>
                            <strong>真题示例：</strong><br />
                            <code>{grammarPoint.example}</code>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
