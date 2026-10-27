import React, { useState } from 'react';
import { Play, Edit3, Check, Trash2, X, RefreshCw } from 'lucide-react';
import { TaskItem } from '../lib/parser';

interface TaskQueueTableProps {
  tasks: TaskItem[];
  rawAudioBuffer: AudioBuffer | null;
  toggleAllSelection: (select: boolean) => void;
  toggleTaskSelection: (index: number) => void;
  updateTaskTime: (index: number, field: 'startTime' | 'endTime', val: number) => void;
  updateTaskTtsOverride: (index: number, newTtsText: string) => void;
  previewInterval: (start: number, end: number) => void;
  playAudio: (url: string) => void;
  editingOverrideIndex: number | null;
  setEditingOverrideIndex: (idx: number | null) => void;
  editingOverrideVal: string;
  setEditingOverrideVal: (val: string) => void;
  requestTtsOnly: () => void;
  isRunning: boolean;
}

const BATCH_COLORS = [
  'rgba(99, 102, 241, 0.08)',   // indigo
  'rgba(16, 185, 129, 0.08)',   // emerald
  'rgba(245, 158, 11, 0.08)',   // amber
  'rgba(168, 85, 247, 0.08)',   // purple
  'rgba(6, 182, 212, 0.08)',    // cyan
  'rgba(244, 63, 94, 0.08)',    // rose
  'rgba(234, 179, 8, 0.08)',    // yellow
  'rgba(59, 130, 246, 0.08)',   // blue
];

