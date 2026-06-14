import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { petService } from '../lib/petService';
import type { PetState } from '../lib/petService';
import { API_URL } from '../lib/auth';
import { decryptContent, OBSCURE_KEY } from '../lib/crypto';
import { cache } from '../lib/cache';
import './CardMatchGame.css';

interface LeaderboardRecord {
  id: string;
  userId: string;
  name: string;
  username: string;
  unit: string;
  score: number; // in milliseconds
  createdAt: string;
}

interface VocabItem {
  word: string;
  meaning: string;
}

interface Card {
  id: string;
  text: string;
  pairId: number;
  color: string;
  type: 'en' | 'cn';
  isFlipped: boolean;
  isMatched: boolean;
}

const PAIR_COLORS = [
  '#f87171', // Coral Red
  '#60a5fa', // Sky Blue
  '#34d399', // Lime Green
  '#fbbf24', // Amber/Yellow
  '#c084fc', // Grape/Purple
  '#f472b6', // Pink
  '#2dd4bf', // Teal
  '#fb923c'  // Orange
];

const FALLBACK_VOCAB: VocabItem[] = [
  { word: 'apple', meaning: '苹果' },
  { word: 'banana', meaning: '香蕉' },
  { word: 'cat', meaning: '猫' },
  { word: 'dog', meaning: '狗' },
  { word: 'elephant', meaning: '大象' },
  { word: 'panda', meaning: '熊猫' },
  { word: 'school', meaning: '学校' },
  { word: 'teacher', meaning: '老师' },
  { word: 'student', meaning: '学生' },
  { word: 'pencil', meaning: '铅笔' },
  { word: 'happy', meaning: '开心的' },
  { word: 'beautiful', meaning: '美丽的' },
  { word: 'jump', meaning: '跳跃' },
  { word: 'run', meaning: '跑步' },
  { word: 'water', meaning: '水' }
];

const getDisplayLabel = (textbook: string, unit: string) => {
  const tb = (textbook || '').trim();
  let ut = (unit || '').trim();
  if (tb && ut.toLowerCase().startsWith(tb.toLowerCase())) {
    let rest = ut.substring(tb.length).trim();
    if (rest.startsWith('-')) {
      rest = rest.substring(1).trim();
    }
    if (rest) {
      ut = rest;
    }
  }
  return tb && ut ? `${tb} - ${ut}` : tb || ut;
};

