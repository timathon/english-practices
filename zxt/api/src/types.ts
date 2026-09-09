export interface Env {
  zxt_poems_db: D1Database;
}

export interface UserContext {
  id: string;
  username: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className?: string;
  createdBy?: string;
  isQuizEditor?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className?: string;
  createdBy: string;
  createdAt: string;
  points?: number;
  streakDays?: number;
}

export interface PoemLineItem {
  text: string;
  pinyin: string;
  cn?: string;
  en?: string;
  image?: string;
}

export interface PoemQuestion {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface PoemItem {
  id: number;
  title: string;
  dynasty: string;
  author: string;
  lines: PoemLineItem[];
  cn?: string;
  en?: string;
  keywords: string[];
  theme: string;
  questions?: PoemQuestion[];
}

export type AppContext = {
  Bindings: Env;
  Variables: { user?: UserContext };
};
