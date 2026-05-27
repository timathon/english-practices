import { useState, useEffect, useRef } from 'react';
import { petService } from '../lib/petService';
import type { PetState } from '../lib/petService';
import './PetDashboardWidget.css';

export function PetDashboardWidget() {
  const [petState, setPetState] = useState<PetState>(() => petService.getPetState());
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(petState.name);
  const [hoverEmoji, setHoverEmoji] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  
  const speechTimeoutRef = useRef<number | null>(null);

  // Sync pet state updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PetState>;
      setPetState(customEvent.detail);
      setNewName(customEvent.detail.name);
    };
    
    window.addEventListener('ep-pet-update', handleUpdate);
    return () => {
      window.removeEventListener('ep-pet-update', handleUpdate);
      if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  const showSpeech = (msg: string) => {
    if (speechTimeoutRef.current) {
      window.clearTimeout(speechTimeoutRef.current);
    }
    setSpeechBubble(msg);
    speechTimeoutRef.current = window.setTimeout(() => {
      setSpeechBubble(null);
    }, 4000);
  };

  const handleFeed = () => {
    if (petState.foodPoints <= 0) {
      showSpeech('Practice and give correct answers to get food! 🍗');
      return;
    }
    const success = petService.feedPet();
    if (success) {
      const msg = petService.getRandomFeedMessage(petState.name, petState.type);
      showSpeech(msg);
    }
  };

  const handlePet = () => {
    petService.petPet();
    const msg = petService.getRandomPetMessage(petState.name, petState.type);
    showSpeech(msg);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    petService.renamePet(newName);
    setIsRenaming(false);
  };

  const handlePetTypeChange = (type: 'cat' | 'dog' | 'dino') => {
    petService.changePetType(type);
    showSpeech(`Adopted a new companion! 🐾`);
  };

  const currentEmoji = petService.getPetEmoji(petState.type, petState.food, petState.love);
  const statusText = petService.getPetStatusText(petState.food, petState.love);

  return (
    <div className="db-stats pet-widget-card">
      <div className="pet-widget-header">
        <h3 className="db-stats-title">Pet Companion (宠物伙伴)</h3>
        <span className="pet-widget-points-badge" title="Food items in stock. Earn more by answering correctly!">
          🍗 Inventory: <strong>{petState.foodPoints}</strong>
        </span>
      </div>

      <div className="pet-widget-content">
        {/* Left side: Pet Avatar & basic info */}
        <div className="pet-widget-avatar-section">
          <div 
            className={`pet-widget-emoji-circle ${hoverEmoji ? 'anim-bounce' : ''}`}
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
          </div>
        </div>

        {/* Bubble message removed - speech bubble renders above face */}

        {/* Middle side: Detailed Stats bars */}
        <div className="pet-widget-stats-section">
          <div className="pet-widget-stat-row">
            <div className="pet-widget-stat-label-container">
              <span className="pet-widget-stat-label">🍔 Hunger (饥饿度)</span>
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
              <span className="pet-widget-stat-label">❤️ Love (好感度)</span>
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
            🌟 Lifetime Correct Answers: <strong>{petState.totalCorrect}</strong>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="pet-widget-actions">
          <button 
            className="pet-widget-btn feed-btn"
            onClick={handleFeed}
            disabled={petState.foodPoints <= 0}
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

        {/* Change companion type */}
        <div className="pet-widget-selector">
          <span className="pet-widget-selector-label">Adopt (领养):</span>
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
        </div>
      </div>
    </div>
  );
}
