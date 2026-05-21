export interface PracticeRecord {
  id: string;
  userId: string;
  unit: string;
  score: number;
  unfinished: boolean;
  createdAt: string;
  updatedAt: string;
}

let practicesCache: any[] | null = null;
let recordsCache: PracticeRecord[] | null = null;

export const cache = {
  getPractices: () => practicesCache,
  setPractices: (data: any[]) => {
    practicesCache = data;
  },
  getRecords: () => recordsCache,
  setRecords: (data: PracticeRecord[]) => {
    recordsCache = data;
  },
  updateRecord: (newRecord: Partial<PracticeRecord> & { id: string }) => {
    if (!recordsCache) return;
    const index = recordsCache.findIndex(r => r.id === newRecord.id);
    if (index !== -1) {
      recordsCache[index] = { ...recordsCache[index], ...newRecord } as PracticeRecord;
    } else {
      // If it's a new record, add it to the front (since records are sorted desc by default)
      recordsCache.unshift(newRecord as PracticeRecord);
    }
  },
  clear: () => {
    practicesCache = null;
    recordsCache = null;
  }
};
