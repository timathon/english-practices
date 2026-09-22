import React from 'react';

interface CompletionReviewProps {
    finalScore: number;
    invisibleMode: boolean;
    isNewHigh: boolean;
    historicalBest: number;
    gainedXp: number;
    gainedLove: number;
    questionsQueue: any[];
    answersLog: Array<{ answeredOption: number | null; answeredText?: string | null; isCorrect: boolean }>;
    onOpenGrammarPoint: (id: string, name: string) => void;
    onOpenTranslationModal: () => void;
    onBackToMenu: () => void;
}

export const CompletionReview: React.FC<CompletionReviewProps> = ({
    finalScore,
    invisibleMode,
    isNewHigh,
    historicalBest,
    gainedXp,
    gainedLove,
    questionsQueue,
    answersLog,
    onOpenGrammarPoint,
    onOpenTranslationModal,
    onBackToMenu,
}) => {
    return (
        <div className="cloze-screen" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <h1 style={{ color: 'var(--primary)', fontSize: '3.2rem', margin: '0' }}>{finalScore}%</h1>
            <h2 style={{ margin: '4px 0 12px 0', color: '#1e293b', fontSize: '1.4rem', fontWeight: 'bold' }}>Section Complete!</h2>

            <div style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#64748b' }}>
                {invisibleMode ? (
                    <i>Practice Mode (Invisible). Score not recorded.</i>
                ) : isNewHigh ? (
                    <strong style={{ color: '#10b981' }}>🎉 New High Score! You've set a new record!</strong>
                ) : (
                    <span>Highest recorded score: <strong style={{ color: 'var(--primary)' }}>{historicalBest}%</strong></span>
                )}
            </div>

            {!invisibleMode && (
                <div style={{ display: 'inline-flex', gap: '16px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0284c7' }}>⚡ +{gainedXp} XP</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e11d48' }}>❤️ +{gainedLove}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ca8a04' }}>🪙 +1 Coin</span>
                </div>
            )}

            {/* Question by Question Review Table */}
            <div style={{ textAlign: 'left', margin: '14px 0', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '1rem', color: '#334155', marginBottom: '8px' }}>📝 答题回顾与考点索引</h3>
                <table className="cloze-results-table">
                    <thead>
                        <tr>
                            <th>题号</th>
                            <th>正确答案</th>
                            <th>你的选择</th>
                            <th>考点类型</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questionsQueue.map((item, idx) => {
                            const ans = answersLog[idx];
                            const isCorrect = ans?.isCorrect;
                            const chosenText = ans ? (ans.answeredText ?? (ans.answeredOption !== null ? item.options[ans.answeredOption] : '未作答')) : '未作答';
                            const correctText = item.options[item.answer];

                            return (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 600 }}>{item.blank_num}</td>
                                    <td style={{ color: '#10b981', fontWeight: 600 }}>{correctText}</td>
                                    <td style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                        {chosenText} {isCorrect ? '✓' : '✗'}
                                    </td>
                                    <td>
                                        <span
                                            className="cloze-grammar-badge-clickable"
                                            onClick={() => onOpenGrammarPoint(item.grammar_point_id, item.grammar_point_name)}
                                            title="点击查看此考点详细解析与例题"
                                        >
                                            🔍 {item.grammar_point_name}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                <button
                    className="cloze-continue-btn"
                    onClick={onOpenTranslationModal}
                    style={{ background: '#059669', minWidth: '180px' }}
                >
                    📖 文章翻译与朗读
                </button>
                <button
                    className="cloze-continue-btn"
                    onClick={onBackToMenu}
                    style={{ minWidth: '180px' }}
                >
                    Back to Menu
                </button>
            </div>
        </div>
    );
};
