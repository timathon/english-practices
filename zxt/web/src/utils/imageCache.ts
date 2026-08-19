/**
 * Image Caching Utility (IndexedDB Storage Engine) & R2 URL Resolver
 * 
 * Primary R2 Base URL: https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/zxt/blg
 */

export const R2_PUBLIC_BASE = 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev/zxt/blg';
const DB_NAME = 'zxt_image_cache_db';
const STORE_NAME = 'image_blobs';
// Bump DB_VERSION to 2 to automatically drop stale cached images from previous builds
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Clean up legacy base64 image strings from localStorage to reclaim localStorage space.
 */
export function clearLegacyLocalStorageImageCache() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('img_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Failed to clean up legacy localStorage image cache:', e);
  }
}

// Auto-run cleanup on module initialization
clearLegacyLocalStorageImageCache();

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked by another tab. Please close other tabs of this app.');
    };
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        // Clear old store on version upgrade to fetch fresh images
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      resolve(null);
    };
  });
  return dbPromise;
}

// Current asset build hash/version for images
export const IMAGE_BUILD_VERSION = '20260819_v3';

/**
 * Resolves any legacy local asset path or filename to a full R2 URL.
 */
export function getR2ImageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }
  const filename = pathOrUrl.split('/').pop() || pathOrUrl;
  return `${R2_PUBLIC_BASE}/${filename}?v=${IMAGE_BUILD_VERSION}`;
}

/**
 * Fetches an image, caches it as a Blob inside IndexedDB, and returns an ObjectURL.
 * If forceRefresh is true, bypasses the cache, fetches the latest from R2, and updates IndexedDB.
 */
export async function getCachedImageUrl(pathOrUrl: string, forceRefresh = false): Promise<string> {
  const targetUrl = getR2ImageUrl(pathOrUrl);
  if (!targetUrl) return '';

  if (targetUrl.startsWith('data:')) {
    return targetUrl;
  }

  try {
    const db = await openDB();

    // 1. Check IndexedDB if not forcing refresh
    if (db && !forceRefresh) {
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
    }

    // 2. Fetch fresh image from network
    const fetchUrl = forceRefresh ? `${targetUrl}?_t=${Date.now()}` : targetUrl;
    const response = await fetch(fetchUrl);
    if (!response.ok) return targetUrl;
    const blob = await response.blob();

    // 3. Store Blob in IndexedDB
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(blob, targetUrl);
      } catch (err) {
        console.warn('Failed to store image Blob in IndexedDB:', err);
      }
    }

    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Failed to fetch/cache image in IndexedDB:', err);
    return targetUrl;
  }
}

/**
 * Completely clears the IndexedDB image cache and reloads database connection.
 */
export async function clearAllImageCache(): Promise<void> {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
    }
  } catch (err) {
    console.warn('Failed to clear IndexedDB image cache:', err);
  }
}

/**
 * Invalidate a specific image from the cache by URL or filename (e.g. "p8_l4.webp").
 */
export async function invalidateImageCache(pathOrUrl: string): Promise<void> {
  const targetUrl = getR2ImageUrl(pathOrUrl);
  if (!targetUrl) return;
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(targetUrl);
    }
  } catch (err) {
    console.warn(`Failed to invalidate cache for ${targetUrl}:`, err);
  }
}

/**
 * Pre-cache all images associated with a poem into IndexedDB.
 */
export async function preCachePoemImages(poem: { lines?: { image?: string }[]; questions?: any[] }) {
  const urlsToCache: string[] = [];
  if (poem.lines) {
    poem.lines.forEach(l => {
      if (l.image) urlsToCache.push(l.image);
    });
  }
  if (poem.questions) {
    poem.questions.forEach(q => {
      if (q.type === 'ImageToLine' && q.image) urlsToCache.push(q.image);
      if (q.type === 'ImageOrdering' && Array.isArray(q.images)) urlsToCache.push(...q.images);
    });
  }
  await Promise.all(urlsToCache.map(url => getCachedImageUrl(url)));
}

// Expose cache utilities to window in browser environments for easy trigger/inspection
if (typeof window !== 'undefined') {
  (window as any).__zxtClearImageCache = clearAllImageCache;
  (window as any).__zxtInvalidateImage = invalidateImageCache;
}
