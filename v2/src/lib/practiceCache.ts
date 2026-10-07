class PracticeCache {
    name = 'ep-practice-cache'
    version = 1
    instance: IDBDatabase | null = null
    private memCache = new Map<string, any>()
    private inFlightGets = new Map<string, Promise<any>>()

    open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (this.instance) return resolve(this.instance)
            const request = indexedDB.open(this.name, this.version)
            
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result as IDBDatabase
                if (!db.objectStoreNames.contains('practices')) {
                    db.createObjectStore('practices', { keyPath: 'id' })
                }
            }
            
            request.onsuccess = (e: any) => {
                this.instance = e.target.result as IDBDatabase
                resolve(this.instance)
            }
            
            request.onerror = (e) => reject(e)
        })
    }

    getSync(id: string): any {
        return this.memCache.get(id) || null
    }

    async get(id: string): Promise<any> {
        if (this.memCache.has(id)) {
            return this.memCache.get(id)
        }
        if (this.inFlightGets.has(id)) {
            return this.inFlightGets.get(id)
        }

        const promise = (async () => {
            try {
                const db = await this.open()
                const data = await new Promise<any>((resolve) => {
                    const transaction = db.transaction('practices', 'readonly')
                    const store = transaction.objectStore('practices')
                    const request = store.get(id)
                    request.onsuccess = () => resolve(request.result?.data || null)
                    request.onerror = () => resolve(null)
                })
                if (data) {
                    this.memCache.set(id, data)
                }
                return data
            } catch (err) {
                console.warn('PracticeCache get error:', err)
                return null
            } finally {
                this.inFlightGets.delete(id)
            }
        })()

        this.inFlightGets.set(id, promise)
        return promise
    }

    async set(id: string, data: any): Promise<boolean> {
        this.memCache.set(id, data)
        try {
            const db = await this.open()
            return new Promise((resolve) => {
                const transaction = db.transaction('practices', 'readwrite')
                const store = transaction.objectStore('practices')
                store.put({ id, data, timestamp: Date.now() })
                transaction.oncomplete = () => resolve(true)
                transaction.onerror = () => resolve(false)
            })
        } catch (err) {
            console.warn('PracticeCache set error:', err)
            return false
        }
    }
}

export const practiceCache = new PracticeCache()

