import { AvatarConfig } from '../../components/AvatarDisplay';

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className: string;
  createdBy: string;
  capabilities: string[];
  isQuizEditor?: boolean;
  points?: number;
  gems?: number;
  gemsHistory?: Array<{
    id: string;
    type: 'exchange' | 'spend';
    pointsDeducted?: number;
    gemsChanged: number;
    gemsBalance: number;
    pointsBalance: number;
    description: string;
    timestamp: string;
  }>;
  streakDays?: number;
  avatarConfig?: AvatarConfig;
}

export interface PoemLine {
  text: string;
  pinyin: string;
  cn?: string;
  en?: string;
  image?: string;
}

// ImageOrdering item (kept for legacy compatibility only)
export interface OrderingItem {
  image: string;
  line_index: number;
}

export type PoemQuestion =
  | {
      id: string;
      type: 'LineAssembly';
      line_index: number;
      prompt: string;
      distractor_chars: string[];
      answer: string;
      explanation?: string;
    }
  | {
      id: string;
      type: 'VerseCloze' | 'PinyinMatch' | 'TextToCn' | 'CulturalContext';
      prompt: string;
      options: string[];
      answer: number;
      explanation?: string;
      line_index?: number;
    }
  | {
      id: string;
      type: 'ImageOrdering';
      prompt: string;
      images: string[];
      explanation?: string;
    }
  | {
      id: string;
      type: 'ImageToLine';
      prompt: string;
      image: string;
      options: string[];
      answer: number;
      explanation?: string;
    };

export interface Poem {
  id: number;
  title: string;
  dynasty: string;
  author: string;
  lines: PoemLine[];
  keywords: string[];
  theme: string;
  questions?: PoemQuestion[];
}

export interface IdiomItem {
  index: number;
  word: string;
  pinyin: string;
  meaning?: string;
  partial_meanings?: string;
  full_meaning?: string;
  has_story?: boolean;
}

export type IdiomQuestion =
  | {
      id: string;
      type: 'IdiomAssembly';
      answer: string;
      distractor_chars: string[];
      prompt?: string;
      explanation?: string;
    }
  | {
      id: string;
      type: 'IdiomSolitaire' | 'IdiomCloze' | 'HomophoneMatch' | 'IdiomMeaning' | 'StoryComprehension' | 'EmotionMatch';
      prompt: string;
      options: string[];
      answer: number;
      explanation?: string;
    }
  | {
      id: string;
      type: 'ImageToIdiom';
      prompt: string;
      image: string;
      options: string[];
      answer: number;
      explanation?: string;
    };

export interface IdiomGroup {
  id: number;
  group_number: number;
  title: string;
  idioms: IdiomItem[];
  questions?: IdiomQuestion[];
}

