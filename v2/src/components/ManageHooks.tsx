import React, { useState, useEffect } from 'react';
import { type VocabHook, fetchAdminHooks, reviewAdminHook } from '../lib/vocabHookService';

interface ManageHooksProps {
  onBack?: () => void;
}

export const ManageHooks: React.FC<ManageHooksProps> = () => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [hooks, setHooks] = useState<VocabHook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadHooks = async () => {
    setIsLoading(true);
    setActionMsg('');
    try {
      const data = await fetchAdminHooks(filter);
      setHooks(data);
    } catch (e: any) {
      setActionMsg(`Failed to load hooks: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHooks();
  }, [filter]);

  const handleReview = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      const ok = await reviewAdminHook(id, action);
      if (ok) {
        setActionMsg(`Successfully performed action: ${action}`);
        // Refresh local list
        setHooks(prev => prev.filter(h => {
          if (action === 'delete') return h.id !== id;
          if (filter === 'pending') return h.id !== id;
          return true;
        }).map(h => h.id === id ? { ...h, status: (action === 'approve' ? 'approved' : 'rejected') } : h));
      } else {
        setActionMsg('Operation failed');
      }
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', padding: '24px', background: '#ffffff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>🧠 Manage Memorization Hooks</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#6b7280' }}>
            Review user-contributed mnemonics before making them public to all learners.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: filter === status ? '1.5px solid #2563eb' : '1px solid #d1d5db',
                background: filter === status ? '#eff6ff' : '#ffffff',
                color: filter === status ? '#1d4ed8' : '#374151',
                fontWeight: filter === status ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.85rem',
                textTransform: 'capitalize'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {actionMsg && (
        <div style={{ padding: '8px 12px', background: '#f0fdf4', color: '#166534', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem' }}>
          {actionMsg}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Loading submitted hooks...</div>
      ) : hooks.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: 8 }}>
          No {filter} hooks found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '10px 12px', width: '15%' }}>Word</th>
                <th style={{ padding: '10px 12px', width: '45%' }}>Submitted Hook</th>
                <th style={{ padding: '10px 12px', width: '12%' }}>Status</th>
                <th style={{ padding: '10px 12px', width: '13%' }}>Created</th>
                <th style={{ padding: '10px 12px', width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hooks.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1e40af' }}>{h.word}</td>
                  <td style={{ padding: '12px', color: '#374151', lineHeight: 1.4 }}>{h.content}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: h.status === 'approved' ? '#dcfce7' : h.status === 'pending' ? '#fef3c7' : '#fee2e2',
                      color: h.status === 'approved' ? '#15803d' : h.status === 'pending' ? '#b45309' : '#b91c1c'
                    }}>
                      {h.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.8rem', color: '#6b7280' }}>
                    {new Date(h.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {h.status !== 'approved' && (
                        <button
                          onClick={() => handleReview(h.id, 'approve')}
                          title="Approve to make visible to all users"
                          style={{
                            padding: '4px 8px',
                            background: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}
                        >
                          ✓ Accept
                        </button>
                      )}
                      {h.status !== 'rejected' && (
                        <button
                          onClick={() => handleReview(h.id, 'reject')}
                          title="Reject"
                          style={{
                            padding: '4px 8px',
                            background: '#f97316',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}
                        >
                          ✕ Reject
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this hook permanently?')) {
                            handleReview(h.id, 'delete');
                          }
                        }}
                        title="Delete"
                        style={{
                          padding: '4px 8px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 500
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
