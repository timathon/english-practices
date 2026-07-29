/**
 * Image Caching Utility (IndexedDB / LocalStorage) & R2 URL Resolver
 * 
 * Primary R2 Base URL: https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/zxt/blg
 */

export const R2_PUBLIC_BASE = 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/zxt/blg';
const DB_NAME = 'zxt_image_cache_db';
const STORE_NAME = 'image_blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

/**
 * Resolves any legacy local asset path or filename to a full R2 URL.
 * e.g. "/assets/blg/poems/p1_l1.webp" -> "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/zxt/blg/p1_l1.webp"
 */
export function getR2ImageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }
  const filename = pathOrUrl.split('/').pop() || pathOrUrl;
  return `${R2_PUBLIC_BASE}/${filename}`;
}

/**
 * Fetches an image, caches it in IndexedDB (or base64 localStorage fallback), and returns an ObjectURL or data URL.
 */
export async function getCachedImageUrl(pathOrUrl: string): Promise<string> {
  const targetUrl = getR2ImageUrl(pathOrUrl);
  if (!targetUrl) return '';

  try {
    const db = await openDB();

    // 1. Try IndexedDB
    if (db) {
      const cachedBlob = await new Promise<Blob | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(targetUrl);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (cachedBlob) {
        return URL.createObjectURL(cachedBlob);
      }
    } else {
      // Fallback: Check localStorage
      const cachedDataUrl = localStorage.getItem(`img_cache_${targetUrl}`);
      if (cachedDataUrl) {
        return cachedDataUrl;
      }
    }

    // 2. Fetch from network
    const response = await fetch(targetUrl);
    if (!response.ok) return targetUrl;
    const blob = await response.blob();

    // 3. Save to storage
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(blob, targetUrl);
      } catch (err) {
        console.warn('Failed to store blob in IndexedDB:', err);
      }
      return URL.createObjectURL(blob);
    } else {
      // LocalStorage fallback for small images
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          try {
            localStorage.setItem(`img_cache_${targetUrl}`, dataUrl);
          } catch {
            /* quota exceeded */
          }
          resolve(dataUrl);
        };
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('Failed to fetch/cache image:', err);
    return targetUrl;
  }
}
