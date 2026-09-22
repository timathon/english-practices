import React from 'react';

interface PassageViewportProps {
    rawText: string | string[];
    activeBlankNum?: number;
    activeSentenceIdx?: number;
    activeSentenceRef: React.RefObject<HTMLSpanElement | null>;
    questionsQueue: any[];
    answersLog: Array<{ answeredOption: number | null; answeredText?: string | null; isCorrect: boolean }>;
    currentQIndex: number;
    mistakeQueue: any[];
    onSelectBlank: (index: number) => void;
}

export const PassageViewport: React.FC<PassageViewportProps> = ({
    rawText,
    activeBlankNum,
    activeSentenceIdx,
    activeSentenceRef,
    questionsQueue,
    answersLog,
    currentQIndex,
    onSelectBlank,
}) => {
    if (!rawText) return null;

    if (Array.isArray(rawText)) {
        return (
            <div className="cloze-passage-paragraph">
                {rawText.map((sentStr: string, sIdx: number) => {
                    const isCurrentSentence = activeSentenceIdx !== undefined
                        ? activeSentenceIdx === sIdx
                        : (activeBlankNum !== undefined && (sentStr.includes(`${activeBlankNum}. _`) || new RegExp(`\\b${activeBlankNum}\\.\\s*_+`).test(sentStr)));

                    const parts = sentStr.split(/(\d+\.\s*_{3,}(?:\s*\([^)]+\))?)/g);

                    return (
                        <span
                            key={sIdx}
                            ref={isCurrentSentence ? activeSentenceRef : null}
                            className={`cloze-passage-sentence ${isCurrentSentence ? 'is-active-sentence' : ''}`}
                        >
                            {parts.map((part: string, ptIdx: number) => {
                                const match = part.match(/^(\d+)\.\s*________(?:\s*\(([^)]+)\))?/);
                                if (match) {
                                    const blankNum = parseInt(match[1]);
                                    const qIndex = questionsQueue.findIndex(item => item.blank_num === blankNum);
                                    const isActive = qIndex === currentQIndex;
                                    const answerData = answersLog[qIndex];

                                    let pillClass = "cloze-blank-pill";
                                    let pillContent = `${blankNum}. ______`;
                                    const targetQ = questionsQueue[qIndex];
                                    const baseWord = targetQ?.base_word || match[2];

                                    if (isActive) {
                                        pillClass += " active";
                                    }
                                    if (answerData) {
                                        if (answerData.isCorrect) {
                                            pillClass += " answered-correct";
                                            pillContent = `${blankNum}. ${targetQ.options[targetQ.answer]}`;
                                        } else {
                                            pillClass += " answered-wrong";
                                            const chosen = answerData.answeredText ?? (answerData.answeredOption !== null ? targetQ.options[answerData.answeredOption] : '未答');
                                            pillContent = `${blankNum}. ${chosen}`;
                                        }
                                    }

                                    return (
                                        <React.Fragment key={ptIdx}>
                                            <span
                                                className={pillClass}
                                                onClick={() => {
                                                    if (qIndex >= 0 && qIndex < questionsQueue.length) {
                                                        onSelectBlank(qIndex);
                                                    }
                                                }}
                                                title={`点击跳转至第 ${blankNum} 题`}
                                            >
                                                {pillContent}
                                            </span>
                                            {baseWord ? <span className="cloze-base-word-text"> ({baseWord})</span> : null}
                                        </React.Fragment>
                                    );
                                }
                                return <span key={ptIdx}>{part}</span>;
                            })}{' '}
                        </span>
                    );
                })}
            </div>
        );
    }

    const paragraphs = (rawText as string).split('\n\n');

    return (
        <>
            {paragraphs.map((para: string, pIdx: number) => {
                const sentenceMatches = para.split(/(?<=[.!?])(?<!\b\d+[.!?])\s+(?=[A-Z"“\d])/g);

                return (
                    <p key={pIdx} className="cloze-passage-paragraph">
                        {sentenceMatches.map((sentStr: string, sIdx: number) => {
                            const hasActiveBlank = activeBlankNum !== undefined &&
                                (sentStr.includes(`${activeBlankNum}. _`) || new RegExp(`\\b${activeBlankNum}\\.\\s*_+`).test(sentStr));

                            const parts = sentStr.split(/(\d+\.\s*_{3,}(?:\s*\([^)]+\))?)/g);

                            return (
                                <span
                                    key={sIdx}
                                    ref={hasActiveBlank ? activeSentenceRef : null}
                                    className={`cloze-passage-sentence ${hasActiveBlank ? 'is-active-sentence' : ''}`}
                                >
                                    {parts.map((part: string, ptIdx: number) => {
                                        const match = part.match(/^(\d+)\.\s*________(?:\s*\(([^)]+)\))?/);
                                        if (match) {
                                            const blankNum = parseInt(match[1]);
                                            const qIndex = questionsQueue.findIndex(item => item.blank_num === blankNum);
                                            const isActive = qIndex === currentQIndex;
                                            const answerData = answersLog[qIndex];

                                            let pillClass = "cloze-blank-pill";
                                            let pillContent = `${blankNum}. ______`;

                                            if (isActive) {
                                                pillClass += " active";
                                            }
                                            if (answerData) {
                                                if (answerData.isCorrect) {
                                                    pillClass += " answered-correct";
                                                    const targetQ = questionsQueue[qIndex];
                                                    pillContent = `${blankNum}. ${targetQ.options[targetQ.answer]}`;
                                                } else {
                                                    pillClass += " answered-wrong";
                                                    const targetQ = questionsQueue[qIndex];
                                                    const chosen = answerData.answeredText ?? (answerData.answeredOption !== null ? targetQ.options[answerData.answeredOption] : '未答');
                                                    pillContent = `${blankNum}. ${chosen}`;
                                                }
                                            }

                                            return (
                                                <span
                                                    key={ptIdx}
                                                    className={pillClass}
                                                    onClick={() => {
                                                        if (qIndex >= 0 && qIndex < questionsQueue.length) {
                                                            onSelectBlank(qIndex);
                                                        }
                                                    }}
                                                    title={`点击跳转至第 ${blankNum} 题`}
                                                >
                                                    {pillContent}
                                                </span>
                                            );
                                        }
                                        return <span key={ptIdx}>{part}</span>;
                                    })}{' '}
                                </span>
                            );
                        })}
                    </p>
                );
            })}
        </>
    );
};
