import React, { useState } from 'react';
import { API_URL } from './lib/auth';

export const DbBenchmarkPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [practiceId, setPracticeId] = useState('test_b-think1-u10_vocab_master');

  const runBenchmark = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/benchmark-db?id=${encodeURIComponent(practiceId)}`);
      const data = await res.json();
      setHistory(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          ...data
        },
        ...prev
      ]);
    } catch (e: any) {
      console.error("Benchmark request error:", e);
      setHistory(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          error: e.message || "Failed to fetch benchmark"
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runBatch = async (count: number = 5) => {
    setLoading(true);
    for (let i = 0; i < count; i++) {
      await runBenchmark();
      await new Promise(r => setTimeout(r, 500));
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        ⚡ DB Performance Benchmark (Cloudflare D1 vs TiDB Serverless)
      </h2>
      <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
        Run live side-by-side latency comparisons between <strong>Cloudflare D1</strong> (SQLite at Edge) and <strong>TiDB Cloud Serverless</strong> (Tokyo AWS). Use this page to test fetch performance directly from your current location with or without VPN.
      </p>

      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Practice ID:</label>
          <input
            type="text"
            value={practiceId}
            onChange={(e) => setPracticeId(e.target.value)}
            style={{ flexGrow: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={runBenchmark}
            disabled={loading}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Running...' : 'Run Single Test 🚀'}
          </button>

          <button
            onClick={() => runBatch(5)}
            disabled={loading}
            style={{
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            Run 5x Sequential Test 🔁
          </button>

          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              style={{
                background: '#e2e8f0',
                color: '#475569',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#334155' }}>Results Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((item, index) => (
              <div
                key={index}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Time: {item.timestamp}</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace' }}>Target ID: {item.practiceId}</span>
                </div>

                {item.error ? (
                  <div style={{ color: '#ef4444', fontWeight: 600 }}>Error: {item.error}</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>Cloudflare D1</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d4ed8' }}>
                        {item.cloudflareD1?.latencyMs} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>ms</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#3b82f6', marginTop: '4px' }}>
                        Status: {item.cloudflareD1?.found ? '✅ Found' : '⚠️ Not Found'}
                      </div>
                    </div>

                    <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6', marginBottom: '4px' }}>AWS Tokyo</div>
                      {item.tidbServerlessTokyo?.error ? (
                        <div style={{ color: '#dc2626', fontSize: '0.7rem' }}>Error: {item.tidbServerlessTokyo.error}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6d28d9' }}>
                            {item.tidbServerlessTokyo?.latencyMs ?? item.tidbServerless?.latencyMs} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>ms</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#7c3aed', marginTop: '4px' }}>
                            Status: {(item.tidbServerlessTokyo?.found ?? item.tidbServerless?.found) ? '✅ Found' : '⚠️ Not Found'}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>AWS Singapore</div>
                      {item.tidbServerlessSingapore?.error ? (
                        <div style={{ color: '#dc2626', fontSize: '0.7rem' }}>Error: {item.tidbServerlessSingapore.error}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                            {item.tidbServerlessSingapore?.latencyMs} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>ms</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '4px' }}>
                            Status: {item.tidbServerlessSingapore?.found ? '✅ Found' : '⚠️ Not Found'}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ background: '#fff7ed', padding: '12px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c', marginBottom: '4px' }}>AliCloud Singapore</div>
                      {item.tidbServerlessAliSingapore?.error ? (
                        <div style={{ color: '#dc2626', fontSize: '0.7rem' }}>Error: {item.tidbServerlessAliSingapore.error}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ea580c' }}>
                            {item.tidbServerlessAliSingapore?.latencyMs} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>ms</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#f97316', marginTop: '4px' }}>
                            Status: {item.tidbServerlessAliSingapore?.found ? '✅ Found' : '⚠️ Not Found'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DbBenchmarkPage;
