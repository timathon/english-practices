import { useState, useRef, useEffect } from 'react'
import md5 from 'md5'
import { audioCache } from '../../lib/audioCache'
import { resolveTestAudioUrl } from './testSheetUtils'
import { ConfirmStopAudioModal } from './TestSheetModals'
import type { AudioSpec } from './TestSheetTypes'

interface TestSheetAudioPlayerProps {
  audio: AudioSpec
  audioKey: string
  textbook: string
  submitted?: boolean
  replayCounts: Record<string, number>
  onPlayIncrement: (key: string) => void
  onPlayingStateChange?: (key: string, isPlaying: boolean, stopAudio: () => void) => void
  activePlayingKey?: string | null
}

export function TestSheetAudioPlayer({
  audio,
  audioKey,
  textbook,
  submitted = false,
  replayCounts,
  onPlayIncrement,
  onPlayingStateChange,
  activePlayingKey
}: TestSheetAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showConfirmStopModal, setShowConfirmStopModal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const maxReplays = typeof audio.maxReplays === 'number' ? audio.maxReplays : 1
  const audioHash = audio.text ? md5(audio.text.trim()) : audioKey
  const trackKey = audioKey.startsWith('sec_') ? audioKey : `hash_${audioHash}`
  const timesPlayed = replayCounts[trackKey] || replayCounts[audioKey] || 0
  const remainingReplays = Math.max(0, maxReplays - timesPlayed)

  // Another audio in the test is currently playing
  const isAnotherPlaying = !!activePlayingKey && activePlayingKey !== audioKey

  // In review mode: unlimited play. In test mode: can only initiate play if replays remain (timesPlayed < maxReplays)
  const canPlay = !isAnotherPlaying && (submitted || remainingReplays > 0)

  // Notify parent component of playing state changes
  useEffect(() => {
    if (onPlayingStateChange) {
      onPlayingStateChange(audioKey, isPlaying, stopAudioPermanently)
    }
  }, [isPlaying, audioKey, onPlayingStateChange])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (onPlayingStateChange) {
        onPlayingStateChange(audioKey, false, () => {})
      }
    }
  }, [audioKey, onPlayingStateChange])

  const resolveAudioUrl = (): string => {
    return resolveTestAudioUrl(audio, textbook)
  }

  const stopAudioPermanently = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setShowConfirmStopModal(false)

    // Ensure all replays are exhausted so it cannot be played again
    if (!submitted) {
      for (let i = 0; i < remainingReplays; i++) {
        onPlayIncrement(trackKey)
      }
    }
  }

  const handleButtonClick = () => {
    if (isPlaying) {
      if (submitted) {
        // In review mode, directly stop without modal
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        setIsPlaying(false)
      } else {
        // Show confirmation modal to prevent accidental stoppage
        setShowConfirmStopModal(true)
      }
      return
    }

    handleStartPlay()
  }

  const handleStartPlay = async () => {
    if (!canPlay) return

    const url = resolveAudioUrl()
    if (!url) return

    try {
      const blob = await audioCache.cacheAudio(url)
      if (!blob) {
        console.warn('Audio not found or failed to load:', url)
        return
      }

      const blobUrl = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const a = new Audio(blobUrl)
      audioRef.current = a

      a.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(blobUrl)
      }

      a.onerror = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(blobUrl)
      }

      if (!submitted) {
        onPlayIncrement(trackKey)
      }
      setIsPlaying(true)
      await a.play()
    } catch (err) {
      console.error('Audio playback error:', err)
      setIsPlaying(false)
    }
  }

  return (
    <>
      <div className="ts-audio-player-bar">
        <button
          type="button"
          className={`ts-audio-play-btn ${isPlaying ? 'playing' : ''} ${!canPlay && !isPlaying ? 'disabled' : ''}`}
          disabled={!canPlay && !isPlaying}
          onClick={handleButtonClick}
          title={
            isAnotherPlaying
              ? 'Another audio is currently playing'
              : submitted
              ? (isPlaying ? 'Stop Audio' : 'Play Audio')
              : isPlaying
              ? 'Stop Audio'
              : canPlay
              ? 'Play Audio'
              : '0 replay left'
          }
        >
          {isPlaying ? (
            /* Stop Button Icon (Square) */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          ) : (
            /* Play Button Icon (Triangle) */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <div className="ts-audio-info">
          {!submitted ? (
            <span className={`ts-replay-badge ${remainingReplays === 0 ? 'exhausted' : ''}`}>
              {`${remainingReplays} replay left`}
            </span>
          ) : (
            <span className="ts-replay-badge submitted">Review Mode</span>
          )}
        </div>
      </div>

      {showConfirmStopModal && (
        <ConfirmStopAudioModal
          onConfirm={stopAudioPermanently}
          onCancel={() => setShowConfirmStopModal(false)}
        />
      )}
    </>
  )
}
