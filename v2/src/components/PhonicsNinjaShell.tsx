import React, { useState, useRef, useEffect, useCallback } from 'react'
import './PhonicsNinjaShell.css'
import { DailyLockModal } from './DailyLockModal'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { shuffle, usePracticeAudio } from '../lib/practiceAudio'
import { useNavigationBlocker } from '../lib/useNavigationBlocker'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ActiveHeader } from './shell/ActiveHeader'
import { FooterAction } from './shell/FooterAction'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { CompleteScreenActions } from './shell/CompleteScreenActions'
import { QuestionReviewList, getEncouragementMessage, type QuestionResultItem } from './shell/QuestionReviewList'
import { renderPromptText } from './test-sheet/testSheetUtils'

export function PhonicsNinjaShell({ data, practiceId, unit, textbook }: any) {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const { playSfx } = usePracticeAudio(textbook)

    const [activeChallenge, setActiveChallenge] = useState<any>(null)
    const [queue, setQueue] = useState<any[]>([])
    const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog] = useState<Array<string | null>>([])

    const [isRedemption, setIsRedemption] = useState(false)
    const [q, setQ] = useState<any>(null)
    const [options, setOptions] = useState<any[]>([])

    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [selectedOptions, setSelectedOptions] = useState<number[]>([])
    const [locked, setLocked] = useState(false)
    const [hintUsed, setHintUsed] = useState(false)
    const [showHintModal, setShowHintModal] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [hintTimeLeft, setHintTimeLeft] = useState(5)
    const hintIntervalRef = useRef<number | null>(null)
    const [completed, setCompleted] = useState(false)
    const [finalScore, setFinalScore] = useState(0)
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrectFeedback, setIsCorrectFeedback] = useState(false)
    const [continueDisabled, setContinueDisabled] = useState(false)
    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)
    const hasFinishedRef = useRef(false)
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [gainedXp, setGainedXp] = useState(0)
    const [gainedLove, setGainedLove] = useState(0)
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [questionResults, setQuestionResults] = useState<QuestionResultItem[]>([])
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)
    const [lastFinishedChallengeId, setLastFinishedChallengeId] = useState<string | null>(null)
    const [flickeringChallengeId, setFlickeringChallengeId] = useState<string | null>(null)
    const [showFocusGuide, setShowFocusGuide] = useState(true)
    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => { })

    useNavigationBlocker(!!activeChallenge && !completed);

    useEffect(() => {
        if (!activeChallenge && lastFinishedChallengeId) {
            setFlickeringChallengeId(lastFinishedChallengeId);
            setTimeout(() => {
                const el = document.getElementById(`pn-card-${lastFinishedChallengeId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);

            const timer = setTimeout(() => {
                setFlickeringChallengeId(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [activeChallenge, lastFinishedChallengeId])

    // Countdown timer (25s per phonics question)
    const countdownTimer = useCountdown(25, {
        onExpire: () => {
            if (timerExpiredRef.current) return
            timerExpiredRef.current = true
            checkAnswerRef.current(true)
        }
    })

    const primaryColor = '#0284c7'
    const primaryDarkColor = '#0369a1'

    const loadRecords = async () => {
        try {
            const cached = cache.getRecords()
            if (cached) {
                setPracticeRecords(cached)
            }
            const res = await fetch(`${API_URL}/api/records`, { credentials: 'include' })
            if (res.ok) {
                const json = await res.json()
                if (json.success && json.records) {
                    setPracticeRecords(json.records)
                    cache.setRecords(json.records)
                }
            }
        } catch (e) {
            console.error('Failed to load records:', e)
        }
    }

    useEffect(() => {
        loadRecords()
    }, [])

    const getStats = useCallback((challengeTitle: string) => {
        const fullUnitName = `${practiceId} (${challengeTitle})`;
        const logs = practiceRecords.filter((r: any) => r.unit === fullUnitName && !r.unfinished);
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayLogs = logs.filter((r: any) => new Date(r.created_at || r.createdAt).getTime() >= startOfDay);
        
        const todayBest = todayLogs.length > 0 ? Math.max(...todayLogs.map((r: any) => r.score)) : 0;
        const lifeBest = logs.length > 0 ? Math.max(...logs.map((r: any) => r.score)) : 0;
        
        return {
            todayRuns: todayLogs.length,
            todayBest,
            lifeRuns: logs.length,
            lifeBest,
            todayLogs
        };
    }, [practiceId, practiceRecords]);

    const handleChallengeSelect = useCallback((challenge: any, overrideInvisible?: boolean) => {
        const isInv = overrideInvisible !== undefined ? overrideInvisible : invisibleMode;
        if (!isInv) {
            const stats = getStats(challenge.title);
            if (stats.todayBest === 100) {
                setLockModalOpen(true);
                return;
            }
            if (trialsTracker.getRemainingTrials(practiceId, challenge.id) <= 0) {
                setLockModalOpen(true);
                return;
            }
            const hasConsumed = trialsTracker.consumeTrial(practiceId, challenge.id);
            if (!hasConsumed) return;
        }

        setActiveChallenge(challenge);
        hasFinishedRef.current = false;
        setActiveRecordId(null);

        const mappedQuestions = challenge.questions.map((item: any, idx: number) => ({
            ...item,
            originalIndex: idx
        }));

        const shuffledQuestions = shuffle(mappedQuestions);
        setQueue(shuffledQuestions);
        setMistakeQueue([]);
        setCurrentIndex(0);
        setScoreLog(new Array(shuffledQuestions.length).fill(null));
        setCompleted(false);
        setIsRedemption(false);
        setQuestionResults([]);
        setGainedXp(0);
        setGainedLove(0);

        setSelectedOption(null);
        setSelectedOptions([]);
        setLocked(false);
        setShowFeedback(false);
        setHintUsed(false);
        setShowHintModal(false);
        setIsClosing(false);
        setHintTimeLeft(5);
        setContinueDisabled(false);
        timerExpiredRef.current = false;

        const firstQ: any = shuffledQuestions[0];
        const rawOpts = firstQ.options.map((text: string, idx: number) => ({ text, originalIdx: idx }));
        setQ(firstQ);
        setOptions(shuffle(rawOpts));
        if (!isInv) {
            countdownTimer.reset(25);
        } else {
            countdownTimer.pause();
        }

        if (!isInv) {
            const postPromise = (async () => {
                const res = await fetch(`${API_URL}/api/records`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        unit: `${practiceId} (${challenge.title})`, 
                        score: 0,
                        unfinished: true 
                    })
                });
                const j = await res.json();
                if (j.success) {
                    setActiveRecordId(j.id);
                    cache.updateRecord({
                        id: j.id,
                        unit: `${practiceId} (${challenge.title})`,
                        score: 0,
                        unfinished: true,
                        createdAt: new Date().toISOString()
                    } as any);
                    return j.id as string;
                }
                throw new Error("Failed to create record");
            })();
            recordIdPromiseRef.current = postPromise;
        }
    }, [practiceId, invisibleMode, countdownTimer]);

    const loadQuestion = useCallback((nextQ: any, redemption: boolean, index: number) => {
        setQ(nextQ);
        setIsRedemption(redemption);
        setCurrentIndex(index);
        setSelectedOption(null);
        setSelectedOptions([]);
        setLocked(false);
        setShowFeedback(false);
        setHintUsed(false);
        setShowHintModal(false);
        setIsClosing(false);
        setHintTimeLeft(5);
        setContinueDisabled(false);
        timerExpiredRef.current = false;

        if (hintIntervalRef.current) {
            clearInterval(hintIntervalRef.current);
            hintIntervalRef.current = null;
        }

        const rawOpts = nextQ.options.map((text: string, idx: number) => ({ text, originalIdx: idx }));
        setOptions(shuffle(rawOpts));
        if (!invisibleMode) {
            countdownTimer.reset(25);
        } else {
            countdownTimer.pause();
        }
    }, [countdownTimer, invisibleMode]);

    const isMultiSelect = q?.type === 'multi-select' || Array.isArray(q?.answer) || q?.category === 'sound-hunter';

    const handleOptionClick = useCallback((idx: number) => {
        if (locked) return;
        if (isMultiSelect) {
            setSelectedOptions(prev => 
                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
            );
        } else {
            setSelectedOption(idx);
        }
    }, [locked, isMultiSelect]);

    const syncRecord = async (scorePercent: number, isFinished: boolean) => {
        try {
            if (isFinished) {
                hasFinishedRef.current = true;
            } else if (hasFinishedRef.current) {
                return;
            }

            if (activeRecordId) {
                const res = await fetch(`${API_URL}/api/records/${activeRecordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        unit: `${practiceId} (${activeChallenge.title})`, 
                        score: scorePercent,
                        unfinished: !isFinished
                    })
                });
                const j = await res.json();
                if (j.success) {
                    cache.updateRecord({
                        id: activeRecordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    });
                }
            } else if (recordIdPromiseRef.current) {
                const recordId = await recordIdPromiseRef.current;
                const res = await fetch(`${API_URL}/api/records/${recordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        unit: `${practiceId} (${activeChallenge.title})`, 
                        score: scorePercent,
                        unfinished: !isFinished
                    })
                });
                const j = await res.json();
                if (j.success) {
                    cache.updateRecord({
                        id: recordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    });
                }
            }
            setPracticeRecords(cache.getRecords() || []);
        } catch (e) {
            console.error("Failed to sync record", e);
        }
    };

    const checkAnswer = useCallback((forceWrong = false) => {
        if (locked) return;
        const isMulti = q?.type === 'multi-select' || Array.isArray(q?.answer) || q?.category === 'sound-hunter';
        if (!forceWrong) {
            if (isMulti && selectedOptions.length === 0) return;
            if (!isMulti && selectedOption === null) return;
        }
        setLocked(true);
        countdownTimer.pause();
        
        setContinueDisabled(true);
        setTimeout(() => setContinueDisabled(false), 800);

        let isCorrect = false;
        if (!forceWrong) {
            if (isMulti) {
                const targetAnswers = Array.isArray(q.answer) ? q.answer : [q.answer];
                const sortedTarget = [...targetAnswers].sort((a, b) => a - b);
                const sortedSelected = [...selectedOptions].sort((a, b) => a - b);
                isCorrect = sortedTarget.length === sortedSelected.length && sortedTarget.every((val, i) => val === sortedSelected[i]);
            } else {
                isCorrect = selectedOption !== null && selectedOption === q.answer;
            }
        }
        setIsCorrectFeedback(isCorrect);
        setShowFeedback(true);

        const updatedMistakes = [...mistakeQueue];
        const updatedScoreLog = [...scoreLog];

        if (!isRedemption) {
            let userAnswerText = '';
            let correctAnswerText = '';
            if (isMulti) {
                const userIndices = [...selectedOptions].sort((a, b) => a - b);
                userAnswerText = userIndices.map(i => q.options[i]).join(', ');
                const targetIndices = (Array.isArray(q.answer) ? q.answer : [q.answer]).sort((a: number, b: number) => a - b);
                correctAnswerText = targetIndices.map((i: number) => q.options[i]).join(', ');
            } else {
                userAnswerText = selectedOption !== null ? q.options[selectedOption] : '';
                correctAnswerText = q.options[q.answer];
            }

            setQuestionResults(prev => {
                const next = [...prev];
                next[currentIndex] = {
                    id: q.id || currentIndex,
                    prompt: q.prompt,
                    userAnswer: userAnswerText,
                    correctAnswer: correctAnswerText,
                    isCorrect: isCorrect
                };
                return next;
            });
        }

        if (isCorrect) {
            playSfx('correct');
            if (!invisibleMode) {
                const { xpGain } = petService.awardCorrectAnswer();
                setGainedXp(prev => prev + xpGain);
                setGainedLove(prev => prev + 1);
            }
            let scoreType = "green";
            if (isRedemption) {
                scoreType = "redemption";
                updatedScoreLog[q.originalIndex] = scoreType;
                updatedMistakes.shift();
            } else {
                if (hintUsed) scoreType = "yellow";
                updatedScoreLog[currentIndex] = scoreType;
            }
        } else {
            playSfx('wrong');
            if (!isRedemption) {
                updatedScoreLog[currentIndex] = "red";
                updatedMistakes.push(q);
                if (userId && !invisibleMode) {
                    mistakeService.addMistake(userId, {
                        practiceId,
                        unit: `${unit || practiceId} (${activeChallenge.title})`,
                        practiceType: 'phonics-ninja',
                        question: q,
                        textbook
                    });
                }
            }
        }

        setScoreLog(updatedScoreLog);
        setMistakeQueue(updatedMistakes);
    }, [locked, selectedOption, selectedOptions, options, q, countdownTimer, mistakeQueue, scoreLog, isRedemption, currentIndex, playSfx, invisibleMode, hintUsed, userId, practiceId, unit, activeChallenge, textbook]);

    checkAnswerRef.current = checkAnswer;

    const finishChallenge = useCallback(async () => {
        setCompleted(true);
        const greenCount = scoreLog.filter(s => s === 'green' || s === 'yellow').length;
        const total = activeChallenge.questions.length;
        const percent = total > 0 ? Math.round((greenCount / total) * 100) : 0;
        setFinalScore(percent);

        if (!invisibleMode) {
            await syncRecord(percent, true);
            if (userId) {
                mistakeService.syncToServer(userId);
            }
        }
    }, [scoreLog, activeChallenge, invisibleMode, userId]);

    const nextQuestion = useCallback(() => {
        if (!isRedemption) {
            if (currentIndex < queue.length - 1) {
                const nextIdx = currentIndex + 1;
                loadQuestion(queue[nextIdx], false, nextIdx);
            } else {
                if (mistakeQueue.length > 0) {
                    const firstMistake = mistakeQueue[0];
                    setIsRedemption(true);
                    setQueue([...mistakeQueue]);
                    loadQuestion(firstMistake, true, 0);
                } else {
                    finishChallenge();
                }
            }
        } else {
            if (mistakeQueue.length > 0) {
                const firstMistake = mistakeQueue[0];
                setQueue([...mistakeQueue]);
                loadQuestion(firstMistake, true, 0);
            } else {
                finishChallenge();
            }
        }
    }, [isRedemption, currentIndex, queue, mistakeQueue, loadQuestion, finishChallenge]);

    const closeHintModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowHintModal(false);
            setIsClosing(false);
            if (hintIntervalRef.current) {
                clearInterval(hintIntervalRef.current);
                hintIntervalRef.current = null;
            }
        }, 200);
    };

    const handleShowHint = () => {
        setHintUsed(true);
        setShowHintModal(true);
        setHintTimeLeft(5);
        
        if (hintIntervalRef.current) clearInterval(hintIntervalRef.current);
        
        let secondsLeft = 5;
        hintIntervalRef.current = window.setInterval(() => {
            secondsLeft -= 1;
            setHintTimeLeft(secondsLeft);
            if (secondsLeft <= 0) {
                closeHintModal();
            }
        }, 1000);
    };

    const renderMarkdownFocus = (mdText?: string) => {
        if (!mdText) return null;
        const lines = mdText.split('\n');
        let tableRows: string[][] = [];
        let blockquoteLines: string[] = [];

        const nodes: any[] = [];
        let keyIdx = 0;

        const flushTable = () => {
            if (tableRows.length > 0) {
                const header = tableRows[0];
                const isSeparator = (row: string[]) => row.every(c => /^:?-+:?$/.test(c.trim()));
                const bodyRows = tableRows.slice(1).filter(r => !isSeparator(r));
                nodes.push(
                    <table key={`table-${keyIdx++}`}>
                        <thead>
                            <tr>
                                {header.map((col, ci) => <th key={ci}>{renderPromptText(col.trim())}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {bodyRows.map((row, ri) => (
                                <tr key={ri}>
                                    {row.map((col, ci) => <td key={ci}>{renderPromptText(col.trim())}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
                tableRows = [];
            }
        };

        const flushBlockquote = () => {
            if (blockquoteLines.length > 0) {
                nodes.push(
                    <blockquote key={`bq-${keyIdx++}`}>
                        {blockquoteLines.map((line, li) => (
                            <div key={li} style={{ margin: '4px 0' }}>{renderPromptText(line)}</div>
                        ))}
                    </blockquote>
                );
                blockquoteLines = [];
            }
        };

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                flushBlockquote();
                const cells = trimmed.split('|').slice(1, -1);
                tableRows.push(cells);
            } else if (trimmed.startsWith('>')) {
                flushTable();
                blockquoteLines.push(trimmed.replace(/^>\s*/, ''));
            } else if (trimmed.startsWith('###')) {
                flushTable();
                flushBlockquote();
                nodes.push(<h4 key={`h-${keyIdx++}`} style={{ margin: '8px 0', color: '#0369a1' }}>{renderPromptText(trimmed.replace(/^###\s*/, ''))}</h4>);
            } else if (trimmed) {
                flushTable();
                flushBlockquote();
                nodes.push(<div key={`p-${keyIdx++}`} style={{ margin: '6px 0' }}>{renderPromptText(trimmed)}</div>);
            }
        });

        flushTable();
        flushBlockquote();
        return nodes;
    };

    if (!activeChallenge) {
        return (
            <div className="pn-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="pn-screen">
                    <ShellHeader
                        title={data.title || 'Phonics Ninja'}
                        level={data.level}
                        textbook={textbook}
                        unit={unit}
                        prefix="pn"
                    />

                    {data.focus && (
                        <div className="pn-focus-banner">
                            <button className="pn-focus-toggle-btn" onClick={() => setShowFocusGuide(!showFocusGuide)}>
                                <span>🔤 单元发音与辨音要点 (Phonics Focus)</span>
                                <span>{showFocusGuide ? '▲ 收起' : '▼ 展开'}</span>
                            </button>
                            {showFocusGuide && (
                                <div className="pn-focus-content">
                                    {renderMarkdownFocus(data.focus)}
                                </div>
                            )}
                        </div>
                    )}

                    <InvisibleModeCheckbox
                        checked={invisibleMode}
                        onChange={setInvisibleMode}
                    />

                    <ChallengeCardGrid
                        challenges={data.challenges || []}
                        onStart={handleChallengeSelect}
                        invisibleMode={invisibleMode}
                        onShowHistory={(c) => {
                            const s = getStats(c.title);
                            setHistoryModal({ title: `TODAY - ${c.title}`, logs: s.todayLogs });
                        }}
                        getRemainingTrials={(cId) => trialsTracker.getRemainingTrials(practiceId, cId)}
                        getChallengeStatsText={(c) => {
                            const s = getStats(c.title);
                            return {
                                today: `${s.todayRuns} Runs | Best: ${s.todayBest}%`,
                                lifetime: `${s.lifeRuns} Runs | Best: ${s.lifeBest}%`,
                                isTodayBestHigh: s.todayBest >= 80
                            };
                        }}
                        isLockedToday={(c) => getStats(c.title).todayBest === 100}
                        flickeringId={flickeringChallengeId}
                        prefix="pn"
                        onResetTrials={(cId) => {
                            trialsTracker.resetTrials(practiceId, cId);
                            setPracticeRecords([...practiceRecords]);
                        }}
                    />

                    {historyModal && (
                        <ShellHistoryModal
                            title={historyModal.title}
                            onClose={() => setHistoryModal(null)}
                            logs={historyModal.logs}
                            prefix="pn"
                        />
                    )}

                    {lockModalOpen && (
                        <DailyLockModal onClose={() => setLockModalOpen(false)} />
                    )}
                </div>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="pn-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="pn-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '6px 0 14px 0', color: '#1e293b', fontSize: '1.4rem', fontWeight: 'bold' }}>
                        {getEncouragementMessage(finalScore).title}
                    </h2>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '8px 16px',
                        marginBottom: '16px',
                        maxWidth: '400px',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        {invisibleMode ? (
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                                👻 Invisible Practice (Score not saved)
                            </span>
                        ) : (
                            <>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0284c7' }}>⚡ +{gainedXp} XP</span>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e11d48' }}>❤️ +{gainedLove} LOVE</span>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ca8a04' }}>🪙 +1 Coin</span>
                            </>
                        )}
                    </div>

                    <QuestionReviewList items={questionResults} maxHeight="clamp(340px, 50vh, 560px)" />

                    <CompleteScreenActions
                        remainingTrials={trialsTracker.getRemainingTrials(practiceId, activeChallenge.id)}
                        onBack={() => {
                            setLastFinishedChallengeId(activeChallenge.id);
                            setActiveChallenge(null);
                            setCompleted(false);
                            loadRecords();
                        }}
                        onTryAgain={(overrideInvisible) => {
                            if (overrideInvisible !== undefined) {
                                setInvisibleMode(overrideInvisible);
                            }
                            handleChallengeSelect(activeChallenge, overrideInvisible);
                        }}
                        prefix="pn"
                        isLockedToday={getStats(activeChallenge.title).todayBest === 100}
                        invisibleMode={invisibleMode}
                    />
                </div>
            </div>
        );
    }

    if (!q) return null;

    const originalText = isRedemption
        ? (mistakeQueue.length === 0 ? "Finish" : "Continue")
        : (currentIndex >= queue.length - 1 && mistakeQueue.length === 0 ? "Finish" : "Continue");

    return (
        <div className="pn-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="pn-screen">
                <ActiveHeader
                    onClose={() => {
                        countdownTimer.pause();
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeChallenge.id);
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this challenge today!`)) {
                            if (userId && !invisibleMode) {
                                mistakeService.syncToServer(userId);
                            }
                            setActiveChallenge(null);
                            loadRecords();
                        } else {
                            if (!locked) countdownTimer.resume();
                        }
                    }}
                    countdownTimer={{
                        secondsLeft: countdownTimer.secondsLeft,
                        totalSeconds: 25,
                        isRunning: countdownTimer.isRunning
                    }}
                    invisibleMode={invisibleMode}
                    queue={queue}
                    currentIndex={currentIndex}
                    scoreLog={scoreLog}
                    showFeedback={showFeedback}
                    isRedemption={isRedemption}
                    currentQuestion={q}
                    prefix="pn"
                />

                <div className="pn-question-area">
                    <div className="pn-prompt-container">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div className="pn-prompt-type" style={{ margin: 0 }}>{q.category ? q.category.replace(/-/g, ' ').toUpperCase() : 'PHONICS'}</div>
                            <button className="pn-prompt-hint-btn" onClick={handleShowHint}>💡</button>
                        </div>
                        <div className="pn-prompt-val">{renderPromptText(q.prompt)}</div>
                    </div>

                    <div className={`pn-options-grid ${isMultiSelect ? 'multi-grid' : ''}`}>
                        {options.map((opt: any, idx: number) => {
                            let classes = "pn-option-btn ";
                            const targetAnswers = Array.isArray(q.answer) ? q.answer : [q.answer];
                            const isSelected = isMultiSelect 
                                ? selectedOptions.includes(opt.originalIdx) 
                                : selectedOption === opt.originalIdx;
                            const isCorrectOpt = targetAnswers.includes(opt.originalIdx);

                            if (locked) {
                                if (isCorrectOpt) {
                                    classes += "correct ";
                                } else if (isSelected) {
                                    classes += "wrong ";
                                }
                            } else {
                                if (isSelected) {
                                    classes += "selected ";
                                }
                            }

                            return (
                                <button
                                    key={`${opt.text}-${opt.originalIdx}`}
                                    className={classes}
                                    onClick={() => handleOptionClick(opt.originalIdx)}
                                    disabled={locked}
                                >
                                    <span className="pn-option-marker">{isMultiSelect ? (isSelected ? '✓' : idx + 1) : idx + 1}</span>
                                    <span>{renderPromptText(opt.text)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`pn-feedback-area ${showFeedback ? 'visible ' + (isCorrectFeedback ? 'correct' : 'wrong') : ''}`}>
                    {showFeedback && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <h3 className="pn-feedback-title" style={{ color: isCorrectFeedback ? '#10b981' : '#ef4444' }}>
                                    {isCorrectFeedback ? 'Excellent!' : 'Incorrect'}
                                </h3>
                            </div>
                            <p className="pn-feedback-msg">
                                {isCorrectFeedback ? 'Great job!' : (
                                    <>Correct Answer: {
                                        (Array.isArray(q.answer) ? q.answer : [q.answer])
                                            .sort((a: number, b: number) => a - b)
                                            .map((ansIdx: number, i: number) => (
                                                <React.Fragment key={ansIdx}>
                                                    {i > 0 && ', '}
                                                    {renderPromptText(q.options[ansIdx])}
                                                </React.Fragment>
                                            ))
                                    }</>
                                )}
                            </p>
                            <div className="pn-feedback-explanation">
                                <strong>解析:</strong> {renderPromptText(q.explanation)}
                            </div>
                        </>
                    )}
                </div>

                <FooterAction
                    locked={locked}
                    disableCheck={isMultiSelect ? selectedOptions.length === 0 : selectedOption === null}
                    continueDisabled={continueDisabled}
                    onCheck={() => checkAnswer()}
                    onContinue={nextQuestion}
                    buttonText={originalText}
                    prefix="pn"
                />

                {(showHintModal || isClosing) && (
                    <div className={`gw-modal-overlay${isClosing ? ' closing' : ''}`} onClick={closeHintModal}>
                        <div className={`gw-modal-content${isClosing ? ' closing' : ''}`} onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: primaryColor }}>
                                    💡 Hint (发音提示) <span style={{ fontSize: '0.9rem', color: '#999', marginLeft: '6px' }}>({hintTimeLeft}s)</span>
                                </span>
                                <button className="gw-close-btn" style={{ margin: 0, width: 'auto', fontSize: '1.2rem' }} onClick={closeHintModal}>✕</button>
                            </div>
                            <div style={{ fontSize: '1.05rem', color: '#333', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                {renderPromptText(q?.hint || '请仔细根据所学发音规律与开/闭音节规则进行判断。')}
                            </div>
                        </div>
                    </div>
                )}

                {lockModalOpen && (
                    <DailyLockModal onClose={() => setLockModalOpen(false)} />
                )}
            </div>
        </div>
    );
}
