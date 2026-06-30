export const TEXTBOOK_EMOJIS: Record<string, string> = {
  A3A: '🌱', A3B: '🌿',
  A4A: '☘️', A4B: '🍀',
  A5A: '🌸', A5B: '🌺',
  A6B: '🌟',
  A7A: '🚀', A7B: '🛸',
  A8A: '🎓', A8B: '🎓',
  A9: '🏆',
  'B-NCE2': '📘',
  'B-Think1': '🧠',
  'book-reviews': '📝',
  'C-GIU': '📚',
  'GENERAL': '⚙️',
  'my-exercises': '✏️',
  'RAZ-B': '🦖',
  SA1: '🏫',
  W9A: '🏛️',
}

export function getTextbookEmoji(tb: string) {
  for (const key of Object.keys(TEXTBOOK_EMOJIS)) {
    if (tb.toUpperCase().includes(key)) return TEXTBOOK_EMOJIS[key]
  }
  return '📖'
}
