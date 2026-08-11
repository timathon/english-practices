// Sync Task Queue Manager for ZXT Web
// Handles background API calls with LocalStorage queue and exponential backoff retry.

export interface SyncTask {
  id: string;
  type: 'MARK_ASSIGNMENT_COMPLETED' | 'RECORD_QUIZ_RESULT';
  payload: any;
  createdAt: number;
  retries: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed';
}

const QUEUE_STORAGE_KEY = 'zxt_sync_queue';
const LISTENERS: Array<() => void> = [];

export const getSyncQueue = (): SyncTask[] => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse sync queue:', e);
    return [];
  }
};

const saveSyncQueue = (queue: SyncTask[]) => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyListeners();
  } catch (e) {
    console.error('Failed to save sync queue:', e);
  }
};

export const subscribeSyncQueue = (listener: () => void) => {
  LISTENERS.push(listener);
  return () => {
    const idx = LISTENERS.indexOf(listener);
    if (idx !== -1) LISTENERS.splice(idx, 1);
  };
};

const notifyListeners = () => {
  LISTENERS.forEach(l => l());
};

export const enqueueSyncTask = (type: SyncTask['type'], payload: any): SyncTask => {
  const queue = getSyncQueue();
  
  // Deduplicate queued tasks by unique identifier
  const recordId = payload?.result?.recordId || payload?.asgnId || payload?.recordId;
  if (recordId) {
    const existing = queue.find(t => {
      const existingId = t.payload?.result?.recordId || t.payload?.asgnId || t.payload?.recordId;
      return t.type === type && existingId === recordId;
    });
    if (existing) {
      return existing;
    }
  }

  const task: SyncTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
    status: 'pending',
  };
  queue.push(task);
  saveSyncQueue(queue);
  return task;
};

export const removeSyncTask = (taskId: string) => {
  const queue = getSyncQueue().filter(t => t.id !== taskId);
  saveSyncQueue(queue);
};

export const clearSyncQueue = () => {
  saveSyncQueue([]);
};
