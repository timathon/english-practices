import type { ReactNode } from 'react'

export interface Node {
  id: string
  text: string
  emoji: string
  cn?: string
  notes?: string
  statement?: string
  answer?: boolean
  explanation?: string
  keywords?: string
  highlight?: string
  state?: 'hidden' | 'empty' | 'emoji' | 'keywords' | 'full'
  children?: Node[]
  speaker?: string
  word_count?: number
  is_given?: boolean
}

export interface MindMapData {
  level: string
  part: string
  section: string
  tree: Node
  writingPrompt?: string
  tts?: {
    by: string
  }
}

export interface MindMapShellProps {
  data: MindMapData
  textbook: string
  unit: string
  practiceId?: string
  isWritingMap: boolean
  headerSlot?: ReactNode
}

export interface SpeakerColorTheme {
  color: string
  bg: string
  border: string
}

export const SPEAKER_COLORS: SpeakerColorTheme[] = [
  { color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.22)', border: 'rgba(96, 165, 250, 0.5)' },
  { color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.22)', border: 'rgba(52, 211, 153, 0.5)' },
  { color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.22)', border: 'rgba(251, 191, 36, 0.5)' },
  { color: '#d8b4fe', bg: 'rgba(168, 85, 247, 0.22)', border: 'rgba(192, 132, 252, 0.5)' },
  { color: '#fda4af', bg: 'rgba(244, 63, 94, 0.22)', border: 'rgba(251, 113, 133, 0.5)' },
  { color: '#67e8f9', bg: 'rgba(6, 182, 212, 0.22)', border: 'rgba(34, 211, 238, 0.5)' },
  { color: '#f0abfc', bg: 'rgba(217, 70, 239, 0.22)', border: 'rgba(232, 121, 249, 0.5)' },
  { color: '#5eead4', bg: 'rgba(20, 184, 166, 0.22)', border: 'rgba(45, 212, 191, 0.5)' },
]
