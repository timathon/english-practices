import { IdiomGroup, IdiomQuestion } from './types';
import { API_BASE_URL, getAuthHeaders } from './config';
import { idbService } from '../db';

const LOCAL_STORAGE_KEY = 'zxt_idiom_groups';

export const idiomsService = {
  /**
   * Fast load: returns cached groups from IndexedDB / localStorage immediately
   */
  async getCachedIdiomGroups(): Promise<IdiomGroup[]> {
    const cached = await idbService.getIdiomGroups();
    if (cached && cached.length > 0) {
      return (cached as IdiomGroup[]).sort((a, b) => a.id - b.id);
    }
    const local = this.getLocalIdiomGroups();
    if (local && local.length > 0) {
      idbService.saveIdiomGroups(local);
      return local;
    }
    return [];
  },

  /**
   * Fetch all idiom groups: loads from IndexedDB/localStorage first, then queries remote in background
   */
  async getIdiomGroups(): Promise<IdiomGroup[]> {
    const cached = await this.getCachedIdiomGroups();
    if (cached.length > 0) {
      return cached;
    }

    // If cache empty, fetch remote
    try {
      const res = await fetch(`${API_BASE_URL}/api/idioms/groups`);
      if (res.ok) {
        const data = await res.json() as { groups?: IdiomGroup[] };
        if (data.groups && Array.isArray(data.groups) && data.groups.length > 0) {
          const groups = [...data.groups].sort((a, b) => a.id - b.id);
          this.saveLocalIdiomGroups(groups);
          await idbService.saveIdiomGroups(groups);
          return groups;
        }
      }
    } catch (e) {
      console.warn('Remote API unavailable, checking local idiom cache.', e);
    }

    return [];
  },

  /**
   * Check remote API for changes compared to current local cache
   */
  async checkRemoteIdiomChanges(): Promise<{ hasChanges: boolean; remoteGroups: IdiomGroup[]; diffSummary: string[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/idioms/groups`);
      if (!res.ok) return { hasChanges: false, remoteGroups: [], diffSummary: [] };
      const data = await res.json() as { groups?: IdiomGroup[] };
      if (!data.groups || !Array.isArray(data.groups)) return { hasChanges: false, remoteGroups: [], diffSummary: [] };

      const remoteGroups = [...data.groups].sort((a, b) => a.id - b.id);
      const localGroups = await this.getCachedIdiomGroups();

      if (localGroups.length === 0 && remoteGroups.length > 0) {
        return {
          hasChanges: true,
          remoteGroups,
          diffSummary: [`新增 ${remoteGroups.length} 个成语组云端题库数据`]
        };
      }

      const localMap = new Map(localGroups.map(g => [g.id, g]));
      const diffSummary: string[] = [];

      for (const rg of remoteGroups) {
        const lg = localMap.get(rg.id);
        if (!lg) {
          diffSummary.push(`新增成语组 #${rg.id} 《${rg.title}》 (${rg.questions?.length || 0} 道题)`);
        } else {
          const lqCount = lg.questions?.length || 0;
          const rqCount = rg.questions?.length || 0;
          if (lqCount !== rqCount) {
            diffSummary.push(`成语组 #${rg.id} 《${rg.title}》: 题目数变动 (${lqCount} 题 ➔ ${rqCount} 题)`);
          } else if (JSON.stringify(lg.questions) !== JSON.stringify(rg.questions)) {
            diffSummary.push(`成语组 #${rg.id} 《${rg.title}》: 题目内容更新`);
          }
        }
      }

      return {
        hasChanges: diffSummary.length > 0,
        remoteGroups,
        diffSummary
      };
    } catch (e) {
      console.warn('Failed to check remote idiom changes:', e);
      return { hasChanges: false, remoteGroups: [], diffSummary: [] };
    }
  },

  /**
   * Apply remote idiom changes to IndexedDB and localStorage
   */
  async applyRemoteIdiomGroups(groups: IdiomGroup[]): Promise<void> {
    this.saveLocalIdiomGroups(groups);
    await idbService.saveIdiomGroups(groups);
    window.dispatchEvent(new CustomEvent('zxt_idiom_groups_updated', { detail: { groups } }));
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
