import { useState, useEffect } from 'react'
import { syncQueue, type SyncTask } from '../lib/syncQueue'
import './IrregularVerbsModal.css'

interface SyncTasksModalProps {
  onClose: () => void;
}

export function SyncTasksModal({ onClose }: SyncTasksModalProps) {
  const [tasks, setTasks] = useState<SyncTask[]>(() => syncQueue.getTasks())
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = syncQueue.subscribe(() => {
      setTasks(syncQueue.getTasks())
    })
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const timer = window.setInterval(() => {
      setTick(t => t + 1)
    }, 1000)

    return () => {
      unsub()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.clearInterval(timer)
    }
  }, [])

  const handleSyncAll = async () => {
    setIsSyncingAll(true)
    try {
      await syncQueue.processQueue(true)
      setTasks(syncQueue.getTasks())
    } finally {
      setIsSyncingAll(false)
    }
  }

  const handleRetryOne = async (id: string) => {
    setRetryingId(id)
    try {
      await syncQueue.retryTask(id)
      setTasks(syncQueue.getTasks())
    } finally {
      setRetryingId(null)
    }
  }

  const getTypeIcon = (type: SyncTask['type']) => {
    if (type === 'record') return '🎯'
    if (type === 'mistakes') return '📓'
    return '🐾'
  }

  const getNextRetryText = (task: SyncTask) => {
    if (task.status === 'syncing') return 'Syncing now...'
    const diffSec = Math.max(0, Math.ceil((task.nextRetryAt - Date.now()) / 1000))
    if (diffSec <= 0) return 'Retrying soon...'
    return `Auto-retry in ${diffSec}s`
  }

  return (
    <div className="iv-modal-overlay" onClick={onClose}>
      <div
        className="iv-modal-content"
        style={{ maxWidth: 640 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="iv-modal-header">
          <h3 className="iv-modal-title">☁️ Sync Tasks (同步任务队列)</h3>
          <button className="iv-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div
          className="iv-filters-row"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                fontWeight: 600,
                background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: isOnline ? '#059669' : '#dc2626'
              }}
            >
              <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
            </span>
            <span style={{ color: 'var(--text, #666)' }}>
              {tasks.length === 0
                ? '0 pending tasks'
                : `${tasks.length} task${tasks.length > 1 ? 's' : ''} queued`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tasks.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all queued sync tasks? Unsynced changes will be discarded.')) {
                    syncQueue.clearAll()
                  }
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(215, 58, 73, 0.3)',
                  background: 'transparent',
                  color: '#d73a49',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear All
              </button>
            )}
            <button
              onClick={handleSyncAll}
              disabled={tasks.length === 0 || isSyncingAll}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: 'none',
                background: tasks.length === 0 ? '#ccc' : 'var(--accent, #3b82f6)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: tasks.length === 0 || isSyncingAll ? 'not-allowed' : 'pointer',
                opacity: isSyncingAll ? 0.7 : 1
              }}
            >
              {isSyncingAll ? '⏳ Syncing...' : '🔄 Sync Now (立即同步)'}
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: '60vh' }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text, #666)' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-h, #222)', marginBottom: 4 }}>
                All user states & scores are synced!
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                所有练习分数、错题本与宠物状态均已成功同步至云端。
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(task => {
                const isSyncing = task.status === 'syncing' || retryingId === task.id
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border, rgba(0,0,0,0.08))',
                      background: 'var(--bg, #f9fafb)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1.3rem', lineHeight: 1.2 }}>{getTypeIcon(task.type)}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.92rem',
                            color: 'var(--text-h, #222)',
                            wordBreak: 'break-word'
                          }}
                        >
                          {task.label}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px 12px',
                            marginTop: 4,
                            fontSize: '0.78rem',
                            color: 'var(--text, #666)'
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color:
                                isSyncing
                                  ? '#2563eb'
                                  : task.status === 'failed'
                                  ? '#dc2626'
                                  : '#d97706'
                            }}
                          >
                            {isSyncing
                              ? 'Syncing...'
                              : task.status === 'failed'
                              ? 'Delayed (Auto-retrying)'
                              : 'Pending'}
                          </span>
                          <span>Retries: {task.retryCount}</span>
                          <span>{getNextRetryText(task)}</span>
                          <span>Updated: {new Date(task.updatedAt).toLocaleTimeString()}</span>
                        </div>
                        {task.lastError && (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 3 }}>
                            Reason: {task.lastError}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleRetryOne(task.id)}
                        disabled={isSyncing}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border, rgba(0,0,0,0.15))',
                          background: 'var(--card-bg, #fff)',
                          color: 'var(--text-h, #222)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isSyncing ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isSyncing ? '...' : 'Retry'}
                      </button>
                      <button
                        onClick={() => syncQueue.removeTask(task.id)}
                        title="Remove task"
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: 'none',
                          background: 'transparent',
                          color: '#999',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

