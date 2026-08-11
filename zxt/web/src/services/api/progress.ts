import { API_BASE_URL, USE_BACKEND, getAuthHeaders } from './config';

export const progressService = {
  getLearntPoemIdsSync(className: string = '三年级A班'): number[] {
    const defaultLearnt = [1, 2, 3, 4, 9, 17, 69];
    const stored = localStorage.getItem(`zxt_learnt_${className}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(Number);
        }
      } catch (_) {}
    }
    return defaultLearnt;
  },

  async getLearntPoemIds(className: string = '三年级A班'): Promise<number[]> {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}/progress`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.learntPoemIds && Array.isArray(data.learntPoemIds) && data.learntPoemIds.length > 0) {
            const numIds = data.learntPoemIds.map(Number);
            localStorage.setItem(`zxt_learnt_${className}`, JSON.stringify(numIds));
            return numIds;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch class progress from DB:', err);
      }
    }
    return this.getLearntPoemIdsSync(className);
  },

  async saveLearntPoemIdsToDB(className: string, learntPoemIds: number[], timeoutMs = 30000): Promise<boolean> {
    if (!USE_BACKEND) return true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}/progress`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ learntPoemIds }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return true;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('网络连接超时 (30秒)，已放弃云端同步');
      }
      throw err;
    }
  },

  async togglePoemLearntStatus(className: string, poemId: number): Promise<number[]> {
    const current = this.getLearntPoemIdsSync(className);
    let updated: number[];
    if (current.includes(poemId)) {
      updated = current.filter(id => id !== poemId);
    } else {
      updated = [...current, poemId];
    }
    localStorage.setItem(`zxt_learnt_${className}`, JSON.stringify(updated));
    await this.saveLearntPoemIdsToDB(className, updated, 30000);
    return updated;
  }
};
