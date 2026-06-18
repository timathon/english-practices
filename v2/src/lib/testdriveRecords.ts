
export interface PracticeRecord {
    id: string;
    userId: string;
    unit: string;
    score: number;
    unfinished: boolean;
    createdAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'test0_local_records';

export const testdriveRecords = {
    getAll: (): PracticeRecord[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load local testdrive records', e);
            return [];
        }
    },
    
    save: (record: Partial<PracticeRecord>): string => {
        const records = testdriveRecords.getAll();
        const id = record.id || Math.random().toString(36).substring(2, 10);
        const now = new Date().toISOString();
        
        const existingIndex = records.findIndex(r => r.id === id);
        if (existingIndex !== -1) {
            records[existingIndex] = {
                ...records[existingIndex],
                ...record,
                updatedAt: now
            } as PracticeRecord;
        } else {
            records.unshift({
                id,
                userId: 'test0',
                unit: record.unit || '',
                score: record.score || 0,
                unfinished: record.unfinished ?? false,
                createdAt: now,
                updatedAt: now
            } as PracticeRecord);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return id;
    }
};
