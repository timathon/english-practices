export const PRACTICE_TYPE_ICONS: Record<string, string> = {
  'Vocab Master': '🔥',
  'Spelling Hero': '✏️',
  'Sentence Architect': '🏗️',
  'Recall Map': '🗺️',
  'Writing Map': '📝',
  'Audio Detective': '🎧',
  'Bug Hunter': '🐛',
  'Irregular Verbs': '⚡',
  'Verb Expressions': '💡',
}

export const translatePracticeName = (name: string): string => {
  const norm = name.trim();

  if (norm.startsWith('Text Navigator')) {
    return norm.replace(/^Text Navigator/i, '阅读导航');
  }
  if (norm.startsWith('Writing Map')) {
    return norm.replace(/^Writing Map/i, '写作导图');
  }
  if (norm.startsWith('Passage Decoder')) {
    return norm.replace(/^Passage Decoder/i, '课文翻译');
  }
  if (norm.startsWith('Audio Detective')) {
    return norm.replace(/^Audio Detective/i, '听力侦探');
  }
  if (norm.startsWith('Bug Hunter')) {
    return norm.replace(/^Bug Hunter/i, 'Bug 猎手');
  }
  if (norm.startsWith('Sentence Architect')) {
    return norm.replace(/^Sentence Architect/i, '句子架构师');
  }
  if (norm.startsWith('Grammar Wizard')) {
    return norm.replace(/^Grammar Wizard/i, '语法向导');
  }
  if (norm.startsWith('Vocab Master')) {
    return norm.replace(/^Vocab Master/i, '词汇大师');
  }
  if (norm.startsWith('Vocab Guide')) {
    return norm.replace(/^Vocab Guide/i, '词汇导学');
  }
  if (norm.startsWith('Spelling Hero')) {
    return norm.replace(/^Spelling Hero/i, '拼写达人');
  }
  if (norm.startsWith('Recall Map')) {
    return norm.replace(/^Recall Map/i, '单元总览');
  }
  if (norm.startsWith('Irregular Verbs')) {
    return norm.replace(/^Irregular Verbs/i, '不规则动词表');
  }
  if (norm.startsWith('Verb Expressions')) {
    return norm.replace(/^Verb Expressions/i, '动词短语与搭配');
  }
  if (norm.startsWith('Test')) {
    return norm.replace(/^Test/i, '单元测试');
  }

  const suffixMatch = norm.match(/\s+(Test\s+\d+|Challenge\s+\d+|Model\s+\d+|\d+|[a-zA-Z\d-]+)$/i);
  const suffix = suffixMatch ? suffixMatch[0] : '';
  const baseName = suffixMatch ? norm.substring(0, norm.length - suffix.length).trim() : norm;

  const map: Record<string, string> = {
    'Recall Map': '单元总览',
    'Vocab Guide': '词汇导学',
    'Vocab Master': '词汇大师',
    'Spelling Hero': '拼写达人',
    'Grammar Wizard': '语法向导',
    'Sentence Architect': '句子架构师',
    'Audio Detective': '听力侦探',
    'Bug Hunter': 'Bug 猎手',
    'Irregular Verbs': '不规则动词表',
    'Verb Expressions': '动词短语与搭配',
    'Test': '单元测试',
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
    'A10': '中考',
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
