import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import md5 from 'md5';
import { audioCache } from '../lib/audioCache';
import { petService } from '../lib/petService';
import type { PetState } from '../lib/petService';
import { API_URL, useSession } from '../lib/auth';
import { decryptContent, OBSCURE_KEY } from '../lib/crypto';
import { cache } from '../lib/cache';
import './TetrisGame.css';

/* ─── Constants ─────────────────────────────────────────────────── */

const COLS = 10;
const ROWS = 20;
const BASE_DROP_MS = 800;
const MIN_DROP_MS = 100;
const Q_SLOWDOWN = 5; // 5× slower drop interval (0.2x speed) while question is open

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const getAudioUrl = (sentence: string, book: string, isCf?: boolean) => {
  const hash = md5(sentence);
  return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${isCf ? 'cf/' : ''}${hash}.mp3`;
};

const TETROMINOES: Record<string, { shape: number[][]; color: string }> = {
  I: { shape: [[1, 1, 1, 1]],           color: '#06b6d4' },
  O: { shape: [[1, 1], [1, 1]],          color: '#eab308' },
  T: { shape: [[0, 1, 0], [1, 1, 1]],   color: '#a855f7' },
  S: { shape: [[0, 1, 1], [1, 1, 0]],   color: '#22c55e' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]],   color: '#ef4444' },
  J: { shape: [[1, 0, 0], [1, 1, 1]],   color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]],   color: '#f97316' },
};

const PIECE_TYPES = Object.keys(TETROMINOES);
const LINE_PTS = [0, 100, 300, 500, 800];

const FALLBACK_VOCAB: VocabItem[] = [
  { word: 'apple', meaning: '苹果' }, { word: 'banana', meaning: '香蕉' },
  { word: 'cat', meaning: '猫' },     { word: 'dog', meaning: '狗' },
  { word: 'elephant', meaning: '大象' }, { word: 'panda', meaning: '熊猫' },
  { word: 'school', meaning: '学校' }, { word: 'teacher', meaning: '老师' },
  { word: 'student', meaning: '学生' }, { word: 'pencil', meaning: '铅笔' },
  { word: 'happy', meaning: '开心的' }, { word: 'beautiful', meaning: '美丽的' },
  { word: 'jump', meaning: '跳跃' },   { word: 'run', meaning: '跑步' },
  { word: 'water', meaning: '水' },
];

/* ─── Types ──────────────────────────────────────────────────────── */

type Board = (string | null)[][];

interface Piece {
  type: string;
  shape: number[][];
  x: number;
  y: number;
  color: string;
}

interface VocabItem {
  word: string;
  meaning: string;
  context_sentence?: string;
  ipa?: string;
  comparison?: string;
  syllable_type?: string;
  memorization_hook?: string;
  hint?: string;
}

interface VocabQuestion {
  prompt: string;
  options: string[];
  answer: number;
  qType: 'En2Cn' | 'Cn2En';
  word?: string;
  context_sentence?: string;
}

interface LBRecord {
  id: string; userId: string; name: string; username: string;
  unit: string; score: number; createdAt: string;
}

/* ─── Pure game helpers ──────────────────────────────────────────── */

const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const rotateMatrix = (m: number[][]): number[][] =>
  m[0].map((_, c) => m.map(r => r[c]).reverse());

const collides = (board: Board, shape: number[][], x: number, y: number): boolean => {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
  return false;
};

const getDropMs = (lines: number): number =>
  Math.max(MIN_DROP_MS, BASE_DROP_MS - Math.floor(lines / 10) * 50);

const makePiece = (type?: string): Piece => {
  const t = type ?? PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const def = TETROMINOES[t];
  const shape = def.shape.map(r => [...r]);
  return { type: t, shape, color: def.color, x: Math.floor(COLS / 2 - shape[0].length / 2), y: 0 };
};

const calcGhostY = (board: Board, p: Piece): number => {
  let y = p.y;
  while (!collides(board, p.shape, p.x, y + 1)) y++;
  return y;
};

const lockPiece = (board: Board, p: Piece): Board => {
  const b = board.map(r => [...r]);
  p.shape.forEach((row, r) => row.forEach((cell, c) => {
    if (cell && p.y + r >= 0) b[p.y + r][p.x + c] = p.color;
  }));
  return b;
};

const sweepLines = (board: Board): { board: Board; n: number } => {
  const kept = board.filter(row => row.some(c => !c));
  const n = ROWS - kept.length;
  const empties = Array.from({ length: n }, () => Array(COLS).fill(null));
  return { board: [...empties, ...kept], n };
};

const makeQuestion = (vocab: VocabItem[]): VocabQuestion => {
  const pool = vocab.length >= 4 ? vocab : [...vocab, ...FALLBACK_VOCAB];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const target = shuffled[0];
  const distractors = shuffled.slice(1, 4);
  const qType: 'En2Cn' | 'Cn2En' = Math.random() < 0.5 ? 'En2Cn' : 'Cn2En';
  const prompt = qType === 'En2Cn' ? target.word : target.meaning;
  const correct = qType === 'En2Cn' ? target.meaning : target.word;
  const wrongs = distractors.map(d => qType === 'En2Cn' ? d.meaning : d.word);
  const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
  return {
    prompt,
    options: opts,
    answer: opts.indexOf(correct),
    qType,
    word: target.word,
    context_sentence: target.context_sentence
  };
};

const getLabel = (tb: string, ut: string): string => {
  const t = (tb || '').trim(), u = (ut || '').trim();
  if (t && u.toLowerCase().startsWith(t.toLowerCase())) {
    let rest = u.substring(t.length).trim();
    if (rest.startsWith('-')) rest = rest.substring(1).trim();
    if (rest) return `${t} - ${rest}`;
  }
  return t && u ? `${t} - ${u}` : t || u;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/* ─── Component ─────────────────────────────────────────────────── */

export function TetrisGame({ showChinese = false }: { showChinese?: boolean }) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  /* Pet */
  const [petState, setPetState] = useState<PetState>(() => petService.getPetState());

  /* Vocab / guides */
  const [vocabGuides, setVocabGuides] = useState<any[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState('fallback');
  const [loadingVocab, setLoadingVocab] = useState(false);
  const vocabRef = useRef<VocabItem[]>(FALLBACK_VOCAB);
  const textbookRef = useRef<string>('');
  const isCfRef = useRef<boolean>(false);

  const speakTTS = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error('TTS failed:', e);
    }
  };

  const playAudio = useCallback(async (text: string) => {
    if (!text) return;
    const tb = textbookRef.current;
    if (tb) {
      const url = getAudioUrl(text, tb, isCfRef.current);
      try {
        const blob = await audioCache.cacheAudio(url);
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const audio = new Audio(blobUrl);
          audio.onended = () => URL.revokeObjectURL(blobUrl);
          audio.play().catch(e => {
            console.error('Audio play failed, falling back to TTS:', e);
            speakTTS(text);
          });
          return;
        }
      } catch (e) {
        console.error('Failed to play R2 audio, falling back to TTS:', e);
      }
    }
    speakTTS(text);
  }, []);

  /* Lottery */
  const [isLotteryRunning, setIsLotteryRunning] = useState(false);
  const [isLotteryStopping, setIsLotteryStopping] = useState(false);
  const [lotteryDisplayLabel, setLotteryDisplayLabel] = useState('');
  const [lotteryTimer, setLotteryTimer] = useState(5.0);
  const isStoppingRef = useRef(false);
  const lotteryTimerId = useRef<number | null>(null);

  /* Game state — React (for rendering) */
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [piece, setPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalLines, setFinalLines] = useState<number | null>(null);
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);
  const downStreakActiveRef = useRef(true);

  /* Game state — refs (for game loop, never stale) */
  const boardRef = useRef<Board>(emptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const nextRef = useRef<Piece | null>(null);
  const linesRef = useRef(0);
  const scoreRef = useRef(0);

  /* Question */
  const [showQuestion, setShowQuestion] = useState(false);
  const showQuestionRef = useRef(false);
  const [question, setQuestion] = useState<VocabQuestion | null>(null);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);

  /* Streak & free rotations */
  const [correctStreak, setCorrectStreak] = useState(0);
  const correctStreakRef = useRef(0);
  const [freeRotations, setFreeRotations] = useState(0);
  const freeRotationsRef = useRef(0);
  const [streakCelebration, setStreakCelebration] = useState(false);
  const [freeRotFlash, setFreeRotFlash] = useState(false);
  const [wrongAnswerFlash, setWrongAnswerFlash] = useState(false);

  /* Countdown */
  const [questionCountdown, setQuestionCountdown] = useState(10);
  const countdownIntervalRef = useRef<number | null>(null);

  /* Game Time Limit (5 mins = 300 seconds) */
  const [gameTimeLeft, setGameTimeLeft] = useState(300);
  const [endReason, setEndReason] = useState<'normal' | 'timeup'>('normal');

  /* Leaderboard */
  const [leaderboard, setLeaderboard] = useState<LBRecord[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);

  /* UI alerts */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unlockedMsg, setUnlockedMsg] = useState<string | null>(null);

  /* ── Keep refs in sync ──────────────────────────────────────── */
  useEffect(() => { showQuestionRef.current = showQuestion; }, [showQuestion]);
  useEffect(() => { freeRotationsRef.current = freeRotations; }, [freeRotations]);

  /* ── Countdown: start/stop when question opens/closes ─────── */
  useEffect(() => {
    if (!showQuestion) {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      setQuestionCountdown(10);
      return;
    }
    setQuestionCountdown(10);
    countdownIntervalRef.current = window.setInterval(() => {
      setQuestionCountdown(prev => {
        if (prev <= 1) {
          window.clearInterval(countdownIntervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    };
  }, [showQuestion]);

  /* ── Time-up: auto-close question as wrong when countdown hits 0 ── */
  useEffect(() => {
    if (questionCountdown === 0 && showQuestion && answerResult === null) {
      setAnswerResult('wrong');
      correctStreakRef.current = 0;
      setCorrectStreak(0);
      setTimeout(() => {
        setShowQuestion(false);
        setQuestion(null);
        setAnswerResult(null);
      }, 700);
    }
  }, [questionCountdown, showQuestion, answerResult]);

  /* ── Sync state helpers (update ref + React state together) ─── */
  const setB = (b: Board) => { boardRef.current = b; setBoard(b); };
  const setP = (p: Piece | null) => { pieceRef.current = p; setPiece(p); };
  const setN = (p: Piece | null) => { nextRef.current = p; setNextPiece(p); };
  const setL = (n: number) => { linesRef.current = n; setLines(n); };
  const setS = (n: number) => { scoreRef.current = n; setScore(n); };

  /* ── Pet sync ─────────────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: Event) => setPetState((e as CustomEvent<PetState>).detail);
    window.addEventListener('ep-pet-update', h);
    return () => window.removeEventListener('ep-pet-update', h);
  }, []);

  /* ── Init ─────────────────────────────────────────────────────── */
  const fetchLeaderboard = useCallback(async () => {
    setLoadingLB(true);
    try {
      const r = await fetch(`${API_URL}/api/games/tetris/leaderboard`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        setLeaderboard(Array.isArray(data) ? data : []);
      }
    } catch { /* silently fail */ }
    finally { setLoadingLB(false); }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const cached = cache.getPractices();
    const loadGuides = (data: any[]) => {
      const guides = data.filter((p: any) => p.type.toLowerCase().includes('vocab-guide'));
      setVocabGuides([...guides].sort((a, b) =>
        getLabel(a.textbook, a.unit).localeCompare(getLabel(b.textbook, b.unit), undefined, { numeric: true, sensitivity: 'base' })
      ));
    };
    if (cached && cached.length > 0) loadGuides(cached);
    else fetch(`${API_URL}/api/practices`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) { cache.setPractices(d); loadGuides(d); } })
      .catch(() => {});
    return () => { if (lotteryTimerId.current) window.clearTimeout(lotteryTimerId.current); };
  }, [fetchLeaderboard]);

  /* ── Save score ─────────────────────────────────────────────── */
  const saveScore = useCallback(async (s: number) => {
    try {
      const res = await fetch(`${API_URL}/api/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ unit: 'game-tetris', score: s }),
      });
      const data = await res.json();
      if (data && data.id) {
        setLastSavedRecordId(data.id);
      }
      fetchLeaderboard();
    } catch { /* ignore */ }
  }, [fetchLeaderboard]);

  /* ── Trigger Game Over ───────────────────────────────────────── */
  const triggerGameOver = useCallback((reason: 'normal' | 'timeup' = 'normal') => {
    setIsPlaying(false);
    setGameOver(true);
    setEndReason(reason);
    setP(null);
    const fs = scoreRef.current;
    const fl = linesRef.current;
    setFinalScore(fs);
    setFinalLines(fl);
    saveScore(fs);
  }, [saveScore]);

  /* ── Game Time Limit Effect ──────────────────────────────────── */
  useEffect(() => {
    if (!isPlaying || gameOver || isPaused) return;
    const interval = window.setInterval(() => {
      setGameTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(interval);
          triggerGameOver('timeup');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPlaying, gameOver, isPaused, triggerGameOver]);

  /* ── Lock & spawn ────────────────────────────────────────────── */
  const lockAndSpawn = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    downStreakActiveRef.current = false;

    const locked = lockPiece(boardRef.current, p);
    const { board: swept, n } = sweepLines(locked);
    setB(swept);

    const newLines = linesRef.current + n;
    const newLevel = Math.floor(newLines / 10) + 1;
    const pts = LINE_PTS[Math.min(n, 4)] * newLevel;
    setL(newLines);
    setLevel(newLevel);
    setS(scoreRef.current + pts);

    const np = nextRef.current ?? makePiece();
    const nn = makePiece();

    if (collides(swept, np.shape, np.x, np.y)) {
      triggerGameOver('normal');
      return;
    }

    setP(np);
    setN(nn);
  }, [triggerGameOver]);

  /* ── Drop callback ref (always fresh — avoids stale closures) ─ */
  const latestDrop = useRef<() => void>(() => {});
  latestDrop.current = () => {
    const p = pieceRef.current;
    if (!p) return;
    const newY = p.y + 1;
    if (collides(boardRef.current, p.shape, p.x, newY)) {
      lockAndSpawn();
    } else {
      setP({ ...p, y: newY });
    }
  };

  /* ── Drop interval ───────────────────────────────────────────── */
  const dropMs = getDropMs(lines);
  const effectiveMs = showQuestion ? dropMs * Q_SLOWDOWN : dropMs;

  useEffect(() => {
    if (!isPlaying || gameOver || isPaused) return;
    const id = setInterval(() => latestDrop.current(), effectiveMs);
    return () => clearInterval(id);
  }, [isPlaying, gameOver, effectiveMs, isPaused]);

  /* ── Movement ────────────────────────────────────────────────── */
  const moveLeft = useCallback(() => {
    const p = pieceRef.current;
    if (!p || showQuestionRef.current) return;
    if (!collides(boardRef.current, p.shape, p.x - 1, p.y))
      setP({ ...p, x: p.x - 1 });
  }, []);

  const moveRight = useCallback(() => {
    const p = pieceRef.current;
    if (!p || showQuestionRef.current) return;
    if (!collides(boardRef.current, p.shape, p.x + 1, p.y))
      setP({ ...p, x: p.x + 1 });
  }, []);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || showQuestionRef.current) return;
    const newY = p.y + 1;
    if (collides(boardRef.current, p.shape, p.x, newY)) lockAndSpawn();
    else setP({ ...p, y: newY });
  }, [lockAndSpawn]);



  /* ── Rotation helpers ────────────────────────────────────────── */
  const applyRotation = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const rotated = rotateMatrix(p.shape);
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!collides(boardRef.current, rotated, p.x + dx, p.y)) {
        setP({ ...p, shape: rotated, x: p.x + dx });
        return;
      }
    }
  }, []);

  // Always-fresh ref so triggerRotation can call applyRotation with zero deps
  const applyRotationRef = useRef<() => void>(() => {});
  applyRotationRef.current = applyRotation;

  const triggerRotation = useCallback(() => {
    if (!pieceRef.current || showQuestionRef.current) return;
    if (freeRotationsRef.current > 0) {
      freeRotationsRef.current -= 1;
      setFreeRotations(freeRotationsRef.current);
      setFreeRotFlash(true);
      applyRotationRef.current();
      setTimeout(() => setFreeRotFlash(false), 1200);
      return;
    }
    const q = makeQuestion(vocabRef.current);
    if (q.word && textbookRef.current) {
      audioCache.preloadAndSync(getAudioUrl(q.word, textbookRef.current, isCfRef.current));
    }
    setQuestion(q);
    setAnswerResult(null);
    setShowQuestion(true);
  }, []);

  const handleAnswer = useCallback((idx: number) => {
    if (!question || answerResult !== null) return;
    // Stop the countdown timer
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    const correct = idx === question.answer;
    setAnswerResult(correct ? 'correct' : 'wrong');
    if (question.word) {
      playAudio(question.word);
    }
    if (correct) {
      petService.awardCorrectAnswer();
      correctStreakRef.current += 1;
      setCorrectStreak(correctStreakRef.current);
      if (correctStreakRef.current >= 5) {
        // Award 5 free rotations!
        freeRotationsRef.current += 5;
        setFreeRotations(freeRotationsRef.current);
        correctStreakRef.current = 0;
        setCorrectStreak(0);
        setStreakCelebration(true);
        setTimeout(() => setStreakCelebration(false), 3000);
      }
      setTimeout(() => {
        applyRotation();
        setShowQuestion(false);
        setQuestion(null);
        setAnswerResult(null);
      }, 500);
    } else {
      correctStreakRef.current = 0;
      setCorrectStreak(0);
      setGameTimeLeft(prev => {
        if (prev <= 10) {
          triggerGameOver('timeup');
          return 0;
        }
        return prev - 10;
      });
      setWrongAnswerFlash(true);
      setTimeout(() => setWrongAnswerFlash(false), 2000);

      setTimeout(() => {
        setShowQuestion(false);
        setQuestion(null);
        setAnswerResult(null);
      }, 700);
    }
  }, [question, answerResult, applyRotation, playAudio]);

  /* ── Keyboard: Question Options (always active when overlay is open) ── */
  useEffect(() => {
    if (!showQuestion) return;
    const handler = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const optionIdx = parseInt(e.key, 10) - 1;
        handleAnswer(optionIdx);
      }
    };
    window.addEventListener('keydown', handler, true); // Use capture phase to ensure it intercepts early
    return () => window.removeEventListener('keydown', handler, true);
  }, [showQuestion, handleAnswer]);

  /* ── Keyboard: Game Controls ────────────────────────────────── */
  useEffect(() => {
    if (!isPlaying || isPaused || showQuestion) return;
    const handler = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', ' ', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowDown') {
        if (e.repeat) {
          if (!downStreakActiveRef.current) return;
          softDrop();
        } else {
          downStreakActiveRef.current = true;
          softDrop();
        }
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':  moveLeft(); break;
        case 'ArrowRight': moveRight(); break;
        case ' ':
        case 'ArrowUp':    triggerRotation(); break;
      }
    };
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        downStreakActiveRef.current = true;
      }
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', keyUpHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', keyUpHandler);
    };
  }, [isPlaying, isPaused, showQuestion, moveLeft, moveRight, softDrop, triggerRotation]);

  /* ── Lottery ─────────────────────────────────────────────────── */
  const startLottery = () => {
    if ((petState.tetrisRoundsLeft || 0) <= 0) {
      setErrorMsg(showChinese
        ? '没有剩余游戏场次，请先购买！'
        : 'No play rounds remaining! Spend 1 gold coin to unlock 3 rounds. 🪙');
      return;
    }
    setErrorMsg(null);
    setUnlockedMsg(null);
    setGameOver(false);
    setFinalScore(null);
    setFinalLines(null);
    setIsLotteryRunning(true);
    setIsLotteryStopping(false);
    isStoppingRef.current = false;
    setLotteryTimer(5.0);

    const pool = [
      { id: 'fallback', label: showChinese ? '常用词汇' : 'General Practice' },
      ...vocabGuides.map(g => ({ id: g.id, label: getLabel(g.textbook, g.unit) })),
    ];

    let currentIdx = Math.floor(Math.random() * pool.length);
    setLotteryDisplayLabel(pool[currentIdx].label);
    let speed = 60, running = true, stopping = false, stopSteps = 0;
    const maxStopSteps = 5, startT = Date.now();

    const tick = () => {
      if (!running) return;
      const elapsed = Date.now() - startT;
      setLotteryTimer(Math.max(0, (5000 - elapsed) / 1000));
      let nextIdx = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && nextIdx === currentIdx) nextIdx = (nextIdx + 1) % pool.length;
      currentIdx = nextIdx;
      setLotteryDisplayLabel(pool[currentIdx].label);
      if ((isStoppingRef.current || elapsed >= 5000) && !stopping) {
        stopping = true; setIsLotteryStopping(true);
      }
      if (stopping) {
        stopSteps++;
        if (stopSteps >= maxStopSteps) {
          running = false;
          const chosen = pool[currentIdx];
          setIsLotteryStopping(false);
          setSelectedGuideId(chosen.id);
          lotteryTimerId.current = window.setTimeout(() => fetchAndStartGame(chosen.id), 800);
          return;
        }
        speed *= 2;
      }
      lotteryTimerId.current = window.setTimeout(tick, speed);
    };
    lotteryTimerId.current = window.setTimeout(tick, speed);
  };

  const fetchAndStartGame = async (guideId: string) => {
    setLoadingVocab(true);
    try {
      let vocab = FALLBACK_VOCAB;
      let tb = '';
      let cf = false;
      if (guideId !== 'fallback') {
        const res = await fetch(`${API_URL}/api/practices/${guideId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          tb = data.textbook || '';
          let content = data.isEncrypted && typeof data.content === 'string'
            ? decryptContent(data.content, OBSCURE_KEY)
            : data.content;
          if (content?.tts?.by === 'melotts') cf = true;
          if (content?.unit_vocabulary?.length > 0) vocab = content.unit_vocabulary;
        }
      }
      textbookRef.current = tb;
      isCfRef.current = cf;
      vocabRef.current = vocab;
      petService.decrementTetrisRounds();
      startGame();
    } catch {
      setErrorMsg('Failed to load vocabulary. Please try again.');
      setIsLotteryRunning(false);
    } finally {
      setLoadingVocab(false);
    }
  };

  const startGame = () => {
    setIsLotteryRunning(false);
    const p = makePiece(), n = makePiece();
    boardRef.current = emptyBoard();
    pieceRef.current = p;
    nextRef.current = n;
    linesRef.current = 0;
    scoreRef.current = 0;
    correctStreakRef.current = 0;
    freeRotationsRef.current = 0;
    setBoard(emptyBoard());
    setPiece(p);
    setNextPiece(n);
    setLines(0);
    setLevel(1);
    setScore(0);
    setGameOver(false);
    setFinalScore(null);
    setFinalLines(null);
    setLastSavedRecordId(null);
    setShowQuestion(false);
    setQuestion(null);
    setCorrectStreak(0);
    setFreeRotations(0);
    setStreakCelebration(false);
    setFreeRotFlash(false);
    setGameTimeLeft(300);
    setEndReason('normal');
    setIsPlaying(true);
    setIsPaused(false);
    setTimeout(() => {
      document.querySelector('.tetris-main-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  /* ── Unlock rounds ───────────────────────────────────────────── */
  const handleUnlock = () => {
    setErrorMsg(null); setUnlockedMsg(null);
    if ((petState.food || 0) < 50 || (petState.love || 0) < 50) {
      setErrorMsg('Your pet must have at least 50% health and 50% love to buy rounds! 🍎❤️');
      return;
    }
    if ((petState.goldCoins || 0) < 1) {
      setErrorMsg('Not enough Gold Coins! Answer questions in lessons to earn coins. 🪙');
      return;
    }
    if (petService.buyTetrisRounds()) setUnlockedMsg('Successfully unlocked 3 play rounds! 🎮✨');
    else setErrorMsg('Unlock failed.');
  };

  /* ── Display board computation ──────────────────────────────── */
  type DisplayCell = { color: string | null; active: boolean; ghost: boolean };

  const displayBoard = useMemo((): DisplayCell[][] => {
    const d: DisplayCell[][] = board.map(row => row.map(color => ({ color, active: false, ghost: false })));
    if (piece) {
      const gy = calcGhostY(board, piece);
      /* ghost */
      piece.shape.forEach((row, r) => row.forEach((cell, c) => {
        if (cell) {
          const x = piece.x + c, y = gy + r;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS && !d[y][x].color)
            d[y][x] = { color: piece.color, active: false, ghost: true };
        }
      }));
      /* active */
      piece.shape.forEach((row, r) => row.forEach((cell, c) => {
        if (cell) {
          const x = piece.x + c, y = piece.y + r;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS)
            d[y][x] = { color: piece.color, active: true, ghost: false };
        }
      }));
    }
    return d;
  }, [board, piece]);

  /* ── Next piece 4×4 display ─────────────────────────────────── */
  const nextDisplay = useMemo((): (string | null)[][] => {
    const d: (string | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
    if (nextPiece) {
      const s = nextPiece.shape;
      const or = Math.floor((4 - s.length) / 2);
      const oc = Math.floor((4 - s[0].length) / 2);
      s.forEach((row, r) => row.forEach((cell, c) => {
        if (cell) d[or + r][oc + c] = nextPiece.color;
      }));
    }
    return d;
  }, [nextPiece]);

  const getLabelFromId = (id: string) => {
    if (id === 'fallback') return showChinese ? '常用词汇' : 'General Practice';
    const g = vocabGuides.find(g => g.id === id);
    return g ? getLabel(g.textbook, g.unit) : (showChinese ? '常用词汇' : 'General Practice');
  };

  const sortedLB = [...leaderboard]
    .filter(r => r.unit === 'game-tetris')
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const cannotBuy = (petState.food || 0) < 50 || (petState.love || 0) < 50;

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────── */
  return (
    <div className="tetris-container">

      {/* ── Header ── */}
      <div className="tetris-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link to="/dashboard" className="tetris-back-btn">← Back to Dashboard</Link>
          <h2 className="tetris-title">
            🧱 Vocab Tetris <span className="tetris-title-cn">（单词方块）</span>
          </h2>
          <p className="tetris-subtitle">
            Move blocks with ← → ↓ keys. Press <kbd>Space</kbd> / ↑ to rotate — but first answer a vocab question! (用方向键移动，按空格键旋转——答对单词题才能转！)
          </p>
        </div>
        {/* Pause button removed from header */}
      </div>

      <div className="tetris-layout">

        {/* ── Main panel ── */}
        <div className="tetris-main-panel">



          {/* Alerts */}
          {errorMsg && <div className="tetris-alert error">{errorMsg}</div>}
          {unlockedMsg && <div className="tetris-alert success">{unlockedMsg}</div>}

          {/* Shop card */}
          {(petState.tetrisRoundsLeft || 0) <= 0 && !isPlaying && !isLotteryRunning && (
            <div className="tetris-shop-card">
              <h3 className="tetris-shop-title">🧱 Vocab Tetris Shop</h3>
              <p className="tetris-shop-text">
                You've run out of rounds. Spend 1 Gold Coin to unlock 3 more!
              </p>
              {cannotBuy && (
                <div className="tetris-buy-warning">
                  ⚠️ Your pet needs at least 50% Hunger and 50% Love to buy rounds.
                  <br />(宠物需要至少 50% 饱食度和 50% 亲密度才能购买游戏场次！)
                </div>
              )}
              <button
                className="tetris-buy-btn"
                onClick={handleUnlock}
                disabled={cannotBuy}
                style={cannotBuy ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                Spend 1 Gold Coin (🪙) for 3 Rounds
              </button>
            </div>
          )}

          {/* Pre-game / Lottery */}
          {!isPlaying && !gameOver && (
            <div className="tetris-config-section">
              {isLotteryRunning ? (
                <div className="tetris-lottery-panel">
                  <h3 className="tetris-lottery-title">
                    {showChinese ? '🎯 正在抽取词汇源...' : '🎯 Rolling Vocabulary Source...'}
                  </h3>
                  <div className="tetris-lottery-box">
                    <span className="tetris-lottery-item">{lotteryDisplayLabel}</span>
                  </div>
                  <div className="tetris-lottery-footer">
                    <span className="tetris-lottery-countdown">
                      {showChinese
                        ? `自动停止倒计时: ${lotteryTimer.toFixed(1)}秒`
                        : `Auto-stop in: ${lotteryTimer.toFixed(1)}s`}
                    </span>
                    <button
                      className="tetris-lottery-stop-btn"
                      onClick={() => { isStoppingRef.current = true; }}
                      disabled={isLotteryStopping}
                    >
                      {isLotteryStopping
                        ? (showChinese ? '正在减速...' : 'Stopping...')
                        : (showChinese ? '🛑 停止' : '🛑 STOP')}
                    </button>
                  </div>
                  {loadingVocab && (
                    <div className="tetris-lottery-loading">
                      {showChinese ? '🔄 正在准备词汇...' : '🔄 Preparing vocabulary...'}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="tetris-start-btn"
                  onClick={startLottery}
                  disabled={(petState.tetrisRoundsLeft || 0) <= 0}
                >
                  {showChinese ? '🚀 开始抽签并游戏 (消耗 1 场次)' : '🚀 Start Game (Costs 1 Round)'}
                </button>
              )}
            </div>
          )}

          {/* Source badge */}
          {(isPlaying || gameOver) && (
            <div className="tetris-source-badge" style={{ display: 'none' }}>
              {showChinese ? '词汇来源: ' : 'Vocab Source: '}
              <strong>{getLabelFromId(selectedGuideId)}</strong>
            </div>
          )}

          {/* Game over card */}
          {gameOver && finalScore !== null && (
            <div className="tetris-gameover-card animate-bounce-in">
              <span className="tetris-gameover-emoji">{endReason === 'timeup' ? '⏰' : '🏆'}</span>
              <h3 className="tetris-gameover-title">
                {endReason === 'timeup'
                  ? (showChinese ? '时间到！' : 'Time Up!')
                  : (showChinese ? '游戏结束！' : 'Game Over!')}
              </h3>
              <div className="tetris-gameover-stats">
                <div className="tetris-gameover-stat">
                  <span>{showChinese ? '最终分数' : 'Final Score'}</span>
                  <strong className="font-mono">{finalScore.toLocaleString()}</strong>
                </div>
                <div className="tetris-gameover-stat">
                  <span>{showChinese ? '消除行数' : 'Lines Cleared'}</span>
                  <strong>{finalLines}</strong>
                </div>
                <div className="tetris-gameover-stat">
                  <span>{showChinese ? '等级' : 'Level'}</span>
                  <strong>{level}</strong>
                </div>
              </div>
              <div className="tetris-gameover-buttons">
                <button
                  className="tetris-play-again-btn"
                  onClick={startLottery}
                  disabled={(petState.tetrisRoundsLeft || 0) <= 0}
                >
                  {showChinese ? '再来一局' : 'Play Again'}
                </button>
                <button className="tetris-reset-btn" onClick={() => setGameOver(false)}>
                  {showChinese ? '重置' : 'Reset'}
                </button>
              </div>
            </div>
          )}

          {/* Game area */}
          {isPlaying && (
            <div className="tetris-game-area" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>

              <div className="tetris-stat-card tetris-stats-consolidated-card">
                
                {/* Row 1: Rounds, Lines, Level */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>🎮</span>
                  <span className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700 }}>×{petState.tetrisRoundsLeft || 0}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>🧱</span>
                  <span className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{lines}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>📈</span>
                  <span className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{level}</span>
                </div>

                {/* Row 2: Timer, Score, Streak */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>⏱️</span>
                  <span className={`tetris-ingame-val font-mono ${gameTimeLeft <= 30 ? 'time-critical' : ''}`} style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    {formatTime(gameTimeLeft)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>⭐</span>
                  <span className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{score.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <div className={`tetris-streak-row ${(correctStreak > 0 || freeRotations > 0) ? 'has-streak' : ''}`} style={{ padding: 0, border: 'none', background: 'none', display: 'flex', alignItems: 'center', margin: 0 }}>
                    <span className="tetris-streak-dots" style={{ display: 'flex', gap: '3px' }}>
                      {[0,1,2,3,4].map(i => {
                        let dotClass = 'tetris-dot';
                        if (freeRotations > 0) {
                          if (i < freeRotations) {
                            dotClass += ' blue';
                          }
                        } else if (i < correctStreak) {
                          dotClass += ' filled';
                        }
                        return <span key={i} className={dotClass} />;
                      })}
                    </span>
                  </div>
                </div>

              </div>

              {/* Row below the stats */}
              <div className="tetris-game-play-row">

                {/* Board */}
                <div className="tetris-board-wrapper">
                <div className="tetris-board">
                  {displayBoard.map((row, r) =>
                    row.map((cell, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={[
                          'tetris-cell',
                          cell.color ? (cell.active ? 'active' : cell.ghost ? 'ghost' : 'locked') : 'empty',
                        ].join(' ')}
                        style={cell.color ? { '--cell-color': cell.color } as React.CSSProperties : {}}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Side info */}
              <div className="tetris-side-panel" style={{ alignSelf: 'stretch' }}>
                {/* Next piece */}
                <div className="tetris-next-card">
                  <div className="tetris-next-label">{showChinese ? '下一个' : 'Next'}</div>
                  <div className="tetris-next-grid">
                    {nextDisplay.map((row, r) =>
                      row.map((color, c) => (
                        <div
                          key={`n-${r}-${c}`}
                          className={`tetris-next-cell ${color ? 'filled' : 'empty'}`}
                          style={color ? { '--cell-color': color } as React.CSSProperties : {}}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Inline Streak / Free Rotation Messages */}
                {streakCelebration && (
                  <div className="tetris-celebration-toast-inline" style={{
                    padding: '8px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid var(--accent)',
                    borderRadius: '8px',
                    color: 'var(--accent)',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    🎉 {showChinese ? '连对 5 次！获得 5 次免费旋转！' : '5 in a row! +5 Free Rotations!'} 🔄
                  </div>
                )}
                {freeRotFlash && (
                  <div className="tetris-free-rot-toast-inline" style={{
                    padding: '8px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    borderRadius: '8px',
                    color: '#22c55e',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    🔄 {showChinese ? '免费旋转！' : 'Free Rotation!'}
                  </div>
                )}
                {wrongAnswerFlash && (
                  <div className="tetris-wrong-flash-inline" style={{
                    padding: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    animation: 'pulse 1.5s infinite',
                    marginTop: '8px'
                  }}>
                    ❌ {showChinese ? '答错了！时间 -10 秒' : 'Wrong Answer! Time -10s'}
                  </div>
                )}

                {/* Desktop hint */}
                <div className="tetris-hint-card">
                  <div className="tetris-hint-row"><kbd>← →</kbd> <span>{showChinese ? '移动' : 'Move'}</span></div>
                  <div className="tetris-hint-row"><kbd>↓</kbd> <span>{showChinese ? '加速下落' : 'Soft drop'}</span></div>
                  <div className="tetris-hint-row"><kbd>Space</kbd> <span>{showChinese ? '旋转 (答题)' : 'Rotate (quiz)'}</span></div>
                </div>

                {/* Pause button for Admin at bottom */}
                {isAdmin && isPlaying && (
                  <button
                    type="button"
                    onClick={() => setIsPaused(prev => !prev)}
                    className="tetris-back-btn"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontWeight: 'bold',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      marginTop: 'auto',
                      textAlign: 'center'
                    }}
                  >
                    {isPaused ? (showChinese ? '▶️ 继续' : '▶️ Resume') : (showChinese ? '⏸️ 暂停' : '⏸️ Pause')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

          {/* Mobile controls */}
          {isPlaying && (
            <div className="tetris-mobile-controls">
              <button className="tetris-ctrl-btn" onClick={moveLeft} aria-label="Move left">◀</button>
              <button className="tetris-ctrl-btn rotate" onClick={triggerRotation} aria-label="Rotate">🔄</button>
              <button 
                className="tetris-ctrl-btn" 
                onClick={softDrop}
                aria-label="Soft drop"
              >
                ▼
              </button>
              <button className="tetris-ctrl-btn" onClick={moveRight} aria-label="Move right">▶</button>
            </div>
          )}

        </div>{/* /tetris-main-panel */}

        {/* ── Leaderboard panel ── */}
        {!isPlaying && (
          <div className="tetris-leaderboard-panel">
            <h3 className="tetris-leaderboard-title">🏅 {showChinese ? '排行榜' : 'Leaderboard'}</h3>
            <div className="tetris-leaderboard-content">
              {loadingLB ? (
                <p className="tetris-loading-text">Loading…</p>
              ) : sortedLB.length === 0 ? (
                <p className="tetris-empty-lb">
                  {showChinese
                    ? '暂无记录。你会是第一名吗？🏆'
                    : 'No records yet. Be the first! 🏆'}
                </p>
              ) : (
                <table className="tetris-lb-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{showChinese ? '玩家' : 'Player'}</th>
                      <th>{showChinese ? '分数' : 'Score'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLB.map((r, i) => {
                      const isLastPlay = lastSavedRecordId !== null && r.id === lastSavedRecordId;
                      return (
                        <tr key={r.id} style={isLastPlay ? { background: 'rgba(168, 85, 247, 0.18)', borderLeft: '3px solid var(--accent)' } : {}}>
                          <td className="rank-cell">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </td>
                          <td>{r.name || r.username}</td>
                          <td className="score-cell font-mono" style={isLastPlay ? { fontWeight: '800' } : {}}>{r.score.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>{/* /tetris-layout */}

      {/* ── Vocab question modal ── */}
      {showQuestion && question && (
        <div className="tetris-question-overlay">
          <div className="tetris-question-card">

            {/* Modal header row lining up countdown, badge, and streak */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', minHeight: '52px' }}>
              {/* Countdown ring */}
              <div
                className="tetris-countdown"
                style={{
                  '--pct': `${(questionCountdown / 10) * 100}%`,
                  '--col': questionCountdown > 6 ? '#10b981' : questionCountdown > 3 ? '#eab308' : '#ef4444',
                } as React.CSSProperties}
              >
                {questionCountdown}
              </div>

              {/* Question type badge */}
              <div className="tetris-question-badge" style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', flex: 1 }}>
                <div>
                  {question.qType === 'En2Cn'
                    ? (showChinese ? '英→中' : 'EN → CN')
                    : (showChinese ? '中→英' : 'CN → EN')}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>
                  {showChinese ? '答对才能旋转！' : 'Answer correctly to rotate!'}
                </div>
              </div>

              {/* Streak badge wrapper (equal width to countdown to keep badge centered) */}
              <div style={{ width: '48px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                {correctStreak > 0 && (
                  <div className="tetris-q-streak-badge">
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🔥</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800' }}>{correctStreak}/5</span>
                  </div>
                )}
              </div>
            </div>
            <div className="tetris-question-prompt">{question.prompt}</div>
            <div className="tetris-question-options">
              {question.options.map((opt, i) => {
                let cls = 'tetris-option-btn';
                if (answerResult === 'correct' && i === question.answer) cls += ' correct';
                if (answerResult === 'wrong' && i === question.answer) cls += ' correct reveal';
                return (
                  <button
                    key={i}
                    id={`tetris-opt-${i}`}
                    className={cls}
                    onClick={() => handleAnswer(i)}
                    disabled={answerResult !== null || questionCountdown === 0}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60px', padding: '16px 24px' }}
                  >
                    <span className="tetris-opt-num" style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '4px',
                      width: '16px',
                      height: '16px',
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      color: 'var(--accent)'
                    }}>{i + 1}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            <div 
              className={`tetris-answer-feedback ${answerResult === 'correct' ? 'correct' : answerResult === 'wrong' ? 'wrong' : ''}`}
              style={{
                visibility: answerResult ? 'visible' : 'hidden',
                background: answerResult ? undefined : 'transparent',
                borderColor: answerResult ? undefined : 'transparent',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '4px 0'
              }}
            >
              {answerResult === 'correct' && `✅ ${showChinese ? '答对了！旋转中...' : 'Correct! Rotating…'}`}
              {answerResult === 'wrong' && (
                questionCountdown === 0
                  ? (showChinese ? '⏰ 时间到！' : '⏰ Time up!')
                  : `❌ ${showChinese ? '答错了，继续加油！' : 'Wrong! No rotation.'}`
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
