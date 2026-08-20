import { useState, useRef, useEffect, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'
import './PassageDecoderShell.css'
import { DailyLockModal } from './DailyLockModal'
import { ShellHeader } from './shell/ShellHeader'
import { InvisibleModeCheckbox } from './shell/InvisibleModeCheckbox'
import { ChallengeCardGrid } from './shell/ChallengeCardGrid'
import { ShellHistoryModal } from './shell/ShellHistoryModal'
import { usePracticeRecords } from '../hooks/usePracticeRecords'
import { audioCache } from '../lib/audioCache'
import { trialsTracker } from '../lib/trialsTracker'
import { useSession, API_URL } from '../lib/auth'
import { mistakeService } from '../lib/mistakeService'
import { petService } from '../lib/petService'
import { useCountdown } from '../lib/useCountdown'
import { CountdownRing } from './CountdownRing'
import md5 from 'md5'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const isWorkbook = (id?: string) => !!id && (id.endsWith('-w') || id.includes('-w-') || id.includes('-passage-decoder-w'));
const isStudentBook = (id?: string) => !!id && (id.endsWith('-s') || id.includes('-s-') || id.includes('-passage-decoder-s'));

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
        const isCf = (!!(practiceId && isWorkbook(practiceId) && data && data.tts === 1) || data?.tts?.by === 'melotts') && data?.tts?.by !== 'gemini';
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
        const isCf = (!!(practiceId && isWorkbook(practiceId) && data && data.tts === 1) || data?.tts?.by === 'melotts') && data?.tts?.by !== 'gemini';
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

    const renderFormattedInlineText = useCallback((
        text: string,
        highlights: string[] = [],
        vocabGuide: any = null,
        onWordClick?: (vocabItem: any) => void
    ): React.ReactNode => {
        if (!text) return null;

        const parts = text.split(/(\*\*.*?\*\*|<u>.*?<\/u>|\*.*?\*|\[\*VISUAL:?\s*.*?\*\])/gi);
        return (
            <>
                {parts.map((part, idx) => {
                    if (!part) return null;
                    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                        return (
                            <strong key={idx}>
                                {renderFormattedInlineText(part.slice(2, -2), highlights, vocabGuide, onWordClick)}
                            </strong>
                        );
                    }
                    if (part.toLowerCase().startsWith('<u>') && part.toLowerCase().endsWith('</u>') && part.length >= 7) {
                        return (
                            <u key={idx} style={{ fontWeight: 'bold' }}>
                                {renderFormattedInlineText(part.slice(3, -4), highlights, vocabGuide, onWordClick)}
                            </u>
                        );
                    }
                    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
                        return (
                            <em key={idx}>
                                {renderFormattedInlineText(part.slice(1, -1), highlights, vocabGuide, onWordClick)}
                            </em>
                        );
                    }
                    if (part.startsWith('[*VISUAL') && part.endsWith('*]')) {
                        let innerText = part.slice(2, -2).trim();
                        if (innerText.startsWith('VISUAL:')) {
                            innerText = innerText.slice(7).trim();
                        } else if (innerText.startsWith('VISUAL')) {
                            innerText = innerText.slice(6).trim();
                        }
                        return (
                            <span key={idx} className="pd-visual-tag" style={{ color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontStyle: 'normal', fontSize: '0.9em' }}>
                                🖼️ [图片提示: {innerText}]
                            </span>
                        );
                    }

                    // If highlights are present, check and replace highlights
                    if (highlights && highlights.length > 0) {
                        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const sortedHighlights = [...highlights].sort((a: any, b: any) => (b as string).length - (a as string).length);
                        const patterns = sortedHighlights.map((h: any) => {
                            const hStr = h as string;
                            if (hStr.includes('...')) {
                                const pParts = hStr.split('...').map((p: any) => p.trim());
                                return pParts.map(escapeRegExp).join('.*?');
                            } else {
                                return `\\b${escapeRegExp(hStr)}\\b`;
                            }
                        });
                        const combinedRegex = new RegExp(`(${patterns.join('|')})`, 'gi');
                        const textWithHighlights = part.replace(combinedRegex, '||HIGHLIGHT||$1||ENDHIGHLIGHT||');
                        const textParts = textWithHighlights.split(/(\|\|HIGHLIGHT\|\|.*?\|\|ENDHIGHLIGHT\|\|)/g);

                        return textParts.map((subPart: string, sIdx: number) => {
                            if (subPart.startsWith('||HIGHLIGHT||') && subPart.endsWith('||ENDHIGHLIGHT||')) {
                                const actualText = subPart.slice(13, -16);
                                const h = (highlights.find((hl: any) => {
                                    if (hl && typeof hl === 'string') {
                                        if (hl.includes('...')) {
                                            const pParts = hl.split('...').map((p: any) => p.trim());
                                            const pattern = pParts.map(escapeRegExp).join('.*?');
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
                                        key={`${idx}-${sIdx}`}
                                        className={`pd-highlight ${matchedVocab ? 'clickable' : ''}`}
                                        onClick={(e) => {
                                            if (matchedVocab && onWordClick) {
                                                e.stopPropagation();
                                                onWordClick(matchedVocab);
                                            }
                                        }}
                                    >
                                        {actualText}
                                    </span>
                                );
                            }
                            return subPart;
                        });
                    }

                    return part;
                })}
            </>
        );
    }, []);

    const renderSentenceText = useCallback((sentence: any) => {
        const highlights = sentence.highlight
            ? Array.from(new Set(sentence.highlight.split(',').map((s: string) => s.trim()).filter(Boolean)))
            : [];
        return renderFormattedInlineText(sentence.en, highlights as string[], vocabGuide, (item) => setActiveWordDetail(item));
    }, [vocabGuide, renderFormattedInlineText]);

    const renderMarkdownBlock = useCallback((markdownText: string) => {
        if (!markdownText) return null;
        const lines = markdownText.split('\n');
        return lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} className="pd-passage-spacer" />;

            // Header line
            const headerMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const content = headerMatch[2];
                const Tag = `h${Math.min(level + 1, 6)}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
                return (
                    <Tag key={lIdx} className={`pd-passage-heading pd-heading-${level}`}>
                        {renderFormattedInlineText(content, [], vocabGuide, (item) => setActiveWordDetail(item))}
                    </Tag>
                );
            }

            // Bullet / list item line
            const bulletMatch = line.match(/^(\s*)([*•^-]|\d+\.)\s+(.*)$/);
            if (bulletMatch) {
                const indentSpaces = bulletMatch[1].length;
                const marker = bulletMatch[2];
                const content = bulletMatch[3];
                const indentClass = indentSpaces >= 4 ? 'pd-indent-2' : indentSpaces >= 2 ? 'pd-indent-1' : '';
                return (
                    <div key={lIdx} className={`pd-bullet-line ${indentClass}`}>
                        <span className="pd-bullet-marker">{marker === '-' || marker === '*' || marker === '^' ? '•' : marker}</span>
                        <span className="pd-bullet-content">
                            {renderFormattedInlineText(content, [], vocabGuide, (item) => setActiveWordDetail(item))}
                        </span>
                    </div>
                );
            }

            return (
                <div key={lIdx} className="pd-block-line">
                    {renderFormattedInlineText(line, [], vocabGuide, (item) => setActiveWordDetail(item))}
                </div>
            );
        });
    }, [vocabGuide, renderFormattedInlineText]);

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

    const {
        practiceRecords,
        setActiveRecordId,
        recordIdPromiseRef,
        loadRecords,
        syncRecord: baseSyncRecord,
        getStats
    } = usePracticeRecords({ practiceId })
    const hasFinishedRef = useRef(false)

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

    // Play sentence audio automatically for student's book passage decoder (ending with -s) or workbook passage decoder (ending with -w) with tts: 1
    useEffect(() => {
        if (!autoPlay) return;
        const isS = !!(practiceId && isStudentBook(practiceId));
        const isWWithTts = !!(practiceId && isWorkbook(practiceId));
        if (q && q.en && (isS || isWWithTts) && textbook) {
            playActiveSentenceAudio(q.en);
        }

        return () => {
            if (sentenceAudioRef.current) {
                sentenceAudioRef.current.pause();
            }
        };
    }, [q, practiceId, textbook, data, autoPlay]);
    const [gainedXp, setGainedXp] = useState(0)
    const [gainedLove, setGainedLove] = useState(0)
    const [historicalBest, setHistoricalBest] = useState(0)
    const [isNewHigh, setIsNewHigh] = useState(false)
    const [invisibleMode, setInvisibleMode] = useState(false)
    const [historyModal, setHistoryModal] = useState<{ title: string, logs: any[] } | null>(null)
    const [lockModalOpen, setLockModalOpen] = useState(false)

    const primaryColor = data.primaryColor || '#4f46e5'
    const primaryDarkColor = data.primaryColorDark || '#3730a3'

    const handleSectionSelect = (sec: any) => {
        const stats = getStats(sec.title);
        if (stats.todayBest === 100) {
            setLockModalOpen(true);
            return;
        }
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
        let nextQ: any = null
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

    const syncRecord = useCallback(async (scorePercent: number, isFinished: boolean) => {
        if (isFinished) {
            hasFinishedRef.current = true
        } else if (hasFinishedRef.current) {
            return
        }
        if (activeSection) {
            await baseSyncRecord(activeSection.title, scorePercent, isFinished)
        }
    }, [baseSyncRecord, activeSection])

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
                    const practiceType = isWorkbook(practiceId) ? 'passage-decoder-w' : (isStudentBook(practiceId) ? 'passage-decoder-s' : 'passage-decoder');
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
        const mappedChallenges = sections.map((sec: any) => ({
            ...sec,
            title: sec.title,
            id: sec.id,
            icon: sec.icon || '📖'
        }));

        return (
            <div className="pd-shell-container" style={{ '--primary': primaryColor, '--primary-dark': primaryDarkColor } as any}>
                <div className="pd-screen">
                    <ShellHeader
                        title={data.title}
                        level={data.level}
                        textbook={textbook}
                        unit={unit}
                        prefix="pd"
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
                                isTodayBestHigh: stats.todayBest >= 70
                            };
                        }}
                        isLockedToday={(c) => getStats(c.title).todayBest === 100}
                        flickeringId={flickeringSectionId}
                        prefix="pd"
                        invisibleMode={invisibleMode}
                    />
                </div>

                {historyModal && (
                    <ShellHistoryModal
                        title={historyModal.title}
                        onClose={() => setHistoryModal(null)}
                        logs={historyModal.logs}
                        prefix="pd"
                    />
                )}
                {lockModalOpen && (
                    <DailyLockModal onClose={() => setLockModalOpen(false)} />
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
                            // Group sentences into passage blocks
                            const blocks: any[] = [];
                            let currentBlock: any = null;

                            queue.forEach((sentence, idx) => {
                                const sWithIdx = { ...sentence, index: idx };
                                const isNewBlock =
                                    sentence.newline ||
                                    sentence.header ||
                                    sentence.prefix ||
                                    sentence.bullet !== undefined ||
                                    sentence.indent !== undefined ||
                                    !currentBlock;

                                if (isNewBlock) {
                                    if (currentBlock) {
                                        blocks.push(currentBlock);
                                    }
                                    currentBlock = {
                                        header: sentence.header,
                                        prefix: sentence.prefix,
                                        suffix: sentence.suffix,
                                        speaker: sentence.speaker,
                                        bullet: sentence.bullet,
                                        indent: sentence.indent,
                                        sentences: [sWithIdx]
                                    };
                                } else {
                                    currentBlock.sentences.push(sWithIdx);
                                    if (sentence.suffix && !currentBlock.suffix) {
                                        currentBlock.suffix = sentence.suffix;
                                    }
                                }
                            });
                            if (currentBlock) {
                                blocks.push(currentBlock);
                            }

                            return blocks.map((block, bIdx) => {
                                // Parse block prefix to check if last line is an inline label (e.g. "* **Notice:** ")
                                let blockLines: string[] = [];
                                let inlinePrefix: { marker: string; label: string } | null = null;
                                let blockIndent = block.indent || 0;

                                if (block.prefix) {
                                    const rawLines = block.prefix.split('\n');
                                    const lastLine = rawLines[rawLines.length - 1];
                                    const prevLines = rawLines.slice(0, -1);

                                    const inlineMatch = lastLine.match(/^(\s*)([*•^-]?)\s*(.*:)\s*$/);
                                    if (inlineMatch) {
                                        const indentSpaces = inlineMatch[1].length;
                                        const marker = inlineMatch[2];
                                        const label = inlineMatch[3];
                                        blockLines = prevLines;
                                        inlinePrefix = {
                                            marker: marker || (indentSpaces > 0 ? '•' : ''),
                                            label
                                        };
                                        if (!blockIndent && indentSpaces > 0) {
                                            blockIndent = indentSpaces >= 4 ? 2 : 1;
                                        }
                                    } else {
                                        blockLines = rawLines;
                                    }
                                }

                                const indentClass = blockIndent === 2 ? 'pd-indent-2' : blockIndent === 1 ? 'pd-indent-1' : '';

                                return (
                                    <div key={bIdx} className="pd-passage-block">
                                        {block.header && renderMarkdownBlock(block.header)}
                                        {blockLines.length > 0 && renderMarkdownBlock(blockLines.join('\n'))}
                                        <p className={`pd-paragraph ${indentClass} ${block.bullet ? 'pd-bullet-item' : ''}`}>
                                            {block.bullet && <span className="pd-bullet-dot">• </span>}
                                            {inlinePrefix && (
                                                <span className="pd-inline-prefix">
                                                    {inlinePrefix.marker && <span className="pd-bullet-marker">{inlinePrefix.marker} </span>}
                                                    <span className="pd-label-prefix">
                                                        {renderFormattedInlineText(inlinePrefix.label, [], vocabGuide, (item) => setActiveWordDetail(item))}{' '}
                                                    </span>
                                                </span>
                                            )}
                                            {block.speaker && (
                                                <strong className="pd-speaker-prefix">{block.speaker}: </strong>
                                            )}
                                            {block.sentences.map((sentence: any) => {
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
                                                        {isCurrent && (isStudentBook(practiceId) || isWorkbook(practiceId)) && (
                                                            <button
                                                                className="pd-sentence-play-btn"
                                                                title="Replay Audio"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const textToPlay = sentence.audioText || sentence.en.replace(/<[^>]*>/g, '').replace(/[*_#`~]/g, '').trim();
                                                                    playActiveSentenceAudio(textToPlay);
                                                                }}
                                                            >
                                                                🔊
                                                            </button>
                                                        )}
                                                    </span>
                                                );
                                            })}
                                        </p>
                                        {block.suffix && renderMarkdownBlock(block.suffix)}
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {/* Lower Viewport: Handles interaction options and feedback */}
                    <div className="pd-lower-viewport">
                        <div className="pd-controls-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
                            <div className="pd-timer-container" style={{ margin: 0, height: '40px' }}>
                                {showOptions && !invisibleMode && (
                                    <CountdownRing secondsLeft={countdownTimer.secondsLeft} totalSeconds={15} isRunning={countdownTimer.isRunning} />
                                )}
                            </div>
                            <div className="pd-autoplay-toggle-container" style={{ margin: 0 }}>
                                <label className="pd-autoplay-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={autoPlay}
                                        onChange={toggleAutoPlay}
                                    />
                                    <span>🔊 Auto Play</span>
                                </label>
                            </div>
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
