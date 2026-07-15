export const TEXTBOOK_EMOJIS: Record<string, string> = {
  A3A: '🌱', A3B: '🌿',
  A4A: '☘️', A4B: '🍀',
  A5A: '🌸', A5B: '🌺',
  A6A: '✨', A6B: '🌟',
  A7A: '🚀', A7B: '🛸',
  A8A: '🎓', A8B: '🔭',
  A9: '🏆',
  'B-NCE2': '📘',
  'B-PU0': '🎒',
  'B-PU1': '🚌',
  'B-Think1': '🧠',
  'book-reviews': '📝',
  'C-GIU': '📚',
  'E-LYRICS': '❄️',
  'GENERAL': '⚙️',
  'my-exercises': '✏️',
  'RAZ-B': '🦖',
  SA1: '🏫',
  T7A: '🏹', T8A: '🎯',
  W7A: '🏯', W7B: '🏰',
  W8A: '📜', W8B: '🎨',
  W9A: '🏛️', W9B: '🧭',
}

export function getTextbookEmoji(tb: string) {
  for (const key of Object.keys(TEXTBOOK_EMOJIS)) {
    if (tb.toUpperCase().includes(key)) return TEXTBOOK_EMOJIS[key]
  }
  return '📖'
}
