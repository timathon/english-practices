export const TEXTBOOK_EMOJIS: Record<string, string> = {
  A3A: '🌱', A3B: '🌿',
  A5A: '🌸', A5B: '🌺',
  A6B: '🌟',
  A7A: '🚀', A7B: '🛸',
  A8B: '🎓',
  'B-NCE2': '📘',
}

export function getTextbookEmoji(tb: string) {
  for (const key of Object.keys(TEXTBOOK_EMOJIS)) {
    if (tb.toUpperCase().includes(key)) return TEXTBOOK_EMOJIS[key]
  }
  return '📖'
}
