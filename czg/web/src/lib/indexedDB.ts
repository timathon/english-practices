/**
 * Lightweight IndexedDB wrapper for CZG user progress & offline diagnosis records.
 * Zero external dependencies.
 */

const DB_NAME = "czg_client_db";
const DB_VERSION = 1;

export interface OfflineDiagnosisRecord {
  id: string;
  textbookId: string;
  chapter: string;
  sectionNumber: string;
  targetTopicId: string;
  status: string;
  rootCauses: string[];
  history: any[];
  masteryUpdates?: { topicId: string; level: string }[];
  synced: boolean;
  createdAt: number;
}

export interface CachedMastery {
  textbookId: string;
  topicId: string;
  level: string;
  updatedAt: number;
}

class LocalStorageDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        return reject(new Error("IndexedDB not supported"));
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("diagnosis_records")) {
          const store = db.createObjectStore("diagnosis_records", { keyPath: "id" });
          store.createIndex("synced", "synced", { unique: false });
        }
        if (!db.objectStoreNames.contains("mastery")) {
          db.createObjectStore("mastery", { keyPath: ["textbookId", "topicId"] });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  // Save or update local diagnosis record
  async saveDiagnosisRecord(record: OfflineDiagnosisRecord): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("diagnosis_records", "readwrite");
      tx.objectStore("diagnosis_records").put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Get all unsynced records to upload when online/login
  async getUnsyncedRecords(): Promise<OfflineDiagnosisRecord[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("diagnosis_records", "readonly");
      const store = tx.objectStore("diagnosis_records");
      const index = store.index("synced");
      const req = index.getAll(IDBKeyRange.only(false));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Mark records as synced
  async markRecordsSynced(ids: string[]): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("diagnosis_records", "readwrite");
      const store = tx.objectStore("diagnosis_records");
      ids.forEach((id) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            getReq.result.synced = true;
            store.put(getReq.result);
          }
        };
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Save mastery map locally
  async saveMasteryMap(textbookId: string, map: Record<string, string>): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("mastery", "readwrite");
      const store = tx.objectStore("mastery");
      const now = Date.now();
      Object.entries(map).forEach(([topicId, level]) => {
        store.put({ textbookId, topicId, level, updatedAt: now });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Load cached mastery map
  async loadMasteryMap(textbookId: string): Promise<Record<string, string>> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("mastery", "readonly");
        const store = tx.objectStore("mastery");
        const req = store.getAll();
        req.onsuccess = () => {
          const map: Record<string, string> = {};
          (req.result as CachedMastery[] || []).forEach((row) => {
            if (row.textbookId === textbookId) {
              map[row.topicId] = row.level;
            }
          });
          resolve(map);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return {};
    }
  }
}

export const localDB = new LocalStorageDB();
