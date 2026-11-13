const STORAGE_KEY = 'ep_tn_sentence_difficulty_v1'
const IGNORED_STORAGE_KEY = 'ep_tn_ignored_sentences_v1'
export const DEFAULT_SENTENCE_DIFFICULTY = 3
export const MIN_SENTENCE_DIFFICULTY = 1
export const MAX_SENTENCE_DIFFICULTY = 5

function normalizeSentence(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

function loadAll(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function saveAll(map: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage quota errors
  }
}

export function getSentenceDifficulty(text?: string | null): number {
  if (!text) return DEFAULT_SENTENCE_DIFFICULTY
  const key = normalizeSentence(text)
  if (!key) return DEFAULT_SENTENCE_DIFFICULTY
  const map = loadAll()
  const val = map[key]
  return typeof val === 'number' ? val : DEFAULT_SENTENCE_DIFFICULTY
}

export function updateSentenceDifficulty(text: string, delta: -1 | 1): number {
  const key = normalizeSentence(text)
  if (!key) return DEFAULT_SENTENCE_DIFFICULTY
  const map = loadAll()
  const current = typeof map[key] === 'number' ? map[key] : DEFAULT_SENTENCE_DIFFICULTY
  const next = Math.min(MAX_SENTENCE_DIFFICULTY, Math.max(MIN_SENTENCE_DIFFICULTY, current + delta))
  map[key] = next
  saveAll(map)
  return next
}

export function getDifficultyBadgeStyle(level: number): { color: string; backgroundColor: string; borderColor: string } {
  if (level >= 4) {
    return { color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.14)', borderColor: 'rgba(239, 68, 68, 0.35)' }
  }
  if (level <= 2) {
    return { color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.14)', borderColor: 'rgba(16, 185, 129, 0.35)' }
  }
  return { color: '#fbbf24', backgroundColor: 'rgba(245, 158, 11, 0.14)', borderColor: 'rgba(245, 158, 11, 0.35)' }
}

export function getIgnoredSentences(): string[] {
  try {
    const raw = localStorage.getItem(IGNORED_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function isSentenceIgnored(text?: string | null): boolean {
  if (!text) return false
  const key = normalizeSentence(text)
  return getIgnoredSentences().includes(key)
}

export function ignoreSentence(text: string): string[] {
  const key = normalizeSentence(text)
  if (!key) return getIgnoredSentences()
  const list = getIgnoredSentences()
  if (!list.includes(key)) {
    const next = [...list, key]
    try {
      localStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage quota errors
    }
    return next
  }
  return list
}

export function unignoreSentence(text: string): string[] {
  const key = normalizeSentence(text)
  const next = getIgnoredSentences().filter(item => item !== key)
  try {
    localStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage quota errors
  }
  return next
}

