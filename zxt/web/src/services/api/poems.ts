import { Poem, PoemQuestion } from './types';
import { API_BASE_URL, getAuthHeaders } from './config';

export const poemsService = {
  async getPoems(): Promise<Poem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blg/poems`);
      if (res.ok) {
        const data = await res.json() as { poems?: Poem[] };
        if (data.poems && Array.isArray(data.poems)) {
          const poems = [...data.poems].sort((a, b) => a.id - b.id);
          localStorage.setItem('zxt_quiz_library', JSON.stringify(poems));
          return poems;
        }
      }
    } catch (e) {
      console.warn('Remote API unavailable, using local quiz library.', e);
    }
    return this.getQuizLibrary();
  },

  seedQuizLibrary(): Poem[] {
    const existing = localStorage.getItem('zxt_quiz_library');
    if (existing) {
      try { return JSON.parse(existing); } catch { /* fall through */ }
    }
    return [];
  },

  getQuizLibrary(): Poem[] {
    const stored = localStorage.getItem('zxt_quiz_library');
    if (!stored) return this.seedQuizLibrary();
    try {
      const poems = JSON.parse(stored);
      return [...poems].sort((a, b) => a.id - b.id);
    } catch (e) {
      return this.seedQuizLibrary();
    }
  },

  saveQuizLibrary(poems: Poem[]) {
    localStorage.setItem('zxt_quiz_library', JSON.stringify(poems));
  },

  savePoemQuestions(poemId: number, questions: PoemQuestion[]) {
    const library = this.getQuizLibrary();
    const updated = library.map(p => p.id === poemId ? { ...p, questions } : p);
    this.saveQuizLibrary(updated);
    localStorage.setItem(`zxt_questions_poem_${poemId}`, JSON.stringify(questions));
    fetch(`${API_BASE_URL}/api/blg/poems/${poemId}/questions`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questions }),
    }).catch(e => console.warn('Failed to save questions to remote D1:', e));
  },

  getPoemQuestions(poemId: number): PoemQuestion[] | null {
    const library = this.getQuizLibrary();
    const poem = library.find(p => p.id === poemId);
    return poem?.questions ?? null;
  }
};
