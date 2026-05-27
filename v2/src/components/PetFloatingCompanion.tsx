import { useState, useEffect, useRef } from 'react';
import { petService } from '../lib/petService';
import type { PetState } from '../lib/petService';
import './PetFloatingCompanion.css';

interface Particle {
  id: number;
  text: string;
  x: number;
  y: number;
}

export function PetFloatingCompanion() {
  const [petState, setPetState] = useState<PetState>(() => petService.getPetState());
  const [isBouncing, setIsBouncing] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [speech, setSpeech] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const particleIdRef = useRef(0);
  const speechTimeoutRef = useRef<number | null>(null);

  // Sync pet state updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PetState>;
      setPetState(customEvent.detail);
    };
    
    window.addEventListener('ep-pet-update', handleUpdate);
    return () => {
      window.removeEventListener('ep-pet-update', handleUpdate);
    };
  }, []);

  // Show a speech bubble helper
  const showSpeech = (text: string, duration = 3000) => {
    if (speechTimeoutRef.current) {
      window.clearTimeout(speechTimeoutRef.current);
    }
    setSpeech(text);
    speechTimeoutRef.current = window.setTimeout(() => {
      setSpeech(null);
    }, duration);
  };

  // Listen to correct answers to trigger reaction
  useEffect(() => {
    const handleCorrect = () => {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 800);

      // Spawn a food particle and love particle
      const id1 = particleIdRef.current++;
      const id2 = particleIdRef.current++;
      
      const newParticles = [
        { id: id1, text: '+1 🍖', x: -10 + Math.random() * 20, y: -20 },
        { id: id2, text: '+1 ❤️', x: -10 + Math.random() * 20, y: -45 }
      ];

      setParticles(prev => [...prev, ...newParticles]);

      // Cleanup particles after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== id1 && p.id !== id2));
      }, 1500);

      // Cute phrase list
      const praises = [
        'Awesome! 🎉',
        'Yummy! 🍖',
        'Smart! 🧠',
        'Keep it up! ✨',
        'Thank you! 💖',
        'Doing great! ⭐'
      ];
      const randomPraise = praises[Math.floor(Math.random() * praises.length)];
      showSpeech(randomPraise);
    };

    window.addEventListener('ep-correct-answer', handleCorrect);
    return () => {
      window.removeEventListener('ep-correct-answer', handleCorrect);
      if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  // Handle manual petting (click)
  const handlePet = (e: React.MouseEvent) => {
    e.stopPropagation();
    petService.petPet();
    
    // Spawn heart particles
    const id = particleIdRef.current++;
    const heartParticle = {
      id,
      text: '❤️',
      x: -15 + Math.random() * 30,
      y: -30
    };
    
    setParticles(prev => [...prev, heartParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1500);

    const msg = petService.getRandomPetMessage(petState.name, petState.type);
    showSpeech(msg);
  };

  const currentEmoji = petService.getPetEmoji(petState.type, petState.food, petState.love);

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
    <div className="pet-float-wrapper">
      {/* Speech bubble */}
      {speech && (
        <div className="pet-float-speech">
          {speech}
          <div className="pet-float-speech-arrow" />
        </div>
      )}

      {/* Floating particles (e.g. +1 🍖, ❤️) */}
      {particles.map(p => (
        <span 
          key={p.id} 
          className="pet-float-particle"
          style={{ 
            left: `calc(50% + ${p.x}px)`, 
            transform: `translateY(${p.y}px)` 
          }}
        >
          {p.text}
        </span>
      ))}

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

      {/* Main companion bubble */}
      <div 
        className={`pet-float-avatar-container ${isBouncing ? 'bounce' : ''}`}
        onClick={handlePet}
        title={`Pet ${petState.name}! Click to give love.`}
      >
        <span className="pet-float-emoji">{currentEmoji}</span>
        
        {/* Status ring */}
        <div className="pet-float-stats-summary">
          <div className="pet-float-stat-bar-micro food" style={{ width: `${petState.food}%` }} />
          <div className="pet-float-stat-bar-micro love" style={{ width: `${petState.love}%` }} />
        </div>
      </div>

    </div>
  );
}
