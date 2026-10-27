import React, { RefObject } from 'react';
import { Settings2, ChevronUp, Trash2, FileUp, FolderUp, RefreshCw, Sparkles, Square } from 'lucide-react';
import { HistoryRecord } from '../lib/db';

interface ConfigPanelProps {
  isFolded: boolean;
  onToggleFold: () => void;
  bookName: string;
  setBookName: (val: string) => void;
  bookError: string;
  setBookError: (val: string) => void;
  keyType: 'paid' | 'free' | 'custom';
  setKeyType: (val: 'paid' | 'free' | 'custom') => void;
  voiceName: string;
  setVoiceName: (val: string) => void;
  customApiKey: string;
  setCustomApiKey: (val: string) => void;
  batchMode: 'chars' | 'count';
  setBatchMode: (val: 'chars' | 'count') => void;
  batchCharLimit: number;
  setBatchCharLimit: (val: number) => void;
  batchSize: number;
  setBatchSize: (val: number) => void;
  model: 'gemini-2.5-flash-preview-tts' | 'gemini-3.1-flash-tts-preview';
  setModel: (val: 'gemini-2.5-flash-preview-tts' | 'gemini-3.1-flash-tts-preview') => void;
  silenceThresholdDb: number;
  setSilenceThresholdDb: (val: number) => void;
  historyList: HistoryRecord[];
  selectedHistoryId: string;
  loadHistoryItem: (id: string) => void;
  deleteHistoryItem: (id: string, e: React.MouseEvent) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  folderInputRef: RefObject<HTMLInputElement>;
  handleFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rawInput: string;
  setRawInput: (val: string) => void;
  handleParse: () => void;
  handleClearAll: () => void;
  tasksCount: number;
  isRunning: boolean;
  elapsedSec: number;
  requestTtsOnly: () => void;
  stopProcessing: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isFolded,
  onToggleFold,
  bookName,
  setBookName,
  bookError,
  setBookError,
  keyType,
  setKeyType,
  voiceName,
  setVoiceName,
  customApiKey,
  setCustomApiKey,
  batchMode,
  setBatchMode,
  batchCharLimit,
  setBatchCharLimit,
  batchSize,
  setBatchSize,
  model,
  setModel,
  silenceThresholdDb,
  setSilenceThresholdDb,
  historyList,
  selectedHistoryId,
  loadHistoryItem,
  deleteHistoryItem,
  fileInputRef,
  folderInputRef,
  handleFilesSelected,
  rawInput,
  setRawInput,
  handleParse,
  handleClearAll,
  tasksCount,
  isRunning,
  elapsedSec,
  requestTtsOnly,
  stopProcessing,
}) => {
  if (isFolded) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings2 size={18} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>Configuration</h2>
        </div>
        <button onClick={onToggleFold} style={{ color: 'var(--text-muted)' }}>
          <ChevronUp size={16} />
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Category / Book Key <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>*</span>
          </label>
          {bookError && <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)' }}>{bookError}</span>}
        </div>
        <input
          type="text"
          value={bookName}
          onChange={e => {
            setBookName(e.target.value.toLowerCase().trim());
            if (e.target.value.trim()) setBookError('');
          }}
          placeholder="Required e.g. a4a, sa1, raz-b"
          style={{
            width: '100%',
            borderColor: bookError ? 'var(--accent-rose)' : 'var(--border)'
          }}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Gemini API Key</label>
          <select value={keyType} onChange={e => setKeyType(e.target.value as any)} style={{ width: '100%' }}>
            <option value="paid">Paid Key (GOOGLE_API_KEY)</option>
            <option value="free">Free Key (GOOGLE_API_KEY_FREE)</option>
            <option value="custom">Custom Input Key</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Voice Name</label>
          <select value={voiceName} onChange={e => setVoiceName(e.target.value)} style={{ width: '100%' }}>
            <option value="Kore">Kore (Standard)</option>
            <option value="Achernar">Achernar (Clear)</option>
            <option value="Puck">Puck (Energetic)</option>
            <option value="Fenrir">Fenrir (Deep)</option>
          </select>
        </div>
      </div>

      {keyType === 'custom' && (
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Custom Gemini API Key</label>
          <input
            type="password"
            value={customApiKey}
            onChange={e => setCustomApiKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Batch Partition Mode</label>
          <select value={batchMode} onChange={e => setBatchMode(e.target.value as any)} style={{ width: '100%' }}>
            <option value="chars">By Text Size (Chars)</option>
            <option value="count">By Item Count</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
            {batchMode === 'chars' ? 'Max Chars / Batch' : 'Items / Batch'}
          </label>
          {batchMode === 'chars' ? (
            <input
              type="number"
              min={50}
              max={2000}
              step={50}
              value={batchCharLimit}
              onChange={e => setBatchCharLimit(parseInt(e.target.value) || 300)}
              placeholder="e.g. 300 chars"
              style={{ width: '100%' }}
            />
          ) : (
            <input
              type="number"
              min={1}
              max={50}
              value={batchSize}
              onChange={e => setBatchSize(parseInt(e.target.value) || 10)}
              style={{ width: '100%' }}
            />
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>TTS Model</label>
          <select value={model} onChange={e => setModel(e.target.value as any)} style={{ width: '100%' }}>
            <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash</option>
            <option value="gemini-3.1-flash-tts-preview">Gemini 3.1 Flash</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Silence Cut (dB)</label>
          <input type="number" min={-50} max={-15} value={silenceThresholdDb} onChange={e => setSilenceThresholdDb(parseInt(e.target.value) || -30)} style={{ width: '100%' }} />
        </div>
      </div>

      {historyList.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saved History Lists ({historyList.length})</label>
            {selectedHistoryId && (
              <button
                onClick={(e) => deleteHistoryItem(selectedHistoryId, e)}
                style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          <select
            value={selectedHistoryId}
            onChange={e => loadHistoryItem(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem' }}
          >
            <option value="">-- Select a previous list to rerun --</option>
            {historyList.map(h => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Input Source or Files</label>
          
          {/* File / Folder Select Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Select one or more JSON / Text / Markdown files"
              style={{
                padding: '0.25rem 0.5rem',
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '4px',
                color: 'var(--accent-primary)',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: 'pointer'
              }}
            >
              <FileUp size={13} /> Select File(s)
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              title="Select a folder containing unit JSON or text files"
              style={{
                padding: '0.25rem 0.5rem',
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: '4px',
                color: '#c084fc',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: 'pointer'
              }}
            >
              <FolderUp size={13} /> Select Folder
            </button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json,.txt,.md,application/json,text/plain,text/markdown"
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-ignore - webkitdirectory is standard in Chromium / modern browsers
          webkitdirectory=""
          directory=""
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />

        <textarea
          rows={6}
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder="Paste *-vocab-guide.json content or line-by-line sentences here..."
          style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleParse}
          style={{ flex: 1, padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontWeight: '600' }}
        >
          Parse Items
        </button>
        <button
          onClick={handleClearAll}
          style={{ padding: '0.6rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-rose)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button
          onClick={requestTtsOnly}
          disabled={isRunning || tasksCount === 0}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: isRunning ? 'var(--accent-emerald)' : 'var(--accent-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: tasksCount === 0 ? 0.5 : 1
          }}
        >
          {isRunning ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
          {isRunning ? `Generating (${elapsedSec}s)...` : `Generate TTS Audio (${tasksCount} Items)`}
        </button>

        {isRunning && (
          <button
            onClick={stopProcessing}
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--accent-rose)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Square size={16} fill="#fff" /> Stop
          </button>
        )}
      </div>
    </div>
  );
};
