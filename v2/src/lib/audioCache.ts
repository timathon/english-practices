import md5 from 'md5'

function getHash(str: string) {
    return md5(str)
}

class AudioCache {
    name = 'ep-audio-cache'
    version = 1
    instance: IDBDatabase | null = null

    open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (this.instance) return resolve(this.instance)
            const request = indexedDB.open(this.name, this.version)
            
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result as IDBDatabase
                if (!db.objectStoreNames.contains('audio')) {
                    db.createObjectStore('audio', { keyPath: 'id' })
                }
            }
            
            request.onsuccess = (e: any) => {
                this.instance = e.target.result as IDBDatabase
                resolve(this.instance)
            }
            
            request.onerror = (e) => reject(e)
        })
    }

    async get(id: string): Promise<any> {
        const db = await this.open()
        return new Promise((resolve) => {
            const transaction = db.transaction('audio', 'readonly')
            const store = transaction.objectStore('audio')
            const request = store.get(id)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => resolve(null)
        })
    }

    async set(id: string, blob: Blob, meta: any): Promise<boolean> {
        const db = await this.open()
        return new Promise((resolve) => {
            const transaction = db.transaction('audio', 'readwrite')
            const store = transaction.objectStore('audio')
            store.put({ id, blob, meta, timestamp: Date.now() })
            transaction.oncomplete = () => resolve(true)
            transaction.onerror = () => resolve(false)
        })
    }

    async cacheAudio(url: string | undefined | null, force = false): Promise<Blob | null> {
        if (!url) return null;
        const baseUrl = url.split('?')[0];
        const baseHash = getHash(baseUrl);
        const cacheKey = "ep-audio-" + baseHash;
        
        if (!force) {
            const cached = await this.get(cacheKey);
            if (cached && cached.blob) return cached.blob;
        }

        try {
            const fetchUrl = force ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : url;
            const resp = await fetch(fetchUrl);
            if (!resp.ok) return null;
            const contentType = resp.headers.get('Content-Type');
            if (!contentType || !contentType.startsWith('audio/')) return null;
            const lastModified = resp.headers.get('Last-Modified');
            const blob = await resp.blob();
            const meta = lastModified ? { lastModified: new Date(lastModified).getTime() } : {};
            await this.set(cacheKey, blob, meta);
            return blob;
        } catch(e) { 
            console.error("Cache failed", e);
            return null;
        }
    }

    async preloadAndSync(url: string | undefined | null) {
        if (!url) return;
        const baseUrl = url.split('?')[0];
        const baseHash = getHash(baseUrl);
        const cacheKey = "ep-audio-" + baseHash;
        const cached = await this.get(cacheKey);
        
        const currentVersion = cached?.meta?.lastModified || 0;

        try {
            const headUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
            const response = await fetch(headUrl, { method: 'HEAD' });
            const lastModifiedStr = response.headers.get('Last-Modified');
            if (lastModifiedStr) {
                const lastModified = new Date(lastModifiedStr).getTime();
                if (lastModified > currentVersion) {
                    await this.cacheAudio(url, true);
                } else if (!cached) {
                    // Not in cache, fetch cleanly
                    await this.cacheAudio(url, false);
                }
            } else if (!cached) {
                await this.cacheAudio(url, false);
            }
        } catch (e) {
            console.error(`Failed to check/preload audio for ${url}`, e);
        }
    }
}

export const audioCache = new AudioCache()
