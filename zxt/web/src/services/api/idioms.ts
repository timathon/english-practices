import { IdiomGroup, IdiomQuestion } from './types';
import { API_BASE_URL, getAuthHeaders } from './config';
import { idbService } from '../db';

const LOCAL_STORAGE_KEY = 'zxt_idiom_groups';

export const idiomsService = {
  /**
   * Fetch all idiom groups: checks IndexedDB -> localStorage -> Remote D1
   */
  async getIdiomGroups(): Promise<IdiomGroup[]> {
    // 1. IndexedDB First
    const cached = await idbService.getIdiomGroups();
    if (cached && cached.length > 0) {
      return (cached as IdiomGroup[]).sort((a, b) => a.id - b.id);
    }

    // 2. LocalStorage Fallback
    const local = this.getLocalIdiomGroups();
    if (local && local.length > 0) {
      idbService.saveIdiomGroups(local);
      return local;
    }

    // 3. Remote API
    try {
      const res = await fetch(`${API_BASE_URL}/api/idioms/groups`);
      if (res.ok) {
        const data = await res.json() as { groups?: IdiomGroup[] };
        if (data.groups && Array.isArray(data.groups)) {
          const groups = [...data.groups].sort((a, b) => a.id - b.id);
          this.saveLocalIdiomGroups(groups);
          await idbService.saveIdiomGroups(groups);
          return groups;
        }
      }
    } catch (e) {
      console.warn('Remote API unavailable, using local idiom library.', e);
    }

    return this.getLocalIdiomGroups();
  },

  getLocalIdiomGroups(): IdiomGroup[] {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];
    try {
      const groups = JSON.parse(stored);
      return Array.isArray(groups) ? groups.sort((a, b) => a.id - b.id) : [];
    } catch (e) {
      return [];
    }
  },

  saveLocalIdiomGroups(groups: IdiomGroup[]) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(groups));
  },

  /**
   * Save questions for a specific idiom group
   */
  async saveIdiomQuestions(groupId: number, questions: IdiomQuestion[]): Promise<void> {
    const groups = this.getLocalIdiomGroups();
    const updated = groups.map(g => g.id === groupId ? { ...g, questions } : g);
    this.saveLocalIdiomGroups(updated);

    const targetGroup = updated.find(g => g.id === groupId);
    if (targetGroup) {
      await idbService.saveIdiomGroup(targetGroup);
    }

    localStorage.setItem(`zxt_questions_idiom_group_${groupId}`, JSON.stringify(questions));

    // Remote D1 background write
    fetch(`${API_BASE_URL}/api/idioms/groups/${groupId}/questions`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questions }),
    }).catch(e => console.warn('Failed to save idiom questions to remote D1:', e));
  },

  getIdiomGroupQuestions(groupId: number): IdiomQuestion[] | null {
    const groups = this.getLocalIdiomGroups();
    const group = groups.find(g => g.id === groupId);
    return group?.questions ?? null;
  }
};
