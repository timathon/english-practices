// IndexedDB Service for ZXT App Local Caching

const DB_NAME = 'ZXT_IndexedDB';
const DB_VERSION = 3;
const STORE_LIST = 'quiz_history_list';
const STORE_DETAILS = 'quiz_history_details';
const STORE_IDIOM_GROUPS = 'idiom_groups';
const STORE_POEMS = 'poems';

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
      if (!db.objectStoreNames.contains(STORE_IDIOM_GROUPS)) {
        db.createObjectStore(STORE_IDIOM_GROUPS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_POEMS)) {
        db.createObjectStore(STORE_POEMS, { keyPath: 'id' });
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
  },

  /**
   * Get all cached idiom groups from IndexedDB
   */
  async getIdiomGroups(): Promise<any[] | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_IDIOM_GROUPS, 'readonly');
        const store = tx.objectStore(STORE_IDIOM_GROUPS);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve(req.result && req.result.length > 0 ? req.result : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  },

  /**
   * Save all idiom groups to IndexedDB
   */
  async saveIdiomGroups(groups: any[]): Promise<void> {
    if (!groups || groups.length === 0) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_IDIOM_GROUPS, 'readwrite');
      const store = tx.objectStore(STORE_IDIOM_GROUPS);
      for (const g of groups) {
        store.put(g);
      }
    } catch (_) {}
  },

  /**
   * Save a single idiom group to IndexedDB
   */
  async saveIdiomGroup(group: any): Promise<void> {
    if (!group || !group.id) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_IDIOM_GROUPS, 'readwrite');
      const store = tx.objectStore(STORE_IDIOM_GROUPS);
      store.put(group);
    } catch (_) {}
  },

  /**
   * Get all cached poems from IndexedDB
   */
  async getPoems(): Promise<any[] | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_POEMS, 'readonly');
        const store = tx.objectStore(STORE_POEMS);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve(req.result && req.result.length > 0 ? req.result : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  },

  /**
   * Save all poems to IndexedDB
   */
  async savePoems(poems: any[]): Promise<void> {
    if (!poems || poems.length === 0) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_POEMS, 'readwrite');
      const store = tx.objectStore(STORE_POEMS);
      for (const p of poems) {
        store.put(p);
      }
    } catch (_) {}
  },

  /**
   * Save a single poem to IndexedDB
   */
  async savePoem(poem: any): Promise<void> {
    if (!poem || !poem.id) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_POEMS, 'readwrite');
      const store = tx.objectStore(STORE_POEMS);
      store.put(poem);
    } catch (_) {}
  }
};

