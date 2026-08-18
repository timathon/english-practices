import { Poem, PoemQuestion } from './types';
import { API_BASE_URL, getAuthHeaders } from './config';
import { idbService } from '../db';

export const poemsService = {
  /**
   * Fast load: returns cached poems from IndexedDB / localStorage immediately
   */
  async getCachedPoems(): Promise<Poem[]> {
    const cached = await idbService.getPoems();
    if (cached && cached.length > 0) {
      return (cached as Poem[]).sort((a, b) => a.id - b.id);
    }
    const local = this.getQuizLibrary();
    if (local && local.length > 0) {
      idbService.savePoems(local);
      return local;
    }
    return [];
  },

  async getPoems(): Promise<Poem[]> {
    const cached = await this.getCachedPoems();
    if (cached.length > 0) {
      return cached;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/blg/poems`);
      if (res.ok) {
        const data = await res.json() as { poems?: Poem[] };
        if (data.poems && Array.isArray(data.poems) && data.poems.length > 0) {
          const poems = [...data.poems].sort((a, b) => a.id - b.id);
          this.saveQuizLibrary(poems);
          await idbService.savePoems(poems);
          return poems;
        }
      }
    } catch (e) {
      console.warn('Remote API unavailable, using local quiz library.', e);
    }
    return this.getQuizLibrary();
  },

  /**
   * Check remote API for poem/question changes compared to current local cache
   */
  async checkRemotePoemChanges(): Promise<{ hasChanges: boolean; remotePoems: Poem[]; diffSummary: string[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blg/poems`);
      if (!res.ok) return { hasChanges: false, remotePoems: [], diffSummary: [] };
      const data = await res.json() as { poems?: Poem[] };
      if (!data.poems || !Array.isArray(data.poems)) return { hasChanges: false, remotePoems: [], diffSummary: [] };

      const remotePoems = [...data.poems].sort((a, b) => a.id - b.id);
      const localPoems = await this.getCachedPoems();

      if (localPoems.length === 0 && remotePoems.length > 0) {
        return {
          hasChanges: true,
          remotePoems,
          diffSummary: [`新增 ${remotePoems.length} 首古诗云端题库数据`]
        };
      }

      const localMap = new Map(localPoems.map(p => [p.id, p]));
      const diffSummary: string[] = [];

      for (const rp of remotePoems) {
        const lp = localMap.get(rp.id);
        if (!lp) {
          diffSummary.push(`新增古诗 #${rp.id} 《${rp.title}》 (${rp.questions?.length || 0} 道题)`);
        } else {
          const lqCount = lp.questions?.length || 0;
          const rqCount = rp.questions?.length || 0;
          if (lqCount !== rqCount) {
            diffSummary.push(`古诗 #${rp.id} 《${rp.title}》: 题目数变动 (${lqCount} 题 ➔ ${rqCount} 题)`);
          } else if (JSON.stringify(lp.questions) !== JSON.stringify(rp.questions)) {
            diffSummary.push(`古诗 #${rp.id} 《${rp.title}》: 题目内容更新`);
          }
        }
      }

      return {
        hasChanges: diffSummary.length > 0,
        remotePoems,
        diffSummary
      };
    } catch (e) {
      console.warn('Failed to check remote poem changes:', e);
      return { hasChanges: false, remotePoems: [], diffSummary: [] };
    }
  },

  /**
   * Apply remote poem changes to IndexedDB and localStorage
   */
  async applyRemotePoems(poems: Poem[]): Promise<void> {
    this.saveQuizLibrary(poems);
    await idbService.savePoems(poems);
    window.dispatchEvent(new CustomEvent('zxt_poems_updated', { detail: { poems } }));
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
