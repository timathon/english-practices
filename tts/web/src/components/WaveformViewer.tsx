import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { AudioSilence } from '../lib/audioCutter';

interface WaveformViewerProps {
  audioBuffer: AudioBuffer | null;
  silences: AudioSilence[];
  itemCuts: { start: number; end: number; text: string; hash: string }[];
  onSeek?: (time: number) => void;
  activePlayRange?: { start: number; end: number } | null;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  audioBuffer,
  silences,
  itemCuts,
  onSeek,
  activePlayRange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startAudioTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Initialize or get AudioContext
  const getAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const stopPlayback = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {}
      audioSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  };

  const playFrom = (time: number, maxDuration?: number) => {
    if (!audioBuffer) return;
    stopPlayback();

    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const safeTime = Math.max(0, Math.min(time, audioBuffer.duration));
    if (maxDuration && maxDuration > 0) {
      source.start(0, safeTime, maxDuration);
    } else {
      source.start(0, safeTime);
    }

    audioSourceRef.current = source;
    startAudioTimeRef.current = ctx.currentTime;
    startOffsetRef.current = safeTime;
    setIsPlaying(true);

    const updateTime = () => {
      const elapsed = ctx.currentTime - startAudioTimeRef.current;
      const cur = startOffsetRef.current + elapsed;
      if (cur >= audioBuffer.duration || (maxDuration && elapsed >= maxDuration)) {
        stopPlayback();
        setCurrentTime(maxDuration ? startOffsetRef.current + maxDuration : audioBuffer.duration);
      } else {
        setCurrentTime(cur);
        animFrameRef.current = requestAnimationFrame(updateTime);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateTime);

    source.onended = () => {
      setIsPlaying(false);
    };
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playFrom(currentTime >= (audioBuffer?.duration || 0) ? 0 : currentTime);
    }
  };

  // Play specific cut range if activePlayRange changes
  useEffect(() => {
    if (activePlayRange && audioBuffer) {
      playFrom(activePlayRange.start, activePlayRange.end - activePlayRange.start);
    }
  }, [activePlayRange]);

  // Clean up on unmount or new buffer
  useEffect(() => {
    return () => stopPlayback();
  }, [audioBuffer]);

  // Draw Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    // Draw grid & time markers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let sec = 0; sec <= Math.ceil(duration); sec += 2) {
      const x = (sec / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(`${sec}s`, x + 3, 12);
    }

    // Draw detected silence zones (light gray / red tint)
    silences.forEach(s => {
      const x1 = (s.start / duration) * width;
      const x2 = (s.end / duration) * width;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
      ctx.fillRect(x1, 0, Math.max(1, x2 - x1), height);
    });

    // Draw item cut sections with distinct vibrant colors
    const colors = [
      'rgba(59, 130, 246, 0.25)',
      'rgba(16, 185, 129, 0.25)',
      'rgba(245, 158, 11, 0.25)',
      'rgba(168, 85, 247, 0.25)',
      'rgba(236, 72, 153, 0.25)',
      'rgba(14, 165, 233, 0.25)',
    ];

    itemCuts.forEach((cut, i) => {
      const x1 = (cut.start / duration) * width;
      const x2 = (cut.end / duration) * width;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x1, 0, Math.max(2, x2 - x1), height);

      // Border markers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, 0, Math.max(2, x2 - x1), height);

      // Label #
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`#${i + 1}`, x1 + 4, height - 8);
    });

    // Draw Waveform peaks
    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    // Draw current playhead
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead handle
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(playheadX, 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [audioBuffer, silences, itemCuts, currentTime]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = ratio * audioBuffer.duration;
    setCurrentTime(targetTime);
    if (onSeek) onSeek(targetTime);
    if (isPlaying) {
      playFrom(targetTime);
    }
  };

  if (!audioBuffer) return null;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={togglePlay}
            style={{
              padding: '0.5rem 1rem',
              background: isPlaying ? 'var(--accent-rose)' : 'var(--accent-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem'
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause Audio' : 'Play Full Audio'}
          </button>
          <button
            onClick={() => { stopPlayback(); setCurrentTime(0); }}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <RotateCcw size={14} /> Rewind
          </button>
          <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: '600' }}>
            {currentTime.toFixed(2)}s / {audioBuffer.duration.toFixed(2)}s
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Click waveform to seek • {itemCuts.length} items colored
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', cursor: 'pointer', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
        <canvas
          ref={canvasRef}
          width={1000}
          height={120}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '120px', display: 'block' }}
        />
      </div>
    </div>
  );
};
