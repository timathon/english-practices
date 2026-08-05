export interface PracticeRecord {
  id: string;
  userId: string;
  unit: string;
  score: number;
  unfinished: boolean;
  createdAt: string;
  updatedAt: string;
}

const RECORDS_CACHE_KEY = 'epv2_records_cache';
const PENDING_SYNCS_KEY = 'epv2_pending_record_syncs';

export interface PendingRecordSync {
  tempId: string;
  recordId: string | null;
  unit: string;
  score: number;
  unfinished: boolean;
  timestamp: string;
}

let practicesCache: any[] | null = null;
let recordsCache: PracticeRecord[] | null = null;

try {
  const localSaved = localStorage.getItem(RECORDS_CACHE_KEY);
  if (localSaved) {
    recordsCache = JSON.parse(localSaved);
  }
} catch (e) {}

export const cache = {
  getPractices: () => practicesCache,
  setPractices: (data: any[]) => {
    practicesCache = data;
  },
  getRecords: (): PracticeRecord[] | null => {
    if (!recordsCache) {
      try {
        const localSaved = localStorage.getItem(RECORDS_CACHE_KEY);
        if (localSaved) recordsCache = JSON.parse(localSaved);
      } catch (e) {}
    }
    return recordsCache;
  },
  setRecords: (data: PracticeRecord[]) => {
    recordsCache = data;
    try {
      localStorage.setItem(RECORDS_CACHE_KEY, JSON.stringify(data));
    } catch (e) {}
  },
  updateRecord: (newRecord: Partial<PracticeRecord> & { id: string }) => {
    if (!recordsCache) recordsCache = [];
    const index = recordsCache.findIndex(r => r.id === newRecord.id);
    if (index !== -1) {
      recordsCache[index] = { ...recordsCache[index], ...newRecord } as PracticeRecord;
    } else {
      recordsCache.unshift(newRecord as PracticeRecord);
    }
    try {
      localStorage.setItem(RECORDS_CACHE_KEY, JSON.stringify(recordsCache));
    } catch (e) {}
  },
  getPendingSyncs: (): PendingRecordSync[] => {
    try {
      const item = localStorage.getItem(PENDING_SYNCS_KEY);
      return item ? JSON.parse(item) : [];
    } catch (e) {
      return [];
    }
  },
  addPendingSync: (syncItem: PendingRecordSync) => {
    const list = cache.getPendingSyncs();
    const existingIndex = list.findIndex(item => (syncItem.recordId && item.recordId === syncItem.recordId) || item.tempId === syncItem.tempId);
    if (existingIndex !== -1) {
      list[existingIndex] = { ...list[existingIndex], ...syncItem };
    } else {
      list.push(syncItem);
    }
    try {
      localStorage.setItem(PENDING_SYNCS_KEY, JSON.stringify(list));
    } catch (e) {}
  },
  removePendingSync: (tempIdOrRecordId: string) => {
    const list = cache.getPendingSyncs().filter(item => item.tempId !== tempIdOrRecordId && item.recordId !== tempIdOrRecordId);
    try {
      localStorage.setItem(PENDING_SYNCS_KEY, JSON.stringify(list));
    } catch (e) {}
  },
  clear: () => {
    practicesCache = null;
    recordsCache = null;
    try {
      localStorage.removeItem(RECORDS_CACHE_KEY);
    } catch (e) {}
  }
};

