import { useState, useRef, useEffect } from 'react'
import md5 from 'md5'
import { audioCache } from '../../lib/audioCache'
import { PUBLIC_URL_BASE } from './testSheetUtils'
import { ConfirmStopAudioModal } from './TestSheetModals'
import type { AudioSpec } from './TestSheetTypes'

interface TestSheetAudioPlayerProps {
  audio: AudioSpec
  audioKey: string
  textbook: string
  submitted?: boolean
  replayCounts: Record<string, number>
  onPlayIncrement: (key: string) => void
}

export function TestSheetAudioPlayer({
  audio,
  audioKey,
  textbook,
  submitted = false,
  replayCounts,
  onPlayIncrement
}: TestSheetAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showConfirmStopModal, setShowConfirmStopModal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const maxReplays = typeof audio.maxReplays === 'number' ? audio.maxReplays : 1
  const audioHash = audio.text ? md5(audio.text.trim()) : audioKey
  const trackKey = audioKey.startsWith('sec_') ? audioKey : `hash_${audioHash}`
  const timesPlayed = replayCounts[trackKey] || replayCounts[audioKey] || 0
  const maxTotalPlays = maxReplays + 1
  const remainingPlays = Math.max(0, maxTotalPlays - timesPlayed)
  const remainingReplays = Math.max(0, remainingPlays - 1)

  // In test mode: allow play only if remainingPlays > 0. In submitted review mode: unlimited play
  const canPlay = submitted || remainingPlays > 0

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [audioKey])

  const resolveAudioUrl = (): string => {
    if (audio.url) return audio.url
    const text = audio.text?.trim()
    if (!text) return ''
    const hash = md5(text)
    const bookCategory = textbook.toLowerCase()
    return `${PUBLIC_URL_BASE}/ep/${bookCategory}/${hash}.mp3`
  }

  const stopAudioPermanently = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setShowConfirmStopModal(false)

    // Ensure all plays are exhausted so it cannot be played again
    if (!submitted) {
      for (let i = 0; i < remainingPlays; i++) {
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
      setLoading(true)
      const blob = await audioCache.cacheAudio(url)
      setLoading(false)
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

      await a.play()
      setIsPlaying(true)
      if (!submitted) {
        onPlayIncrement(trackKey)
      }
    } catch (err) {
      console.error('Audio playback error:', err)
      setLoading(false)
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
            submitted
              ? (isPlaying ? 'Stop Audio' : 'Play Audio')
              : isPlaying
              ? 'Stop Audio'
              : canPlay
              ? 'Play Audio'
              : '0 replay left'
          }
        >
          {loading ? (
            <span className="ts-audio-spinner" />
          ) : isPlaying ? (
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
          <span className="ts-audio-label">
            {isPlaying ? 'Playing audio...' : 'Listening Material'}
          </span>
          {!submitted ? (
            <span className={`ts-replay-badge ${remainingPlays === 0 ? 'exhausted' : ''}`}>
              {timesPlayed === 0
                ? `${maxReplays} replay left`
                : `${remainingReplays} replay left`}
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
