import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Sparkles, ChevronDown, ChevronUp, Headphones, Wand2, Scissors, Upload, Trash2, Loader2 } from 'lucide-react';
import { parseInputToTasks, md5, TaskItem } from './lib/parser';
import { extractTextsFromFiles } from './lib/fileImport';
import { detectSilences, trimAudioBuffer, pcmToAudioBuffer, AudioSilence } from './lib/audioCutter';
import { audioBufferToMp3Blob } from './lib/mp3Encoder';
import { WaveformViewer } from './components/WaveformViewer';
import { getAllHistory, saveHistory, deleteHistory, getSetting, setSetting, migrateFromLocalStorage, HistoryRecord } from './lib/db';
import { API_BASE, checkR2AudioExists, PUBLIC_R2_BASE } from './lib/ttsApi';
import { AuthScreen } from './components/AuthScreen';
import { ProgressModal, ProgressModalData } from './components/ProgressModal';
import { ConfigPanel } from './components/ConfigPanel';
import { TaskQueueTable } from './components/TaskQueueTable';

export default function App() {
  const [passcode, setPasscode] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const [bookName, setBookName] = useState('');
  const [bookError, setBookError] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [model, setModel] = useState<'gemini-2.5-flash-preview-tts' | 'gemini-3.1-flash-tts-preview'>('gemini-2.5-flash-preview-tts');
  const [voiceName, setVoiceName] = useState('Kore');
  const [keyType, setKeyType] = useState<'paid' | 'free' | 'custom'>('paid');
  const [customApiKey, setCustomApiKey] = useState('');
  const [batchMode, setBatchMode] = useState<'chars' | 'count'>('chars');
  const [batchCharLimit, setBatchCharLimit] = useState(300);
  const [batchSize, setBatchSize] = useState(10);
  const [silenceThresholdDb, setSilenceThresholdDb] = useState(-30);

  // Fold/Collapse Configuration after receiving audio or manually
  const [isConfigFolded, setIsConfigFolded] = useState(false);

  // History lists state (stored in IndexedDB)
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCutting, setIsCutting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modal progress state for cutting and uploading
  const [progressModal, setProgressModal] = useState<ProgressModalData | null>(null);

  // Active audio buffer from Gemini generation
  const [rawAudioBuffer, setRawAudioBuffer] = useState<AudioBuffer | null>(null);
  const [rawAudioSilences, setRawAudioSilences] = useState<AudioSilence[]>([]);
  const [activePlayRange, setActivePlayRange] = useState<{ start: number; end: number } | null>(null);
  const [lastEditedIndex, setLastEditedIndex] = useState<number | null>(null);

  const [, setCurrentBatchIdx] = useState(0);
  const [, setTotalBatches] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [activeTtsStatus, setActiveTtsStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [, setActiveAudioUrl] = useState<string | null>(null);
  const [editingOverrideIndex, setEditingOverrideIndex] = useState<number | null>(null);
  const [editingOverrideVal, setEditingOverrideVal] = useState<string>('');

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const stopRequestedRef = useRef(false);
  const timerIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 100)]);
  };

  // Load IndexedDB data & settings on initial mount
  useEffect(() => {
    async function initDB() {
      await migrateFromLocalStorage();
      const records = await getAllHistory();
      setHistoryList(records);

      const savedPasscode = await getSetting<string>('tts_passcode', '');
      if (savedPasscode) {
        setPasscode(savedPasscode);
        fetch(`${API_BASE}/api/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: savedPasscode }),
        }).then(r => {
          if (r.ok) setIsAuthed(true);
        }).catch(() => {});
      }

      const savedApiKey = await getSetting<string>('tts_custom_api_key', '');
      if (savedApiKey) setCustomApiKey(savedApiKey);
    }
    initDB();
  }, []);

  const saveToHistory = async (book: string, input: string, count: number, currentTasks?: TaskItem[]) => {
    if (!input.trim() || count === 0) return;
    const title = input.trim().split('\n')[0].slice(0, 30);
    
    const overrides: Record<string, string> = {};
    const timestamps: Record<string, { start: number; end: number }> = {};
    const selectedMap: Record<string, boolean> = {};
    (currentTasks || tasks).forEach(t => {
      if (t.ttsOverrideText && t.ttsOverrideText.trim()) {
        overrides[t.hash] = t.ttsOverrideText.trim();
      }
      if (t.startTime !== undefined && t.endTime !== undefined) {
        timestamps[t.hash] = { start: t.startTime, end: t.endTime };
      }
      if (t.selected !== undefined) {
        selectedMap[t.hash] = t.selected;
      }
    });

    const newEntry: HistoryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${book.toUpperCase()} (${count} items) - ${title}`,
      book,
      timestamp: Date.now(),
      itemCount: count,
      rawInput: input,
      ttsOverrides: overrides,
      timestamps: timestamps,
      selectedMap: selectedMap,
    };

    await saveHistory(newEntry);
    const updated = [newEntry, ...historyList.filter(h => h.rawInput !== input)];
    setHistoryList(updated);
    setSelectedHistoryId(newEntry.id);
  };

  const loadHistoryItem = (id: string) => {
    setSelectedHistoryId(id);
    const found = historyList.find(h => h.id === id);
    if (found) {
      setBookName(found.book);
      setRawInput(found.rawInput);
      const parsed = parseInputToTasks(found.rawInput, found.book);
      
      parsed.forEach(t => {
        if (found.ttsOverrides?.[t.hash]) {
          t.ttsOverrideText = found.ttsOverrides[t.hash];
        }
        if (found.timestamps?.[t.hash]) {
          t.startTime = found.timestamps[t.hash].start;
          t.endTime = found.timestamps[t.hash].end;
        }
        if (found.selectedMap && found.selectedMap[t.hash] !== undefined) {
          t.selected = found.selectedMap[t.hash];
        } else {
          t.selected = true;
        }
      });

      setTasks(parsed);
      addLog(`Loaded history item from IndexedDB: "${found.name}" (${parsed.length} items).`);
    }
  };

  const toggleTaskSelection = async (index: number) => {
    const updated = tasks.map((t, idx) => {
      if (idx === index) {
        return { ...t, selected: t.selected === false ? true : false };
      }
      return t;
    });
    setTasks(updated);

    if (selectedHistoryId) {
      const found = historyList.find(h => h.id === selectedHistoryId);
      if (found) {
        const selectedMap: Record<string, boolean> = { ...(found.selectedMap || {}) };
        selectedMap[updated[index].hash] = updated[index].selected ?? true;
        const updatedRecord: HistoryRecord = { ...found, selectedMap };
        await saveHistory(updatedRecord);
        setHistoryList(prev => prev.map(h => h.id === selectedHistoryId ? updatedRecord : h));
      }
    }
  };

  const toggleAllSelection = async (select: boolean) => {
    const updated = tasks.map(t => ({ ...t, selected: select }));
    setTasks(updated);

    if (selectedHistoryId) {
      const found = historyList.find(h => h.id === selectedHistoryId);
      if (found) {
        const selectedMap: Record<string, boolean> = {};
        updated.forEach(t => {
          selectedMap[t.hash] = select;
        });
        const updatedRecord: HistoryRecord = { ...found, selectedMap };
        await saveHistory(updatedRecord);
        setHistoryList(prev => prev.map(h => h.id === selectedHistoryId ? updatedRecord : h));
      }
    }
  };

  const updateTaskTtsOverride = async (index: number, newTtsText: string) => {
    const updated = tasks.map((t, idx) => {
      if (idx === index) {
        return {
          ...t,
          ttsOverrideText: newTtsText.trim() ? newTtsText.trim() : undefined,
        };
      }
      return t;
    });
    setTasks(updated);

    if (selectedHistoryId) {
      const found = historyList.find(h => h.id === selectedHistoryId);
      if (found) {
        const overrides: Record<string, string> = { ...(found.ttsOverrides || {}) };
        const item = updated[index];
        if (item.ttsOverrideText) {
          overrides[item.hash] = item.ttsOverrideText;
        } else {
          delete overrides[item.hash];
        }
        const updatedRecord: HistoryRecord = { ...found, ttsOverrides: overrides };
        await saveHistory(updatedRecord);
        setHistoryList(prev => prev.map(h => h.id === selectedHistoryId ? updatedRecord : h));
      }
    }
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteHistory(id);
    const updated = historyList.filter(h => h.id !== id);
    setHistoryList(updated);
    if (selectedHistoryId === id) {
      setSelectedHistoryId('');
    }
    addLog('Removed list from IndexedDB.');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        await setSetting('tts_passcode', passcode);
        setIsAuthed(true);
        addLog('Logged in successfully. Saved passcode to IndexedDB.');
      } else {
        setAuthError('Incorrect passcode');
      }
    } catch (err: any) {
      setAuthError(`Connection error: ${err.message}`);
    }
  };

  const startNewTask = () => {
    setBookName('');
    setBookError('');
    setRawInput('');
    setTasks([]);
    setRawAudioBuffer(null);
    setRawAudioSilences([]);
    setActivePlayRange(null);
    setLastEditedIndex(null);
    setSelectedHistoryId('');
    setIsConfigFolded(false);
    addLog('✨ Started a fresh new task. Book Key cleared.');
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    addLog(`📂 Reading and extracting audio texts...`);
    const { detectedBook, sentences: finalSentences, validFileCount } = await extractTextsFromFiles(files, addLog);

    if (validFileCount === 0) {
      addLog(`⚠️ No practice JSON or text files found in selection.`);
      return;
    }

    const currentBook = detectedBook || bookName;
    if (detectedBook) {
      setBookName(detectedBook);
      setBookError('');
      addLog(`🏷️ Auto-detected Book Key: "${detectedBook}"`);
    }

    const combinedText = finalSentences.join('\n');
    setRawInput(combinedText);

    if (!currentBook.trim()) {
      setBookError('Please enter a Book Key (e.g. a6a, a4a, sa1)');
      addLog(`📋 Extracted ${finalSentences.length} items. Please enter a Book Key and click "Parse Items".`);
      return;
    }

    const tasksList: TaskItem[] = finalSentences.map(s => ({
      text: s,
      hash: md5(s),
      book: currentBook.trim().toLowerCase(),
      status: 'pending',
      selected: true
    }));

    setTasks(tasksList);
    setLastEditedIndex(null);
    saveToHistory(currentBook.trim().toLowerCase(), combinedText, tasksList.length, tasksList);
    addLog(`✨ Extracted ${tasksList.length} unique audio items from ${validFileCount} file(s) for book "${currentBook.toLowerCase()}".`);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };


  const handleParse = () => {
    setBookError('');
    if (!bookName.trim()) {
      setBookError('Book Key is required (e.g. a4a, sa1, raz-b)');
      addLog('⚠️ Please enter a Book Key before parsing.');
      return;
    }
    const parsed = parseInputToTasks(rawInput, bookName.trim().toLowerCase());
    setTasks(parsed);
    setLastEditedIndex(null);
    saveToHistory(bookName.trim().toLowerCase(), rawInput, parsed.length);
    addLog(`Parsed ${parsed.length} items for book "${bookName.trim().toLowerCase()}". Saved to history.`);
  };

  const playAudio = (url: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play();
      setActiveAudioUrl(url);
    }
  };

  const stopProcessing = () => {
    stopRequestedRef.current = true;
    addLog('🛑 Stop requested. Halting after current step...');
  };

  const updateTaskTime = (index: number, field: 'startTime' | 'endTime', value: number) => {
    setLastEditedIndex(index);
    setTasks(prev => prev.map((t, idx) => idx === index ? { ...t, [field]: value } : t));
  };

  const previewInterval = (start: number, end: number) => {
    if (!rawAudioBuffer) return;
    setActivePlayRange({ start, end });
  };

  const analyzeAudioForward = () => {
    if (!rawAudioBuffer || tasks.length === 0) return;

    const silences = rawAudioSilences.length > 0 
      ? rawAudioSilences 
      : detectSilences(rawAudioBuffer, silenceThresholdDb, 0.4);
    
    setRawAudioSilences(silences);

    const fromIndex = lastEditedIndex !== null && lastEditedIndex >= 0 && lastEditedIndex < tasks.length 
      ? lastEditedIndex 
      : 0;

    const targetBatch = tasks[fromIndex]?.batchIndex;

    // Find batch boundary: first and last item indices with this batchIndex
    let batchStartIndex = 0;
    let batchEndIndex = tasks.length - 1;

    if (targetBatch !== undefined) {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].batchIndex === targetBatch) {
          batchStartIndex = i;
          break;
        }
      }
      for (let i = tasks.length - 1; i >= 0; i--) {
        if (tasks[i].batchIndex === targetBatch) {
          batchEndIndex = i;
          break;
        }
      }
    }

    const startFromTime = (fromIndex === batchStartIndex && lastEditedIndex === null) 
      ? (tasks[batchStartIndex]?.startTime ?? 0)
      : (tasks[fromIndex]?.endTime ?? tasks[fromIndex]?.startTime ?? 0);

    const batchUpperBound = tasks[batchEndIndex]?.endTime ?? rawAudioBuffer.duration;

    const subsequentSilences = silences
      .filter(s => s.start >= startFromTime - 0.05 && s.end <= batchUpperBound + 0.1)
      .map(s => ({ ...s, duration: s.end - s.start }))
      .sort((a, b) => a.start - b.start);

    const startIndexToUpdate = (fromIndex === batchStartIndex && lastEditedIndex === null) ? batchStartIndex : fromIndex + 1;
    const itemsToUpdateCount = Math.max(0, batchEndIndex - startIndexToUpdate + 1);

    addLog(`🔍 Analyzing audio for Batch ${targetBatch !== undefined ? targetBatch : 'All'} (items #${startIndexToUpdate + 1}..#${batchEndIndex + 1}, ${startFromTime.toFixed(2)}s..${batchUpperBound.toFixed(2)}s). Found ${subsequentSilences.length} gap(s) for ${itemsToUpdateCount} item(s)...`);

    let currentAnchor = startFromTime;
    const updated = [...tasks];
    let sIdx = 0;

    for (let i = startIndexToUpdate; i <= batchEndIndex; i++) {
      while (sIdx < subsequentSilences.length && subsequentSilences[sIdx].start < currentAnchor + 0.25) {
        sIdx++;
      }

      let nextEnd: number;
      if (sIdx < subsequentSilences.length && i < batchEndIndex) {
        const s = subsequentSilences[sIdx];
        nextEnd = (s.start + s.end) / 2;
        sIdx++;
      } else {
        nextEnd = (i === batchEndIndex) ? batchUpperBound : Math.min(batchUpperBound, currentAnchor + 5);
      }

      updated[i] = {
        ...updated[i],
        startTime: parseFloat(currentAnchor.toFixed(2)),
        endTime: parseFloat(nextEnd.toFixed(2)),
      };
      currentAnchor = nextEnd;
    }

    setTasks(updated);
    addLog(`✅ Audio analysis completed for Batch ${targetBatch !== undefined ? targetBatch : 'All'}. Items #${startIndexToUpdate + 1} to #${batchEndIndex + 1} realigned.`);
  };

  // Step 1: Request TTS Audio & Calculate Initial Cut Boundaries
  const requestTtsOnly = async () => {
    const targetTasks = tasks.filter(t => t.selected !== false);
    if (targetTasks.length === 0) {
      addLog('⚠️ No items selected for TTS generation. Please select at least one item.');
      return;
    }

    setIsRunning(true);
    stopRequestedRef.current = false;
    setElapsedSec(0);

    const startTime = Date.now();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    if (keyType === 'custom' && customApiKey) {
      setSetting('tts_custom_api_key', customApiKey);
    }

    const audioCtx = getAudioCtx();
    const is31 = model.includes('3.1');
    const WARMUP = "Warmup sentence. Let's begin.";

    let accumulatedBuffer: AudioBuffer | null = null;
    let accumulatedSilences: AudioSilence[] = [];
    let accumulatedTasks: TaskItem[] = [];
    const completedHashes = new Set<string>();

    const effectiveBook = bookName.trim().toLowerCase();
    const maxChars = Math.max(50, batchCharLimit);

    try {
      addLog(`🔍 Starting R2 existence checks & TTS generation for ${targetTasks.length} selected item(s)...`);

      let taskIndex = 0;
      let batchNumber = 0;

      const buildNextBatch = async (): Promise<TaskItem[]> => {
        const batch: TaskItem[] = [];
        let batchChars = 0;
        const R2_PARALLEL_LIMIT = 10;

        while (taskIndex < targetTasks.length) {
          if (stopRequestedRef.current) break;

          const windowItems = targetTasks.slice(taskIndex, taskIndex + R2_PARALLEL_LIMIT);
          const results = await Promise.all(
            windowItems.map(async (item) => {
              const { exists, url } = await checkR2AudioExists(effectiveBook, item.hash);
              return { item, exists, url };
            })
          );

          let batchFull = false;
          for (let i = 0; i < results.length; i++) {
            if (stopRequestedRef.current) break;

            const { item, exists, url } = results[i];
            const currentItemIdx = taskIndex + 1;
            taskIndex++;

            if (exists) {
              addLog(`⚡ R2 Cache Hit: [${currentItemIdx}/${targetTasks.length}] "${item.text.slice(0, 30)}" already in R2.`);
              const confirmedItem: TaskItem = {
                ...item,
                status: 'done',
                audioUrl: url,
                selected: false,
              };
              accumulatedTasks.push(confirmedItem);
              completedHashes.add(item.hash);
              setTasks(prev => prev.map(t => t.hash === item.hash ? confirmedItem : t));
              continue;
            }

            const itemLen = (item.ttsOverrideText || item.text).length + 15;
            if (batch.length > 0 && batchChars + itemLen > maxChars) {
              taskIndex--;
              batchFull = true;
              break;
            }

            batch.push(item);
            batchChars += itemLen;
          }

          if (batchFull) {
            break;
          }
        }

        return batch;
      };

      const callGeminiTtsWithRetry = async (combinedPrompt: string, batchLabel: string): Promise<any> => {
        const maxRetries = 2; // 2 retries = 3 attempts total
        let attempt = 0;

        while (attempt <= maxRetries) {
          if (stopRequestedRef.current) {
            throw new Error('Terminated by user');
          }

          const controller = new AbortController();
          const timeoutMs = 180000;
          const timeoutId = setTimeout(() => {
            controller.abort(new Error("TTS request timed out after 180s"));
          }, timeoutMs);

          const attemptStart = Date.now();
          let waitTimer: any = null;

          try {
            if (attempt > 0) {
              addLog(`🔁 Retrying batch ${batchLabel} (Attempt ${attempt + 1}/${maxRetries + 1})...`);
            } else {
              addLog(`⏳ Sending batch ${batchLabel} request to Gemini TTS endpoint...`);
            }

            setActiveTtsStatus(`Batch ${batchLabel}: 0s elapsed...`);

            // Ticking elapsed timer while waiting for Gemini TTS response
            waitTimer = setInterval(() => {
              const seconds = Math.floor((Date.now() - attemptStart) / 1000);
              const remaining = Math.max(0, 180 - seconds);
              setActiveTtsStatus(`Batch ${batchLabel}: ${seconds}s elapsed (timeout in ${remaining}s)`);
            }, 1000);

            const ttsRes = await fetch(`${API_BASE}/api/tts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Passcode': passcode,
              },
              body: JSON.stringify({
                prompt: combinedPrompt,
                model: model,
                voiceName: voiceName,
                keyType: keyType,
                customApiKey: keyType === 'custom' ? customApiKey : undefined,
              }),
              signal: controller.signal,
            });

            clearInterval(waitTimer);
            clearTimeout(timeoutId);
            setActiveTtsStatus(null);

            const clientElapsedMs = Date.now() - attemptStart;

            if (!ttsRes.ok) {
              const errData = await ttsRes.json().catch(() => ({}));
              const msg = errData.details || errData.error || `HTTP ${ttsRes.status}`;
              throw new Error(`Gemini rejected batch ${batchLabel}: ${msg} (${(clientElapsedMs / 1000).toFixed(1)}s)`);
            }

            const ttsData = await ttsRes.json();
            // Ensure precise elapsed duration from client-side measurement
            ttsData.elapsedMs = ttsData.elapsedMs || clientElapsedMs;
            return ttsData;
          } catch (err: any) {
            if (waitTimer) clearInterval(waitTimer);
            clearTimeout(timeoutId);
            setActiveTtsStatus(null);

            if (stopRequestedRef.current) {
              throw new Error('Terminated by user');
            }

            if (attempt < maxRetries) {
              attempt++;
              addLog(`⚠️ Batch ${batchLabel} failed: ${err.message}. Retrying in 30s (${attempt}/${maxRetries})...`);

              // 30-second countdown, interruptible by stopRequestedRef
              const countdownSec = 30;
              for (let c = countdownSec; c > 0; c--) {
                if (stopRequestedRef.current) {
                  setActiveTtsStatus(null);
                  throw new Error('Terminated by user');
                }
                setActiveTtsStatus(`Batch ${batchLabel} retry in ${c}s...`);
                await new Promise(r => setTimeout(r, 1000));
              }
              setActiveTtsStatus(null);
              continue;
            }

            throw err;
          }
        }
      };

      while (taskIndex < targetTasks.length) {
        if (stopRequestedRef.current) {
          addLog('🛑 Process terminated by user.');
          break;
        }

        // 1. Build next batch of items (checks R2 for items; skips those in R2)
        const currentBatch: TaskItem[] = await buildNextBatch();

        if (currentBatch.length === 0) {
          if (taskIndex >= tasks.length) break;
          continue;
        }

        batchNumber++;
        setCurrentBatchIdx(batchNumber);
        const chunkChars = currentBatch.reduce((sum, c) => sum + (c.ttsOverrideText || c.text).length, 0);
        addLog(`Processing TTS batch ${batchNumber} (${currentBatch.length} items, ~${chunkChars} chars)...`);

        let combinedPrompt = '';
        if (is31) {
          const parts = [
            "Read the provided sentences one by one. Insert a silent 3-second gap between every single sentence. Do not blend the sentences together. Do not shorten the silence. Treat each line break as a hard stop.\n",
            `${WARMUP} ...`
          ];
          for (let i = 0; i < currentBatch.length; i++) {
            const spokenText = currentBatch[i].ttsOverrideText || currentBatch[i].text;
            if (i === currentBatch.length - 1) {
              parts.push(`... ${spokenText}`);
            } else {
              parts.push(`... ${spokenText} ...`);
            }
          }
          combinedPrompt = parts.join('\n[long pause: hold silence for 3 seconds]\n');
        } else {
          combinedPrompt = [WARMUP, ...currentBatch.map(c => c.ttsOverrideText || c.text)].join(' \n\n. . . . . . . . . .\n\n ');
        }

        // Mark current batch items as generating in the table
        setTasks(prev => prev.map(t => {
          if (currentBatch.some(c => c.hash === t.hash)) {
            return { ...t, status: 'generating', batchIndex: batchNumber };
          }
          return t;
        }));

        // Wait for Gemini TTS to return before doing any further R2 checks
        const ttsData = await callGeminiTtsWithRetry(combinedPrompt, `${batchNumber}`);
        const base64Audio = ttsData.data;
        addLog(`📡 Batch ${batchNumber} response OK in ${(ttsData.elapsedMs ? ttsData.elapsedMs / 1000 : 0).toFixed(1)}s`);

        const binaryStr = atob(base64Audio);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        let chunkBuffer: AudioBuffer;
        if (ttsData.mimeType && ttsData.mimeType.includes('pcm')) {
          chunkBuffer = pcmToAudioBuffer(audioCtx, bytes, 24000);
        } else {
          try {
            chunkBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
          } catch {
            chunkBuffer = pcmToAudioBuffer(audioCtx, bytes, 24000);
          }
        }

        const chunkSilences = detectSilences(chunkBuffer, silenceThresholdDb, 0.4);
        const candidateSilences = chunkSilences.filter(s => s.start > 0.1);

        let warmupSkipped = false;
        let expectedPauses = currentBatch.length;
        if (candidateSilences.length === currentBatch.length - 1) {
          warmupSkipped = true;
          expectedPauses = currentBatch.length - 1;
        }

        let sortedSilences = candidateSilences
          .map(s => ({ ...s, duration: s.end - s.start }))
          .sort((a, b) => b.duration - a.duration)
          .slice(0, expectedPauses)
          .sort((a, b) => a.start - b.start);

        const bufferOffset = accumulatedBuffer ? accumulatedBuffer.duration : 0;

        let currentCutStart = 0;
        if (!warmupSkipped && sortedSilences.length > 0) {
          currentCutStart = (sortedSilences[0].start + sortedSilences[0].end) / 2;
        }

        const updatedChunkTasks = currentBatch.map((item, i) => {
          const silenceIndex = warmupSkipped ? i : i + 1;
          const s = sortedSilences[silenceIndex];
          const cutEnd = s ? (s.start + s.end) / 2 : (i === currentBatch.length - 1 ? chunkBuffer.duration : currentCutStart + 15);
          const taskWithTime: TaskItem = {
            ...item,
            status: 'pending',
            batchIndex: batchNumber,
            startTime: parseFloat((bufferOffset + currentCutStart).toFixed(2)),
            endTime: parseFloat((bufferOffset + cutEnd).toFixed(2)),
          };
          currentCutStart = cutEnd;
          completedHashes.add(item.hash);
          return taskWithTime;
        });

        accumulatedTasks = [...accumulatedTasks, ...updatedChunkTasks];
        const taskMap = new Map(accumulatedTasks.map(t => [t.hash, t]));
        setTasks(prev => prev.map(t => taskMap.get(t.hash) || t));

        if (!accumulatedBuffer) {
          accumulatedBuffer = chunkBuffer;
          accumulatedSilences = chunkSilences;
        } else {
          const combinedLength = accumulatedBuffer.length + chunkBuffer.length;
          const combined = audioCtx.createBuffer(1, combinedLength, accumulatedBuffer.sampleRate);
          const combinedData = combined.getChannelData(0);
          combinedData.set(accumulatedBuffer.getChannelData(0), 0);
          combinedData.set(chunkBuffer.getChannelData(0), accumulatedBuffer.length);

          accumulatedSilences = [
            ...accumulatedSilences,
            ...chunkSilences.map(s => ({ start: s.start + bufferOffset, end: s.end + bufferOffset }))
          ];
          accumulatedBuffer = combined;
        }

        setRawAudioBuffer(accumulatedBuffer);
        setRawAudioSilences(accumulatedSilences);
      }

      setTotalBatches(batchNumber);
      if (accumulatedBuffer) {
        setIsConfigFolded(true);
        addLog(`✅ TTS generation completed: ${batchNumber} batch(es) received (${accumulatedBuffer.duration.toFixed(1)}s total).`);
      } else {
        addLog(`✅ All items already existed in Cloudflare R2! No new audio needed.`);
      }
    } catch (err: any) {
      addLog(`❌ TTS Error: ${err.message}`);
      setTasks(prev => prev.map(t => {
        if (!completedHashes.has(t.hash)) {
          return { ...t, selected: false };
        }
        return t;
      }));
      addLog('ℹ️ Unchecked current batch and all remaining unprocessed items due to failure.');
    } finally {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setActiveTtsStatus(null);
      setIsRunning(false);
    }
  };

  // Step 2: Cut Audio based on current timestamps
  const cutAudioSlices = async () => {
    if (!rawAudioBuffer || tasks.length === 0) return;
    const selectedTasks = tasks.filter(t => t.selected !== false);
    if (selectedTasks.length === 0) {
      addLog('⚠️ No items selected for cutting. Check at least one item.');
      return;
    }

    setIsCutting(true);
    setProgressModal({
      open: true,
      type: 'cutting',
      current: 0,
      total: selectedTasks.length,
      currentText: selectedTasks[0]?.text || '',
    });
    addLog(`✂️ Cutting ${selectedTasks.length} selected item(s) (of ${tasks.length} total) using adjusted timestamps...`);

    const audioCtx = getAudioCtx();
    const sampleRate = rawAudioBuffer.sampleRate;

    const newTasks = [...tasks];
    let cutCount = 0;

    for (let i = 0; i < newTasks.length; i++) {
      const item = newTasks[i];
      if (item.selected === false) {
        continue;
      }

      cutCount++;
      setProgressModal({
        open: true,
        type: 'cutting',
        current: cutCount,
        total: selectedTasks.length,
        currentText: item.text,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const startTime = item.startTime ?? 0;
      const endTime = item.endTime ?? rawAudioBuffer.duration;

      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.min(rawAudioBuffer.length, Math.floor(endTime * sampleRate));
      const sliceLength = Math.max(1, endSample - startSample);

      const sliceBuffer = audioCtx.createBuffer(rawAudioBuffer.numberOfChannels, sliceLength, sampleRate);
      for (let ch = 0; ch < rawAudioBuffer.numberOfChannels; ch++) {
        sliceBuffer.copyToChannel(rawAudioBuffer.getChannelData(ch).subarray(startSample, endSample), ch);
      }

      const trimmed = trimAudioBuffer(audioCtx, sliceBuffer, -32, 0.08);
      const mp3Blob = audioBufferToMp3Blob(trimmed, 128);
      const localUrl = URL.createObjectURL(mp3Blob);

      newTasks[i] = {
        ...item,
        status: 'pending',
        audioBlob: mp3Blob,
        audioUrl: localUrl,
      };
    }

    setTasks(newTasks);
    setIsCutting(false);
    setProgressModal(null);
    addLog(`🎉 Cut ${selectedTasks.length} selected item(s) to MP3. Ready for preview or Cloudflare R2 Upload.`);
  };

  // Step 3: Upload Checked Cut MP3s to Cloudflare R2
  const uploadToR2 = async () => {
    const selectedTasks = tasks.filter(t => t.selected !== false);
    if (selectedTasks.length === 0) {
      addLog('⚠️ No items selected for upload. Check at least one item.');
      return;
    }

    setIsUploading(true);
    setProgressModal({
      open: true,
      type: 'uploading',
      current: 0,
      total: selectedTasks.length,
      currentText: selectedTasks[0]?.text || '',
    });
    addLog(`🚀 Uploading ${selectedTasks.length} selected MP3 file(s) (of ${tasks.length} total) to Cloudflare R2...`);

    let uploadedCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      const item = tasks[i];
      if (item.selected === false) {
        continue;
      }

      uploadedCount++;
      setProgressModal({
        open: true,
        type: 'uploading',
        current: uploadedCount,
        total: selectedTasks.length,
        currentText: item.text,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      if (!item.audioBlob) {
        addLog(`⚠️ Item #${i + 1} (${item.text}) has no cut audio. Cutting now...`);
        const audioCtx = getAudioCtx();
        if (rawAudioBuffer) {
          const sampleRate = rawAudioBuffer.sampleRate;
          const startSample = Math.floor((item.startTime || 0) * sampleRate);
          const endSample = Math.min(rawAudioBuffer.length, Math.floor((item.endTime || rawAudioBuffer.duration) * sampleRate));
          const sliceLength = Math.max(1, endSample - startSample);
          const sliceBuffer = audioCtx.createBuffer(rawAudioBuffer.numberOfChannels, sliceLength, sampleRate);
          for (let ch = 0; ch < rawAudioBuffer.numberOfChannels; ch++) {
            sliceBuffer.copyToChannel(rawAudioBuffer.getChannelData(ch).subarray(startSample, endSample), ch);
          }
          const trimmed = trimAudioBuffer(audioCtx, sliceBuffer, -32, 0.08);
          item.audioBlob = audioBufferToMp3Blob(trimmed, 128);
          item.audioUrl = URL.createObjectURL(item.audioBlob);
        }
      }

      if (item.audioBlob) {
        setTasks(prev => prev.map(t => t.hash === item.hash ? { ...t, status: 'uploading' } : t));
        const r2Key = `ep/${bookName}/${item.hash}.mp3`;

        try {
          const upRes = await fetch(`${API_BASE}/api/upload?key=${encodeURIComponent(r2Key)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'audio/mpeg',
              'X-Passcode': passcode,
            },
            body: item.audioBlob,
          });

          if (upRes.ok) {
            const upData = await upRes.json();
            const fullUrl = upData.url || `${PUBLIC_R2_BASE}/${r2Key}`;
            setTasks(prev => prev.map(t => t.hash === item.hash ? { ...t, status: 'done', audioUrl: fullUrl } : t));
            addLog(`✅ [${uploadedCount}/${selectedTasks.length}] Uploaded: ${fullUrl}`);
          } else {
            const errData = await upRes.json().catch(() => ({}));
            setTasks(prev => prev.map(t => t.hash === item.hash ? { ...t, status: 'error', error: 'Upload failed' } : t));
            addLog(`❌ [${uploadedCount}/${selectedTasks.length}] Upload failed for ${r2Key}: ${errData.error || upRes.statusText}`);
          }
        } catch (e: any) {
          setTasks(prev => prev.map(t => t.hash === item.hash ? { ...t, status: 'error', error: e.message } : t));
          addLog(`❌ [${uploadedCount}/${selectedTasks.length}] Upload error for ${r2Key}: ${e.message}`);
        }
      }
    }

    setIsUploading(false);
    setProgressModal(null);
    addLog(`✨ Cloudflare R2 Upload Completed for selected items!`);
  };

  if (!isAuthed) {
    return (
      <AuthScreen
        passcode={passcode}
        setPasscode={setPasscode}
        authError={authError}
        handleLogin={handleLogin}
      />
    );
  }

  const selectedCount = tasks.filter(t => t.selected !== false).length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', color: '#fff' }}>
            <Volume2 size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Cloudflare TTS Studio</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gemini Flash TTS • Interactive Waveform Slicing • Direct R2 Cloud Upload</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={startNewTask}
            style={{
              padding: '0.45rem 0.9rem',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} /> New Task
          </button>
          <button
            onClick={() => setIsConfigFolded(prev => !prev)}
            style={{
              padding: '0.45rem 0.8rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            {isConfigFolded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {isConfigFolded ? 'Expand Configuration' : 'Fold Configuration'}
          </button>
          <button onClick={() => setIsAuthed(false)} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Lock</button>
        </div>
      </header>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isConfigFolded ? '1fr' : '420px 1fr', gap: '1.5rem', transition: 'grid-template-columns 0.3s ease' }}>
        {/* Left Control Panel */}
        <ConfigPanel
          isFolded={isConfigFolded}
          onToggleFold={() => setIsConfigFolded(true)}
          bookName={bookName}
          setBookName={setBookName}
          bookError={bookError}
          setBookError={setBookError}
          keyType={keyType}
          setKeyType={setKeyType}
          voiceName={voiceName}
          setVoiceName={setVoiceName}
          customApiKey={customApiKey}
          setCustomApiKey={setCustomApiKey}
          batchMode={batchMode}
          setBatchMode={setBatchMode}
          batchCharLimit={batchCharLimit}
          setBatchCharLimit={setBatchCharLimit}
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          model={model}
          setModel={setModel}
          silenceThresholdDb={silenceThresholdDb}
          setSilenceThresholdDb={setSilenceThresholdDb}
          historyList={historyList}
          selectedHistoryId={selectedHistoryId}
          loadHistoryItem={loadHistoryItem}
          deleteHistoryItem={deleteHistoryItem}
          fileInputRef={fileInputRef}
          folderInputRef={folderInputRef}
          handleFilesSelected={handleFilesSelected}
          rawInput={rawInput}
          setRawInput={setRawInput}
          handleParse={handleParse}
          handleClearAll={() => { setTasks([]); setRawInput(''); setRawAudioBuffer(null); }}
          tasksCount={tasks.filter(t => t.selected !== false).length}
          isRunning={isRunning}
          elapsedSec={elapsedSec}
          requestTtsOnly={requestTtsOnly}
          stopProcessing={stopProcessing}
        />

        {/* Right Task, Waveform & Cutter Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Waveform Visualization & Master Audio Controls */}
          {rawAudioBuffer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Headphones size={20} color="var(--accent-primary)" />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Master Audio Waveform</h2>
                </div>
                {/* Action buttons: Analyze, Cut & Upload */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={analyzeAudioForward}
                    title={lastEditedIndex !== null ? `Recalculate and realign timestamps after item #${lastEditedIndex + 1}` : 'Recalculate timestamps for all items'}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      color: '#a5b4fc',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Wand2 size={16} />
                    {lastEditedIndex !== null ? `Analyze Audio (from #${lastEditedIndex + 1})` : 'Analyze Audio'}
                  </button>

                  <button
                    onClick={cutAudioSlices}
                    disabled={isCutting || selectedCount === 0}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--accent-amber)',
                      color: '#000',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      opacity: (isCutting || selectedCount === 0) ? 0.6 : 1,
                      cursor: (isCutting || selectedCount === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Scissors size={16} />
                    {isCutting 
                      ? 'Cutting...' 
                      : `Cut Audio (${selectedCount})`}
                  </button>

                  <button
                    onClick={uploadToR2}
                    disabled={isUploading || selectedCount === 0}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--accent-emerald)',
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      opacity: (isUploading || selectedCount === 0) ? 0.6 : 1,
                      cursor: (isUploading || selectedCount === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Upload size={16} />
                    {isUploading 
                      ? 'Uploading to R2...' 
                      : `Upload (${selectedCount}) to R2`}
                  </button>
                </div>
              </div>

              <WaveformViewer
                audioBuffer={rawAudioBuffer}
                silences={rawAudioSilences}
                itemCuts={tasks.map(t => ({
                  start: t.startTime ?? 0,
                  end: t.endTime ?? 0,
                  text: t.text,
                  hash: t.hash,
                }))}
                activePlayRange={activePlayRange}
              />
            </div>
          )}

          {/* Task Status Table */}
          <TaskQueueTable
            tasks={tasks}
            rawAudioBuffer={rawAudioBuffer}
            toggleAllSelection={toggleAllSelection}
            toggleTaskSelection={toggleTaskSelection}
            updateTaskTime={updateTaskTime}
            updateTaskTtsOverride={updateTaskTtsOverride}
            previewInterval={previewInterval}
            playAudio={playAudio}
            editingOverrideIndex={editingOverrideIndex}
            setEditingOverrideIndex={setEditingOverrideIndex}
            editingOverrideVal={editingOverrideVal}
            setEditingOverrideVal={setEditingOverrideVal}
            requestTtsOnly={requestTtsOnly}
            isRunning={isRunning}
          />

          {/* Activity Console */}
          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0, color: 'var(--text-secondary)' }}>Activity Log</h3>
                {activeTtsStatus && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.15rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontFamily: 'var(--font-mono)',
                      animation: 'pulse 1.5s infinite ease-in-out'
                    }}
                  >
                    <Loader2 size={11} className="spin" />
                    {activeTtsStatus}
                  </span>
                )}
              </div>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  title="Clear all logs"
                  style={{
                    padding: '0.2rem 0.5rem',
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    borderRadius: '4px',
                    color: 'var(--accent-rose)',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={11} /> Clear
                </button>
              )}
            </div>
            <div style={{ height: '120px', overflowY: 'auto', background: 'var(--bg-main)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>No activity logs yet.</div>
              ) : (
                logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>

      <audio ref={audioPlayerRef} style={{ display: 'none' }} />

      {/* Progress Modal */}
      {progressModal && <ProgressModal modal={progressModal} />}
    </div>
  );
}
