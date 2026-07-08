export const PRACTICE_TYPE_ICONS: Record<string, string> = {
  'Vocab Master': '🔥',
  'Spelling Hero': '✏️',
  'Sentence Architect': '🏗️',
  'Recall Map': '🗺️',
  'Writing Map': '📝',
  'Audio Detective': '🎧',
  'Bug Hunter': '🐛',
}

export const translatePracticeName = (name: string): string => {
  const norm = name.trim();
  const suffixMatch = norm.match(/\s+(Test\s+\d+|Challenge\s+\d+|Model\s+\d+|\d+|[a-zA-Z]\d+|[a-zA-Z])$/i);
  const suffix = suffixMatch ? suffixMatch[0] : '';
  const baseName = suffixMatch ? norm.substring(0, norm.length - suffix.length).trim() : norm;

  if (baseName.startsWith('Text Navigator')) {
    if (baseName === 'Text Navigator 2 Start Up') return '阅读导航2 Start Up' + suffix;
    if (baseName === 'Text Navigator 3 Speed Up') return '阅读导航3 Speed Up' + suffix;
    return baseName.replace('Text Navigator', '阅读导航') + suffix;
  }
  if (baseName.startsWith('Writing Map')) {
    if (baseName === 'Writing Map Model 1') return '写作导图 Model 1' + suffix;
    if (baseName === 'Writing Map Model 2') return '写作导图 Model 2' + suffix;
    return baseName.replace('Writing Map', '写作导图') + suffix;
  }
  if (baseName.startsWith('Passage Decoder')) {
    if (baseName.toLowerCase().endsWith('w')) return '*练习册翻译*' + suffix;
    return '课文翻译' + suffix;
  }
  const map: Record<string, string> = {
    'Recall Map': '单元总览',
    'Vocab Guide': '词汇导学',
    'Vocab Master': '词汇大师',
    'Spelling Hero': '拼写达人',
    'Grammar Wizard': '语法向导',
    'Sentence Architect': '句子架构师',
    'Audio Detective': '听力侦探',
    'Bug Hunter': 'Bug 猎手',
  };
  const translatedBase = map[baseName] || map[baseName.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')] || baseName;
  return translatedBase + suffix;
};

export const translateTextbookName = (name: string): string => {
  const map: Record<string, string> = {
    'A3A': '三上', 'A3B': '三下',
    'A4A': '四上', 'A4B': '四下',
    'A5A': '五上', 'A5B': '五下',
    'A6A': '六上', 'A6B': '六下',
    'A7A': '七上', 'A7B': '七下',
    'A8A': '八上', 'A8B': '八下',
    'A9A': '九上', 'A9B': '九下', 'A9': '九全',
    'NCE1': '新一', 'NCE2': '新二', 'NCE3': '新三',
    'B-NCE2': '新二',
    'B-THINK1': 'Think 1',
  };
  return map[name.toUpperCase()] || name;
};

export const LS_KEY = 'ep-last-units'

export function getLastUnit(tb: string): string | undefined {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}')[tb] } catch { return undefined }
}

export function saveLastUnit(tb: string, unit: string) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    localStorage.setItem(LS_KEY, JSON.stringify({ ...map, [tb]: unit }))
  } catch { }
}
