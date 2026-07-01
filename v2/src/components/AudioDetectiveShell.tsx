import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import './AudioDetectiveShell.css'
import { DailyLockModal } from './DailyLockModal'
import md5 from 'md5'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { CountdownRing } from './CountdownRing'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string, isCf?: boolean) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${isCf ? 'cf/' : ''}${hash}.mp3`;
}

function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

export function AudioDetectiveShell({ data, practiceId, unit, textbook }: any) {
    const isCf = data?.tts?.by === 'melotts'
    const { data: session } = useSession()
    const userId = session?.user?.id
    const sentenceAudioRef = useRef<HTMLAudioElement | null>(null)
    const sfxRef = useRef<HTMLAudioElement | null>(null)

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
    const [historyModal, setHistoryModal] = useState<{title: string, logs: any[]} | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)
    const [lastFinishedSectionTitle, setLastFinishedSectionTitle] = useState<string | null>(null)
    const [flickeringSectionTitle, setFlickeringSectionTitle] = useState<string | null>(null)
    
    // Play audio states
    const [playCount, setPlayCount] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playedAfterCheck, setPlayedAfterCheck] = useState(false)

    const playSfx = (type: 'correct' | 'wrong') => {
        if (sfxRef.current) {
            sfxRef.current.pause();
        }
        const sfxUrl = type === 'correct' 
            ? "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3"
            : "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3";
        const audio = new Audio(sfxUrl);
        sfxRef.current = audio;
        audio.play().catch(e => console.warn("Failed to play SFX:", e));
    }

    const playSentenceAudio = async (text: string, isAutoPlayAfterCheck = false) => {
        if (!text || !textbook) return;
        
        if (locked && !isAutoPlayAfterCheck) {
            if (playedAfterCheck) return;
        } else if (!locked) {
            if (playCount >= 3) return;
        }

        if (sentenceAudioRef.current) {
            sentenceAudioRef.current.pause();
            sentenceAudioRef.current = null;
        }

        setIsPlaying(true);
        const url = getAudioUrl(text, textbook, isCf);
        try {
            const blob = await audioCache.cacheAudio(url);
            if (blob) {
                const audio = new Audio(URL.createObjectURL(blob));
                sentenceAudioRef.current = audio;
                audio.onended = () => {
                    setIsPlaying(false);
                };
                audio.onerror = () => {
                    setIsPlaying(false);
                };
                if (locked) {
                    if (!isAutoPlayAfterCheck) {
                        setPlayedAfterCheck(true);
                    }
                } else {
                    setPlayCount(prev => prev + 1);
                }
                audio.play().catch(e => {
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

    const blocker = useBlocker(
        ({ nextLocation, currentLocation }) =>
            !!activeSection && !completed && nextLocation.pathname !== currentLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === 'blocked') {
            const proceed = window.confirm('您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。');
            if (proceed) {
                setActiveSection(null);
                blocker.reset();
            } else {
                blocker.reset();
            }
        }
    }, [blocker]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (activeSection && !completed) {
                e.preventDefault();
                e.returnValue = '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。';
                return '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [activeSection, completed]);

    // Auto play audio when question changes and is not checked yet
    useEffect(() => {
        if (q && activeSection && !completed && lastPlayedQuestionId.current !== q.id) {
            lastPlayedQuestionId.current = q.id;
            const timer = setTimeout(() => {
                playSentenceAudio(q.en);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [q, activeSection, completed, playSentenceAudio]);

    useEffect(() => {
        if (!activeSection && lastFinishedSectionTitle) {
            setFlickeringSectionTitle(lastFinishedSectionTitle);
            setTimeout(() => {
                const el = document.getElementById(`ad-card-${lastFinishedSectionTitle.replace(/\s+/g, '-')}`);
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

    const timerExpiredRef = useRef(false);
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {});

    // 10s countdown timer
    const countdownTimer = useCountdown(10, {
        onExpire: () => {
            if (timerExpiredRef.current) return;
            timerExpiredRef.current = true;
            checkAnswerRef.current(true);
        }
    });

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

    const getStats = (sectionTitle: string) => {
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
    }

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

        // Shuffle sentences
        const shuffled = shuffle([...sec.sentences]).map((s: any, i: number) => ({ ...s, originalIndex: i }));
        setQueue(shuffled);
        setMistakeQueue([]);
        setCurrentIndex(0);
        setScoreLog(new Array(sec.sentences.length).fill(null));
        setCompleted(false);

        // Preload SFX
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3");
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3");

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

        // Shuffled options
        const selectedOptions = nextQ.options.map((text: string, idx: number) => ({ text, originalIdx: idx }));
        setOptions(shuffle(selectedOptions));

        if (!invisibleMode) {
            countdownTimer.reset();
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

    const checkAnswer = useCallback((forceWrong?: boolean) => {
        if (locked) return;
        if (!forceWrong && selectedOption === null) return;
        setLocked(true);
        countdownTimer.pause();

        setContinueDisabled(true);
        setTimeout(() => setContinueDisabled(false), 2000); // disable continue button for 2 seconds

        const isCorrect = !forceWrong && selectedOption === q.answer;
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
                        wrongAnswer: selectedOption !== null ? q.options[selectedOption] : undefined
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
            } else if (!locked && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const idx = parseInt(e.key, 10) - 1;
                if (options[idx]) {
                    handleOptionClick(options[idx].originalIdx);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection, completed, historyModal, locked, selectedOption, continueDisabled, nextQuestion, checkAnswer, options]);

    if (!activeSection) {
        return (
            <div className="ad-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="ad-screen">
                    <div className="ad-header">
                        <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                        <h1>Audio Detective</h1>
                        <h2>
                            {[
                                data.level ? data.level.replace(/[-–—－\s]+$/, '').trim() : '',
                                data.part ? data.part.replace(/[-–—－\s]+$/, '').trim() : ''
                            ].filter(Boolean).join(' - ')}
                        </h2>
                    </div>

                    <div className="ad-mode-switch">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={invisibleMode} 
                                onChange={(e) => setInvisibleMode(e.target.checked)}
                            />
                            <span>👻 Invisible Mode (No timer, no records/XP)</span>
                        </label>
                    </div>

                    <div className="ad-section-grid">
                        {data.sections.map((sec: any) => {
                            const stats = getStats(sec.title);
                            const challengeId = sec.title.toLowerCase().replace(/\s+/g, '-');
                            const isLockedToday = stats.todayBest === 100;
                            const isOutOfAttempts = trialsTracker.getRemainingTrials(practiceId, challengeId) === 0;

                            return (
                                <div key={sec.title} id={`ad-card-${challengeId}`} className={`ad-section-card ${flickeringSectionTitle === sec.title ? 'flicker-active' : ''}`}>
                                    <div className="ad-card-header">
                                        <div className="ad-card-title-group">
                                            <span className="ad-card-icon">🕵️</span>
                                            <h3>{sec.title}</h3>
                                            <span className="ad-attempts-left">
                                                {trialsTracker.getRemainingTrials(practiceId, challengeId)} / 5 attempts left
                                            </span>
                                        </div>
                                        <button 
                                            className="ad-start-btn" 
                                            onClick={() => handleSectionSelect(sec)}
                                            style={isLockedToday ? { backgroundColor: '#10b981', borderBottomColor: '#059669', color: '#fff' } : isOutOfAttempts ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                            disabled={isOutOfAttempts && !isLockedToday}
                                        >
                                            {isLockedToday ? 'LOCKED 🔒' : isOutOfAttempts ? 'OUT OF ATTEMPTS' : 'START'}
                                        </button>
                                    </div>
                                    <div className="ad-card-stats">
                                        <div className="ad-stat-row" onClick={() => setHistoryModal({ title: `TODAY - ${sec.title}`, logs: stats.todayLogs })}>
                                            <span className="ad-stat-label">TODAY</span>
                                            <span className="ad-stat-val" style={stats.todayBest >= 80 ? { color: '#10b981', fontWeight: 'bold' } : {}}>{stats.todayRuns} Runs | Best: {stats.todayBest}%</span>
                                        </div>
                                        <div className="ad-stat-row" onClick={() => setHistoryModal({ title: `LIFETIME - ${sec.title}`, logs: stats.lifeLogs })}>
                                            <span className="ad-stat-label">LIFETIME</span>
                                            <span className="ad-stat-val">{stats.lifeRuns} Runs | Best: {stats.lifeBest}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {historyModal && (
                    <div className="ad-modal-overlay" onClick={() => setHistoryModal(null)}>
                        <div className="ad-modal-content" onClick={e => e.stopPropagation()}>
                            <h3 className="ad-modal-title">{historyModal.title}</h3>
                            {historyModal.logs.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                            ) : (
                                <ul className="ad-history-list">
                                    {historyModal.logs.map((log: any, i: number) => {
                                        const d = new Date(log.createdAt);
                                        const isUnfinished = log.unfinished ? ' (Unfinished)' : '';
                                        const now = new Date();
                                        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                        const logMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                        const diffDays = Math.round((todayMidnight.getTime() - logMidnight.getTime()) / 86400000);
                                        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        let dateLabel: string;
                                        if (diffDays === 0) dateLabel = historyModal.title.startsWith('LIFETIME') ? 'Today ' + timeStr : timeStr;
                                        else if (diffDays === 1) dateLabel = 'Yesterday ' + timeStr;
                                        else if (diffDays <= 6) dateLabel = diffDays + ' days ago ' + timeStr;
                                        else dateLabel = d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                                        return (
                                            <li key={log.id || i} className="ad-history-item">
                                                <span className="ad-history-date">{dateLabel}</span>
                                                <span className="ad-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                    {log.score}%{isUnfinished}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <button className="ad-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                        </div>
                    </div>
                )}

                {lockModalOpen && (
                    <DailyLockModal onClose={() => setLockModalOpen(false)} />
                )}
            </div>
        )
    }

    if (completed) {
        return (
            <div className="ad-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="ad-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '5px 0 10px 0', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>Challenge Complete!</h2>
                    
                    {/* High Score / Record Status */}
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

                    {/* Rewards Summary Card */}
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
                        <div className="ad-mistakes-review" style={{ marginBottom: '25px', width: '100%', maxWidth: '400px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#475569', margin: '0 0 10px 0', textAlign: 'left' }}>Mistake Review</h3>
                            <div className="ad-mistake-list">
                                {mistakeQueue.map((item, idx) => (
                                    <div key={idx} className="ad-mistake-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p className="ad-mistake-en">{item.en}</p>
                                            <button 
                                                className="ad-play-audio-btn small" 
                                                onClick={() => {
                                                    const url = getAudioUrl(item.en, textbook, isCf);
                                                    const audio = new Audio(url);
                                                    audio.play().catch(e => console.warn(e));
                                                }}
                                            >
                                                🔊
                                            </button>
                                        </div>
                                        <p className="ad-mistake-cn">{item.options[item.answer]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="ad-actions" style={{ width: '100%', maxWidth: '400px' }}>
                        <button className="ad-action-btn primary" onClick={() => handleSectionSelect(activeSection)}>
                            Try Again
                        </button>
                        <button className="ad-action-btn secondary" onClick={() => { setActiveSection(null); setCompleted(false); }}>
                            Back to Sections
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const isLastQuestion = isRedemption 
        ? (mistakeQueue.length === 0) 
        : (currentIndex + 1 >= queue.length && mistakeQueue.length === 0);

    return (
        <div className="ad-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="ad-screen gameplay">
                <div className="ad-top-bar">
                    <div style={{ position: 'relative', flexShrink: 0, width: 30 }}>
                        <button className="ad-close-btn" onClick={() => {
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
                        }}>✕</button>
                        {!invisibleMode && <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={10} isRunning={countdownTimer.isRunning} />}
                    </div>
                    <div className="ad-progress-container">
                        {queue.map((_, i) => {
                            const isActive = (!isRedemption && i === currentIndex && !showFeedback) || (isRedemption && q && q.originalIndex === i && !showFeedback);
                            return <div key={i} className={`ad-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`} />
                        })}
                    </div>
                </div>

                <div className="ad-question-card">
                    <div className="ad-detective-avatar">
                        🕵️‍♂️
                    </div>
                    
                    <div className="ad-audio-control-card">
                        <button 
                            className={`ad-detective-audio-btn ${isPlaying ? 'playing' : ''} ${(locked ? playedAfterCheck : playCount >= 3) ? 'disabled' : ''}`}
                            onClick={() => playSentenceAudio(q.en)}
                            disabled={(locked ? playedAfterCheck : playCount >= 3) || isPlaying}
                        >
                            <span className="ad-detective-icon">{isPlaying ? '🎧' : '🔊'}</span>
                            <span className="ad-detective-status">
                                {isPlaying ? 'Listening...' : 'Play Audio'}
                            </span>
                        </button>
                        <div className="ad-play-counter">
                            {locked ? (playedAfterCheck ? '0 plays remaining' : '1 review play remaining') : `${3 - playCount} plays remaining`}
                        </div>
                    </div>

                </div>



                <div className="ad-options-container">
                    {options.map((opt, index) => {
                        const isSelected = selectedOption === opt.originalIdx;
                        const isCorrectAnswer = opt.originalIdx === q.answer;
                        let optionClass = "ad-option-btn";
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
                                <span className="ad-option-number">{index + 1}</span>
                                <span className="ad-option-text">{opt.text}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Show corresponding English sentence AFTER check is clicked */}
                <div className={`ad-revealed-sentence ${locked ? 'revealed' : 'hidden'}`}>
                    <p className="ad-revealed-speaker">{q.speaker ? `${q.speaker}: ` : ''}</p>
                    <p className="ad-revealed-text">{q.en}</p>
                </div>

                <div className="ad-game-footer">
                    {!locked ? (
                        <button 
                            className="ad-action-btn primary"
                            disabled={selectedOption === null}
                            onClick={() => checkAnswer()}
                        >
                            Check Answer
                        </button>
                    ) : (
                        <button 
                            className="ad-action-btn primary"
                            disabled={continueDisabled}
                            onClick={() => nextQuestion()}
                        >
                            {continueDisabled ? 'Reviewing...' : (isLastQuestion ? 'Finish' : 'Continue')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
