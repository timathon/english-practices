// IndexedDB Service for ZXT App Local Caching

const DB_NAME = 'ZXT_IndexedDB';
const DB_VERSION = 1;
const STORE_LIST = 'quiz_history_list';
const STORE_DETAILS = 'quiz_history_details';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_LIST)) {
        db.createObjectStore(STORE_LIST, { keyPath: 'studentId' });
      }
      if (!db.objectStoreNames.contains(STORE_DETAILS)) {
        db.createObjectStore(STORE_DETAILS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export const idbService = {
  /**
   * Get cached quiz history list from IndexedDB
   */
  async getHistoryList(studentId: string = 'usr_stu_001'): Promise<any[] | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_LIST, 'readonly');
        const store = tx.objectStore(STORE_LIST);
        const req = store.get(studentId);
        req.onsuccess = () => {
          resolve(req.result ? req.result.history : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  },

  /**
   * Save quiz history list to IndexedDB
   */
  async saveHistoryList(studentId: string = 'usr_stu_001', history: any[]): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_LIST, 'readwrite');
      const store = tx.objectStore(STORE_LIST);
      store.put({ studentId, history, updatedAt: Date.now() });
    } catch (_) {}
  },

  /**
   * Get cached quiz detail item from IndexedDB by history ID
   */
  async getHistoryDetail(id: string): Promise<any | null> {
    if (!id) return null;
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_DETAILS, 'readonly');
        const store = tx.objectStore(STORE_DETAILS);
        const req = store.get(id);
        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  },

  /**
   * Save single quiz history detail item to IndexedDB
   */
  async saveHistoryDetail(detailItem: any): Promise<void> {
    if (!detailItem || !detailItem.id) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_DETAILS, 'readwrite');
      const store = tx.objectStore(STORE_DETAILS);
      store.put({
        ...detailItem,
        updatedAt: Date.now()
      });
    } catch (_) {}
  }
};
