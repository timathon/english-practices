import { API_URL } from './auth';

export interface Mistake {
  id: string; // Composite key: practiceId_questionId
  practiceId: string;
  textbook: string;
  unit: string;
  practiceType: string;
  question: any; // Entire question object for self-containment
  wrongAnswer: any; // Keep track of what they selected
  createdAt: string;
  attemptsCount: number;
  correctStreak: number;
  resolved?: boolean;
}

const getStorageKey = (userId: string) => `ep-mistakes-${userId}`;

export const mistakeService = {
  getMistakes(userId: string): Mistake[] {
    if (!userId) return [];
    try {
      const stored = localStorage.getItem(getStorageKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to read mistakes from localStorage:', e);
      return [];
    }
  },

  addMistake(
    userId: string,
    params: {
      practiceId: string;
      textbook: string;
      unit: string;
      practiceType: string;
      question: any;
      wrongAnswer?: any;
    }
  ): void {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      const questionId = params.question.id || params.question.word || 'unknown';
      const compositeId = `${params.practiceId}_${questionId}`;

      const existingIndex = mistakes.findIndex((m) => m.id === compositeId);

      if (existingIndex > -1) {
        // Update existing mistake
        mistakes[existingIndex] = {
          ...mistakes[existingIndex],
          wrongAnswer: params.wrongAnswer ?? mistakes[existingIndex].wrongAnswer,
          attemptsCount: mistakes[existingIndex].attemptsCount + 1,
          correctStreak: 0, // Reset streak since they made a mistake again
          createdAt: new Date().toISOString(),
          resolved: false,
        };
      } else {
        // Insert new mistake
        mistakes.push({
          id: compositeId,
          practiceId: params.practiceId,
          textbook: params.textbook,
          unit: params.unit,
          practiceType: params.practiceType,
          question: params.question,
          wrongAnswer: params.wrongAnswer,
          attemptsCount: 1,
          correctStreak: 0,
          createdAt: new Date().toISOString(),
          resolved: false,
        });
      }

      localStorage.setItem(getStorageKey(userId), JSON.stringify(mistakes));
    } catch (e) {
      console.error('Failed to save mistake to localStorage:', e);
    }
  },

  removeMistake(userId: string, id: string): void {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      const filtered = mistakes.filter((m) => m.id !== id);
      localStorage.setItem(getStorageKey(userId), JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to remove mistake from localStorage:', e);
    }
  },

  resolveMistake(userId: string, id: string, resolved = true): void {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      const index = mistakes.findIndex((m) => m.id === id);
      if (index > -1) {
        mistakes[index].resolved = resolved;
        localStorage.setItem(getStorageKey(userId), JSON.stringify(mistakes));
      }
    } catch (e) {
      console.error('Failed to resolve mistake in localStorage:', e);
    }
  },

  clearAllMistakes(userId: string): void {
    if (!userId) return;
    try {
      localStorage.removeItem(getStorageKey(userId));
    } catch (e) {
      console.error('Failed to clear mistakes from localStorage:', e);
    }
  },

  recordAttempt(userId: string, id: string, isCorrect: boolean): void {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      const index = mistakes.findIndex((m) => m.id === id);
      if (index > -1) {
        if (isCorrect) {
          mistakes[index].correctStreak += 1;
        } else {
          mistakes[index].correctStreak = 0;
          mistakes[index].attemptsCount += 1;
        }
        localStorage.setItem(getStorageKey(userId), JSON.stringify(mistakes));
      }
    } catch (e) {
      console.error('Failed to record attempt in localStorage:', e);
    }
  },

  async syncFromServer(userId: string): Promise<Mistake[]> {
    if (!userId) return [];
    try {
      const res = await fetch(`${API_URL}/api/mistakes`, { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(data));
        return data;
      }
      return this.getMistakes(userId);
    } catch (e) {
      console.error('Failed to sync mistakes from server:', e);
      return this.getMistakes(userId);
    }
  },

  async syncToServer(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      await fetch(`${API_URL}/api/mistakes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(mistakes),
      });
    } catch (e) {
      console.error('Failed to sync mistakes to server:', e);
    }
  }
};
