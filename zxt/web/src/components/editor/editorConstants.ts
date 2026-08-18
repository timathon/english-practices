import { PoemQuestion, IdiomQuestion } from '../../services/api';

export const genId = () => Math.random().toString(36).slice(2, 10);

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  LineAssembly:   '连句组装',
  VerseCloze:    '诗句填空',
  PinyinMatch:   '拼音辨析',
  TextToCn:      '诗意理解',
  CulturalContext:'文化背景',
  ImageOrdering: '插图排序',
  ImageToLine:   '图配句',
  IdiomAssembly:  '成语还原',
  ChainAssembly:  '接龙还原',
  IdiomSolitaire: '首尾接龙',
  IdiomCloze:     '成语填空',
  HomophoneMatch: '字音字形',
  IdiomMeaning:   '成语释义',
  StoryComprehension: '故事问答',
  ImageToIdiom:   '看图识成语',
  EmotionMatch:   '情感归类',
};

export const ALL_TYPES = ['LineAssembly', 'VerseCloze', 'PinyinMatch', 'TextToCn', 'CulturalContext', 'ImageOrdering', 'ImageToLine'];
export const IDIOM_TYPES = ['IdiomAssembly', 'ChainAssembly', 'IdiomSolitaire', 'IdiomCloze', 'HomophoneMatch', 'IdiomMeaning', 'StoryComprehension', 'ImageToIdiom', 'EmotionMatch'];

export const TYPE_COLORS: Record<string, string> = {
  LineAssembly:   'bg-violet-100 text-violet-800 border-violet-200',
  VerseCloze:    'bg-teal-100 text-teal-800 border-teal-200',
  PinyinMatch:   'bg-sky-100 text-sky-800 border-sky-200',
  TextToCn:      'bg-amber-100 text-amber-800 border-amber-200',
  CulturalContext:'bg-rose-100 text-rose-800 border-rose-200',
  ImageOrdering: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ImageToLine:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  IdiomAssembly:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  ChainAssembly:  'bg-amber-100 text-amber-800 border-amber-200',
  IdiomSolitaire: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  IdiomCloze:     'bg-teal-100 text-teal-800 border-teal-200',
  HomophoneMatch: 'bg-sky-100 text-sky-800 border-sky-200',
  IdiomMeaning:   'bg-amber-100 text-amber-800 border-amber-200',
  StoryComprehension: 'bg-purple-100 text-purple-800 border-purple-200',
  ImageToIdiom:   'bg-teal-100 text-teal-800 border-teal-200',
  EmotionMatch:   'bg-rose-100 text-rose-800 border-rose-200',
};

export function makeBlankIdiomQuestion(type: string): IdiomQuestion {
  const id = `q_idm_${Math.random().toString(36).slice(2, 8)}`;
  if (type === 'IdiomAssembly') {
    return { id, type: 'IdiomAssembly', answer: '', distractor_chars: [] };
  }
  if (type === 'ChainAssembly') {
    return { id, type: 'ChainAssembly', idioms: ['', '', ''], distractor_chars: [] };
  }
  if (type === 'ImageToIdiom') {
    return { id, type: 'ImageToIdiom', prompt: '', image: '', options: ['', '', '', ''], answer: 0, explanation: '' };
  }
  return { id, type: type as any, prompt: '', options: ['', '', '', ''], answer: 0, explanation: '' };
}

export function makeBlankQuestion(type: string): PoemQuestion {
  const id = genId();
  if (type === 'LineAssembly') {
    return { id, type: 'LineAssembly', line_index: 0, prompt: '', distractor_chars: [], answer: '' };
  }
  if (type === 'ImageOrdering') {
    return { id, type: 'ImageOrdering', prompt: '', images: [], explanation: '' };
  }
  if (type === 'ImageToLine') {
    return { id, type: 'ImageToLine', prompt: '', image: '', options: ['', '', '', ''], answer: 0, explanation: '' };
  }
  const optCount = type === 'VerseCloze' ? 6 : 4;
  return { id, type: type as any, prompt: '', options: Array(optCount).fill(''), answer: 0, explanation: '' };
}