export function CardMatchGame({ showChinese = false }: { showChinese?: boolean }) {
  const [petState, setPetState] = useState<PetState>(() => petService.getPetState());
  const [difficulty, setDifficulty] = useState<4 | 6 | 8>(6); // 4 for Easy (8 cards), 6 for Normal (12 cards), 8 for Hard (16 cards)
  const [vocabGuides, setVocabGuides] = useState<any[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string>('fallback');
  const [loadingVocab, setLoadingVocab] = useState<boolean>(false);
  
  // Lottery State
  const [isLotteryRunning, setIsLotteryRunning] = useState<boolean>(false);
  const [isLotteryStopping, setIsLotteryStopping] = useState<boolean>(false);
  const [lotteryDisplayLabel, setLotteryDisplayLabel] = useState<string>('');
  const [lotteryTimer, setLotteryTimer] = useState<number>(5.0);

  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]); // indices of currently selected cards
  const [isProcessingMatch, setIsProcessingMatch] = useState<boolean>(false);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [leaderboardTab, setLeaderboardTab] = useState<4 | 6 | 8>(6);
  
  const [unlockedMsg, setUnlockedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const lotteryTimerId = useRef<number | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  // Sync pet state updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PetState>;
      setPetState(customEvent.detail);
    };
    window.addEventListener('ep-pet-update', handleUpdate);
    return () => window.removeEventListener('ep-pet-update', handleUpdate);
  }, []);

  // Fetch leaderboard & load practices
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${API_URL}/api/games/cardmatch/leaderboard`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Load vocab guide list
    const cachedPractices = cache.getPractices();
    if (cachedPractices && cachedPractices.length > 0) {
      const guides = cachedPractices.filter((p: any) => p.type.toLowerCase().includes('vocab-guide'));
      const sorted = [...guides].sort((a, b) => {
        const labelA = getDisplayLabel(a.textbook, a.unit).toLowerCase();
        const labelB = getDisplayLabel(b.textbook, b.unit).toLowerCase();
        return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setVocabGuides(sorted);
    } else {
      fetch(`${API_URL}/api/practices`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            cache.setPractices(data);
            const guides = data.filter((p: any) => p.type.toLowerCase().includes('vocab-guide'));
            const sorted = [...guides].sort((a, b) => {
              const labelA = getDisplayLabel(a.textbook, a.unit).toLowerCase();
              const labelB = getDisplayLabel(b.textbook, b.unit).toLowerCase();
              return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
            });
            setVocabGuides(sorted);
          }
        })
        .catch(e => console.error('Failed to fetch practices:', e));
    }

    return () => {
      if (lotteryTimerId.current) {
        window.clearTimeout(lotteryTimerId.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isPlaying && startTime !== null) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 30);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isPlaying, startTime]);

  const startLottery = () => {
    if ((petState.cardMatchRoundsLeft || 0) <= 0) {
      setErrorMsg(showChinese ? '没有剩余游戏场次，请先购买！' : 'No play rounds remaining! Spend 1 gold coin to unlock 3 rounds. 🪙');
      return;
    }
    
    setErrorMsg(null);
    setUnlockedMsg(null);
    setGameFinished(false);
    setIsLotteryRunning(true);
    setIsLotteryStopping(false);
    isStoppingRef.current = false;
    setLotteryTimer(5.0);
    
    const pool = [
      { id: 'fallback', label: showChinese ? '常用词汇' : 'General Practice' },
      ...vocabGuides.map(g => ({
        id: g.id,
        label: getDisplayLabel(g.textbook, g.unit)
      }))
    ];
    
    let currentIdx = Math.floor(Math.random() * pool.length);
    setLotteryDisplayLabel(pool[currentIdx].label);
    
    let speed = 60;
    let running = true;
    let stopping = false;
    let stopSteps = 0;
    const maxStopSteps = 5;
    
    const startTime = Date.now();
    
    const tick = () => {
      if (!running) return;
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (5000 - elapsed) / 1000);
      setLotteryTimer(remaining);
      
      let nextIdx = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && nextIdx === currentIdx) {
        nextIdx = (nextIdx + 1) % pool.length;
      }
      currentIdx = nextIdx;
      
      setLotteryDisplayLabel(pool[currentIdx].label);
      
      if ((isStoppingRef.current || elapsed >= 5000) && !stopping) {
        stopping = true;
        setIsLotteryStopping(true);
        stopSteps = 0;
      }
      
      if (stopping) {
        stopSteps++;
        if (stopSteps >= maxStopSteps) {
          running = false;
          finishLottery(pool[currentIdx]);
          return;
        }
        speed = speed * 2;
      }
      
      lotteryTimerId.current = window.setTimeout(tick, speed);
    };
    
    lotteryTimerId.current = window.setTimeout(tick, speed);
  };

  const finishLottery = (selectedOption: { id: string; label: string }) => {
    setSelectedGuideId(selectedOption.id);
    lotteryTimerId.current = window.setTimeout(() => {
      fetchAndStartGame(selectedOption.id);
    }, 1000);
  };

  const fetchAndStartGame = async (guideId: string) => {
    setLoadingVocab(true);
    setErrorMsg(null);
    try {
      let vocabList = FALLBACK_VOCAB;
      if (guideId !== 'fallback') {
        const res = await fetch(`${API_URL}/api/practices/${guideId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          let vocabData = data;
          if (data.isEncrypted && typeof data.content === 'string') {
            vocabData = decryptContent(data.content, OBSCURE_KEY);
          } else {
            vocabData = data.content;
          }
          if (vocabData && Array.isArray(vocabData.unit_vocabulary) && vocabData.unit_vocabulary.length > 0) {
            vocabList = vocabData.unit_vocabulary;
          }
        }
      }
      
      petService.decrementCardMatchRounds();
      initializeCards(vocabList);
      
      setIsPlaying(true);
      setElapsedTime(0);
      setStartTime(Date.now());
      setIsLotteryRunning(false);
    } catch (e) {
      console.error(e);
      setErrorMsg(showChinese ? '加载词汇失败，请重试！' : 'Failed to load vocabulary, please try again.');
      setIsLotteryRunning(false);
    } finally {
      setLoadingVocab(false);
    }
  };

  const initializeCards = (vocabList: VocabItem[]) => {
    const pool = [...vocabList];
    const selectedWords: VocabItem[] = [];
    
    while (pool.length < difficulty) {
      pool.push(...FALLBACK_VOCAB);
    }

    for (let i = 0; i < difficulty; i++) {
      const index = Math.floor(Math.random() * pool.length);
      selectedWords.push(pool.splice(index, 1)[0]);
    }

    const cardList: Card[] = [];
    selectedWords.forEach((item, index) => {
      const pairColor = PAIR_COLORS[index % PAIR_COLORS.length];
      
      cardList.push({
        id: `pair-${index}-en`,
        text: item.word,
        pairId: index,
        color: pairColor,
        type: 'en',
        isFlipped: false,
        isMatched: false
      });

      cardList.push({
        id: `pair-${index}-cn`,
        text: item.meaning,
        pairId: index,
        color: pairColor,
        type: 'cn',
        isFlipped: false,
        isMatched: false
      });
    });

    for (let i = cardList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardList[i], cardList[j]] = [cardList[j], cardList[i]];
    }

    setCards(cardList);
    setSelectedCards([]);
    setIsProcessingMatch(false);
    setGameFinished(false);
    setFinalTime(null);
  };

  const handleCardClick = (clickedIndex: number) => {
    if (!isPlaying || isProcessingMatch) return;
    const clickedCard = cards[clickedIndex];
    if (clickedCard.isFlipped || clickedCard.isMatched) return;

    // Flip clicked card
    const updatedCards = [...cards];
    updatedCards[clickedIndex] = { ...clickedCard, isFlipped: true };
    setCards(updatedCards);

    const activeSelections = [...selectedCards, clickedIndex];
    setSelectedCards(activeSelections);

    if (activeSelections.length === 2) {
      setIsProcessingMatch(true);
      const [firstIdx, secondIdx] = activeSelections;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        // MATCH FOUND!
        setTimeout(() => {
          const matchedCards = [...updatedCards];
          matchedCards[firstIdx] = { ...firstCard, isFlipped: true, isMatched: true };
          matchedCards[secondIdx] = { ...secondCard, isFlipped: true, isMatched: true };
          setCards(matchedCards);
          setSelectedCards([]);
          setIsProcessingMatch(false);

          // Check if all matched
          const allMatched = matchedCards.every(c => c.isMatched);
          if (allMatched) {
            handleVictory();
          }
        }, 300);
      } else {
        // NO MATCH! Flip back after 800ms
        setTimeout(() => {
          const resetCards = [...updatedCards];
          resetCards[firstIdx] = { ...firstCard, isFlipped: false };
          resetCards[secondIdx] = { ...secondCard, isFlipped: false };
          setCards(resetCards);
          setSelectedCards([]);
          setIsProcessingMatch(false);
        }, 800);
      }
    }
  };

  const handleVictory = async () => {
    const finalMs = Date.now() - (startTime || Date.now());
    setIsPlaying(false);
    setGameFinished(true);
    setFinalTime(finalMs);
    
    // Save record to DB
    try {
      await fetch(`${API_URL}/api/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          unit: `game-cardmatch-${difficulty}`,
          score: finalMs,
        })
      });
      // Refresh leaderboard
      fetchLeaderboard();
    } catch (e) {
      console.error('Failed to save card match score:', e);
    }
  };

  const handleUnlockRounds = () => {
    setErrorMsg(null);
    setUnlockedMsg(null);
    
    if ((petState.food || 0) < 50 || (petState.love || 0) < 50) {
      setErrorMsg('Your pet must have at least 50% health (food) and 50% love to buy game rounds! 🍎❤️');
      return;
    }

    if ((petState.goldCoins || 0) < 1) {
      setErrorMsg('Not enough Gold Coins! Answer questions in lessons to earn coins. 🪙');
      return;
    }
    
    const success = petService.buyCardMatchRounds();
    if (success) {
      setUnlockedMsg('Successfully unlocked 3 play rounds! 🎮✨');
    } else {
      setErrorMsg('Unlock failed.');
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${String(centiseconds).padStart(2, '0')}s`;
  };

  const filteredLeaderboard = leaderboard
    .filter(r => r.unit === `game-cardmatch-${leaderboardTab}`)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  const getDisplayLabelFromId = (id: string) => {
    if (id === 'fallback') {
      return showChinese ? '常用词汇' : 'General Practice';
    }
    const guide = vocabGuides.find(g => g.id === id);
    if (guide) {
      return getDisplayLabel(guide.textbook, guide.unit);
    }
    return showChinese ? '常用词汇' : 'General Practice';
  };

  return (
    <div className="cardmatch-container">
      {/* Header */}
      <div className="cardmatch-header">
        <Link to="/dashboard" className="cardmatch-back-btn">← Back to Dashboard</Link>
        <h2 className="cardmatch-title">
          <span className="db-title-grid">
            <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
              Card Match Game
            </span>
            <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
              卡片配对
            </span>
          </span>
        </h2>
        <p className="cardmatch-subtitle">
          Flip cards to match the English word with its Chinese translation. Each matching pair is highlighted in a distinct font color!
          <br />
          (翻牌配对英文单词与中文翻译。每一对正确的单词 and 翻译在翻开时会有专属的字体颜色以示区分！)
        </p>
      </div>

      <div className="cardmatch-layout">
        {/* Main Panel */}
        <div className="cardmatch-main-panel">
          {/* Stats Bar or Victory Card */}
          {gameFinished && finalTime !== null ? (
            <div className="cardmatch-victory-card animate-bounce-in">
              <span className="cardmatch-victory-emoji">🏆</span>
              <h3 className="cardmatch-victory-title">
                <span className="db-title-grid">
                  <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                    Excellent Job!
                  </span>
                  <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                    太棒了！
                  </span>
                </span>
              </h3>
              <p className="cardmatch-victory-desc">
                <span className="db-title-grid">
                  <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                    You completed the {difficulty} pairs puzzle in:
                  </span>
                  <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                    你已成功完成 {difficulty} 对卡片配对：
                  </span>
                </span>
              </p>
              <div className="cardmatch-victory-time font-mono">{formatTime(finalTime)}</div>
              <div className="cardmatch-victory-buttons">
                <button className="cardmatch-play-again-btn" onClick={startLottery} disabled={(petState.cardMatchRoundsLeft || 0) <= 0}>
                  <span className="db-title-grid">
                    <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                      Play Again
                    </span>
                    <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                      再来一局
                    </span>
                  </span>
                </button>
                <button className="cardmatch-back-dash-btn" onClick={() => setGameFinished(false)}>
                  <span className="db-title-grid">
                    <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                      Reset
                    </span>
                    <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                      重置
                    </span>
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="cardmatch-stats-row">
              <div className="cardmatch-stat-card">
                <span className="cardmatch-stat-emoji">🪙</span>
                <div>
                  <div className="cardmatch-stat-lbl">
                    <span className="db-title-grid">
                      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                        Gold Coins
                      </span>
                      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                        金币
                      </span>
                    </span>
                  </div>
                  <div className="cardmatch-stat-val">{petState.goldCoins || 0}</div>
                </div>
              </div>
              <div className="cardmatch-stat-card">
                <span className="cardmatch-stat-emoji">🎮</span>
                <div>
                  <div className="cardmatch-stat-lbl">
                    <span className="db-title-grid">
                      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                        Rounds Left
                      </span>
                      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                        剩余场次
                      </span>
                    </span>
                  </div>
                  <div className="cardmatch-stat-val">{petState.cardMatchRoundsLeft || 0}</div>
                </div>
              </div>
              <div className="cardmatch-stat-card">
                <span className="cardmatch-stat-emoji">⏱️</span>
                <div>
                  <div className="cardmatch-stat-lbl">
                    <span className="db-title-grid">
                      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                        Stopwatch
                      </span>
                      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                        计时器
                      </span>
                    </span>
                  </div>
                  <div className="cardmatch-stat-val font-mono">{formatTime(elapsedTime)}</div>
                </div>
              </div>
            </div>
          )}

          {(isPlaying || gameFinished) && (
            <div className="cardmatch-source-badge animate-bounce-in">
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  Vocabulary Source: <strong>{getDisplayLabelFromId(selectedGuideId)}</strong>
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  词汇来源: <strong>{getDisplayLabelFromId(selectedGuideId)}</strong>
                </span>
              </span>
            </div>
          )}

          {/* Feedback alerts */}
          {errorMsg && <div className="cardmatch-alert error">{errorMsg}</div>}
          {unlockedMsg && <div className="cardmatch-alert success">{unlockedMsg}</div>}

          {/* Shop Card */}
          {((petState.cardMatchRoundsLeft || 0) <= 0 && !isPlaying) && (() => {
            const cannotBuy = (petState.food || 0) < 50 || (petState.love || 0) < 50;
            return (
              <div className="cardmatch-shop-card">
                <h3 className="cardmatch-shop-title">🎮 Card Match Shop</h3>
                <p className="cardmatch-shop-text">You have run out of rounds. Unlock more play rounds using gold coins to challenge and build vocabulary!</p>
                {cannotBuy && (
                  <div className="cardmatch-buy-warning">
                    ⚠️ Your pet needs at least 50% health (food) and 50% love to buy game rounds! Feed and pet them first.
                    <br />
                    (宠物需要至少 50% 饱食度和 50% 亲密度才能购买游戏场次！)
                  </div>
                )}
                <button 
                  className="cardmatch-buy-btn" 
                  onClick={handleUnlockRounds}
                  disabled={cannotBuy}
                  style={cannotBuy ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Spend 1 Gold Coin (🪙) for 3 Rounds
                </button>
              </div>
            );
          })()}

          {/* Configuration Selection */}
          {!isPlaying && !gameFinished && (
            <div className="cardmatch-config-section">
              {isLotteryRunning ? (
                /* Lottery Animation Screen */
                <div className="cardmatch-lottery-panel">
                  <h3 className="cardmatch-lottery-title">
                    {showChinese ? '🎯 正在抽取词汇源...' : '🎯 Rolling Vocabulary Source...'}
                  </h3>
                  
                  <div className="cardmatch-lottery-box">
                    <span className="cardmatch-lottery-item">
                      {lotteryDisplayLabel}
                    </span>
                  </div>

                  <div className="cardmatch-lottery-footer">
                    <span className="cardmatch-lottery-countdown">
                      {showChinese ? `自动停止倒计时: ${lotteryTimer.toFixed(1)}秒` : `Auto-stop in: ${lotteryTimer.toFixed(1)}s`}
                    </span>
                    <button
                      className="cardmatch-lottery-stop-btn"
                      onClick={() => { isStoppingRef.current = true; }}
                      disabled={isLotteryStopping}
                    >
                      {isLotteryStopping 
                        ? (showChinese ? '正在减速...' : 'Stopping...') 
                        : (showChinese ? '🛑 停止' : '🛑 STOP')}
                    </button>
                  </div>
                  
                  {loadingVocab && (
                    <div className="cardmatch-lottery-loading">
                      {showChinese ? '🔄 正在准备词汇...' : '🔄 Preparing vocabulary...'}
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Config Screen (WITHOUT Select Vocabulary Source select dropdown) */
                <>
                  {/* Difficulty Selection */}
                  <div className="cardmatch-config-row">
                    <span className="cardmatch-select-lbl">
                      <span className="db-title-grid">
                        <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                          Select Grid Size / Difficulty:
                        </span>
                        <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                          选择难度/网格大小:
                        </span>
                      </span>
                    </span>
                    <div className="cardmatch-options-buttons">
                      <button 
                        className={`cardmatch-diff-btn ${difficulty === 4 ? 'active' : ''}`}
                        onClick={() => setDifficulty(4)}
                      >
                        <span className="db-title-grid">
                          <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                            Easy (4 pairs)
                          </span>
                          <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                            简单 (4对)
                          </span>
                        </span>
                      </button>
                      <button 
                        className={`cardmatch-diff-btn ${difficulty === 6 ? 'active' : ''}`}
                        onClick={() => setDifficulty(6)}
                      >
                        <span className="db-title-grid">
                          <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                            Normal (6 pairs)
                          </span>
                          <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                            普通 (6对)
                          </span>
                        </span>
                      </button>
                      <button 
                        className={`cardmatch-diff-btn ${difficulty === 8 ? 'active' : ''}`}
                        onClick={() => setDifficulty(8)}
                      >
                        <span className="db-title-grid">
                          <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                            Hard (8 pairs)
                          </span>
                          <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                            困难 (8对)
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>

                  <button 
                    className="cardmatch-start-btn" 
                    onClick={startLottery}
                    disabled={(petState.cardMatchRoundsLeft || 0) <= 0}
                  >
                    <span className="db-title-grid">
                      <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                        🚀 Start Game (Costs 1 Round)
                      </span>
                      <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                        🚀 开始抽签并游戏 (消耗 1 场次)
                      </span>
                    </span>
                  </button>
                </>
              )}
            </div>
          )}


          {/* Game Board */}
          {(isPlaying || gameFinished) && cards.length > 0 && (
            <div className="cardmatch-board-wrapper">
              <div className="cardmatch-board-grid" style={{ gridTemplateColumns: `repeat(${difficulty === 4 ? 4 : 4}, 1fr)` }}>
                {cards.map((card, index) => {
                  const isFlipped = card.isFlipped || card.isMatched;
                  
                  return (
                    <div
                      key={card.id}
                      className={`cardmatch-card-outer ${isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                      onClick={() => handleCardClick(index)}
                    >
                      <div className="cardmatch-card-inner">
                        {/* Front (face down) */}
                        <div className="cardmatch-card-front">
                          <span className="cardmatch-card-back-symbol">🎴</span>
                        </div>
                        {/* Back (face up) */}
                        <div 
                          className="cardmatch-card-back"
                          style={{ 
                            color: card.isMatched ? card.color : 'var(--text-h)', 
                            borderColor: card.isMatched ? card.color : 'var(--border)' 
                          }}
                        >
                          <span className="cardmatch-card-text">{card.text}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Leaderboards) */}
        <div className="cardmatch-leaderboard-panel">
          <h3 className="cardmatch-leaderboard-title">
            <span className="db-title-grid">
              <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                🏆 Rankings
              </span>
              <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                🏆 排行榜
              </span>
            </span>
          </h3>
          
          <div className="cardmatch-leaderboard-tabs">
            <button
              className={`cardmatch-leaderboard-tab ${leaderboardTab === 4 ? 'active' : ''}`}
              onClick={() => setLeaderboardTab(4)}
            >
              Easy
            </button>
            <button
              className={`cardmatch-leaderboard-tab ${leaderboardTab === 6 ? 'active' : ''}`}
              onClick={() => setLeaderboardTab(6)}
            >
              Normal
            </button>
            <button
              className={`cardmatch-leaderboard-tab ${leaderboardTab === 8 ? 'active' : ''}`}
              onClick={() => setLeaderboardTab(8)}
            >
              Hard
            </button>
          </div>

          <div className="cardmatch-leaderboard-content">
            {loadingLeaderboard ? (
              <div className="cardmatch-loading-text">Loading leaderboards...</div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="cardmatch-empty-leaderboard">
                No scores recorded yet. Be the first to set a record!
              </div>
            ) : (
              <table className="cardmatch-leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Time</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((r, index) => {
                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
                    const isSelf = r.userId === petState.userId;
                    
                    return (
                      <tr key={r.id} className={isSelf ? 'leaderboard-row-self' : ''}>
                        <td className="rank-cell">{rankEmoji}</td>
                        <td className="name-cell font-bold">{r.name}</td>
                        <td className="time-cell font-mono">{formatTime(r.score)}</td>
                        <td className="date-cell">{new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
