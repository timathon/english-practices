import React from 'react';
import { CountdownRing } from '../CountdownRing';

interface QuestionPaneProps {
    q: any;
    currentQIndex: number;
    totalQuestions: number;
    isRedemption: boolean;
    mistakeCount: number;
    showOptions: boolean;
    invisibleMode: boolean;
    countdownTimer: {
        secondsLeft: number;
        isRunning: boolean;
    };
    locked: boolean;
    selectedOption: number | null;
    activeSection: any;
    onRevealOptions: () => void;
    onCheckAnswer: (index: number) => void;
    onNextQuestion: () => void;
}

export const QuestionPane: React.FC<QuestionPaneProps> = ({
    q,
    currentQIndex,
    totalQuestions,
    isRedemption,
    mistakeCount,
    showOptions,
    invisibleMode,
    countdownTimer,
    locked,
    selectedOption,
    activeSection,
    onRevealOptions,
    onCheckAnswer,
    onNextQuestion,
}) => {
    return (
        <div className="cloze-lower-viewport">
            <div className="cloze-question-header">
                <span className="cloze-q-badge">
                    {isRedemption ? (
                        <span style={{ color: '#ea580c' }}>🔄 错题重练: 第 {q.blank_num} 空 (剩余 {mistakeCount} 题)</span>
                    ) : (
                        `第 ${q.blank_num} 空 (${currentQIndex + 1} / ${totalQuestions})`
                    )}
                </span>
                {showOptions && !invisibleMode && (
                    <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={15} isRunning={countdownTimer.isRunning} />
                )}
            </div>

            {!showOptions ? (
                <div className="cloze-think-box">
                    <button className="cloze-reveal-btn" onClick={onRevealOptions}>
                        Show Options <span className="cloze-shortcut-tag">Enter / Space</span>
                    </button>
                </div>
            ) : (
                <>
                    <div className="cloze-options-grid">
                        {q.options.map((opt: string, optIdx: number) => {
                            let btnClass = "cloze-option-btn";
                            if (locked) {
                                if (optIdx === q.answer) {
                                    btnClass += " correct";
                                } else if (selectedOption === optIdx) {
                                    btnClass += " wrong";
                                }
                            } else if (selectedOption === optIdx) {
                                btnClass += " selected";
                            }

                            return (
                                <button
                                    key={optIdx}
                                    className={btnClass}
                                    onClick={() => onCheckAnswer(optIdx)}
                                    disabled={locked}
                                >
                                    <span className="cloze-option-idx">{String.fromCharCode(65 + optIdx)}</span>
                                    <span>{opt}</span>
                                </button>
                            );
                        })}
                    </div>

                    {locked && (
                        <div className={`cloze-explanation-banner ${selectedOption === q.answer ? '' : 'is-wrong'}`}>
                            {(activeSection?.filled_text_cn?.[q.sentence_index] || activeSection?.raw_text_cn?.[q.sentence_index]) && (
                                <div className="cloze-sentence-cn-box">
                                    <span className="cloze-sentence-cn-label">📖 句意：</span>
                                    <span>{(activeSection.filled_text_cn?.[q.sentence_index] || activeSection.raw_text_cn[q.sentence_index]).replace(/^#+\s*/, '')}</span>
                                </div>
                            )}
                            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{selectedOption === q.answer ? '💡 解析点拨：' : '⚠️ 正确答案与解析：'}</strong>
                                {q.grammar_point_name && (
                                    <span className="cloze-grammar-label-badge">
                                        考点: {q.grammar_point_name}
                                    </span>
                                )}
                            </div>
                            <div>
                                {(() => {
                                    if (!q.explanation) return null;
                                    const cleanedExp = q.explanation.replace(/^句意[:：]\s*.*?[。！？\.\?!]\s*/, '').trim();
                                    return cleanedExp || q.explanation;
                                })()}
                            </div>
                            {q.rule_summary && (
                                <div style={{ marginTop: '4px', opacity: 0.9 }}>
                                    <strong>规则速记：</strong>{q.rule_summary}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="cloze-footer-action">
                        <button
                            className="cloze-continue-btn"
                            onClick={onNextQuestion}
                            disabled={!locked}
                        >
                            {!isRedemption
                                ? (currentQIndex + 1 >= totalQuestions
                                    ? (mistakeCount > 0 ? `进入错题重做 (${mistakeCount} 题)` : '查看成绩与考点')
                                    : '下一题 (Next)')
                                : (mistakeCount === 0 ? '查看成绩与考点' : `下一道错题 (剩余 ${mistakeCount} 题)`)}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