export const TaskQueueTable: React.FC<TaskQueueTableProps> = ({
  tasks,
  rawAudioBuffer,
  toggleAllSelection,
  toggleTaskSelection,
  updateTaskTime,
  updateTaskTtsOverride,
  previewInterval,
  playAudio,
  editingOverrideIndex,
  setEditingOverrideIndex,
  editingOverrideVal,
  setEditingOverrideVal,
  requestTtsOnly,
  isRunning,
}) => {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const selectedCount = tasks.filter(t => t.selected !== false).length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>Sentence Slices Queue ({tasks.length} items)</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Listen to each cut range, adjust starting and ending seconds, then click "Cut Audio Slices" & "Upload to R2".
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Selected: <strong style={{ color: 'var(--text-primary)' }}>{selectedCount}</strong> / {tasks.length} • Uploaded: <strong style={{ color: 'var(--accent-emerald)' }}>{doneCount}</strong>
          </span>
          {!rawAudioBuffer && tasks.length > 0 && (
            <button
              onClick={requestTtsOnly}
              disabled={isRunning}
              style={{ padding: '0.4rem 0.8rem', background: 'var(--accent-primary)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: '600', fontSize: '0.8rem' }}
            >
              {isRunning ? 'Generating...' : '1. Generate Audio'}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead style={{ background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.5rem 0.5rem', width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={tasks.length > 0 && tasks.every(t => t.selected !== false)}
                  onChange={e => toggleAllSelection(e.target.checked)}
                  title="Select / Deselect all items for upload"
                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                />
              </th>
              <th style={{ padding: '0.5rem 0.5rem', width: '36px' }}>#</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Text</th>
              <th style={{ padding: '0.5rem 0.75rem', width: '130px', whiteSpace: 'nowrap' }}>Start Time (s)</th>
              <th style={{ padding: '0.5rem 0.75rem', width: '130px', whiteSpace: 'nowrap' }}>End Time (s)</th>
              <th style={{ padding: '0.5rem 0.75rem', width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>Preview</th>
              <th style={{ padding: '0.5rem 0.75rem', width: '90px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '0.5rem 0.75rem', width: '60px', textAlign: 'center', whiteSpace: 'nowrap' }}>MP3</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No tasks loaded. Paste vocabulary JSON or text on the left and click "Parse Items".
                </td>
              </tr>
            ) : (
              tasks.map((task, idx) => {
                const isHighlighted = selectedRowIndex === idx;
                const batchBg = task.batchIndex !== undefined 
                  ? BATCH_COLORS[(task.batchIndex - 1) % BATCH_COLORS.length] 
                  : undefined;
                return (
                  <tr
                    key={task.hash}
                    onClick={() => setSelectedRowIndex(idx)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: isHighlighted 
                        ? 'rgba(99, 102, 241, 0.25)' 
                        : batchBg
                          ? batchBg
                          : task.selected === false 
                            ? 'rgba(0,0,0,0.2)' 
                            : 'transparent',
                      outline: isHighlighted ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                      opacity: task.selected === false && !isHighlighted ? 0.6 : 1,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                  <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={task.selected !== false}
                      onChange={() => toggleTaskSelection(idx)}
                      title={task.selected !== false ? "Checked: Will be uploaded to R2" : "Unchecked: Ignored from upload"}
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem 0.5rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: task.ttsOverrideText ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {task.text}
                        </span>
                        
                        {task.ttsOverrideText ? (
                          <span
                            onClick={() => {
                              setEditingOverrideIndex(idx);
                              setEditingOverrideVal(task.ttsOverrideText || '');
                            }}
                            title="Custom text sent to Gemini for TTS"
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: 'rgba(168, 85, 247, 0.18)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            TTS: "{task.ttsOverrideText}" <Edit3 size={11} />
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingOverrideIndex(idx);
                              setEditingOverrideVal(task.text);
                            }}
                            title="Click to customize pronunciation text for TTS"
                            style={{
                              padding: '0.15rem 0.4rem',
                              background: 'transparent',
                              border: '1px dashed rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              color: 'var(--text-muted)',
                              fontSize: '0.7rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <Edit3 size={11} /> Set TTS text
                          </button>
                        )}
                      </div>

                      {/* Inline Edit Form */}
                      {editingOverrideIndex === idx && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
                          <input
                            type="text"
                            autoFocus
                            value={editingOverrideVal}
                            onChange={e => setEditingOverrideVal(e.target.value)}
                            placeholder="Text for Gemini TTS..."
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.8rem',
                              background: '#1e1b4b',
                              border: '1px solid #818cf8',
                              borderRadius: '4px',
                              color: '#fff',
                              width: '240px'
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateTaskTtsOverride(idx, editingOverrideVal);
                                setEditingOverrideIndex(null);
                              } else if (e.key === 'Escape') {
                                setEditingOverrideIndex(null);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              updateTaskTtsOverride(idx, editingOverrideVal);
                              setEditingOverrideIndex(null);
                            }}
                            title="Save TTS Text"
                            style={{ padding: '0.25rem 0.45rem', background: 'var(--accent-primary)', color: '#fff', borderRadius: '4px' }}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => {
                              updateTaskTtsOverride(idx, '');
                              setEditingOverrideIndex(null);
                            }}
                            title="Clear Override"
                            style={{ padding: '0.25rem 0.45rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', borderRadius: '4px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            onClick={() => setEditingOverrideIndex(null)}
                            title="Cancel"
                            style={{ padding: '0.25rem 0.45rem', background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: '4px' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}

                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        MD5 (Original): {task.hash}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.4rem 0.75rem', width: '130px' }}>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={task.startTime ?? 0}
                      onChange={e => updateTaskTime(idx, 'startTime', parseFloat(e.target.value) || 0)}
                      style={{ width: '100px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </td>
                  <td style={{ padding: '0.4rem 0.75rem', width: '130px' }}>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={task.endTime ?? 0}
                      onChange={e => updateTaskTime(idx, 'endTime', parseFloat(e.target.value) || 0)}
                      style={{ width: '100px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </td>
                  <td style={{ padding: '0.4rem 0.75rem', textAlign: 'center' }}>
                    {rawAudioBuffer ? (
                      <button
                        onClick={() => previewInterval(task.startTime ?? 0, task.endTime ?? rawAudioBuffer.duration)}
                        title="Listen to this slice interval"
                        style={{
                          padding: '0.3rem 0.6rem',
                          background: 'rgba(59,130,246,0.15)',
                          color: 'var(--accent-primary)',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        <Play size={12} /> Play
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: task.status === 'done' 
                        ? 'rgba(16,185,129,0.15)' 
                        : task.status === 'generating'
                          ? 'rgba(245,158,11,0.2)'
                          : task.status === 'error' 
                            ? 'rgba(244,63,94,0.15)' 
                            : 'rgba(59,130,246,0.15)',
                      color: task.status === 'done' 
                        ? 'var(--accent-emerald)' 
                        : task.status === 'generating'
                          ? 'var(--accent-amber)'
                          : task.status === 'error' 
                            ? 'var(--accent-rose)' 
                            : 'var(--accent-primary)',
                    }}>
                      {task.status === 'generating' ? (
                        <>
                          <RefreshCw size={11} className="spin" />
                          generating...
                        </>
                      ) : (
                        task.status
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                    {task.audioUrl ? (
                      <button onClick={() => playAudio(task.audioUrl!)} title="Play cut MP3" style={{ color: 'var(--accent-emerald)' }}>
                        <Play size={16} />
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
