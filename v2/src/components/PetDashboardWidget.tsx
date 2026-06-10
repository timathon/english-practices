import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { petService, ACHIEVEMENT_DEFS, DAILY_GOAL_VALUES } from '../lib/petService';
import type { PetState, DailyGoalPreset, AchievementDef } from '../lib/petService';
import './PetDashboardWidget.css';

export function PetDashboardWidget() {
  const [petState, setPetState] = useState<PetState>(() => petService.getPetState());
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(petState.name);
  const [hoverEmoji, setHoverEmoji] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [showAdopt, setShowAdopt] = useState(false);
  const [achievementToast, setAchievementToast] = useState<AchievementDef | null>(null);
  const [goalCelebrating, setGoalCelebrating] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'evolution' | 'activities'>('stats');
  const navigate = useNavigate();
  const [showBuyFoodModal, setShowBuyFoodModal] = useState(false);
  const [showBuyGameModal, setShowBuyGameModal] = useState(false);
  const [buyAmount, setBuyAmount] = useState(1);

  const speechTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Sync pet state updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PetState>;
      setPetState(customEvent.detail);
      setNewName(customEvent.detail.name);
    };

    const handleAchievement = (e: Event) => {
      const customEvent = e as CustomEvent<AchievementDef>;
      setAchievementToast(customEvent.detail);
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => {
        setAchievementToast(null);
      }, 4000);
    };

    window.addEventListener('ep-pet-update', handleUpdate);
    window.addEventListener('ep-achievement-unlock', handleAchievement);
    return () => {
      window.removeEventListener('ep-pet-update', handleUpdate);
      window.removeEventListener('ep-achievement-unlock', handleAchievement);
      if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const showSpeech = (msg: string) => {
    if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
    setSpeechBubble(msg);
    speechTimeoutRef.current = window.setTimeout(() => setSpeechBubble(null), 4000);
  };

  const handleFeed = () => {
    if ((petState.foodItems || 0) <= 0) {
      setBuyAmount(1);
      setShowBuyFoodModal(true);
      return;
    }
    const success = petService.feedPet();
    if (success) {
      showSpeech(petService.getRandomFeedMessage(petState.name, petState.type));
    }
  };

  const handleBuyFood = (amount: number) => {
    if ((petState.goldCoins || 0) < amount) {
      showSpeech(`You need at least ${amount} 🪙 to buy food!`);
      return;
    }
    const success = petService.buyFood(amount);
    if (success) {
      showSpeech(`Bought ${amount} food item${amount > 1 ? 's' : ''}! ${petService.getPetFoodEmoji(petState.type)}`);
      // Trigger feed directly after buying
      setTimeout(() => {
        const fed = petService.feedPet(amount);
        if (fed) {
          showSpeech(petService.getRandomFeedMessage(petState.name, petState.type));
        }
      }, 300);
    }
  };

  const handlePet = () => {
    const result = petService.petPet();
    const msg = result.success
      ? petService.getRandomPetMessage(petState.name, petState.type)
      : petService.getRandomRefusalMessage(petState.name, petState.type, result.nextAvailableInMs);
    showSpeech(msg);
  };

  const handleGameClick = () => {
    if ((petState.schulteRoundsLeft || 0) <= 0) {
      setShowBuyGameModal(true);
    } else {
      navigate('/games/schulte');
    }
  };

  const handleBuyGameRounds = () => {
    if ((petState.goldCoins || 0) < 1) {
      showSpeech(`You need at least 1 🪙 to buy game rounds!`);
      return;
    }
    const success = petService.buySchulteRounds();
    if (success) {
      setShowBuyGameModal(false);
      navigate('/games/schulte');
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    petService.renamePet(newName);
    setIsRenaming(false);
  };

  const handlePetTypeChange = (type: 'cat' | 'dog' | 'dino') => {
    petService.changePetType(type);
    showSpeech('Adopted a new companion! 🐾');
  };

  const handleGoalPresetChange = (preset: DailyGoalPreset) => {
    petService.setDailyGoalPreset(preset);
  };

  // Derived state
  const currentEmoji = petService.getPetEmoji(petState.type, petState.food, petState.love, petState.level);
  const statusText = petService.getPetStatusText(petState.food, petState.love);
  const stage = petService.getEvolutionStage(petState.level);
  const stageLabel = petService.getEvolutionLabel(stage);
  const xpProgress = petService.getXpProgress(petState.xp, petState.level);
  const dailyProgress = petService.getDailyProgress(petState);
  const streakInfo = petService.getStreakInfo(petState);

  // Quantity selector variables
  const canDecrement = buyAmount > 1;
  const maxBuyAmount = Math.max(1, petState.goldCoins || 0);
  const canIncrement = buyAmount < maxBuyAmount;
  const isBuyDisabled = (petState.goldCoins || 0) < buyAmount;

  // Goal celebration effect
  useEffect(() => {
    if (dailyProgress.completed) {
      setGoalCelebrating(true);
      const t = setTimeout(() => setGoalCelebrating(false), 2000);
      return () => clearTimeout(t);
    }
  }, [dailyProgress.completed]);

  const stageGlowClass = `pet-widget-glow-${stage}`;

  return (
    <div className="db-stats pet-widget-card">
      {/* Achievement toast */}
      {achievementToast && (
        <div className="pet-widget-toast">
          <span className="pet-widget-toast-emoji">{achievementToast.emoji}</span>
          <div>
            <div className="pet-widget-toast-title">Achievement Unlocked!</div>
            <div className="pet-widget-toast-name">{achievementToast.title} ({achievementToast.titleCn})</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="pet-widget-header">
        <div className="pet-widget-header-row">
          <h3 className="db-stats-title">Pet Companion (宠物伙伴)</h3>
          <button
            type="button"
            className="pet-help-btn"
            onClick={() => setShowHelpModal(true)}
            title="How the Pet System works (宠物系统指南)"
          >
            ❓
          </button>
        </div>
        <div className="pet-widget-header-sub" style={{ display: 'flex', gap: '8px' }}>
          <span className={`pet-widget-level-badge pet-widget-level-${stage}`}>
            Lv.{petState.level} · {stageLabel}
          </span>
          <span className="pet-widget-points-badge" title="Gold Coins earned from correct answers (通过答题赚取的金币)">
            🪙 {petState.goldCoins || 0}
          </span>
        </div>
      </div>

      <div className="pet-widget-content">
        {/* ── Row 1: Avatar + Name + Status ── */}
        <div className="pet-widget-avatar-section">
          <div
            className={`pet-widget-emoji-circle ${stageGlowClass} ${hoverEmoji ? 'anim-bounce' : ''}`}
            onMouseEnter={() => setHoverEmoji(true)}
            onMouseLeave={() => setHoverEmoji(false)}
            onClick={handlePet}
            title="Click to pet!"
            style={{ position: 'relative' }}
          >
            {speechBubble && (
              <div className="pet-widget-face-speech">
                {speechBubble}
                <div className="pet-widget-face-speech-arrow" />
              </div>
            )}
            <span className="pet-widget-emoji">{currentEmoji}</span>
          </div>

          <div className="pet-widget-info">
            {isRenaming ? (
              <form onSubmit={handleSaveName} className="pet-widget-rename-form">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={12}
                  className="pet-widget-rename-input"
                  autoFocus
                />
                <button type="submit" className="pet-widget-rename-save-btn">✓</button>
                <button type="button" onClick={() => setIsRenaming(false)} className="pet-widget-rename-cancel-btn">✕</button>
              </form>
            ) : (
              <div className="pet-widget-name-container">
                <span className="pet-widget-name">{petState.name}</span>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="pet-widget-edit-btn"
                  title="Rename Pet"
                >
                  ✏️
                </button>
              </div>
            )}
            <div className="pet-widget-status">{statusText}</div>

            {/* XP Progress Bar */}
            <div className="pet-widget-xp-section">
              <div className="pet-widget-xp-label">
                <span>⭐ XP</span>
                <span>{petState.level >= 20 ? 'MAX' : `${xpProgress.current}/${xpProgress.needed}`}</span>
              </div>
              <div className="pet-widget-xp-bar-bg">
                <div
                  className={`pet-widget-xp-bar-fill pet-widget-xp-${stage}`}
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Streak + Daily Goal ── */}
        <div className="pet-widget-metrics-row">
          {/* Streak */}
          <div className={`pet-widget-metric-card ${streakInfo.streak > 0 ? 'streak-active' : 'streak-inactive'}`}>
            <div className="pet-widget-metric-icon-wrap">
              <span className={`pet-widget-metric-icon ${streakInfo.streak > 0 ? 'flame-anim' : ''}`}>
                {streakInfo.streak > 0 ? '🔥' : '❄️'}
              </span>
            </div>
            <div className="pet-widget-metric-data">
              <span className="pet-widget-metric-value">{streakInfo.streak}</span>
              <span className="pet-widget-metric-label">
                {streakInfo.streak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
            <div className="pet-widget-metric-sub">
              Best: {streakInfo.longestStreak}
            </div>
          </div>

          {/* Daily Goal */}
          <div className={`pet-widget-metric-card ${dailyProgress.completed ? 'goal-complete' : ''} ${goalCelebrating ? 'goal-celebrating' : ''}`}>
            <div className="pet-widget-daily-ring-wrap">
              <svg className="pet-widget-daily-ring" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke={dailyProgress.completed ? '#22c55e' : 'var(--accent)'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - dailyProgress.percent / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }}
                  transform="rotate(-90 24 24)"
                />
              </svg>
              <span className="pet-widget-daily-ring-text">
                {dailyProgress.completed ? '✅' : `${dailyProgress.percent}%`}
              </span>
            </div>
            <div className="pet-widget-metric-data">
              <span className="pet-widget-metric-value">{dailyProgress.current}/{dailyProgress.goal}</span>
              <span className="pet-widget-metric-label">Daily Goal</span>
            </div>
            <div className="pet-widget-metric-sub">
              <select
                className="pet-widget-goal-select"
                value={petState.dailyGoalPreset}
                onChange={(e) => handleGoalPresetChange(e.target.value as DailyGoalPreset)}
                title="Change daily goal target"
              >
                <option value="easy">Easy ({DAILY_GOAL_VALUES.easy})</option>
                <option value="normal">Normal ({DAILY_GOAL_VALUES.normal})</option>
                <option value="hard">Hard ({DAILY_GOAL_VALUES.hard})</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Row 3: Food & Love bars (compact) ── */}
        <div className="pet-widget-stats-section">
          <div className="pet-widget-stat-row">
            <div className="pet-widget-stat-label-container">
              <span className="pet-widget-stat-label">🍔 Hunger</span>
              <span className="pet-widget-stat-value">{Math.round(petState.food)}/100</span>
            </div>
            <div className="pet-widget-progress-bg">
              <div
                className="pet-widget-progress-fill food"
                style={{ width: `${petState.food}%` }}
              />
            </div>
          </div>

          <div className="pet-widget-stat-row">
            <div className="pet-widget-stat-label-container">
              <span className="pet-widget-stat-label">❤️ Love</span>
              <span className="pet-widget-stat-value">{Math.round(petState.love)}/100</span>
            </div>
            <div className="pet-widget-progress-bg">
              <div
                className="pet-widget-progress-fill love"
                style={{ width: `${petState.love}%` }}
              />
            </div>
          </div>

          <div className="pet-widget-lifetime-correct">
            🌟 Total Correct: <strong>{petState.totalCorrect}</strong> · XP: <strong>{petState.xp}</strong>
          </div>
        </div>

        {/* ── Row 4: Action Buttons ── */}
        <div className="pet-widget-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <button
            className="pet-widget-btn feed-btn"
            onClick={handleFeed}
            title="Feed your pet"
          >
            {petService.getPetFoodEmoji(petState.type)} Feed (喂食)
          </button>
          <button
            className="pet-widget-btn feed-btn"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, var(--accent) 100%)', borderColor: 'var(--accent)', color: '#fff' }}
            onClick={handleGameClick}
            title="Play Schulte Table Game"
          >
            🎮 Game (游戏 x{petState.schulteRoundsLeft || 0})
          </button>
        </div>

        {/* ── Row 5: Achievements Shelf ── */}
        <div className="pet-widget-achievements-section">
          <div className="pet-widget-achievements-header">
            <span className="pet-widget-achievements-title">🏆 Achievements ({petState.achievements.length}/{ACHIEVEMENT_DEFS.length})</span>
          </div>
          <div className="pet-widget-achievements-shelf">
            {ACHIEVEMENT_DEFS.map(ach => {
              const unlocked = petState.achievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`pet-widget-achievement-badge ${unlocked ? 'unlocked' : 'locked'}`}
                  title={unlocked ? `${ach.title} (${ach.titleCn}) — ${ach.description}` : `??? — ${ach.description}`}
                >
                  <span className="pet-widget-achievement-emoji">
                    {unlocked ? ach.emoji : '🔒'}
                  </span>
                  <span className="pet-widget-achievement-name">
                    {unlocked ? ach.titleCn : '???'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Row 6: Adopt (Collapsible) ── */}
        <div className="pet-widget-selector">
          <button
            className="pet-widget-adopt-toggle"
            onClick={() => setShowAdopt(!showAdopt)}
          >
            🐾 {showAdopt ? 'Hide' : 'Adopt (领养)'}
            <span className={`pet-widget-adopt-arrow ${showAdopt ? 'open' : ''}`}>▸</span>
          </button>
          {showAdopt && (
            <div className="pet-widget-selector-buttons">
              <button
                className={`pet-selector-btn ${petState.type === 'cat' ? 'active' : ''}`}
                onClick={() => handlePetTypeChange('cat')}
              >
                🐱 Cat
              </button>
              <button
                className={`pet-selector-btn ${petState.type === 'dog' ? 'active' : ''}`}
                onClick={() => handlePetTypeChange('dog')}
              >
                🐶 Dog
              </button>
              <button
                className={`pet-selector-btn ${petState.type === 'dino' ? 'active' : ''}`}
                onClick={() => handlePetTypeChange('dino')}
              >
                🦖 Dino
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Help Modal ── */}
      {showHelpModal && (
        <div className="pet-help-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="pet-help-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pet-help-modal-header">
              <h4 className="pet-help-modal-title">🐾 Companion Guide (宠物系统指南)</h4>
              <button className="pet-help-modal-close" onClick={() => setShowHelpModal(false)}>×</button>
            </div>

            {/* Tab navigation */}
            <div className="pet-help-tabs">
              <button
                type="button"
                className={`pet-help-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                📊 Stats (属性)
              </button>
              <button
                type="button"
                className={`pet-help-tab-btn ${activeTab === 'evolution' ? 'active' : ''}`}
                onClick={() => setActiveTab('evolution')}
              >
                🌱 Evolution (进化)
              </button>
              <button
                type="button"
                className={`pet-help-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
                onClick={() => setActiveTab('activities')}
              >
                🏆 Milestones (挑战)
              </button>
            </div>

            <div className="pet-help-modal-body">
              <div className="pet-help-tab-content">
                {activeTab === 'stats' && (
                  <div className="pet-help-cards-container">
                    {/* XP Card */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>⭐</span>
                        <h5>XP & Levels (经验与等级)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Earn base <strong>10 XP</strong> per correct answer. Daily streak adds up to <strong>+40 XP</strong> per answer. Completing the daily goal awards a <strong>+50 XP</strong> bonus.</p>
                        <p className="help-cn">每答对一题获得 <strong>10</strong> 基础经验值，每日连续练习奖励最高可达单题 <strong>+40 经验</strong>。完成每日目标额外赠送 <strong>+50 经验</strong>。</p>
                      </div>
                    </div>

                    {/* Hunger/Food Card */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>🍔</span>
                        <h5>Hunger & Food (饱食度与食物)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Correct answers grant <strong>1 Gold Coin</strong>. Spend <strong>1 Gold Coin</strong> to feed a food item ({petService.getPetFoodEmoji(petState.type)}) to your pet, restoring Hunger by <strong>+10</strong>.</p>
                        <p className="help-cn">每答对一题获得 <strong>1 金币</strong>。花费 <strong>1 金币</strong> 可以购买食物进行喂食，恢复 <strong>+10 饱食度</strong>。</p>
                      </div>
                    </div>

                    {/* Love Card */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>❤️</span>
                        <h5>Love & Interaction (亲密度与互动)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Correct answers increase Love by <strong>1</strong>. You can also click the <strong>Pet (抚摸)</strong> button up to <strong>5 times every 2 hours</strong> to increase Love by <strong>+2</strong> per pet.</p>
                        <p className="help-cn">每答对一题增加 <strong>1 亲密度</strong>。点击 <strong>Pet (抚摸)</strong> 按钮与伙伴互动（<strong>每2小时限5次</strong>），直接增加 <strong>+2 亲密度</strong>。</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'evolution' && (
                  <div className="pet-help-cards-container">
                    {/* Stages Card */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>🌱</span>
                        <h5>Evolution Stages (成长进化阶段)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Your companion has 4 growth stages based on their level:</p>
                        <p className="help-cn">你的伙伴根据等级分为四个成长阶段：</p>
                        <p className="help-en">🐣 <strong>Baby:</strong> Lv. 1 – 4</p>
                        <p className="help-cn">🐣 <strong>幼年期:</strong> 等级 1 – 4</p>
                        <p className="help-en">🌱 <strong>Teen:</strong> Lv. 5 – 10</p>
                        <p className="help-cn">🌱 <strong>成长期:</strong> 等级 5 – 10</p>
                        <p className="help-en">⭐ <strong>Adult:</strong> Lv. 11 – 17</p>
                        <p className="help-cn">⭐ <strong>成熟期:</strong> 等级 11 – 17</p>
                        <p className="help-en">👑 <strong>Legendary:</strong> Lv. 18 – 20 (Max Level)</p>
                        <p className="help-cn">👑 <strong>传说级:</strong> 等级 18 – 20（满级）</p>
                      </div>
                    </div>

                    {/* Perks Card */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>✨</span>
                        <h5>Evolution Visuals (视觉与外观)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Evolving your pet changes their avatar emoji and unlocks gorgeous glowing level ring styles on the dashboard.</p>
                        <p className="help-cn">当宠物进化时，会改变其外观 Emoji 形象，并在主页卡片上解锁精美的流光等级边框。</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activities' && (
                  <div className="pet-help-cards-container">
                    {/* Goals & Streaks */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>🔥</span>
                        <h5>Daily Goal & Streaks (每日目标与连击)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Practicing daily maintains your streak, boosting XP gains. Set custom Daily Goal presets (Easy, Normal, Hard) to fit your study plan.</p>
                        <p className="help-cn">每日练习可以保持连击天数，大幅提升单题经验获取。可以根据学习计划自由选择每日目标预设（简单、普通、困难）。</p>
                      </div>
                    </div>

                    {/* Achievements */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>🏆</span>
                        <h5>Achievements (成就挑战)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Unlock permanent trophies by hitting key milestones (levels, streak goals, correct answers). Unlocked trophies display on the display shelf.</p>
                        <p className="help-cn">达成特定里程碑（如特定等级、连续天数、累计答对题数）可解锁永久成就奖杯，并在底部的陈列架上展示。</p>
                      </div>
                    </div>

                    {/* Decay */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>🍂</span>
                        <h5>Natural Decay (日常消耗)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Hunger (🍔) and Love (❤️) decay at <strong>0.5 points per hour</strong> (12 points/day). Practice regularly to prevent them from becoming hungry or lonely!</p>
                        <p className="help-cn">饱食度（🍔）与亲密度（❤️）每小时会自然减少 <strong>0.5 点</strong>（每天共消耗 12 点）。记得经常打卡练习，不要冷落它哦！</p>
                      </div>
                    </div>

                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>🎮</span>
                        <h5>Schulte Table (舒尔特方格)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Spend <strong>1 Gold Coin</strong> to play <strong>3 rounds</strong> of Schulte Table (4x4 or 5x5). Top the global leaderboard with your fastest completion time!</p>
                        <p className="help-cn">消耗 <strong>1 金币</strong> 可解锁 <strong>3 局</strong> 舒尔特方格游戏（可选 4x4 或 5x5）。以最快的时间冲击全球排行榜！</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Buy Food Modal ── */}
      {showBuyFoodModal && (
        <div className="pet-help-modal-overlay" onClick={() => setShowBuyFoodModal(false)}>
          <div className="pet-help-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="pet-help-modal-header">
              <h4 className="pet-help-modal-title">🛒 Buy Food (购买饲料)</h4>
              <button className="pet-help-modal-close" onClick={() => setShowBuyFoodModal(false)}>×</button>
            </div>
            <div className="pet-help-modal-body" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{petService.getPetFoodEmoji(petState.type)}</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>Choose quantity to buy & feed: (选择购买并喂食的数量)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setBuyAmount(prev => Math.max(1, prev - 1))}
                    disabled={!canDecrement}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1px solid var(--border)',
                      background: 'var(--code-bg)',
                      color: 'var(--text-h)',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      cursor: canDecrement ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: canDecrement ? 1 : 0.5,
                      transition: 'all 0.15s'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center', color: 'var(--text-h)' }}>
                    {buyAmount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBuyAmount(prev => Math.min(maxBuyAmount, prev + 1))}
                    disabled={!canIncrement}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1px solid var(--border)',
                      background: 'var(--code-bg)',
                      color: 'var(--text-h)',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      cursor: canIncrement ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: canIncrement ? 1 : 0.5,
                      transition: 'all 0.15s'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <p style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '0.9rem' }}>
                Spend <strong>{buyAmount} Gold Coin{buyAmount > 1 ? 's' : ''}</strong> to buy {buyAmount} food item{buyAmount > 1 ? 's' : ''} and feed {petState.name}?
                <br />
                (花费 <strong>{buyAmount} 金币</strong> 购买 {buyAmount} 个食物并喂食 {petState.name}？)
              </p>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <span>🪙 Coins: <strong>{petState.goldCoins || 0}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="pet-widget-btn feed-btn"
                  onClick={() => {
                    if (isBuyDisabled) return;
                    handleBuyFood(buyAmount);
                    setShowBuyFoodModal(false);
                  }}
                  disabled={isBuyDisabled || buyAmount < 1}
                  style={{ padding: '8px 20px', minWidth: '100px' }}
                >
                  Buy & Feed (购买并喂)
                </button>
                <button
                  type="button"
                  className="pet-widget-btn pet-btn"
                  onClick={() => setShowBuyFoodModal(false)}
                  style={{ padding: '8px 20px', minWidth: '100px' }}
                >
                  Cancel (取消)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Buy Game Modal ── */}
      {showBuyGameModal && (
        <div className="pet-help-modal-overlay" onClick={() => setShowBuyGameModal(false)}>
          <div className="pet-help-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="pet-help-modal-header">
              <h4 className="pet-help-modal-title">🎮 Schulte Table Game</h4>
              <button className="pet-help-modal-close" onClick={() => setShowBuyGameModal(false)}>×</button>
            </div>
            <div className="pet-help-modal-body" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧩</div>
              <p style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>No game rounds left!</p>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '0.9rem' }}>
                Spend <strong>1 Gold Coin</strong> to buy <strong>3 play rounds</strong> of Schulte Table?
                <br />
                (花费 <strong>1 金币</strong> 购买 <strong>3 局</strong> 舒尔特方格游戏场次？)
              </p>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
                <span>🪙 Coins: <strong>{petState.goldCoins || 0}</strong></span>
                <span>🎮 Rounds: <strong>{petState.schulteRoundsLeft || 0}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="pet-widget-btn feed-btn"
                  onClick={handleBuyGameRounds}
                  disabled={(petState.goldCoins || 0) < 1}
                  style={{ padding: '8px 20px', minWidth: '100px' }}
                >
                  Buy & Play (购买并玩)
                </button>
                <button
                  type="button"
                  className="pet-widget-btn pet-btn"
                  onClick={() => setShowBuyGameModal(false)}
                  style={{ padding: '8px 20px', minWidth: '100px' }}
                >
                  Cancel (取消)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
