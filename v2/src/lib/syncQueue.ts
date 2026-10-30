import { cache } from './cache';

export type SyncTaskType = 'record' | 'mistakes' | 'pet';

export interface SyncTask {
  id: string;
  type: SyncTaskType;
  userId?: string;
  token?: string;
  label: string;
  recordId: string | null;
  tempId: string;
  payload: any;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: number;
  lastError?: string;
}

const SYNC_TASKS_KEY = 'epv2_sync_tasks_v1';
const TEMP_ID_MAP_KEY = 'epv2_sync_temp_id_map_v1';
const LEGACY_PENDING_KEY = 'epv2_pending_record_syncs';

const FETCH_TIMEOUT_MS = 8000;
const RETRY_CHECK_INTERVAL_MS = 10000;

type Listener = () => void;
const listeners = new Set<Listener>();

let tasksMemory: SyncTask[] | null = null;
let tempIdToServerId: Record<string, string> = {};
let isProcessingQueue = false;
let storedOriginalFetch: typeof window.fetch | null = null;
let storedApiUrl: string = '';

try {
  const savedMap = localStorage.getItem(TEMP_ID_MAP_KEY);
  if (savedMap) {
    tempIdToServerId = JSON.parse(savedMap) || {};
  }
} catch (e) {}

function saveTempIdMap() {
  try {
    // Keep at most 200 recent mappings
    const keys = Object.keys(tempIdToServerId);
    if (keys.length > 200) {
      const trimmed: Record<string, string> = {};
      keys.slice(-200).forEach(k => {
        trimmed[k] = tempIdToServerId[k];
      });
      tempIdToServerId = trimmed;
    }
    localStorage.setItem(TEMP_ID_MAP_KEY, JSON.stringify(tempIdToServerId));
  } catch (e) {}
}

function getActiveUserContext(): { userId?: string; token?: string } {
  try {
    const token = localStorage.getItem('active_session_token') || undefined;
    const loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
    const current = Array.isArray(loggedInUsers)
      ? loggedInUsers.find((u: any) => u.token === token)
      : undefined;
    return { userId: current?.userId, token };
  } catch (e) {
    return {};
  }
}

export function formatRecordLabel(payload: any): string {
  const unit = payload?.unit || 'Practice';
  const score = typeof payload?.score === 'number' ? `${payload.score}%` : '';
  const stateStr = payload?.unfinished ? 'In Progress' : 'Finished';
  return `${unit} · ${score} (${stateStr})`;
}

function getBackoffMs(retryCount: number): number {
  // 10s, 20s, 40s, 60s, max 120s
  return Math.min(120000, 10000 * Math.pow(1.8, Math.max(0, retryCount - 1)));
}

function loadTasksFromStorage(): SyncTask[] {
  if (tasksMemory !== null) return tasksMemory;
  let loaded: SyncTask[] = [];
  try {
    const raw = localStorage.getItem(SYNC_TASKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) loaded = parsed;
    }
  } catch (e) {}

  // Recover any tasks that were stuck in 'syncing' from a previous page unload
  const now = Date.now();
  let changed = false;
  loaded.forEach(t => {
    if (t.status === 'syncing') {
      const updatedMs = new Date(t.updatedAt).getTime() || 0;
      if (now - updatedMs > 10000) {
        t.status = 'pending';
        t.retryCount = Math.max(1, t.retryCount);
        t.nextRetryAt = now + 2000;
        t.lastError = t.lastError || 'Interrupted before completion';
        changed = true;
      }
    }
  });

  // Migrate any legacy pending record syncs from epv2_pending_record_syncs
  try {
    const legacyRaw = localStorage.getItem(LEGACY_PENDING_KEY);
    if (legacyRaw) {
      const legacyList = JSON.parse(legacyRaw);
      if (Array.isArray(legacyList) && legacyList.length > 0) {
        const ctx = getActiveUserContext();
        for (const item of legacyList) {
          if (!item || !item.unit) continue;
          const id = item.recordId || item.tempId || `offline_rec_${Date.now()}`;
          if (!loaded.some(t => t.id === id || t.tempId === item.tempId)) {
            const payload = {
              unit: item.unit,
              score: item.score ?? 0,
              unfinished: !!item.unfinished
            };
            loaded.push({
              id,
              type: 'record',
              userId: ctx.userId,
              token: ctx.token,
              label: formatRecordLabel(payload),
              recordId: item.recordId || null,
              tempId: item.tempId || id,
              payload,
              status: 'pending',
              retryCount: 1,
              createdAt: item.timestamp || new Date().toISOString(),
              updatedAt: item.timestamp || new Date().toISOString(),
              nextRetryAt: Date.now() + 2000,
              lastError: 'Pending from offline session'
            });
            changed = true;
          }
        }
      }
      localStorage.removeItem(LEGACY_PENDING_KEY);
    }
  } catch (e) {}

  tasksMemory = loaded;
  if (changed) {
    persistTasks();
  }
  return tasksMemory;
}

