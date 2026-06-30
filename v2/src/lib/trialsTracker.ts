const DAILY_LIMIT = 5;

function getTodayString() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

export function getActiveUserId(): string {
    try {
        const activeToken = localStorage.getItem('active_session_token');
        if (!activeToken) return 'default';
        const loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
        const currentUser = loggedInUsers.find((u: any) => u.token === activeToken);
        return currentUser ? currentUser.userId : 'default';
    } catch {
        return 'default';
    }
}

export const trialsTracker = {
    getConsumedTrials(practiceId: string, challengeId: string): number {
        try {
            const todayStr = getTodayString();
            const userId = getActiveUserId();
            const storageKey = `ep-trials-${userId}`;
            const stored = localStorage.getItem(storageKey);
            if (!stored) return 0;
            const data = JSON.parse(stored);
            if (!data[todayStr]) return 0;
            
            const key = `${practiceId}_${challengeId}`;
            return data[todayStr][key] || 0;
        } catch {
            return 0;
        }
    },
    
    getRemainingTrials(practiceId: string, challengeId: string): number {
        return Math.max(0, DAILY_LIMIT - this.getConsumedTrials(practiceId, challengeId));
    },

    consumeTrial(practiceId: string, challengeId: string): boolean {
        try {
            const todayStr = getTodayString();
            const userId = getActiveUserId();
            const storageKey = `ep-trials-${userId}`;
            const stored = localStorage.getItem(storageKey);
            let data: Record<string, Record<string, number>> = {};
            
            if (stored) {
                data = JSON.parse(stored);
            }
            
            // Wipe old days to save local storage memory
            Object.keys(data).forEach(key => {
                if (key !== todayStr) delete data[key];
            });

            if (!data[todayStr]) {
                data[todayStr] = {};
            }

            const key = `${practiceId}_${challengeId}`;
            const consumed = data[todayStr][key] || 0;
            
            if (consumed >= DAILY_LIMIT) {
                return false; // Cannot consume!
            }

            data[todayStr][key] = consumed + 1;
            localStorage.setItem(storageKey, JSON.stringify(data));
            return true;
        } catch {
            return false;
        }
    },

    resetTrials(practiceId: string, challengeId: string): void {
        try {
            const todayStr = getTodayString();
            const userId = getActiveUserId();
            const storageKey = `ep-trials-${userId}`;
            const stored = localStorage.getItem(storageKey);
            if (!stored) return;
            const data = JSON.parse(stored);
            if (!data[todayStr]) return;
            
            const key = `${practiceId}_${challengeId}`;
            delete data[todayStr][key];
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {}
    }
};

