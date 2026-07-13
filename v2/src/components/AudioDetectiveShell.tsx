import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './AudioDetectiveShell.css'
import { DailyLockModal } from './DailyLockModal'
import { getAudioUrl, shuffle, usePracticeAudio } from '../lib/practiceAudio'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { useNavigationBlocker } from '../lib/useNavigationBlocker'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ActiveHeader } from './shell/ActiveHeader'
import { FooterAction } from './shell/FooterAction'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { CompleteScreenActions } from './shell/CompleteScreenActions'

export function AudioDetectiveShell({ data, practiceId, unit, textbook }: any) {
    const isCf = data?.tts?.by === 'melotts'
    const { data: session } = useSession()
    const userId = session?.user?.id

    const { playSfx, resolveAudioUrl, audioRef } = usePracticeAudio(textbook, () => isCf)

    const [activeSection, setActiveSection] = useState<any>(null)
    const [queue, setQueue] = useState<any[]>([])
    const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog] = useState<Array<string | null>>([])

    const [isRedemption, setIsRedemption] = useState(false)
    const [q, setQ] = useState<any>(null)
    const [options, setOptions] = useState<any[]>([])

    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [locked, setLocked] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [finalScore, setFinalScore] = useState(0)
    const [showFeedback, setShowFeedback] = useState(false)
    const [continueDisabled, setContinueDisabled] = useState(false)
    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)
    const hasFinishedRef = useRef(false)
    const lastPlayedQuestionId = useRef<string | null>(null)
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [gainedXp, setGainedXp] = useState(0)
    const [gainedLove, setGainedLove] = useState(0)
    const [historicalBest, setHistoricalBest] = useState(0)
    const [isNewHigh, setIsNewHigh] = useState(false)
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)
    const [lastFinishedSectionTitle, setLastFinishedSectionTitle] = useState<string | null>(null)
    const [flickeringSectionTitle, setFlickeringSectionTitle] = useState<string | null>(null)

    // Play audio states
    const [playCount, setPlayCount] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playedAfterCheck, setPlayedAfterCheck] = useState(false)

    const timerExpiredRef = useRef(false);
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => { });

    // 10s countdown timer
    const countdownTimer = useCountdown(10, {
        onExpire: () => {
            if (timerExpiredRef.current) return;
            timerExpiredRef.current = true;
            checkAnswerRef.current(true);
        }
    });

    const [isOptionsBlurred, setIsOptionsBlurred] = useState(false)
    const isFirstPlayRef = useRef(true)
    const transitioningRef = useRef(false)

    useEffect(() => {
        transitioningRef.current = false;
    }, [q]);

    const revealOptions = useCallback(() => {
        isFirstPlayRef.current = false;
        setIsOptionsBlurred(false);
        if (!invisibleMode) {
            countdownTimer.resume();
        }
    }, [invisibleMode, countdownTimer]);

    const playSentenceAudio = async (text: string, isAutoPlayAfterCheck = false) => {
        if (!text || !textbook) return;

        if (locked && !isAutoPlayAfterCheck) {
            if (playedAfterCheck) return;
        } else if (!locked) {
            if (playCount >= 3) return;
        }

        setIsPlaying(true);
        const url = resolveAudioUrl(getAudioUrl(text, textbook));
        try {
            const blob = await audioCache.cacheAudio(url);
            if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                if (audioRef.current) {
                    audioRef.current.src = blobUrl;
                } else {
                    audioRef.current = new Audio(blobUrl);
                }

                audioRef.current.onended = () => {
                    URL.revokeObjectURL(blobUrl);
                    setIsPlaying(false);
                    if (isFirstPlayRef.current) {
                        isFirstPlayRef.current = false;
                        setIsOptionsBlurred(false);
                        if (!invisibleMode) {
                            countdownTimer.resume();
                        }
                    }
                };
                audioRef.current.onerror = () => {
                    setIsPlaying(false);
                    if (isFirstPlayRef.current) {
                        isFirstPlayRef.current = false;
                        setIsOptionsBlurred(false);
                        if (!invisibleMode) {
                            countdownTimer.resume();
                        }
                    }
                };

                if (locked) {
                    if (!isAutoPlayAfterCheck) {
                        setPlayedAfterCheck(true);
                    }
                } else {
                    setPlayCount(prev => prev + 1);
                }
                audioRef.current.play().catch(e => {
                    console.warn("Failed to play sentence audio:", e);
                    setIsPlaying(false);
                });
            } else {
                setIsPlaying(false);
            }
        } catch (e) {
            console.warn("Play sentence audio error:", e);
            setIsPlaying(false);
        }
    }

    // Set up navigation blocker
    useNavigationBlocker(!!activeSection && !completed);

    // Auto play audio when question changes and is not checked yet
    useEffect(() => {
        if (q && activeSection && !completed && lastPlayedQuestionId.current !== q.id) {
            lastPlayedQuestionId.current = q.id;
            const timer = setTimeout(() => {
                playSentenceAudio(q.en);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [q, activeSection, completed]);

    useEffect(() => {
        if (!activeSection && lastFinishedSectionTitle) {
            setFlickeringSectionTitle(lastFinishedSectionTitle);
            setTimeout(() => {
                const el = document.getElementById(`det-card-${lastFinishedSectionTitle.toLowerCase().replace(/\s+/g, '-')}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);

            const timer = setTimeout(() => {
                setFlickeringSectionTitle(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [activeSection, lastFinishedSectionTitle]);

    const primaryColor = data.primaryColor || '#4f46e5'
    const primaryDarkColor = data.primaryColorDark || '#3730a3'

    const loadRecords = async () => {
        try {
            const cached = cache.getRecords()
            if (cached) {
                setPracticeRecords(cached)
            }
            const res = await fetch(API_URL + '/api/records', { credentials: 'include' })
            const json = await res.json()
            if (Array.isArray(json)) {
                cache.setRecords(json)
                setPracticeRecords(json)
            }
        } catch (e) {
            console.error("Failed to load records", e)
        }
    }

    useEffect(() => {
        loadRecords();
    }, []);

    const getStats = useCallback((sectionTitle: string) => {
        const u = `${practiceId} (${sectionTitle})`
        const logs = practiceRecords.filter(r => r.unit === u && !r.unfinished)

        const todayStr = new Date().toLocaleDateString()
        const todayLogs = logs.filter(r => new Date(r.createdAt).toLocaleDateString() === todayStr)

        const todayBest = todayLogs.length > 0 ? Math.max(...todayLogs.map(t => t.score)) : 0
        const lifeBest = logs.length > 0 ? Math.max(...logs.map(t => t.score)) : 0

        return {
            todayRuns: todayLogs.length,
            todayBest,
            lifeRuns: logs.length,
            lifeBest,
            todayLogs,
            lifeLogs: logs
        }
    }, [practiceRecords, practiceId]);

    const handleSectionSelect = (sec: any) => {
        const stats = getStats(sec.title);
        if (stats.todayBest === 100) {
            setLockModalOpen(true);
            return;
        }
        const challengeId = sec.title.toLowerCase().replace(/\s+/g, '-');
        const hasConsumed = trialsTracker.consumeTrial(practiceId, challengeId);
        if (!hasConsumed) return;

        setActiveSection(sec);
        setActiveRecordId(null);
        setGainedXp(0);
        setGainedLove(0);
        recordIdPromiseRef.current = null;
        hasFinishedRef.current = false;
        lastPlayedQuestionId.current = null;

        // Deduplicate sentences by their English text ('en')
        const uniqueSentences: any[] = [];
        const seenEn = new Set<string>();
        for (const s of sec.sentences) {
            const cleaned = (s.en || '').trim();
            if (cleaned && !seenEn.has(cleaned)) {
                seenEn.add(cleaned);
                uniqueSentences.push(s);
            }
        }

        // Shuffle sentences
        const shuffled = shuffle([...uniqueSentences]).map((s: any, i: number) => ({ ...s, originalIndex: i }));
        setQueue(shuffled);
        setMistakeQueue([]);
        setCurrentIndex(0);
        setScoreLog(new Array(uniqueSentences.length).fill(null));
        setCompleted(false);

        loadQuestion(shuffled, [], 0, false);
    }

    const loadQuestion = (currentQueue: any[], currentMistakes: any[], index: number, redemption: boolean) => {
        let nextQ = null;
        let isRedemp = redemption;

        if (index < currentQueue.length) {
            nextQ = currentQueue[index];
            isRedemp = false;
        } else if (currentMistakes.length > 0) {
            nextQ = currentMistakes[0];
            isRedemp = true;
        } else {
            finishGame(currentQueue);
            return;
        }

        setQ(nextQ);
        setIsRedemption(isRedemp);
        setSelectedOption(null);
        setLocked(false);
        setShowFeedback(false);
        timerExpiredRef.current = false;
        setPlayCount(0);
        setPlayedAfterCheck(false);
        setIsPlaying(false);
        lastPlayedQuestionId.current = null;
        setIsOptionsBlurred(true);
        isFirstPlayRef.current = true;

        // Shuffled options
        const selectedOptions = nextQ.options.map((text: string, idx: number) => ({ text, originalIdx: idx }));
        setOptions(shuffle(selectedOptions));

        if (!invisibleMode) {
            countdownTimer.reset();
            countdownTimer.pause();
        } else {
            countdownTimer.pause();
        }
    }

    const syncRecord = async (scorePercent: number, isFinished: boolean) => {
        if (invisibleMode) return;
        try {
            const unitName = `${practiceId} (${activeSection.title})`;
            if (activeRecordId) {
                const res = await fetch(`${API_URL}/api/records/${activeRecordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: unitName,
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
                    setPracticeRecords([...(cache.getRecords() || [])]);
                }
            } else if (recordIdPromiseRef.current) {
                const recordId = await recordIdPromiseRef.current;
                const res = await fetch(`${API_URL}/api/records/${recordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: unitName,
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
                    setPracticeRecords([...(cache.getRecords() || [])]);
                }
            } else {
                const postPromise = (async () => {
                    const res = await fetch(`${API_URL}/api/records`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            unit: unitName,
                            score: scorePercent,
                            unfinished: !isFinished
                        })
                    });
                    const j = await res.json();
                    if (j.success && j.id) {
                        setActiveRecordId(j.id);
                        cache.updateRecord({
                            id: j.id,
                            unit: unitName,
                            score: scorePercent,
                            unfinished: !isFinished,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        } as any);
                        return j.id as string;
                    }
                    throw new Error("Failed to create record");
                })();

                recordIdPromiseRef.current = postPromise;
                await postPromise;
            }
        } catch (e) {
            console.error("Failed to sync record", e);
        }
    }

    const checkAnswer = useCallback((forceWrong?: boolean, overrideOption?: number | null) => {
        if (locked) return;
        const currentSelectedOption = overrideOption !== undefined ? overrideOption : selectedOption;
        if (!forceWrong && currentSelectedOption === null) return;
        setLocked(true);
        countdownTimer.pause();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        setContinueDisabled(true);
        setTimeout(() => setContinueDisabled(false), 2000); // disable continue button for 2 seconds

        const isCorrect = !forceWrong && currentSelectedOption === q.answer;
        setShowFeedback(true);

        let updatedMistakes = [...mistakeQueue];
        let updatedScoreLog = [...scoreLog];

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
                updatedScoreLog[currentIndex] = scoreType;
            }
        } else {
            playSfx('wrong');
            if (!isRedemption) {
                updatedScoreLog[currentIndex] = "red";
                updatedMistakes.push(q);
                if (userId) {
                    mistakeService.addMistake(userId, {
                        practiceId,
                        textbook,
                        unit,
                        practiceType: 'audio-detective',
                        question: q,
                        wrongAnswer: currentSelectedOption !== null && currentSelectedOption !== undefined ? q.options[currentSelectedOption] : undefined
                    });
                }
            } else {
                const missed = updatedMistakes.shift();
                updatedMistakes.push(missed);
            }
        }

        setMistakeQueue(updatedMistakes);
        setScoreLog(updatedScoreLog);

        const totalScore = updatedScoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1;
            return acc;
        }, 0);

        const scorePercent = Math.round((totalScore / queue.length) * 100);
        if (!invisibleMode) {
            const isLastMain = !isRedemption && currentIndex === queue.length - 1;
            syncRecord(scorePercent, isLastMain);
        }

        // Auto play the audio again after check
        setTimeout(() => {
            playSentenceAudio(q.en, true);
        }, 600);
    }, [locked, selectedOption, q, mistakeQueue, scoreLog, currentIndex, isRedemption, queue.length, countdownTimer, userId, practiceId, textbook, unit, invisibleMode]);

    useEffect(() => { checkAnswerRef.current = checkAnswer }, [checkAnswer]);

    const nextQuestion = () => {
        if (transitioningRef.current) return;
        transitioningRef.current = true;

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        let nextIndex = currentIndex;
        if (!isRedemption) {
            nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
        }
        loadQuestion(queue, mistakeQueue, nextIndex, isRedemption);
    }

    const finishGame = async (finalQueue: any[]) => {
        setCompleted(true);

        const totalScore = scoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1;
            return acc;
        }, 0);

        const scorePercent = Math.round((totalScore / finalQueue.length) * 100);
        setFinalScore(scorePercent);

        const u = `${practiceId} (${activeSection.title})`;
        const logs = practiceRecords.filter(r => r.unit === u);
        const histBest = logs.length > 0 ? Math.max(...logs.map(t => t.score)) : 0;
        setHistoricalBest(histBest);
        setIsNewHigh(histBest === 0 ? scorePercent > 0 : scorePercent > histBest);

        if (!invisibleMode) {
            petService.awardQuizCompletion();
            syncRecord(scorePercent, true);
            petService.syncWithServer();
        }
        setLastFinishedSectionTitle(activeSection.title);
        loadRecords();
    }

    const handleOptionClick = (originalIdx: number) => {
        if (locked) return;
        setSelectedOption(originalIdx);
        checkAnswer(false, originalIdx);
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeSection || completed || historyModal) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!locked) {
                    if (selectedOption !== null) {
                        checkAnswer();
                    }
                } else {
                    if (!continueDisabled) {
                        nextQuestion();
                    }
                }
            } else if (!locked && !isOptionsBlurred && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const idx = parseInt(e.key, 10) - 1;
                if (options[idx]) {
                    handleOptionClick(options[idx].originalIdx);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection, completed, historyModal, locked, selectedOption, continueDisabled, nextQuestion, checkAnswer, options, isOptionsBlurred]);

    // Format mapped challenges for ChallengeCardGrid
    const mappedChallenges = useMemo(() => {
        return data.sections.map((sec: any) => ({
            ...sec,
            id: sec.title.toLowerCase().replace(/\s+/g, '-'),
            icon: sec.icon || '🕵️'
        }));
    }, [data.sections]);

    const formattedLevel = useMemo(() => {
        return [
            data.level ? data.level.replace(/[-–—－\s]+$/, '').trim() : '',
            data.part ? data.part.replace(/[-–—－\s]+$/, '').trim() : ''
        ].filter(Boolean).join(' - ');
    }, [data.level, data.part]);

    // --- RENDER Lobby Screen ---
    if (!activeSection) {
        return (
            <div className="det-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="det-screen">
                    <ShellHeader
                        title="Audio Detective"
                        level={formattedLevel}
                        textbook={textbook}
                        unit={unit}
                        prefix="det"
                    />

                    <InvisibleModeCheckbox
                        checked={invisibleMode}
                        onChange={setInvisibleMode}
                    />

                    <ChallengeCardGrid
                        challenges={mappedChallenges}
                        onStart={handleSectionSelect}
                        onShowHistory={(c) => {
                            const stats = getStats(c.title);
                            setHistoryModal({
                                title: `TODAY - ${c.title}`,
                                logs: stats.todayLogs
                            });
                        }}
                        getRemainingTrials={(cId) => trialsTracker.getRemainingTrials(practiceId, cId)}
                        getChallengeStatsText={(c) => {
                            const stats = getStats(c.title);
                            return {
                                today: `${stats.todayRuns} Runs | Best: ${stats.todayBest}%`,
                                lifetime: `${stats.lifeRuns} Runs | Best: ${stats.lifeBest}%`,
                                isTodayBestHigh: stats.todayBest >= 80
                            };
                        }}
                        isLockedToday={(c) => getStats(c.title).todayBest === 100}
                        flickeringId={flickeringSectionTitle ? flickeringSectionTitle.toLowerCase().replace(/\s+/g, '-') : null}
                        prefix="det"
                        invisibleMode={invisibleMode}
                    />
                </div>

                {historyModal && (
                    <ShellHistoryModal
                        title={historyModal.title}
                        onClose={() => setHistoryModal(null)}
                        logs={historyModal.logs}
                        prefix="det"
                    />
                )}

                {lockModalOpen && (
                    <DailyLockModal onClose={() => setLockModalOpen(false)} />
                )}
            </div>
        )
    }

    // --- RENDER Complete Screen ---
    if (completed) {
        const challengeId = activeSection.title.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="det-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="det-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '5px 0 10px 0', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>Challenge Complete!</h2>

                    <div style={{ margin: '10px 0 20px 0', fontSize: '1rem', color: '#555' }}>
                        {invisibleMode ? (
                            <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                                Practice Mode (Invisible). Score not saved.
                            </div>
                        ) : isNewHigh ? (
                            <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                                🎉 New High Score! You've set a new record!
                            </div>
                        ) : (
                            <div>
                                Keep trying! Your highest score is <strong style={{ color: 'var(--primary)' }}>{historicalBest}%</strong>. You can do even better!
                            </div>
                        )}
                    </div>

                    <div style={{
                        width: '100%',
                        maxWidth: '400px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '16px 20px',
                        marginBottom: '20px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                        {invisibleMode ? (
                            <div style={{ color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic' }}>
                                Practice Mode active. No rewards are awarded.
                            </div>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Rewards Earned</h3>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.8rem', marginBottom: '2px' }}>⚡</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0284c7' }}>+{gainedXp} XP</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.8rem', marginBottom: '2px' }}>❤️</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e11d48' }}>+{gainedLove} ❤️</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.8rem', marginBottom: '2px' }}>🪙</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ca8a04' }}>+1 Coin</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {mistakeQueue.length > 0 && (
                        <div className="det-mistakes-review" style={{ marginBottom: '25px', width: '100%', maxWidth: '400px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#475569', margin: '0 0 10px 0', textAlign: 'left' }}>Mistake Review</h3>
                            <div className="det-mistake-list">
                                {mistakeQueue.map((item, idx) => (
                                    <div key={idx} className="det-mistake-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p className="det-mistake-en">{item.en}</p>
                                            <button
                                                className="det-play-audio-btn small"
                                                onClick={() => {
                                                    const url = getAudioUrl(item.en, textbook, isCf);
                                                    const audio = new Audio(url);
                                                    audio.play().catch(e => console.warn(e));
                                                }}
                                            >
                                                🔊
                                            </button>
                                        </div>
                                        <p className="det-mistake-cn">{item.options[item.answer]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <CompleteScreenActions
                        remainingTrials={trialsTracker.getRemainingTrials(practiceId, challengeId)}
                        onBack={() => {
                            setLastFinishedSectionTitle(activeSection.title)
                            setActiveSection(null)
                            setCompleted(false)
                            loadRecords()
                        }}
                        onTryAgain={(overrideInvisible) => {
                            if (overrideInvisible !== undefined) {
                                setInvisibleMode(overrideInvisible);
                            }
                            handleSectionSelect(activeSection);
                        }}
                        prefix="det"
                        isLockedToday={getStats(activeSection.title).todayBest === 100}
                        invisibleMode={invisibleMode}
                    />
                </div>
            </div>
        )
    }

    // --- RENDER Gameplay Screen ---
    const isLastQuestion = isRedemption
        ? (mistakeQueue.length === 0)
        : (currentIndex + 1 >= queue.length && mistakeQueue.length === 0);

    return (
        <div className="det-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="det-screen gameplay">
                <ActiveHeader
                    onClose={() => {
                        countdownTimer.pause()
                        const challengeId = activeSection.title.toLowerCase().replace(/\s+/g, '-');
                        const rem = trialsTracker.getRemainingTrials(practiceId, challengeId);
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this challenge today!`)) {
                            if (userId && !invisibleMode) {
                                mistakeService.syncToServer(userId);
                            }
                            setActiveSection(null);
                            loadRecords();
                        } else {
                            if (!locked) countdownTimer.resume()
                        }
                    }}
                    countdownTimer={{
                        secondsLeft: countdownTimer.secondsLeft,
                        totalSeconds: 10,
                        isRunning: countdownTimer.isRunning
                    }}
                    invisibleMode={invisibleMode}
                    queue={queue}
                    currentIndex={currentIndex}
                    scoreLog={scoreLog}
                    showFeedback={showFeedback}
                    isRedemption={isRedemption}
                    currentQuestion={q}
                    prefix="det"
                />

                <div className="det-question-card">
                    <div className="det-detective-avatar">
                        🕵️‍♂️
                    </div>

                    <div className="det-audio-control-card">
                        <button
                            className={`det-detective-audio-btn ${isPlaying ? 'playing' : ''} ${(locked ? playedAfterCheck : playCount >= 3) ? 'disabled' : ''}`}
                            onClick={() => playSentenceAudio(q.en)}
                            disabled={(locked ? playedAfterCheck : playCount >= 3) || isPlaying}
                        >
                            <span className="det-detective-icon">{isPlaying ? '🎧' : '🔊'}</span>
                            <span className="det-detective-status">
                                {isPlaying ? 'Listening...' : 'Play Audio'}
                            </span>
                        </button>
                        <div className="det-play-counter">
                            {locked ? (playedAfterCheck ? '0 plays remaining' : '1 review play remaining') : `${3 - playCount} plays remaining`}
                        </div>
                    </div>
                </div>

                <div className="det-options-wrapper" style={{ position: 'relative' }}>
                    {isOptionsBlurred && (
                        <div
                            className="det-options-blur-overlay"
                            onClick={revealOptions}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 10,
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                border: '2px dashed var(--primary)',
                                padding: '20px',
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <span style={{ fontSize: '1.5rem' }}>🕵️‍♂️</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}>
                                点击显示选项并开始计时
                            </span>
                        </div>
                    )}
                    <div className="det-options-container" style={isOptionsBlurred ? { filter: 'blur(8px)', pointerEvents: 'none' } : {}}>
                        {options.map((opt, index) => {
                            const isSelected = selectedOption === opt.originalIdx;
                            const isCorrectAnswer = opt.originalIdx === q.answer;
                            let optionClass = "det-option-btn";
                            if (locked) {
                                if (isCorrectAnswer) {
                                    optionClass += " correct-answer";
                                } else if (isSelected) {
                                    optionClass += " wrong-answer";
                                } else {
                                    optionClass += " disabled-answer";
                                }
                            } else if (isSelected) {
                                optionClass += " selected-answer";
                            }

                            return (
                                <button
                                    key={index}
                                    className={optionClass}
                                    onClick={() => handleOptionClick(opt.originalIdx)}
                                    disabled={locked}
                                >
                                    <span className="det-option-number">{index + 1}</span>
                                    <span className="det-option-text">{opt.text}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Show corresponding English sentence AFTER check is clicked */}
                <div className={`det-revealed-sentence ${locked ? 'revealed' : 'hidden'}`}>
                    <p className="det-revealed-speaker">{q.speaker ? `${q.speaker}: ` : ''}</p>
                    <p className="det-revealed-text">{q.en}</p>
                </div>

                <FooterAction
                    locked={locked}
                    disableCheck={selectedOption === null}
                    continueDisabled={continueDisabled}
                    onCheck={() => checkAnswer()}
                    onContinue={isLastQuestion ? () => finishGame(queue) : () => nextQuestion()}
                    buttonText={isLastQuestion ? "Finish" : "Continue"}
                    prefix="det"
                    noCheckButton={true}
                />
            </div>
        </div>
    )
}
