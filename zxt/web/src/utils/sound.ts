// Sound effects utility for ZXT Smart Edu platform
// Uses cloud-hosted high quality audio files with instant Web Audio API synthesizer fallback

const LOCAL_CORRECT_SFX = "/assets/sfx/correct.mp3";
const LOCAL_WRONG_SFX = "/assets/sfx/error.mp3";
const REMOTE_CORRECT_SFX = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/correct.mp3";
const REMOTE_WRONG_SFX = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/ep/sfx/error.mp3";

// Web Audio API Synthesizer fallback for zero-latency instant feedback
function playSynthSFX(type: 'correct' | 'wrong') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'correct') {
      // Pleasant dual-tone major arpeggio chime (C5 -> E5 -> G5)
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } else {
      // Gentle double-buzz error tone (220Hz -> 180Hz)
      const now = ctx.currentTime;
      [220, 180].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.1, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.15);
      });
    }
  } catch (err) {
    // Ignore audio context errors
  }
}

/**
 * Play sound effect for correct or wrong quiz answer
 */
export function playAnswerSFX(type: 'correct' | 'wrong') {
  const localUrl = type === 'correct' ? LOCAL_CORRECT_SFX : LOCAL_WRONG_SFX;
  const remoteUrl = type === 'correct' ? REMOTE_CORRECT_SFX : REMOTE_WRONG_SFX;
  
  const audio = new Audio(localUrl);
  audio.volume = 0.6;
  audio.play().catch(() => {
    // Retry with remote URL or synth fallback
    const remoteAudio = new Audio(remoteUrl);
    remoteAudio.volume = 0.6;
    remoteAudio.play().catch(() => {
      playSynthSFX(type);
    });
  });
}
