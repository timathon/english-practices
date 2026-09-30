/**
 * Simple, robust IndexedDB wrapper for TTS Studio.
 * Handles storage of History Lists, Audio Buffers/Blobs, and Settings without 5MB localStorage limits.
 */

const DB_NAME = 'TTS_Studio_DB';
const DB_VERSION = 1;

export interface HistoryRecord {
  id: string;
  name: string;
  book: string;
  timestamp: number;
  itemCount: number;
  rawInput: string;
  ttsOverrides?: Record<string, string>;
  timestamps?: Record<string, { start: number; end: number }>;
  selectedMap?: Record<string, boolean>;
}

export interface SettingRecord {
  key: string;
  value: any;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;

        // Store for History items
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for App Settings / Config
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

// History Records
export async function getAllHistory(): Promise<HistoryRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const req = store.getAll();

      req.onsuccess = () => {
        const items: HistoryRecord[] = req.result || [];
        // Sort descending by timestamp
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveHistory(item: HistoryRecord): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteHistory(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Settings KV
export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : defaultValue);
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * One-time migration helper from localStorage to IndexedDB if localStorage has existing items
 */
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    const rawHistory = localStorage.getItem('tts_history_lists');
    if (rawHistory) {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          await saveHistory(item);
        }
        localStorage.removeItem('tts_history_lists');
      }
    }
  } catch {}
}
