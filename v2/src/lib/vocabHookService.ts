import { API_URL } from './auth';

export interface VocabHook {
  id: string;
  word: string;
  content: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string | number;
  updatedAt?: string | number;
}

// In-memory cache for word -> hooks
const hooksCache: Record<string, VocabHook[]> = {};

// LocalStorage key for user preference
const PREF_KEY_PREFIX = 'chosen_hook_pref_';

export function getSelectedHookId(word: string): string | null {
  try {
    return localStorage.getItem(`${PREF_KEY_PREFIX}${word.trim().toLowerCase()}`);
  } catch {
    return null;
  }
}

export function setSelectedHookId(word: string, hookId: string | null) {
  try {
    const key = `${PREF_KEY_PREFIX}${word.trim().toLowerCase()}`;
    if (!hookId || hookId === 'default') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, hookId);
    }
    // Dispatch custom event so all shells update instantly
    window.dispatchEvent(new CustomEvent('vocab-hook-selection-changed', {
      detail: { word: word.trim().toLowerCase(), hookId }
    }));
  } catch (e) {
    console.warn('Failed to save hook preference', e);
  }
}

/**
 * Fetch hooks for a list of words.
 * Returns a mapping of { [word: string]: VocabHook[] }
 */
export async function fetchVocabHooks(words: string[]): Promise<Record<string, VocabHook[]>> {
  const normalized = Array.from(
    new Set(words.map(w => w.trim().toLowerCase()).filter(Boolean))
  );

  if (normalized.length === 0) return {};

  // Check which words are missing from cache
  const missingWords = normalized.filter(w => !(w in hooksCache));
  if (missingWords.length === 0) {
    const result: Record<string, VocabHook[]> = {};
    for (const w of normalized) {
      result[w] = hooksCache[w] || [];
    }
    return result;
  }

  try {
    // Fetch in batches of 50 to avoid query string length limits
    const chunkSize = 50;
    for (let i = 0; i < missingWords.length; i += chunkSize) {
      const chunk = missingWords.slice(i, i + chunkSize);
      const res = await fetch(`${API_URL}/api/vocab-hooks?words=${encodeURIComponent(chunk.join(','))}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data: VocabHook[] = await res.json();
        // Initialize all words in the chunk as empty array first
        for (const w of chunk) {
          hooksCache[w] = [];
        }
        // Fill received items
        for (const item of data) {
          const w = item.word.toLowerCase();
          if (!hooksCache[w]) hooksCache[w] = [];
          hooksCache[w].push(item);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch vocab hooks', err);
  }

  const result: Record<string, VocabHook[]> = {};
  for (const w of normalized) {
    result[w] = hooksCache[w] || [];
  }
  return result;
}

export function getCachedHooksForWord(word: string): VocabHook[] {
  return hooksCache[word.trim().toLowerCase()] || [];
}

/**
 * Submit a new hook for a word
 */
export async function submitVocabHook(word: string, content: string): Promise<{ success: boolean; hook?: VocabHook; error?: string }> {
  try {
    const normalizedWord = word.trim().toLowerCase();
    const res = await fetch(`${API_URL}/api/vocab-hooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ word: normalizedWord, content: content.trim() })
    });

    const data = await res.json();
    if (res.ok && data.success && data.hook) {
      // Add to local cache immediately
      if (!hooksCache[normalizedWord]) {
        hooksCache[normalizedWord] = [];
      }
      hooksCache[normalizedWord].unshift(data.hook);

      // Automatically select the newly created hook for the user
      setSelectedHookId(normalizedWord, data.hook.id);

      window.dispatchEvent(new CustomEvent('vocab-hooks-updated', {
        detail: { word: normalizedWord, hook: data.hook }
      }));
      return { success: true, hook: data.hook };
    }
    return { success: false, error: data.error || 'Failed to submit' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * Admin: fetch pending/all hooks
 */
export async function fetchAdminHooks(status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'): Promise<VocabHook[]> {
  const res = await fetch(`${API_URL}/api/admin/vocab-hooks?status=${status}`, {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch admin hooks');
  return res.json();
}

/**
 * Admin: review a hook
 */
export async function reviewAdminHook(id: string, action: 'approve' | 'reject' | 'delete'): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/admin/vocab-hooks/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action })
  });
  return res.ok;
}
