import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { petService } from '../lib/petService';
import type { PetState, AchievementDef } from '../lib/petService';
import './PetFloatingCompanion.css';

interface Particle {
  id: number;
  text: string;
  x: number;
  y: number;
}

export function PetFloatingCompanion() {
  const location = useLocation();
  const [petState, setPetState] = useState<PetState>(() => petService.getPetState());
  const [isBouncing, setIsBouncing] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [speech, setSpeech] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [recentlyClicked, setRecentlyClicked] = useState(false);

  const particleIdRef = useRef(0);
  const speechTimeoutRef = useRef<number | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const prevLevelRef = useRef(petState.level);

  // Sync pet state updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PetState>;
      const newState = customEvent.detail;

      // Detect level up
      if (newState.level > prevLevelRef.current) {
        setIsLevelingUp(true);
        showSpeech(`Level Up! Lv.${newState.level} ⭐`);
        setTimeout(() => setIsLevelingUp(false), 1500);
      }
      prevLevelRef.current = newState.level;

      setPetState(newState);
    };

    const handleAchievement = (e: Event) => {
      const ach = (e as CustomEvent<AchievementDef>).detail;
      showSpeech(`${ach.emoji} ${ach.title}!`, 4000);
    };

    window.addEventListener('ep-pet-update', handleUpdate);
    window.addEventListener('ep-achievement-unlock', handleAchievement);
    return () => {
      window.removeEventListener('ep-pet-update', handleUpdate);
      window.removeEventListener('ep-achievement-unlock', handleAchievement);
    };
  }, []);

  // Show a speech bubble helper
  const showSpeech = (text: string, duration = 3000) => {
    if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
    setSpeech(text);
    speechTimeoutRef.current = window.setTimeout(() => setSpeech(null), duration);
  };

  // Listen to correct answers to trigger reaction
  useEffect(() => {
    const handleCorrect = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};

      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 800);

      // Spawn particles
      const id1 = particleIdRef.current++;
      const id2 = particleIdRef.current++;
      const newParticles: Particle[] = [
        { id: id1, text: `+${detail.xpGain || 10} XP`, x: -10 + Math.random() * 20, y: -20 },
        { id: id2, text: '+1 ❤️', x: -10 + Math.random() * 20, y: -45 },
      ];

      setParticles(prev => [...prev, ...newParticles]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== id1 && p.id !== id2));
      }, 3500);

      // Check for special events
      if (detail.dailyGoalJustCompleted) {
        showSpeech('🎉 Daily Goal Complete! Amazing!', 4000);
        // Spawn celebration particles
        for (let i = 0; i < 5; i++) {
          const cid = particleIdRef.current++;
          const celebEmojis = ['🎉', '🎊', '⭐', '✨', '🌟'];
          setTimeout(() => {
            setParticles(prev => [...prev, {
              id: cid,
              text: celebEmojis[i % celebEmojis.length],
              x: -30 + Math.random() * 60,
              y: -30 - Math.random() * 20,
            }]);
            setTimeout(() => {
              setParticles(prev => prev.filter(p => p.id !== cid));
            }, 3500);
          }, i * 100);
        }
      } else {
        // Regular praise
        const praises = [
          'Awesome! 🎉',
          'Yummy! 🍖',
          'Smart! 🧠',
          'Keep it up! ✨',
          'Thank you! 💖',
          'Doing great! ⭐',
        ];
        showSpeech(praises[Math.floor(Math.random() * praises.length)]);
      }
    };

    window.addEventListener('ep-correct-answer', handleCorrect);
    return () => {
      window.removeEventListener('ep-correct-answer', handleCorrect);
      if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
      if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // Handle manual petting (click)
  const handlePet = (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = petService.petPet();

    setRecentlyClicked(true);
    if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = window.setTimeout(() => {
      setRecentlyClicked(false);
    }, 2000);

    const id = particleIdRef.current++;
    setParticles(prev => [...prev, {
      id,
      text: result.success ? '+2 ❤️' : '+0 ❤️',
      x: -15 + Math.random() * 30,
      y: -30,
    }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 3500);

    const msg = result.success
      ? petService.getRandomPetMessage(petState.name, petState.type)
      : petService.getRandomRefusalMessage(petState.name, petState.type, result.nextAvailableInMs);
    showSpeech(msg);
  };

  const currentEmoji = petService.getPetEmoji(petState.type, petState.food, petState.love, petState.level);
  const stage = petService.getEvolutionStage(petState.level);
  const dailyProgress = petService.getDailyProgress(petState);
  const streakInfo = petService.getStreakInfo(petState);

  // Daily ring SVG params
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - dailyProgress.percent / 100);

  if (location.pathname === '/dashboard' || location.pathname.includes('vocab-guide')) {
    return null;
  }

  if (isMinimized) {
    return (
      <button
        className="pet-float-minimized"
        onClick={() => {
          setIsMinimized(false);
          showSpeech('I am back! 😊');
        }}
        title="Show Pet Companion"
      >
        🐾
      </button>
    );
  }

  return (
    <>
      {/* Floating particles (rendered fixed to viewport to avoid layer clipping) */}
      {particles.map(p => (
        <span
          key={p.id}
          className="pet-float-particle"
          style={{
            right: `${58 - p.x}px`,
            bottom: `${58 - p.y}px`,
          }}
        >
          {p.text}
        </span>
      ))}

      <div className={`pet-float-wrapper${recentlyClicked ? ' active' : ''}`}>
        {/* Speech bubble */}
        {speech && (
          <div className="pet-float-speech">
            {speech}
            <div className="pet-float-speech-arrow" />
          </div>
        )}

        {/* Close button */}
        <button
          className="pet-float-close"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(true);
          }}
          title="Hide Pet"
        >
          ✕
        </button>

        {/* Streak badge */}
        {streakInfo.streak > 0 && (
          <div className="pet-float-streak-badge" title={`${streakInfo.streak} day streak!`}>
            🔥{streakInfo.streak}
          </div>
        )}

        {/* Main companion with daily progress ring */}
        <div
          className={`pet-float-avatar-container ${isBouncing ? 'bounce' : ''} ${isLevelingUp ? 'level-up' : ''} pet-float-stage-${stage}`}
          onClick={handlePet}
          title={`Pet ${petState.name}! Click to give love.`}
        >
          {/* Daily progress ring (SVG) */}
          <svg className="pet-float-daily-ring-svg" viewBox="0 0 80 80">
            {/* Background ring */}
            <circle
              cx="40" cy="40" r={ringRadius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="3"
              opacity="0.3"
            />
            {/* Progress ring */}
            <circle
              cx="40" cy="40" r={ringRadius}
              fill="none"
              stroke={dailyProgress.completed ? '#22c55e' : 'var(--accent)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }}
              transform="rotate(-90 40 40)"
            />
          </svg>

          <span className="pet-float-emoji">{currentEmoji}</span>

          {/* Micro stat bars */}
          <div className="pet-float-stats-summary">
            <div className="pet-float-stat-bar-micro food" style={{ width: `${petState.food}%` }} />
            <div className="pet-float-stat-bar-micro love" style={{ width: `${petState.love}%` }} />
          </div>
        </div>
      </div>
    </>
  );
}
