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
  deleted?: boolean;
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
          deleted: false,
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
          deleted: false,
        });
      }

      localStorage.setItem(getStorageKey(userId), JSON.stringify(mistakes));
      this.syncToServer(userId);
    } catch (e) {
      console.error('Failed to save mistake to localStorage:', e);
    }
  },

  removeMistake(userId: string, id: string): void {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      const index = mistakes.findIndex((m) => m.id === id);
      if (index > -1) {
        mistakes[index].deleted = true;
        mistakes[index].createdAt = new Date().toISOString();
        localStorage.setItem(getStorageKey(userId), JSON.stringify(mistakes));
        this.syncToServer(userId);
      }
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
        mistakes[index].createdAt = new Date().toISOString();
        localStorage.setItem(getStorageKey(userId), JSON.stringify(mistakes));
        this.syncToServer(userId);
      }
    } catch (e) {
      console.error('Failed to resolve mistake in localStorage:', e);
    }
  },

  clearAllMistakes(userId: string): void {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      const cleared = mistakes.map(m => ({
        ...m,
        deleted: true,
        createdAt: new Date().toISOString()
      }));
      localStorage.setItem(getStorageKey(userId), JSON.stringify(cleared));
      this.syncToServer(userId);
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
        mistakes[index].createdAt = new Date().toISOString();
        localStorage.setItem(getStorageKey(userId), JSON.stringify(mistakes));
        this.syncToServer(userId);
      }
    } catch (e) {
      console.error('Failed to record attempt in localStorage:', e);
    }
  },

  mergeMistakes(local: Mistake[], server: Mistake[]): Mistake[] {
    const mergedMap = new Map<string, Mistake>();
    
    // Put server mistakes first
    for (const m of server) {
      if (m && m.id) mergedMap.set(m.id, m);
    }
    
    // Merge local mistakes
    for (const localM of local) {
      if (!localM || !localM.id) continue;
      const serverM = mergedMap.get(localM.id);
      if (!serverM) {
        mergedMap.set(localM.id, localM);
      } else {
        const localTime = localM.createdAt ? new Date(localM.createdAt).getTime() : 0;
        const serverTime = serverM.createdAt ? new Date(serverM.createdAt).getTime() : 0;
        if (localTime > serverTime) {
          mergedMap.set(localM.id, localM);
        }
      }
    }
    
    return Array.from(mergedMap.values());
  },

  async syncFromServer(userId: string): Promise<Mistake[]> {
    if (!userId) return [];
    try {
      const res = await fetch(`${API_URL}/api/mistakes`, { credentials: 'include' });
      const serverData = await res.json();
      const localData = this.getMistakes(userId);
      if (Array.isArray(serverData)) {
        const merged = this.mergeMistakes(localData, serverData);
        localStorage.setItem(getStorageKey(userId), JSON.stringify(merged));
        // Push merged state back to the server
        await this.syncToServer(userId);
        return merged;
      }
      return localData;
    } catch (e) {
      console.error('Failed to sync mistakes from server:', e);
      return this.getMistakes(userId);
    }
  },

  async syncToServer(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const mistakes = this.getMistakes(userId);
      const res = await fetch(`${API_URL}/api/mistakes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(mistakes),
      });
      const data = await res.json();
      if (data && Array.isArray(data.mistakeState)) {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(data.mistakeState));
      }
    } catch (e) {
      console.error('Failed to sync mistakes to server:', e);
    }
  }
};