function persistTasks() {
  if (!tasksMemory) return;
  try {
    localStorage.setItem(SYNC_TASKS_KEY, JSON.stringify(tasksMemory));
  } catch (e) {}
  notifyListeners();
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {}
  });
}

async function fetchWithTimeout(
  fetchFn: typeof window.fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const existingSignal = init?.signal;
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort();
    } else {
      existingSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function buildAuthInit(method: string, bodyObj: any, token?: string): RequestInit {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const activeToken = token || localStorage.getItem('active_session_token');
  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }
  return {
    method,
    headers,
    credentials: 'include',
    body: JSON.stringify(bodyObj)
  };
}

export const syncQueue = {
  init(originalFetch: typeof window.fetch, apiUrl: string) {
    storedOriginalFetch = originalFetch;
    storedApiUrl = apiUrl;
    loadTasksFromStorage();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getTasks(): SyncTask[] {
    return [...loadTasksFromStorage()];
  },

  /**
   * Tasks visible in the nav-btn badge and menu counter:
   * excludes initial in-flight requests (retryCount === 0 && status === 'syncing')
   * so normal fast online saves never cause badge flicker.
   */
  getVisibleTasks(): SyncTask[] {
    return loadTasksFromStorage().filter(
      t => t.status === 'pending' || t.status === 'failed' || (t.status === 'syncing' && t.retryCount > 0)
    );
  },

  upsertTask(task: SyncTask) {
    const list = loadTasksFromStorage();
    const idx = list.findIndex(
      t =>
        t.id === task.id ||
        (task.type === 'record' && task.recordId && t.recordId === task.recordId) ||
        (task.type === 'record' && task.tempId && t.tempId === task.tempId)
    );
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...task };
    } else {
      list.unshift(task);
    }
    persistTasks();
  },

  removeTask(idOrTempId: string) {
    const list = loadTasksFromStorage();
    const next = list.filter(
      t => t.id !== idOrTempId && t.tempId !== idOrTempId && t.recordId !== idOrTempId
    );
    if (next.length !== list.length) {
      tasksMemory = next;
      persistTasks();
    }
  },

  clearAll() {
    tasksMemory = [];
    persistTasks();
  },

  /**
   * Overlay pending record sync tasks onto a server records list
   * so Dashboard and Practice Shells immediately reflect unsynced local scores.
   */
  mergeRecordsWithPending(records: any[]): any[] {
    if (!Array.isArray(records)) return records;
    const pendingRecords = loadTasksFromStorage().filter(t => t.type === 'record');
    if (pendingRecords.length === 0) return records;

    const result = [...records];
    for (const task of pendingRecords) {
      const targetId = task.recordId || tempIdToServerId[task.tempId] || task.tempId;
      const existingIdx = result.findIndex(
        r => r && (r.id === targetId || r.id === task.tempId || (task.recordId && r.id === task.recordId))
      );
      if (existingIdx !== -1) {
        result[existingIdx] = {
          ...result[existingIdx],
          score: task.payload.score,
          unfinished: !!task.payload.unfinished,
          updatedAt: task.updatedAt
        };
      } else {
        result.unshift({
          id: targetId,
          userId: task.userId || '',
          unit: task.payload.unit,
          score: task.payload.score,
          unfinished: !!task.payload.unfinished,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        });
      }
    }
    return result;
  },

  async executeSingleTask(task: SyncTask): Promise<boolean> {
    if (!storedOriginalFetch || !storedApiUrl) return false;

    const list = loadTasksFromStorage();
    const current = list.find(t => t.id === task.id);
    if (!current) return true;

    const snapshotUpdatedAt = current.updatedAt;
    current.status = 'syncing';
    persistTasks();

    try {
      if (current.type === 'record') {
        const effectiveRecordId = current.recordId || tempIdToServerId[current.tempId] || null;
        if (effectiveRecordId) {
          const res = await fetchWithTimeout(
            storedOriginalFetch,
            `${storedApiUrl}/api/records/${effectiveRecordId}`,
            buildAuthInit('PUT', current.payload, current.token),
            FETCH_TIMEOUT_MS
          );
          if (res.ok) {
            const latest = loadTasksFromStorage().find(t => t.id === current.id);
            if (latest && latest.updatedAt !== snapshotUpdatedAt) {
              // Task was updated with newer score while syncing; keep it pending for next pass
              latest.recordId = effectiveRecordId;
              latest.status = 'pending';
              latest.nextRetryAt = Date.now() + 500;
              persistTasks();
              return false;
            }
            this.removeTask(current.id);
            cache.updateRecord({
              id: effectiveRecordId,
              unit: current.payload.unit,
              score: current.payload.score,
              unfinished: !!current.payload.unfinished,
              updatedAt: new Date().toISOString()
            });
            return true;
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
        } else {
          const res = await fetchWithTimeout(
            storedOriginalFetch,
            `${storedApiUrl}/api/records`,
            buildAuthInit('POST', current.payload, current.token),
            FETCH_TIMEOUT_MS
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.id) {
              tempIdToServerId[current.tempId] = data.id;
              saveTempIdMap();

              const latest = loadTasksFromStorage().find(t => t.id === current.id);
              if (latest && latest.updatedAt !== snapshotUpdatedAt) {
                // Newer score arrived while POST was in flight; upgrade to PUT with real server ID
                latest.recordId = data.id;
                latest.status = 'pending';
                latest.nextRetryAt = Date.now() + 500;
                persistTasks();
                return false;
              }

              this.removeTask(current.id);
              cache.replaceTempRecord(current.tempId, {
                id: data.id,
                unit: current.payload.unit,
                score: current.payload.score,
                unfinished: !!current.payload.unfinished,
                createdAt: current.createdAt,
                updatedAt: new Date().toISOString()
              });
              return true;
            }
            throw new Error('Invalid server response');
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
        }
      } else if (current.type === 'mistakes') {
        const res = await fetchWithTimeout(
          storedOriginalFetch,
          `${storedApiUrl}/api/mistakes`,
          buildAuthInit('PUT', current.payload, current.token),
          FETCH_TIMEOUT_MS
        );
        if (res.ok) {
          this.removeTask(current.id);
          return true;
        }
        throw new Error(`HTTP ${res.status}`);
      } else if (current.type === 'pet') {
        const res = await fetchWithTimeout(
          storedOriginalFetch,
          `${storedApiUrl}/api/pet`,
          buildAuthInit('PUT', current.payload, current.token),
          FETCH_TIMEOUT_MS
        );
        if (res.ok || res.status === 409) {
          this.removeTask(current.id);
          return true;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return false;
    } catch (err: any) {
      const target = loadTasksFromStorage().find(t => t.id === current.id);
      if (target) {
        target.retryCount = (target.retryCount || 0) + 1;
        target.status = target.retryCount >= 5 ? 'failed' : 'pending';
        target.nextRetryAt = Date.now() + getBackoffMs(target.retryCount);
        target.lastError = err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Network error');
        persistTasks();
      }
      return false;
    }
  },

  async retryTask(taskId: string): Promise<boolean> {
    const task = loadTasksFromStorage().find(t => t.id === taskId);
    if (!task) return false;
    task.nextRetryAt = 0;
    const ok = await this.executeSingleTask(task);
    if (ok) {
      window.dispatchEvent(new CustomEvent('ep-sync-completed'));
    }
    return ok;
  },

  async processQueue(forceAll = false): Promise<void> {
    if (isProcessingQueue) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine && !forceAll) return;

    const list = loadTasksFromStorage();
    const now = Date.now();
    const dueTasks = list.filter(t => {
      if (t.status === 'syncing') return false;
      if (forceAll) return true;
      return t.nextRetryAt <= now;
    });

    if (dueTasks.length === 0) return;

    isProcessingQueue = true;
    let anySucceeded = false;
    try {
      // Process in chronological order (oldest first)
      const ordered = [...dueTasks].reverse();
      for (const task of ordered) {
        const ok = await this.executeSingleTask(task);
        if (ok) {
          anySucceeded = true;
        }
      }
    } finally {
      isProcessingQueue = false;
      if (anySucceeded) {
        window.dispatchEvent(new CustomEvent('ep-sync-completed'));
      }
    }
  },

  async interceptFetch(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    originalFetch: typeof window.fetch
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method || 'GET').toUpperCase();

    // 1. Overlay pending record syncs onto GET /api/records
    if (method === 'GET' && url.endsWith('/api/records')) {
      const res = await originalFetch(input, init);
      if (res.ok) {
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (Array.isArray(data)) {
            const merged = this.mergeRecordsWithPending(data);
            return new Response(JSON.stringify(merged), {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers
            });
          }
        } catch (e) {}
      }
      return res;
    }

    // 2. Intercept POST /api/records
    if (method === 'POST' && url.endsWith('/api/records') && init?.body) {
      let bodyObj: any;
      try {
        bodyObj = JSON.parse(init.body as string);
      } catch (e) {
        return originalFetch(input, init);
      }

      const nowIso = new Date().toISOString();
      const ctx = getActiveUserContext();

      // Coalesce if there's already an unfinished pending POST task for this exact unit within the last 10 mins
      const existingUnfinished = loadTasksFromStorage().find(
        t =>
          t.type === 'record' &&
          !t.recordId &&
          t.payload?.unit === bodyObj.unit &&
          t.payload?.unfinished &&
          Date.now() - new Date(t.createdAt).getTime() < 10 * 60 * 1000
      );

      const tempId = existingUnfinished?.tempId || `offline_rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const taskObj: SyncTask = {
        id: tempId,
        type: 'record',
        userId: ctx.userId,
        token: ctx.token,
        label: formatRecordLabel(bodyObj),
        recordId: existingUnfinished?.recordId || null,
        tempId,
        payload: bodyObj,
        status: 'syncing',
        retryCount: existingUnfinished ? existingUnfinished.retryCount : 0,
        createdAt: existingUnfinished?.createdAt || nowIso,
        updatedAt: nowIso,
        nextRetryAt: Date.now() + 10000
      };

      // Persist immediately before network call so tab-close or crash never loses data
      this.upsertTask(taskObj);
      cache.updateRecord({
        id: tempId,
        userId: ctx.userId || '',
        unit: bodyObj.unit,
        score: bodyObj.score,
        unfinished: !!bodyObj.unfinished,
        createdAt: taskObj.createdAt,
        updatedAt: nowIso
      });

      const queueForRetry = (reason: string) => {
        const current = loadTasksFromStorage().find(t => t.id === tempId);
        if (current) {
          current.retryCount = Math.max(1, (current.retryCount || 0) + 1);
          current.status = 'pending';
          current.nextRetryAt = Date.now() + getBackoffMs(current.retryCount);
          current.lastError = reason;
          persistTasks();
        }
        return new Response(JSON.stringify({ success: true, id: tempId, queued: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return queueForRetry('Offline');
      }

      try {
        const res = await fetchWithTimeout(originalFetch, input, init, FETCH_TIMEOUT_MS);
        if (res.status === 401 || res.status === 403) {
          this.removeTask(tempId);
          return res;
        }
        if (!res.ok) {
          return queueForRetry(`HTTP ${res.status}`);
        }
        const clone = res.clone();
        const data = await clone.json();
        if (data && data.success && data.id) {
          tempIdToServerId[tempId] = data.id;
          saveTempIdMap();

          const latest = loadTasksFromStorage().find(t => t.id === tempId);
          if (latest && latest.updatedAt !== nowIso) {
            // A subsequent PUT updated this task while POST was in-flight!
            latest.recordId = data.id;
            latest.status = 'pending';
            latest.nextRetryAt = Date.now() + 200;
            persistTasks();
            setTimeout(() => this.processQueue(true), 200);
          } else {
            this.removeTask(tempId);
          }

          cache.replaceTempRecord(tempId, {
            id: data.id,
            userId: ctx.userId || '',
            unit: latest ? latest.payload.unit : bodyObj.unit,
            score: latest ? latest.payload.score : bodyObj.score,
            unfinished: latest ? !!latest.payload.unfinished : !!bodyObj.unfinished,
            createdAt: taskObj.createdAt,
            updatedAt: new Date().toISOString()
          });
          return res;
        }
        return queueForRetry('Invalid response');
      } catch (err: any) {
        return queueForRetry(err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Network error'));
      }
    }

    // 3. Intercept PUT /api/records/:id
    const putRecordMatch = method === 'PUT' && url.match(/\/api\/records\/([^/?#]+)$/);
    if (putRecordMatch && init?.body) {
      const rawTargetId = putRecordMatch[1];
      let bodyObj: any;
      try {
        bodyObj = JSON.parse(init.body as string);
      } catch (e) {
        return originalFetch(input, init);
      }

      const nowIso = new Date().toISOString();
      const ctx = getActiveUserContext();
      const mappedServerId = tempIdToServerId[rawTargetId];
      const isUnmappedTempId = rawTargetId.startsWith('offline_rec_') || rawTargetId.startsWith('temp_');

      // Case A: Updating a record that only has a local tempId and hasn't obtained a server ID yet
      if (isUnmappedTempId && !mappedServerId) {
        const existing = loadTasksFromStorage().find(t => t.id === rawTargetId || t.tempId === rawTargetId);
        const mergedPayload = existing ? { ...existing.payload, ...bodyObj } : bodyObj;
        this.upsertTask({
          id: rawTargetId,
          type: 'record',
          userId: ctx.userId || existing?.userId,
          token: ctx.token || existing?.token,
          label: formatRecordLabel(mergedPayload),
          recordId: existing?.recordId || null,
          tempId: rawTargetId,
          payload: mergedPayload,
          status: existing?.status === 'syncing' ? 'syncing' : 'pending',
          retryCount: Math.max(1, existing?.retryCount || 1),
          createdAt: existing?.createdAt || nowIso,
          updatedAt: nowIso,
          nextRetryAt: Date.now() + 1000,
          lastError: existing?.lastError || 'Waiting for initial record creation'
        });

        cache.updateRecord({
          id: rawTargetId,
          unit: mergedPayload.unit,
          score: mergedPayload.score,
          unfinished: !!mergedPayload.unfinished,
          updatedAt: nowIso
        });

        if (typeof navigator === 'undefined' || navigator.onLine) {
          setTimeout(() => this.processQueue(true), 300);
        }

        return new Response(JSON.stringify({ success: true, id: rawTargetId, queued: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Case B: We have a real server recordId (either directly or mapped from tempId)
      const realRecordId = mappedServerId || rawTargetId;
      const targetUrl = mappedServerId ? url.replace(rawTargetId, mappedServerId) : url;
      const existing = loadTasksFromStorage().find(
        t => t.id === realRecordId || t.recordId === realRecordId || t.tempId === rawTargetId
      );
      const mergedPayload = existing ? { ...existing.payload, ...bodyObj } : bodyObj;
      const taskKey = existing?.id || realRecordId;

      this.upsertTask({
        id: taskKey,
        type: 'record',
        userId: ctx.userId || existing?.userId,
        token: ctx.token || existing?.token,
        label: formatRecordLabel(mergedPayload),
        recordId: realRecordId,
        tempId: existing?.tempId || realRecordId,
        payload: mergedPayload,
        status: 'syncing',
        retryCount: existing ? existing.retryCount : 0,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
        nextRetryAt: Date.now() + 10000,
        lastError: existing?.lastError
      });

      cache.updateRecord({
        id: realRecordId,
        unit: mergedPayload.unit,
        score: mergedPayload.score,
        unfinished: !!mergedPayload.unfinished,
        updatedAt: nowIso
      });

      const queuePutForRetry = (reason: string) => {
        const current = loadTasksFromStorage().find(t => t.id === taskKey);
        if (current) {
          current.retryCount = Math.max(1, (current.retryCount || 0) + 1);
          current.status = 'pending';
          current.nextRetryAt = Date.now() + getBackoffMs(current.retryCount);
          current.lastError = reason;
          persistTasks();
        }
        return new Response(JSON.stringify({ success: true, id: realRecordId, queued: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return queuePutForRetry('Offline');
      }

      try {
        const res = await fetchWithTimeout(originalFetch, targetUrl, init, FETCH_TIMEOUT_MS);
        if (res.status === 401 || res.status === 403) {
          this.removeTask(taskKey);
          return res;
        }
        if (!res.ok) {
          return queuePutForRetry(`HTTP ${res.status}`);
        }
        const latest = loadTasksFromStorage().find(t => t.id === taskKey);
        if (latest && latest.updatedAt !== nowIso) {
          latest.status = 'pending';
          latest.nextRetryAt = Date.now() + 200;
          persistTasks();
        } else {
          this.removeTask(taskKey);
        }
        return res;
      } catch (err: any) {
        return queuePutForRetry(err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Network error'));
      }
    }

    // 4. Intercept PUT /api/mistakes and PUT /api/pet
    if (method === 'PUT' && (url.endsWith('/api/mistakes') || url.endsWith('/api/pet')) && init?.body) {
      const isMistakes = url.endsWith('/api/mistakes');
      const taskType: SyncTaskType = isMistakes ? 'mistakes' : 'pet';
      const taskId = isMistakes ? 'sync_mistakes_state' : 'sync_pet_state';
      let bodyObj: any;
      try {
        bodyObj = JSON.parse(init.body as string);
      } catch (e) {
        return originalFetch(input, init);
      }

      const nowIso = new Date().toISOString();
      const ctx = getActiveUserContext();
      const existing = loadTasksFromStorage().find(t => t.id === taskId);
      const label = isMistakes
        ? `Mistake Notebook (${Array.isArray(bodyObj) ? bodyObj.length : 0} items)`
        : `Pet Companion State (Lv.${bodyObj?.level || 1}, XP ${bodyObj?.xp || 0})`;

      const queueStateForRetry = (reason: string) => {
        this.upsertTask({
          id: taskId,
          type: taskType,
          userId: ctx.userId || existing?.userId,
          token: ctx.token || existing?.token,
          label,
          recordId: null,
          tempId: taskId,
          payload: bodyObj,
          status: 'pending',
          retryCount: Math.max(1, (existing?.retryCount || 0) + 1),
          createdAt: existing?.createdAt || nowIso,
          updatedAt: nowIso,
          nextRetryAt: Date.now() + getBackoffMs((existing?.retryCount || 0) + 1),
          lastError: reason
        });
        return new Response(
          JSON.stringify(isMistakes ? { success: true, mistakeState: bodyObj, queued: true } : { success: true, petState: bodyObj, queued: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return queueStateForRetry('Offline');
      }

      try {
        const res = await fetchWithTimeout(originalFetch, input, init, FETCH_TIMEOUT_MS);
        if (res.ok || res.status === 409 || res.status === 401 || res.status === 403) {
          this.removeTask(taskId);
          return res;
        }
        return queueStateForRetry(`HTTP ${res.status}`);
      } catch (err: any) {
        return queueStateForRetry(err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Network error'));
      }
    }

    return originalFetch(input, init);
  }
};

// Setup background periodic retry & online listeners
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    syncQueue.processQueue(false);
  }, RETRY_CHECK_INTERVAL_MS);

  window.addEventListener('online', () => {
    syncQueue.processQueue(true);
  });

  window.addEventListener('ep-trigger-sync', () => {
    syncQueue.processQueue(false);
  });
}

