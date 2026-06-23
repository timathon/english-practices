import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './PassageDecoderShell.css'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { cache } from '../lib/cache'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { CountdownRing } from './CountdownRing'
import md5 from 'md5'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string, isCf?: boolean) => {
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${isCf ? 'cf/' : ''}${hash}.mp3`;
}

const findVocabItem = (vocabList: any[], highlightPattern: string, actualText: string) => {
    const cleanPattern = highlightPattern.trim().toLowerCase();
    const cleanActual = actualText.trim().toLowerCase();
    
    // 1. Try exact match on word
    let found = vocabList.find(item => item.word.trim().toLowerCase() === cleanPattern);
    if (found) return found;

    // 2. Try exact match on actual text
    found = vocabList.find(item => item.word.trim().toLowerCase() === cleanActual);
    if (found) return found;

    // 3. Try starts-with/starts-with reverse to handle plurals/tenses
    found = vocabList.find(item => {
        const word = item.word.trim().toLowerCase();
        return cleanActual.startsWith(word) || word.startsWith(cleanActual);
    });
    if (found) return found;

    // 4. Fallback search: any partial overlap
    found = vocabList.find(item => {
        const word = item.word.trim().toLowerCase();
        return cleanActual.includes(word) || word.includes(cleanActual);
    });
    return found;
}




export function PassageDecoderShell({ data, practiceId, unit, textbook }: any) {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const sfxRef = useRef<HTMLAudioElement | null>(null)
    const activeSentenceRef = useRef<HTMLSpanElement | null>(null)
    const lastActiveSectionIdRef = useRef<string | null>(null)
    const sentenceAudioRef = useRef<HTMLAudioElement | null>(null)

    // Vocab Guide loading state
    const [vocabGuide, setVocabGuide] = useState<any>(null);
    const [activeWordDetail, setActiveWordDetail] = useState<any>(null);
    const [playingWordAudio, setPlayingWordAudio] = useState(false);

    useEffect(() => {
        if (!practiceId) return;
        const vocabGuideId = practiceId
            .replace(/-passage-decoder-[sw]$/, '-vocab-guide')
            .replace(/-passage-decoder$/, '-vocab-guide');
        
        fetch(API_URL + `/api/practices/${vocabGuideId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(resData => {
                if (resData && !resData.error) {
                    let content = resData.content;
                    if (resData.isEncrypted && typeof content === 'string') {
                        try {
                            content = decryptContent(content, OBSCURE_KEY);
                        } catch (decErr) {
                            console.error("Decryption of vocab-guide failed:", decErr);
                            return;
                        }
                    }
                    setVocabGuide(content);
                } else {
                    console.warn(`Vocab guide not found or error loading: ${vocabGuideId}`, resData?.error);
                    setVocabGuide(null);
                }
            })
            .catch(err => {
                console.error("Failed to load vocab guide in PassageDecoder:", err);
                setVocabGuide(null);
            });
    }, [practiceId]);

    const playWordSentenceAudio = async (sentence: string) => {
        if (!textbook || !sentence) return;
        setPlayingWordAudio(true);
        const isCf = !!(practiceId && practiceId.endsWith('-w') && data && data.tts === 1) || data?.tts?.by === 'melotts';
        const url = getAudioUrl(sentence, textbook, isCf);
        try {
            const blob = await audioCache.cacheAudio(url);
            if (blob) {
                const audio = new Audio(URL.createObjectURL(blob));
                audio.onended = () => setPlayingWordAudio(false);
                audio.onerror = () => setPlayingWordAudio(false);
                audio.play();
            } else {
                setPlayingWordAudio(false);
            }
        } catch (e) {
            console.error("Word audio playback error:", e);
            setPlayingWordAudio(false);
        }
    };

    const playActiveSentenceAudio = async (text: string) => {
        if (!text || !textbook) return;
        if (sentenceAudioRef.current) {
            sentenceAudioRef.current.pause();
            sentenceAudioRef.current = null;
        }
        const isCf = !!(practiceId && practiceId.endsWith('-w') && data && data.tts === 1) || data?.tts?.by === 'melotts';
        const url = getAudioUrl(text, textbook, isCf);
        try {
            const blob = await audioCache.cacheAudio(url);
            if (blob) {
                const audio = new Audio(URL.createObjectURL(blob));
                sentenceAudioRef.current = audio;
                audio.play().catch(e => console.warn("Failed to play sentence audio:", e));
            }
        } catch (e) {
            console.warn("Play sentence audio error:", e);
        }
    };

    const renderSentenceText = useCallback((sentence: any) => {
        if (!sentence.highlight) return sentence.en;

        const highlights = Array.from(new Set(sentence.highlight.split(',').map((s: string) => s.trim()).filter(Boolean)));
        
        const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        // Sort highlights by length descending to match longer phrases first
        const sortedHighlights = [...highlights].sort((a: any, b: any) => (b as string).length - (a as string).length);

        const patterns = sortedHighlights.map((h: any) => {
            const hStr = h as string;
            if (hStr.includes('...')) {
                const parts = hStr.split('...').map((p: any) => p.trim());
                return parts.map(escapeRegExp).join('.*?');
            } else {
                return `\\b${escapeRegExp(hStr)}\\b`;
            }
        });

        const combinedRegex = new RegExp(`(${patterns.join('|')})`, 'gi');
        const textWithHighlights = sentence.en.replace(combinedRegex, '||HIGHLIGHT||$1||ENDHIGHLIGHT||');

        const textParts = textWithHighlights.split(/(\|\|HIGHLIGHT\|\|.*?\|\|ENDHIGHLIGHT\|\|)/g);
        return textParts.map((part: string, idx: number) => {
            if (part.startsWith('||HIGHLIGHT||') && part.endsWith('||ENDHIGHLIGHT||')) {
                const actualText = part.slice(13, -16);
                
                const h = (highlights.find((hl: any) => {
                    if (hl && typeof hl === 'string') {
                        if (hl.includes('...')) {
                            const parts = hl.split('...').map((p: any) => p.trim());
                            const pattern = parts.map(escapeRegExp).join('.*?');
                            return new RegExp(pattern, 'i').test(actualText);
                        }
                        return new RegExp(`\\b${escapeRegExp(hl)}\\b`, 'i').test(actualText) ||
                               actualText.toLowerCase().includes(hl.toLowerCase());
                    }
                    return false;
                }) || actualText) as string;

                const hasGuide = vocabGuide && Array.isArray(vocabGuide.unit_vocabulary);
                const matchedVocab = hasGuide ? findVocabItem(vocabGuide.unit_vocabulary, h, actualText) : null;

                return (
                    <span 
                        key={idx} 
                        className={`pd-highlight ${matchedVocab ? 'clickable' : ''}`}
                        onClick={(e) => {
                            if (matchedVocab) {
                                e.stopPropagation();
                                setActiveWordDetail(matchedVocab);
                            }
                        }}
                    >
                        {actualText}
                    </span>
                );
            }
            return part;
        });
    }, [vocabGuide]);

    // Sections list with safe IDs
    const sections = (data.sections || []).map((sec: any, idx: number) => ({
        ...sec,
        id: sec.id || `sec_${idx + 1}`
    }));

    const [activeSection, setActiveSection] = useState<any>(null)
    const [autoPlay, setAutoPlay] = useState<boolean>(() => {
        const saved = localStorage.getItem('pd_autoplay');
        return saved === null ? true : saved === 'true';
    });

    const toggleAutoPlay = () => {
        setAutoPlay(prev => {
            const newVal = !prev;
            localStorage.setItem('pd_autoplay', String(newVal));
            return newVal;
        });
    };

    const [flickeringSectionId, setFlickeringSectionId] = useState<string | null>(null)
    const [queue, setQueue] = useState<any[]>([])
    const [mistakeQueue, setMistakeQueue] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [scoreLog, setScoreLog] = useState<Array<string | null>>([])

    const [isRedemption, setIsRedemption] = useState(false)
    const [q, setQ] = useState<any>(null)
    const [showOptions, setShowOptions] = useState(false)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [locked, setLocked] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [finalScore, setFinalScore] = useState(0)
    const [isCorrectFeedback, setIsCorrectFeedback] = useState(false)

    const timerExpiredRef = useRef(false)
    const checkAnswerRef = useRef<(forceWrong?: boolean) => void>(() => {})

    // Countdown timer (15s per question)
    const countdownTimer = useCountdown(15, {
        onExpire: () => {
            if (timerExpiredRef.current) return
            timerExpiredRef.current = true
            checkAnswerRef.current(true)
        }
    })

    const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
    const recordIdPromiseRef = useRef<Promise<string> | null>(null)
    const hasFinishedRef = useRef(false)

    // Play sentence audio automatically for student's book passage decoder (ending with -s) or workbook passage decoder (ending with -w) with tts: 1
    useEffect(() => {
        if (!autoPlay) return;
        const isS = !!(practiceId && practiceId.endsWith('-s'));
        const isWWithTts = !!(practiceId && practiceId.endsWith('-w') && data && (data.tts === 1 || data.tts?.by === 'melotts'));
        if (q && q.en && (isS || isWWithTts) && textbook) {
            playActiveSentenceAudio(q.en);
        }

        return () => {
            if (sentenceAudioRef.current) {
                sentenceAudioRef.current.pause();
            }
        };
    }, [q, practiceId, textbook, data, autoPlay]);
    const [practiceRecords, setPracticeRecords] = useState<any[]>([])
    const [gainedXp, setGainedXp] = useState(0)
    const [gainedLove, setGainedLove] = useState(0)
    const [historicalBest, setHistoricalBest] = useState(0)
    const [isNewHigh, setIsNewHigh] = useState(false)
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)

    const primaryColor = data.primaryColor || '#4f46e5'
    const primaryDarkColor = data.primaryColorDark || '#3730a3'

    const loadRecords = async () => {
        try {
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
        loadRecords()
    }, [])

    const handleSectionSelect = (sec: any) => {
        const hasConsumed = trialsTracker.consumeTrial(practiceId, sec.id)
        if (!hasConsumed) return;

        lastActiveSectionIdRef.current = sec.id
        setFlickeringSectionId(null)
        setActiveSection(sec)
        setActiveRecordId(null)
        setGainedXp(0)
        setGainedLove(0)
        recordIdPromiseRef.current = null
        hasFinishedRef.current = false

        // Passages are played in linear narrative order (NOT shuffled)
        const linearQueue = sec.sentences.map((sentence: any, i: number) => ({
            ...sentence,
            originalIndex: i
        }))

        setQueue(linearQueue)
        setMistakeQueue([])
        setCurrentIndex(0)
        setScoreLog(new Array(sec.sentences.length).fill(null))
        setCompleted(false)

        // Preload audios
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3");
        audioCache.preloadAndSync("https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3");

        loadQuestion(linearQueue, [], 0, false)
    }

    const loadQuestion = (currentQueue: any[], currentMistakes: any[], index: number, redemption: boolean) => {
        let nextQ = null
        let isRedemp = redemption

        if (index < currentQueue.length) {
            nextQ = currentQueue[index]
            isRedemp = false
        } else if (currentMistakes.length > 0) {
            nextQ = currentMistakes[0]
            isRedemp = true
        } else {
            finishGame(currentQueue)
            return
        }

        if (nextQ) {
            // Create a copy of the question and shuffle its options
            const shuffledQ = { ...nextQ };
            const zipped = shuffledQ.options.map((opt: string, idx: number) => ({
                opt,
                isCorrect: idx === nextQ.answer
            }));
            
            for (let i = zipped.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
            }
            
            shuffledQ.options = zipped.map((z: any) => z.opt);
            shuffledQ.answer = zipped.findIndex((z: any) => z.isCorrect);
            nextQ = shuffledQ;
        }

        setQ(nextQ)
        setIsRedemption(isRedemp)
        setSelectedOption(null)
        setShowOptions(false)
        setLocked(false)
        timerExpiredRef.current = false
        countdownTimer.pause()
    }



    const playSfx = async (type: 'correct' | 'wrong') => {
        const url = type === 'correct'
            ? "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3"
            : "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3";
        try {
            const blob = await audioCache.cacheAudio(url);
            if (!blob) return;
            const blobUrl = URL.createObjectURL(blob);
            if (sfxRef.current) {
                sfxRef.current.src = blobUrl;
                sfxRef.current.onended = () => URL.revokeObjectURL(blobUrl)
                sfxRef.current.play().catch(console.error)
            } else {
                const a = new Audio(blobUrl)
                a.onended = () => URL.revokeObjectURL(blobUrl)
                a.play().catch(console.error)
                sfxRef.current = a
            }
        } catch (e) { console.error(e) }
    }

    const syncRecord = async (scorePercent: number, isFinished: boolean) => {
        try {
            if (isFinished) {
                hasFinishedRef.current = true
            } else if (hasFinishedRef.current) {
                return
            }

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
                })
                const j = await res.json()
                if (j.success) {
                    cache.updateRecord({
                        id: activeRecordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    })
                }
            } else if (recordIdPromiseRef.current) {
                const recordId = await recordIdPromiseRef.current
                const res = await fetch(`${API_URL}/api/records/${recordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        unit: unitName,
                        score: scorePercent,
                        unfinished: !isFinished
                    })
                })
                const j = await res.json()
                if (j.success) {
                    cache.updateRecord({
                        id: recordId,
                        score: scorePercent,
                        unfinished: !isFinished,
                        updatedAt: new Date().toISOString()
                    })
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
                    })
                    const j = await res.json()
                    if (j.success && j.id) {
                        setActiveRecordId(j.id)
                        cache.updateRecord({
                            id: j.id,
                            unit: unitName,
                            score: scorePercent,
                            unfinished: !isFinished,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        } as any)
                        return j.id as string
                    }
                    throw new Error("Failed to create record")
                })()

                recordIdPromiseRef.current = postPromise
                await postPromise
            }
        } catch (e) {
            console.error("Failed to sync record", e)
        }
    }

    const checkAnswer = useCallback((optionIdx: number | null, forceWrong?: boolean) => {
        if (locked) return
        if (!forceWrong && optionIdx === null) return
        setLocked(true)
        countdownTimer.pause()

        const isCorrect = !forceWrong && optionIdx === q.answer
        setIsCorrectFeedback(isCorrect)
        setSelectedOption(optionIdx)

        let updatedMistakes = [...mistakeQueue]
        let updatedScoreLog = [...scoreLog]

        if (isCorrect) {
            playSfx('correct')
            if (!invisibleMode) {
                const { xpGain } = petService.awardCorrectAnswer()
                setGainedXp(prev => prev + xpGain)
                setGainedLove(prev => prev + 1)
            }
            if (isRedemption) {
                updatedScoreLog[q.originalIndex] = "redemption"
                updatedMistakes.shift() // Remove from mistake queue
            } else {
                updatedScoreLog[currentIndex] = "green"
            }
        } else {
            playSfx('wrong')
            if (!isRedemption) {
                updatedScoreLog[currentIndex] = "red"
                updatedMistakes.push(q)
                if (userId && !invisibleMode) {
                    const practiceType = practiceId.endsWith('-w') ? 'passage-decoder-w' : (practiceId.endsWith('-s') ? 'passage-decoder-s' : 'passage-decoder');
                    mistakeService.addMistake(userId, {
                        practiceId,
                        textbook,
                        unit,
                        practiceType,
                        question: q,
                        wrongAnswer: optionIdx !== null ? q.options[optionIdx] : undefined
                    });
                }
            } else {
                const missed = updatedMistakes.shift()
                updatedMistakes.push(missed) // Move to back
            }
        }

        setMistakeQueue(updatedMistakes)
        setScoreLog(updatedScoreLog)

        const totalScore = updatedScoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / queue.length) * 100)
        if (!invisibleMode) {
            const isLastMain = !isRedemption && currentIndex === queue.length - 1
            syncRecord(scorePercent, isLastMain)
        }
    }, [locked, q, mistakeQueue, scoreLog, currentIndex, isRedemption, queue.length, countdownTimer, invisibleMode])

    // Keep ref in sync so onExpire uses the latest checkAnswer
    useEffect(() => {
        checkAnswerRef.current = (forceWrong?: boolean) => {
            checkAnswer(null, forceWrong)
        }
    }, [checkAnswer])

    const nextQuestion = useCallback(() => {
        let nextIndex = currentIndex
        if (!isRedemption) {
            nextIndex = currentIndex + 1
            setCurrentIndex(nextIndex)
        }
        loadQuestion(queue, mistakeQueue, nextIndex, isRedemption)
    }, [currentIndex, isRedemption, queue, mistakeQueue])

    const finishGame = async (finalQueue: any[]) => {
        setCompleted(true)
        countdownTimer.pause()

        const totalScore = scoreLog.reduce((acc, curr) => {
            if (curr === "green") return acc + 1
            return acc
        }, 0)

        const scorePercent = Math.round((totalScore / finalQueue.length) * 100)
        setFinalScore(scorePercent)

        const u = `${practiceId} (${activeSection.title})`
        const logs = practiceRecords.filter(r => r.unit === u)
        const histBest = logs.length > 0 ? Math.max(...logs.map(t => t.score)) : 0
        setHistoricalBest(histBest)
        setIsNewHigh(histBest === 0 ? scorePercent > 0 : scorePercent > histBest)

        if (!invisibleMode) {
            petService.awardQuizCompletion()
            syncRecord(scorePercent, true)
            if (userId) {
                mistakeService.syncToServer(userId);
            }
        }
    }

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

    const revealOptions = () => {
        setShowOptions(true)
        timerExpiredRef.current = false
        if (!invisibleMode) {
            countdownTimer.reset(15)
        } else {
            countdownTimer.pause()
        }
    }

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeSection || completed || historyModal) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (!showOptions) {
                    revealOptions();
                } else if (showOptions && locked) {
                    nextQuestion();
                }
            } else if (showOptions && !locked) {
                if (e.key === '1') {
                    e.preventDefault();
                    checkAnswer(0);
                } else if (e.key === '2') {
                    e.preventDefault();
                    checkAnswer(1);
                } else if (e.key === '3') {
                    e.preventDefault();
                    checkAnswer(2);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection, completed, historyModal, showOptions, locked, nextQuestion, checkAnswer, q]);

    // Scroll active sentence into view
    useEffect(() => {
        if (activeSentenceRef.current) {
            activeSentenceRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [currentIndex, q, showOptions]);

    // Scroll back to the last active section card when returning to menu
    useEffect(() => {
        if (!activeSection && lastActiveSectionIdRef.current) {
            const lastId = lastActiveSectionIdRef.current;
            const cardId = `sec-card-${lastId}`;
            lastActiveSectionIdRef.current = null; // Clear it so it only scrolls once
            setFlickeringSectionId(lastId);

            const timeoutId = setTimeout(() => {
                const element = document.getElementById(cardId);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }, 100);

            const flickerTimeoutId = setTimeout(() => {
                setFlickeringSectionId(null);
            }, 2500);

            return () => {
                clearTimeout(timeoutId);
                clearTimeout(flickerTimeoutId);
            };
        }
    }, [activeSection]);

    // Menu/Dashboard View
    if (!activeSection) {
        return (
            <div className="pd-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="pd-screen">
                    <div className="pd-header">
                        <Link to="/dashboard" state={{ textbook: textbook, unit: unit }} style={{ position: 'absolute', left: 0, top: 0, fontSize: '1.5rem', textDecoration: 'none' }}>🏠</Link>
                        <h1>{data.title}</h1>
                        <h2>{data.level}</h2>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '20px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '8px 16px',
                        width: 'fit-content',
                        margin: '0 auto 20px auto'
                    }}>
                        <label style={{ 
                            fontSize: '0.95rem', 
                            color: '#475569', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer',
                            fontWeight: 500
                        }}>
                            <input 
                                type="checkbox" 
                                checked={invisibleMode} 
                                onChange={(e) => setInvisibleMode(e.target.checked)}
                                style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    accentColor: 'var(--primary)',
                                    cursor: 'pointer'
                                }}
                            />
                            <span>👻 Invisible Mode (No timer/records)</span>
                        </label>
                    </div>

                    <div className="pd-section-grid">
                        {sections.map((sec: any) => {
                            const isFlickering = flickeringSectionId === sec.id;
                            return (
                                <div key={sec.id} id={`sec-card-${sec.id}`} className={`pd-section-card ${isFlickering ? 'flicker-active' : ''}`}>
                                    <div className="pd-card-header">
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <h3 className="pd-card-title">{sec.title}</h3>
                                            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px' }}>
                                                {trialsTracker.getRemainingTrials(practiceId, sec.id)} / 5 attempts left
                                            </div>
                                        </div>
                                        <button
                                            className="pd-start-btn"
                                            onClick={() => handleSectionSelect(sec)}
                                            style={trialsTracker.getRemainingTrials(practiceId, sec.id) === 0 ? { backgroundColor: '#aaa', borderBottomColor: '#888', cursor: 'not-allowed' } : {}}
                                        >
                                            {trialsTracker.getRemainingTrials(practiceId, sec.id) === 0 ? 'LOCKED' : 'START'}
                                        </button>
                                    </div>
                                    <div className="pd-card-stats">
                                        {(() => {
                                            const s = getStats(sec.title);
                                            return (
                                                <>
                                                    <div className="pd-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `TODAY - ${sec.title}`, logs: s.todayLogs })}>
                                                        <span className="pd-stat-label">TODAY</span>
                                                        <span className="pd-stat-val" style={s.todayBest >= 70 ? { color: '#10b981', fontWeight: 'bold' } : {}}>{s.todayRuns} Runs | Best: {s.todayBest}%</span>
                                                    </div>
                                                    <div className="pd-stat-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryModal({ title: `LIFETIME - ${sec.title}`, logs: s.lifeLogs })}>
                                                        <span className="pd-stat-label">LIFETIME</span>
                                                        <span className="pd-stat-val">{s.lifeRuns} Runs | Best: {s.lifeBest}%</span>
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {historyModal && (
                    <div className="pd-modal-overlay" onClick={() => setHistoryModal(null)}>
                        <div className="pd-modal-content" onClick={e => e.stopPropagation()}>
                            <h3 className="pd-modal-title">{historyModal.title}</h3>
                            {historyModal.logs.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic' }}>No records yet.</p>
                            ) : (
                                <ul className="pd-history-list">
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
                                            <li key={log.id || i} className="pd-history-item">
                                                <span className="pd-history-date">{dateLabel}</span>
                                                <span className="pd-history-score" style={{ color: log.score >= 80 ? 'var(--primary)' : 'inherit' }}>
                                                    {log.score}%{isUnfinished}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <button className="pd-check-btn" style={{ marginTop: '20px', padding: '10px' }} onClick={() => setHistoryModal(null)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Completion View
    if (completed) {
        return (
            <div className="pd-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="pd-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                    <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', margin: '0' }}>{finalScore}%</h1>
                    <h2 style={{ margin: '5px 0 10px 0', color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>Section Complete!</h2>
                    
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
                        marginBottom: '30px',
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

                    <button className="pd-check-btn" onClick={() => {
                        setActiveSection(null)
                        loadRecords()
                    }} style={{ maxWidth: '300px' }}>
                        Back to Menu
                    </button>
                </div>
            </div>
        )
    }

    if (!q) return null

    return (
        <div className="pd-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
            <div className="pd-screen gameplay">
                <div className="pd-top-bar">
                    <button className="pd-close-btn" onClick={() => {
                        countdownTimer.pause()
                        const rem = trialsTracker.getRemainingTrials(practiceId, activeSection.id);
                        if (window.confirm(`Are you sure you want to quit?\nYou only have ${rem} attempt(s) left for this section today!`)) {
                            if (userId) {
                                mistakeService.syncToServer(userId);
                            }
                            setActiveSection(null);
                            loadRecords();
                        } else {
                            if (!locked && showOptions && !invisibleMode) countdownTimer.resume()
                        }
                    }}>✕</button>
                    <div className="pd-progress-container">
                        {queue.map((_, i) => {
                            const isActive = (!isRedemption && i === currentIndex) || (isRedemption && q.originalIndex === i);
                            return <div key={i} className={`pd-progress-segment ${scoreLog[i] || ''}${isActive ? ' active' : ''}`} />
                        })}
                    </div>
                </div>

                <div className="pd-split-viewport">
                    {/* Upper Viewport: Shows full text context formatted as paragraphs/dialogue */}
                    <div className="pd-upper-viewport">
                        {(() => {
                            // Group sentences into paragraphs/lines
                            const paragraphs: any[][] = [];
                            let currentParagraph: any[] = [];

                            queue.forEach((sentence, idx) => {
                                if (sentence.newline && currentParagraph.length > 0) {
                                    paragraphs.push(currentParagraph);
                                    currentParagraph = [];
                                }
                                currentParagraph.push({ ...sentence, index: idx });
                            });
                            if (currentParagraph.length > 0) {
                                paragraphs.push(currentParagraph);
                            }

                            return paragraphs.map((para, paraIdx) => {
                                const firstSentence = para[0];
                                return (
                                    <p key={paraIdx} className="pd-paragraph">
                                        {firstSentence.speaker && (
                                            <strong className="pd-speaker-prefix">{firstSentence.speaker}: </strong>
                                        )}
                                        {para.map((sentence) => {
                                            const isCurrent = isRedemption
                                                ? q.originalIndex === sentence.index
                                                : currentIndex === sentence.index;
                                            const isPast = isRedemption
                                                ? false
                                                : sentence.index < currentIndex;
                                            return (
                                                <span
                                                    key={sentence.id}
                                                    ref={isCurrent ? activeSentenceRef : null}
                                                    className={`pd-sentence ${isCurrent ? 'active' : ''} ${isPast ? 'completed' : ''}`}
                                                >
                                                    {renderSentenceText(sentence)}{' '}
                                                    {isCurrent && (practiceId?.endsWith('-s') || (practiceId?.endsWith('-w') && (data.tts === 1 || data.tts?.by === 'melotts'))) && (
                                                        <button
                                                            className="pd-sentence-play-btn"
                                                            title="Replay Audio"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                playActiveSentenceAudio(sentence.en);
                                                            }}
                                                        >
                                                            🔊
                                                        </button>
                                                    )}
                                                </span>
                                            );
                                        })}
                                    </p>
                                );
                            });
                        })()}
                    </div>

                    {/* Lower Viewport: Handles interaction options and feedback */}
                    <div className="pd-lower-viewport">
                        <div className="pd-autoplay-toggle-container">
                            <label className="pd-autoplay-toggle-label">
                                <input
                                    type="checkbox"
                                    checked={autoPlay}
                                    onChange={toggleAutoPlay}
                                />
                                <span>🔊 Auto Play</span>
                            </label>
                        </div>
                        {!showOptions ? (
                            <div className="pd-think-area">
                                <p className="pd-think-prompt">想一想这句话的中文翻译...</p>
                                <p className="pd-think-sub">Think about the translation in your head</p>
                                <button className="pd-reveal-btn" onClick={revealOptions}>
                                    Show Options <span className="pd-shortcut-tag">Enter</span>
                                </button>
                            </div>
                        ) : (
                            <div className="pd-options-area">
                                <div className="pd-timer-container">
                                    {!invisibleMode && <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={15} isRunning={countdownTimer.isRunning} />}
                                </div>
                                <div className="pd-options-grid">
                                    {q.options.map((opt: string, optIdx: number) => {
                                        let btnClass = "pd-option-btn"
                                        if (locked) {
                                            if (optIdx === q.answer) {
                                                btnClass += " correct"
                                            } else if (selectedOption === optIdx) {
                                                btnClass += " wrong"
                                            }
                                        } else if (selectedOption === optIdx) {
                                            btnClass += " selected"
                                        }

                                        return (
                                            <button
                                                key={optIdx}
                                                className={btnClass}
                                                onClick={() => checkAnswer(optIdx)}
                                                disabled={locked}
                                            >
                                                <span className="pd-option-num">{optIdx + 1}</span>
                                                <span className="pd-option-text">{opt}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {locked && q.remark && (
                                    <div className="pd-remark-banner">
                                        <span className="pd-remark-icon">💡</span>
                                        <div className="pd-remark-text">
                                            <strong>备注：</strong>{q.remark}
                                        </div>
                                    </div>
                                )}

                                <div className="pd-footer-action">
                                    <button
                                        className="pd-continue-btn"
                                        onClick={nextQuestion}
                                        disabled={!locked}
                                    >
                                        {(() => {
                                            let mistakesCount = mistakeQueue.length;
                                            if (isRedemption && isCorrectFeedback) {
                                                mistakesCount = Math.max(0, mistakesCount - 1);
                                            } else if (!isRedemption && !isCorrectFeedback) {
                                                mistakesCount += 1;
                                            }
                                            const isLast = isRedemption
                                                ? (mistakesCount === 0)
                                                : (currentIndex + 1 >= queue.length && mistakesCount === 0);
                                            return isLast ? 'Finish' : 'Continue';
                                        })()}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {activeWordDetail && (
                    <div className="pd-modal-overlay" onClick={() => {
                        setActiveWordDetail(null);
                        setPlayingWordAudio(false);
                    }}>
                        <div className="pd-word-detail-modal" onClick={e => e.stopPropagation()}>
                            <button className="pd-word-modal-close" onClick={() => {
                                setActiveWordDetail(null);
                                setPlayingWordAudio(false);
                            }}>✕</button>
                            
                            <div className="pd-word-detail-header">
                                <h3 className="pd-word-detail-title">
                                    {activeWordDetail.word}
                                </h3>
                                {activeWordDetail.ipa && (
                                    <span className="pd-word-detail-ipa">[{activeWordDetail.ipa}]</span>
                                )}
                            </div>
                            
                            <div className="pd-word-detail-body">
                                <div className="pd-word-detail-row">
                                    <span className="pd-word-detail-label">🇨🇳 中文释义</span>
                                    <span className="pd-word-detail-val font-chinese">{activeWordDetail.meaning}</span>
                                </div>
                                
                                {activeWordDetail.syllable_type && (
                                    <div className="pd-word-detail-row">
                                        <span className="pd-word-detail-label">🎵 音节类型</span>
                                        <span className="pd-word-detail-val">{activeWordDetail.syllable_type}</span>
                                    </div>
                                )}
                                
                                {activeWordDetail.comparison && (
                                    <div className="pd-word-detail-row">
                                        <span className="pd-word-detail-label">🔍 易混辨析</span>
                                        <span className="pd-word-detail-val">{activeWordDetail.comparison}</span>
                                    </div>
                                )}

                                {activeWordDetail.context_sentence && (
                                    <div className="pd-word-detail-context">
                                        <span className="pd-word-detail-label">🔊 例句朗读</span>
                                        <div className="pd-word-detail-sentence-box">
                                            <button 
                                                className={`pd-word-play-btn ${playingWordAudio ? 'playing' : ''}`}
                                                onClick={() => playWordSentenceAudio(activeWordDetail.context_sentence)}
                                            >
                                                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                            </button>
                                            <span className="pd-word-detail-sentence">"{activeWordDetail.context_sentence}"</span>
                                        </div>
                                    </div>
                                )}
                                
                                {(activeWordDetail.memorization_hook || activeWordDetail.hint) && (
                                    <div className="pd-word-detail-row hook">
                                        <span className="pd-word-detail-label">🧠 核心记忆法</span>
                                        <span className="pd-word-detail-val font-chinese">
                                            {activeWordDetail.memorization_hook || activeWordDetail.hint}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
