class PracticeCache {
    name = 'ep-practice-cache'
    version = 1
    instance: IDBDatabase | null = null

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

    async get(id: string): Promise<any> {
        const db = await this.open()
        return new Promise((resolve) => {
            const transaction = db.transaction('practices', 'readonly')
            const store = transaction.objectStore('practices')
            const request = store.get(id)
            request.onsuccess = () => resolve(request.result?.data || null)
            request.onerror = () => resolve(null)
        })
    }

    async set(id: string, data: any): Promise<boolean> {
        const db = await this.open()
        return new Promise((resolve) => {
            const transaction = db.transaction('practices', 'readwrite')
            const store = transaction.objectStore('practices')
            store.put({ id, data, timestamp: Date.now() })
            transaction.oncomplete = () => resolve(true)
            transaction.onerror = () => resolve(false)
        })
    }
}

export const practiceCache = new PracticeCache()
