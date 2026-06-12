import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { petService } from '../lib/petService';
import type { PetState } from '../lib/petService';
import { API_URL } from '../lib/auth';
import './SchulteGame.css';

interface LeaderboardRecord {
  id: string;
  userId: string;
  name: string;
  username: string;
  unit: string;
  score: number; // in milliseconds
  createdAt: string;
}

export function SchulteGame() {
  const [petState, setPetState] = useState<PetState>(() => petService.getPetState());
  const [gridSize, setGridSize] = useState<4 | 5>(4); // 4 for 4x4, 5 for 5x5
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextNum, setNextNum] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [wrongClickCell, setWrongClickCell] = useState<number | null>(null);
  const [clickedCells, setClickedCells] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [leaderboardTab, setLeaderboardTab] = useState<4 | 5>(4);
  const [unlockedMsg, setUnlockedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // Sync pet state updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PetState>;
      setPetState(customEvent.detail);
    };
    window.addEventListener('ep-pet-update', handleUpdate);
    return () => window.removeEventListener('ep-pet-update', handleUpdate);
  }, []);

  // Fetch leaderboard on mount and tab change
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${API_URL}/api/games/schulte/leaderboard`, { credentials: 'include' });
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

  // Generate grid numbers
  const initializeGrid = () => {
    const totalCells = gridSize * gridSize;
    const array = Array.from({ length: totalCells }, (_, i) => i + 1);
    
    // Fisher-Yates Shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    
    setNumbers(array);
    setNextNum(1);
    setClickedCells([]);
    setWrongClickCell(null);
    setGameFinished(false);
    setFinalTime(null);
  };

  const handleStartGame = () => {
    if ((petState.schulteRoundsLeft || 0) <= 0) {
      setErrorMsg('No play rounds remaining! Spend 1 gold coin to unlock 3 rounds.');
      return;
    }
    
    petService.decrementSchulteRounds();
    setIsPlaying(true);
    setElapsedTime(0);
    setStartTime(Date.now());
    initializeGrid();
    setErrorMsg(null);
    setUnlockedMsg(null);
  };

  const handleCellClick = async (num: number) => {
    if (!isPlaying) return;

    if (num === nextNum) {
      const updatedClicked = [...clickedCells, num];
      setClickedCells(updatedClicked);
      setWrongClickCell(null);
      
      const totalCells = gridSize * gridSize;
      if (num === totalCells) {
        // Game Complete!
        const finalMs = Date.now() - (startTime || Date.now());
        setIsPlaying(false);
        setGameFinished(true);
        setFinalTime(finalMs);
        
        // Save to server
        try {
          await fetch(`${API_URL}/api/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              unit: `game-schulte-${gridSize}x${gridSize}`,
              score: finalMs,
            })
          });
          // Refresh leaderboard
          fetchLeaderboard();
        } catch (e) {
          console.error('Failed to save score:', e);
        }
      } else {
        setNextNum(nextNum + 1);
      }
    } else {
      // Wrong Click
      setWrongClickCell(num);
      setTimeout(() => {
        setWrongClickCell(null);
      }, 500);
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
    
    const success = petService.buySchulteRounds();
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
    .filter(r => r.unit === `game-schulte-${leaderboardTab}x${leaderboardTab}`)
    // Sort ascending (faster is better)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  return (
    <div className="schulte-container">
      {/* Header breadcrumb & info */}
      <div className="schulte-header">
        <Link to="/dashboard" className="schulte-back-btn">← Back to Dashboard</Link>
        <h2 className="schulte-title">Schulte Table (舒尔特方格)</h2>
        <p className="schulte-subtitle">Click the numbers from 1 to {gridSize * gridSize} in order as fast as possible to train your focus! (按顺序从 1 点击到 {gridSize * gridSize}，锻炼你的专注力！)</p>
      </div>

      <div className="schulte-layout">
        {/* Left column: game details & control */}
        <div className="schulte-main-panel">
          {/* Stats bar */}
          <div className="schulte-stats-row">
            <div className="schulte-stat-card">
              <span className="schulte-stat-emoji">🪙</span>
              <div>
                <div className="schulte-stat-lbl">Gold Coins (金币)</div>
                <div className="schulte-stat-val">{petState.goldCoins || 0}</div>
              </div>
            </div>
            <div className="schulte-stat-card">
              <span className="schulte-stat-emoji">🎮</span>
              <div>
                <div className="schulte-stat-lbl">Rounds Left (剩余场次)</div>
                <div className="schulte-stat-val">{petState.schulteRoundsLeft || 0}</div>
              </div>
            </div>
            <div className="schulte-stat-card">
              <span className="schulte-stat-emoji">⏱️</span>
              <div>
                <div className="schulte-stat-lbl">Stopwatch (计时器)</div>
                <div className="schulte-stat-val font-mono">{formatTime(elapsedTime)}</div>
              </div>
            </div>
          </div>

          {/* Feedback alerts */}
          {errorMsg && <div className="schulte-alert error">{errorMsg}</div>}
          {unlockedMsg && <div className="schulte-alert success">{unlockedMsg}</div>}

          {/* Shop unlocking card */}
          {((petState.schulteRoundsLeft || 0) <= 0 && !isPlaying) && (() => {
            const cannotBuy = (petState.food || 0) < 50 || (petState.love || 0) < 50;
            return (
              <div className="schulte-shop-card">
                <h3 className="schulte-shop-title">🎮 Schulte Table Shop</h3>
                <p className="schulte-shop-text">You have run out of rounds. Unlock more play rounds to practice and top the global leaderboards!</p>
                {cannotBuy && (
                  <div style={{ color: '#d73a49', fontSize: '0.85rem', marginBottom: '16px', background: 'rgba(215, 58, 73, 0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(215, 58, 73, 0.2)', textAlign: 'left' }}>
                    ⚠️ Your pet needs at least 50% health (food) and 50% love to buy game rounds! Feed and pet them first.
                    <br />
                    (宠物需要至少 50% 饱食度和 50% 喜爱度才能购买游戏场次！)
                  </div>
                )}
                <button 
                  className="schulte-buy-btn" 
                  onClick={handleUnlockRounds}
                  disabled={cannotBuy}
                  style={cannotBuy ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Spend 1 Gold Coin (🪙) for 3 Rounds
                </button>
              </div>
            );
          })()}

          {/* Settings & Game Board */}
          {!isPlaying && !gameFinished && (
            <div className="schulte-config-section">
              <div className="schulte-grid-select">
                <span className="schulte-select-lbl">Select Grid Size (网格大小):</span>
                <div className="schulte-options-buttons">
                  <button 
                    className={`schulte-size-btn ${gridSize === 4 ? 'active' : ''}`}
                    onClick={() => setGridSize(4)}
                  >
                    4x4 (1-16)
                  </button>
                  <button 
                    className={`schulte-size-btn ${gridSize === 5 ? 'active' : ''}`}
                    onClick={() => setGridSize(5)}
                  >
                    5x5 (1-25)
                  </button>
                </div>
              </div>
              <button 
                className="schulte-start-btn" 
                onClick={handleStartGame}
                disabled={(petState.schulteRoundsLeft || 0) <= 0}
              >
                🚀 Start Game (消耗 1 场次)
              </button>
            </div>
          )}

          {/* Victory Card */}
          {gameFinished && finalTime !== null && (
            <div className="schulte-victory-card animate-bounce-in">
              <span className="schulte-victory-emoji">🏆</span>
              <h3 className="schulte-victory-title">Congratulations! (恭喜通关!)</h3>
              <p className="schulte-victory-desc">You completed the {gridSize}x{gridSize} grid in:</p>
              <div className="schulte-victory-time font-mono">{formatTime(finalTime)}</div>
              <div className="schulte-victory-buttons">
                <button className="schulte-play-again-btn" onClick={handleStartGame} disabled={(petState.schulteRoundsLeft || 0) <= 0}>
                  Play Again (再来一局)
                </button>
                <button className="schulte-back-dash-btn" onClick={() => setGameFinished(false)}>
                  Reset (重置)
                </button>
              </div>
            </div>
          )}

          {/* Active Grid Board */}
          {isPlaying && numbers.length > 0 && (
            <div className="schulte-grid-wrapper">
              <div className="schulte-current-hint">
                Find and click (寻找下一个目标): <strong className="schulte-hint-highlight">{nextNum}</strong>
              </div>
              <div 
                className="schulte-board" 
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
              >
                {numbers.map((num) => {
                  const isClicked = clickedCells.includes(num);
                  const isWrong = wrongClickCell === num;
                  
                  let cellClass = '';
                  if (isClicked) cellClass = 'clicked';
                  else if (isWrong) cellClass = 'wrong';

                  return (
                    <button
                      key={num}
                      className={`schulte-cell ${cellClass}`}
                      onClick={() => handleCellClick(num)}
                      disabled={isClicked}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Leaderboards */}
        <div className="schulte-leaderboard-panel">
          <h3 className="schulte-leaderboard-title">🏆 Top Rankings (排行榜)</h3>
          
          <div className="schulte-leaderboard-tabs">
            <button
              className={`schulte-leaderboard-tab ${leaderboardTab === 4 ? 'active' : ''}`}
              onClick={() => setLeaderboardTab(4)}
            >
              4x4 Rankings
            </button>
            <button
              className={`schulte-leaderboard-tab ${leaderboardTab === 5 ? 'active' : ''}`}
              onClick={() => setLeaderboardTab(5)}
            >
              5x5 Rankings
            </button>
          </div>

          <div className="schulte-leaderboard-content">
            {loadingLeaderboard ? (
              <div className="schulte-loading-text">Loading leaderboards...</div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="schulte-empty-leaderboard">
                No scores recorded yet. Be the first to play and set a record!
              </div>
            ) : (
              <table className="schulte-leaderboard-table">
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
