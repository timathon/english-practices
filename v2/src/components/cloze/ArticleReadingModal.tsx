import React from 'react';

interface ArticleReadingModalProps {
    isOpen: boolean;
    activeSection: any;
    onClose: () => void;
    revealedTranslationIndex: number | null;
    toggleTranslation: (idx: number) => void;
    highlightedSentenceIndex: number | null;
    setHighlightedSentenceIndex: (idx: number | null) => void;
    playingSentenceIdx: number | null;
    playSentenceAudio: (text: string, idx: number) => void;
    autoPlayNext: boolean;
    setAutoPlayNext: (val: boolean) => void;
    autoPlayNextRef: React.MutableRefObject<boolean>;
    modalSentenceRefs: React.MutableRefObject<{ [idx: number]: HTMLElement | null }>;
}

export const ArticleReadingModal: React.FC<ArticleReadingModalProps> = ({
    isOpen,
    activeSection,
    onClose,
    revealedTranslationIndex,
    toggleTranslation,
    highlightedSentenceIndex,
    setHighlightedSentenceIndex,
    playingSentenceIdx,
    playSentenceAudio,
    autoPlayNext,
    setAutoPlayNext,
    autoPlayNextRef,
    modalSentenceRefs,
}) => {
    if (!isOpen || !activeSection) return null;

    return (
        <div className="cloze-modal-overlay" onClick={onClose}>
            <div className="cloze-modal-card cloze-article-modal" onClick={e => e.stopPropagation()}>
                <button className="cloze-modal-close" onClick={onClose}>✕</button>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{activeSection.icon || '📖'}</span>
                        <span>{activeSection.title} - 全文精读与朗读</span>
                    </div>
                    <label
                        className="cloze-auto-play-toggle"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: autoPlayNext ? 'var(--primary)' : '#64748b',
                            background: autoPlayNext ? '#e0f2fe' : '#f1f5f9',
                            border: `1px solid ${autoPlayNext ? '#7dd3fc' : '#e2e8f0'}`,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={autoPlayNext}
                            onChange={(e) => {
                                setAutoPlayNext(e.target.checked);
                                autoPlayNextRef.current = e.target.checked;
                            }}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <span>连续朗读</span>
                    </label>
                </h3>

                <div className="cloze-article-scroll-container">
                    {(activeSection.filled_text || activeSection.raw_text || []).map((sent: string, sIdx: number) => {
                        const isHeading = sent.startsWith('#');
                        const cleanEn = sent.replace(/^#+\s*/, '').trim();
                        const cnText = (activeSection.filled_text_cn?.[sIdx] || activeSection.raw_text_cn?.[sIdx] || '').replace(/^#+\s*/, '').trim();
                        const isCnRevealed = revealedTranslationIndex === sIdx;

                        if (isHeading) {
                            return (
                                <h4
                                    key={sIdx}
                                    ref={el => { modalSentenceRefs.current[sIdx] = el; }}
                                    className={`cloze-modal-article-heading ${highlightedSentenceIndex === sIdx ? 'highlighted' : ''}`}
                                    onMouseDown={() => setHighlightedSentenceIndex(sIdx)}
                                    onTouchStart={() => setHighlightedSentenceIndex(sIdx)}
                                >
                                    {isCnRevealed && cnText ? cnText : cleanEn}
                                    {cnText && (
                                        <button
                                            className="cloze-toggle-cn-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTranslation(sIdx);
                                            }}
                                            title={isCnRevealed ? "显示英文" : "显示中文（5秒后自动切回英文）"}
                                        >
                                            {isCnRevealed ? "英" : "中"}
                                        </button>
                                    )}
                                </h4>
                            );
                        }

                        const isHighlighted = highlightedSentenceIndex === sIdx;

                        // Find any question targeting this sentence_index
                        const sectionQuestions = (activeSection.questions || []) as any[];
                        const matchedQuestions = sectionQuestions.filter(q => q.sentence_index === sIdx);

                        // Helper to render English text with highlighted target answers
                        const renderSentenceContent = () => {
                            if (isCnRevealed && cnText) {
                                return cnText;
                            }

                            if (matchedQuestions.length === 0) {
                                return cleanEn;
                            }

                            // Collect all target answer words for this sentence
                            const targetAnswers = matchedQuestions
                                .map(q => {
                                    if (q.options && q.answer !== undefined && q.options[q.answer]) {
                                        return q.options[q.answer].trim();
                                    }
                                    return null;
                                })
                                .filter((w): w is string => !!w);

                            if (targetAnswers.length === 0) {
                                return cleanEn;
                            }

                            // Sort target answers by length descending to match longer phrases first
                            targetAnswers.sort((a, b) => b.length - a.length);

                            // Escape special regex characters
                            const regexPatterns = targetAnswers.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                            const pattern = new RegExp(`(\\b(?:${regexPatterns.join('|')})\\b)`, 'gi');

                            const parts = cleanEn.split(pattern);

                            return parts.map((part, pIdx) => {
                                const isTarget = targetAnswers.some(target => target.toLowerCase() === part.toLowerCase());
                                if (isTarget) {
                                    return (
                                        <span key={pIdx} className="cloze-reading-target-word">
                                            {part}
                                        </span>
                                    );
                                }
                                return part;
                            });
                        };

                        return (
                            <div
                                key={sIdx}
                                ref={el => { modalSentenceRefs.current[sIdx] = el; }}
                                className={`cloze-article-sentence-row ${isCnRevealed ? 'is-cn' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                onMouseDown={() => setHighlightedSentenceIndex(sIdx)}
                                touch-action="manipulation"
                                onTouchStart={() => setHighlightedSentenceIndex(sIdx)}
                            >
                                <span className="cloze-article-sentence-num">{sIdx + 1}.</span>
                                <div className="cloze-article-sentence-body">
                                    <span className="cloze-article-sentence-text">
                                        {renderSentenceContent()}
                                    </span>
                                </div>
                                <div className="cloze-article-sentence-actions">
                                    {cnText && (
                                        <button
                                            className={`cloze-toggle-cn-btn ${isCnRevealed ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTranslation(sIdx);
                                            }}
                                            title={isCnRevealed ? "切换回英文" : "查看中文翻译（5秒后自动切回英文）"}
                                        >
                                            {isCnRevealed ? "英" : "中"}
                                        </button>
                                    )}
                                    <button
                                        className={`cloze-sentence-audio-btn ${playingSentenceIdx === sIdx ? 'is-playing' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playSentenceAudio(cleanEn, sIdx);
                                        }}
                                        title={playingSentenceIdx === sIdx ? "停止播放" : "朗读本句"}
                                    >
                                        {playingSentenceIdx === sIdx ? '⏹️' : '🔈'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
