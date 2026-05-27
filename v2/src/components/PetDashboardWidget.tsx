import { useState, useEffect, useRef } from 'react';
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
    if (petState.foodPoints < 1.0) {
      showSpeech('Practice and give correct answers to get food! 🍗');
      return;
    }
    const success = petService.feedPet();
    if (success) {
      showSpeech(petService.getRandomFeedMessage(petState.name, petState.type));
    }
  };

  const handlePet = () => {
    petService.petPet();
    showSpeech(petService.getRandomPetMessage(petState.name, petState.type));
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
        <h3 className="db-stats-title">Pet Companion (宠物伙伴)</h3>
        <div className="pet-widget-header-sub">
          <span className={`pet-widget-level-badge pet-widget-level-${stage}`}>
            Lv.{petState.level} · {stageLabel}
          </span>
          <span className="pet-widget-points-badge" title="Food items in stock. Earn more by answering correctly! (每答对10题获得1个食物)">
            🍗 ×{Math.floor(petState.foodPoints)}
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
        <div className="pet-widget-actions">
          <button
            className="pet-widget-btn feed-btn"
            onClick={handleFeed}
            disabled={petState.foodPoints < 1.0}
          >
            🍗 Feed (喂食)
          </button>
          <button
            className="pet-widget-btn pet-btn"
            onClick={handlePet}
          >
            👋 Pet (抚摸)
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
    </div>
  );
}
