import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { petService, ACHIEVEMENT_DEFS, DAILY_GOAL_VALUES } from '../lib/petService';
import type { PetState, DailyGoalPreset, AchievementDef } from '../lib/petService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import './PetDashboardWidget.css';

export function PetDashboardWidget({ showChinese = false }: { showChinese?: boolean }) {
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
  const [showGameCenterModal, setShowGameCenterModal] = useState(false);
  const [buyAmount, setBuyAmount] = useState(1);
  const [showChartModal, setShowChartModal] = useState(false);

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
    setShowGameCenterModal(true);
  };

  const handleBuySchulteRounds = () => {
    if ((petState.food || 0) < 50 || (petState.love || 0) < 50) {
      showSpeech(`Your pet needs at least 50% health (food) and 50% love to buy game rounds! 🍎❤️`);
      return;
    }
    if ((petState.goldCoins || 0) < 1) {
      showSpeech(`You need at least 1 🪙 to buy game rounds!`);
      return;
    }
    const success = petService.buySchulteRounds();
    if (success) {
      showSpeech(`Successfully bought 3 Schulte Table rounds! 🧩`);
    }
  };

  const handleBuyCardMatchRounds = () => {
    if ((petState.food || 0) < 50 || (petState.love || 0) < 50) {
      showSpeech(`Your pet needs at least 50% health (food) and 50% love to buy game rounds! 🍎❤️`);
      return;
    }
    if ((petState.goldCoins || 0) < 1) {
      showSpeech(`You need at least 1 🪙 to buy game rounds!`);
      return;
    }
    const success = petService.buyCardMatchRounds();
    if (success) {
      showSpeech(`Successfully bought 3 Card Match rounds! 🎴`);
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
          <h3 className="db-stats-title">
            <span className="db-title-grid">
              <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                Companion & Rewards
              </span>
              <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                伙伴与奖励
              </span>
            </span>
          </h3>
          <button
            type="button"
            className="pet-help-btn"
            onClick={() => setShowHelpModal(true)}
            title="How the Companion & Reward System works (伙伴与奖励系统指南)"
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
            title="Click to interact!"
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
                  title="Rename Companion"
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
          <div
            className="pet-widget-stats-bars"
            onClick={() => setShowChartModal(true)}
            title={showChinese ? "查看最近24小时状态趋势 (View status trend over the last 24 hours)" : "View 24h state trend"}
          >
            <div className="pet-widget-stat-row">
              <div className="pet-widget-stat-label-container">
                <span className="pet-widget-stat-label">
                  <span className="db-title-grid">
                    <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                      🍔 Hunger
                    </span>
                    <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                      🍔 饱食度
                    </span>
                  </span>
                </span>
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
                <span className="pet-widget-stat-label">
                  <span className="db-title-grid">
                    <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                      ❤️ Love
                    </span>
                    <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                      ❤️ 亲密度
                    </span>
                  </span>
                </span>
                <span className="pet-widget-stat-value">{Math.round(petState.love)}/100</span>
              </div>
              <div className="pet-widget-progress-bg">
                <div
                  className="pet-widget-progress-fill love"
                  style={{ width: `${petState.love}%` }}
                />
              </div>
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
            title="Feed your companion"
          >
            <span className="db-title-grid">
              <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "p-feed-en-out" : "p-feed-en-in"}>
                {petService.getPetFoodEmoji(petState.type)} Feed
              </span>
              <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "p-feed-cn-in" : "p-feed-cn-out"}>
                {petService.getPetFoodEmoji(petState.type)} 喂食伙伴
              </span>
            </span>
          </button>
          <button
            className="pet-widget-btn feed-btn"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, var(--accent) 100%)', borderColor: 'var(--accent)', color: '#fff' }}
            onClick={handleGameClick}
            title="Open Game Center"
          >
            <span className="db-title-grid">
              <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "p-games-en-out" : "p-games-en-in"}>
                🎮 Games (x{(petState.schulteRoundsLeft || 0) + (petState.cardMatchRoundsLeft || 0)})
              </span>
              <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "p-games-cn-in" : "p-games-cn-out"}>
                🎮 游戏 (x{(petState.schulteRoundsLeft || 0) + (petState.cardMatchRoundsLeft || 0)})
              </span>
            </span>
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
            🐾 {showAdopt ? 'Hide' : 'Select Companion (选择伙伴)'}
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
              <h4 className="pet-help-modal-title">🏆 Companion & Rewards Guide (伙伴与奖励系统指南)</h4>
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
                        <p className="help-en">Earn base <strong>3 XP</strong> per correct answer. Daily streak adds up to <strong>+5 XP</strong> per answer. Completing the daily goal awards a <strong>+15 XP</strong> bonus.</p>
                        <p className="help-cn">每答对一题获得 <strong>3</strong> 基础经验值，每日连续练习奖励最高可达单题 <strong>+5 经验</strong>。完成每日目标额外赠送 <strong>+15 经验</strong>。</p>
                      </div>
                    </div>

                    {/* Hunger/Food Card */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>🍔</span>
                        <h5>Hunger & Feed (饱食度与饲料)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Correct answers grant <strong>1 Gold Coin</strong>. Spend <strong>1 Gold Coin</strong> to feed a food item ({petService.getPetFoodEmoji(petState.type)}) to your companion, restoring Hunger by <strong>+10</strong>.</p>
                        <p className="help-cn">每答对一题获得 <strong>1 金币</strong>。花费 <strong>1 金币</strong> 可以购买饲料进行喂食，恢复 <strong>+10 饱食度</strong>。</p>
                      </div>
                    </div>

                    {/* Love Card */}
                    <div className="pet-help-card">
                      <div className="pet-help-card-header">
                        <span>❤️</span>
                        <h5>Love & Interaction (亲密度与互动)</h5>
                      </div>
                      <div className="pet-help-card-body">
                        <p className="help-en">Correct answers increase Love by <strong>1</strong>. You can also click the companion to **Interact (互动)** up to <strong>5 times every 2 hours</strong> to increase Love by <strong>+2</strong> per interaction.</p>
                        <p className="help-cn">每答对一题增加 <strong>1 亲密度</strong>。点击伙伴进行 **Interact (互动)**（<strong>每2小时限5次</strong>），直接增加 <strong>+2 亲密度</strong>。</p>
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
                        <p className="help-en">Evolving your companion changes their avatar emoji and unlocks gorgeous glowing level ring styles on the dashboard.</p>
                        <p className="help-cn">当伙伴进化时，会改变其外观 Emoji 形象，并在主页卡片上解锁精美的流光等级边框。</p>
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
                        <p className="help-en">Hunger (🍔) and Love (❤️) decay at <strong>1 point per hour</strong> (24 points/day). Practice regularly to prevent your companion from becoming hungry or lonely!</p>
                        <p className="help-cn">饱食度（🍔）与亲密度（❤️）每小时会自然减少 <strong>1 点</strong>（每天共消耗 24 点）。记得经常打卡练习，不要冷落伙伴哦！</p>
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
          <div className="pet-help-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '400px', maxWidth: '95%' }}>
            <div className="pet-help-modal-header">
              <h4 className="pet-help-modal-title">🛒 Buy Feed (购买饲料)</h4>
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
                (花费 <strong>{buyAmount} 金币</strong> 购买 {buyAmount} 个饲料并喂食 {petState.name}？)
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
                  Buy & Feed (购买并喂食)
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

      {/* ── Game Center Modal ── */}
      {showGameCenterModal && (() => {
        const cannotBuy = (petState.food || 0) < 50 || (petState.love || 0) < 50;
        return (
          <div className="pet-help-modal-overlay" onClick={() => setShowGameCenterModal(false)}>
            <div className="pet-help-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '480px', maxWidth: '95%' }}>
              <div className="pet-help-modal-header">
                <h4 className="pet-help-modal-title">🎮 Game Center & Shop (游戏中心)</h4>
                <button className="pet-help-modal-close" onClick={() => setShowGameCenterModal(false)}>×</button>
              </div>
              <div className="pet-help-modal-body" style={{ padding: '16px' }}>
                <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-h)' }}>🪙 Available Gold Coins:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#eab308' }}>🪙 {petState.goldCoins || 0}</span>
                </div>

                {cannotBuy && (
                  <div style={{ color: 'var(--accent, #d73a49)', fontSize: '0.85rem', marginBottom: '20px', background: 'rgba(215, 58, 73, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(215, 58, 73, 0.2)', textAlign: 'left' }}>
                    ⚠️ Your pet needs at least 50% health (food) and 50% love to buy game rounds! Feed and pet them first.
                    <br />
                    (宠物需要至少 50% 饱食度和 50% 亲密度才能购买游戏场次！)
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Game 1: Schulte Table */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', background: 'var(--bg)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🧩</span> Schulte Table (舒尔特方格)
                      </span>
                      <span style={{ fontSize: '0.85rem', background: 'var(--code-bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        Rounds: {petState.schulteRoundsLeft || 0}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                      Click numbers from 1 to N in order as fast as possible to train your focus!
                      <br />
                      (按顺序从 1 点击到 N，练习你的专注力！)
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="pet-widget-btn feed-btn"
                        onClick={() => {
                          setShowGameCenterModal(false);
                          navigate('/games/schulte');
                        }}
                        disabled={(petState.schulteRoundsLeft || 0) <= 0}
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', opacity: (petState.schulteRoundsLeft || 0) <= 0 ? 0.5 : 1 }}
                      >
                        Play (开始游戏)
                      </button>
                      <button
                        type="button"
                        className="pet-widget-btn pet-btn"
                        onClick={handleBuySchulteRounds}
                        disabled={cannotBuy || (petState.goldCoins || 0) < 1}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', borderColor: 'var(--accent)', color: '#fff', opacity: (cannotBuy || (petState.goldCoins || 0) < 1) ? 0.5 : 1 }}
                      >
                        Buy 3 Rounds (1 🪙)
                      </button>
                    </div>
                  </div>

                  {/* Game 2: Card Match */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', background: 'var(--bg)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🎴</span> Card Match (卡片配对)
                      </span>
                      <span style={{ fontSize: '0.85rem', background: 'var(--code-bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        Rounds: {petState.cardMatchRoundsLeft || 0}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                      Match English words to Chinese translations from your textbook's vocab guides!
                      <br />
                      (配对英文单词与课本词汇表的中文翻译！)
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="pet-widget-btn feed-btn"
                        onClick={() => {
                          setShowGameCenterModal(false);
                          navigate('/games/card-match');
                        }}
                        disabled={(petState.cardMatchRoundsLeft || 0) <= 0}
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', opacity: (petState.cardMatchRoundsLeft || 0) <= 0 ? 0.5 : 1 }}
                      >
                        Play (开始游戏)
                      </button>
                      <button
                        type="button"
                        className="pet-widget-btn pet-btn"
                        onClick={handleBuyCardMatchRounds}
                        disabled={cannotBuy || (petState.goldCoins || 0) < 1}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', borderColor: 'var(--accent)', color: '#fff', opacity: (cannotBuy || (petState.goldCoins || 0) < 1) ? 0.5 : 1 }}
                      >
                        Buy 3 Rounds (1 🪙)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Chart Modal ── */}
      {showChartModal && (() => {
        // Prepare chart data: sorted by timestamp, and default to empty if not exists
        let history = petState.history && petState.history.length >= 2 ? petState.history : [];
        if (history.length < 2) {
          const fallbackHistory = [];
          const now = Date.now();
          const food = petState.food || 50;
          const love = petState.love || 50;
          const DECAY_RATE_PER_HOUR = 1.0;
          for (let i = 8; i >= 0; i--) {
            const t = now - i * 3 * 60 * 60 * 1000;
            const hoursAgo = i * 3;
            const baseFoodDecay = hoursAgo * DECAY_RATE_PER_HOUR;
            const baseLoveDecay = hoursAgo * DECAY_RATE_PER_HOUR;
            
            const fluctuationFood = Math.sin(hoursAgo * 0.8) * 8;
            const fluctuationLove = Math.cos(hoursAgo * 0.8) * 6;
            
            const historicFood = Math.min(100, Math.max(10, food + baseFoodDecay + fluctuationFood));
            const historicLove = Math.min(100, Math.max(10, love + baseLoveDecay + fluctuationLove));
            
            fallbackHistory.push({
              timestamp: t,
              food: Math.round(historicFood),
              love: Math.round(historicLove)
            });
          }
          history = fallbackHistory;
        }

        const chartData = [...history]
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(h => ({
            ...h,
            timeLabel: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          }));

        // Format tooltip for the chart
        const historyTooltip = ({ active, payload }: any) => {
          if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const formattedTime = new Date(dataPoint.timestamp).toLocaleTimeString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            return (
              <div style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-h)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)',
                padding: '12px',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}>
                <p style={{ color: 'var(--text)', fontWeight: 600, margin: '0 0 6px 0' }}>{formattedTime}</p>
                {payload.map((pld: any) => (
                  <p key={pld.name} style={{ color: 'var(--text-h)', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pld.color }} />
                    {pld.name === 'food' ? (showChinese ? '🍔 饱食度' : '🍔 Hunger') : (showChinese ? '❤️ 亲密度' : '❤️ Love')}: <strong>{Math.round(pld.value)}/100</strong>
                  </p>
                ))}
              </div>
            );
          }
          return null;
        };

        return (
          <div className="pet-help-modal-overlay" onClick={() => setShowChartModal(false)}>
            <div className="pet-help-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '500px', maxWidth: '95%' }}>
              <div className="pet-help-modal-header">
                <h4 className="pet-help-modal-title">
                  📈 {showChinese ? `${petState.name} 的状态趋势` : `${petState.name}'s State Trend`}
                </h4>
                <button className="pet-help-modal-close" onClick={() => setShowChartModal(false)}>×</button>
              </div>
              <div className="pet-help-modal-body" style={{ padding: '10px 0' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0 0 16px 0', padding: '0 4px' }}>
                  {showChinese
                    ? '饱食度与亲密度在过去 24 小时内的变化趋势（每小时自然消耗 1 点）：'
                    : 'Hunger and Love trends over the last 24 hours (naturally decays by 1 point per hour):'}
                </p>

                {/* Legends */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-h)' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #f97316, #ea580c)' }} />
                    <span>{showChinese ? '🍔 饱食度' : '🍔 Hunger'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-h)' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #ec4899, #db2777)' }} />
                    <span>{showChinese ? '❤️ 亲密度' : '❤️ Love'}</span>
                  </div>
                </div>

                <div style={{ width: '100%', height: '240px', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '12px', padding: '10px', boxSizing: 'border-box', border: '1px solid var(--border)' }}>
                  <ResponsiveContainer width="99%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="foodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="loveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#db2777" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#db2777" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="timeLabel"
                        stroke="var(--text)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis
                        stroke="var(--text)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <ReferenceLine
                        y={50}
                        stroke="var(--accent)"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        opacity={0.7}
                      />
                      <Tooltip content={historyTooltip} />
                      <Area
                        type="monotone"
                        dataKey="food"
                        stroke="#ea580c"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#foodGrad)"
                        name="food"
                      />
                      <Area
                        type="monotone"
                        dataKey="love"
                        stroke="#db2777"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#loveGrad)"
                        name="love"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  className="pet-widget-btn pet-btn"
                  onClick={() => setShowChartModal(false)}
                  style={{ padding: '8px 24px', minWidth: '100px' }}
                >
                  {showChinese ? '关闭' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
