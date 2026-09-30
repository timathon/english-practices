import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Upload, CheckCircle2, AlertTriangle, KeyRound, Sparkles, Volume2, Settings2, Trash2, Square, Clock, ChevronDown, ChevronUp, Scissors, Headphones, Edit3, Check, X, Wand2, Sliders, Database, FileText, FolderUp, FileUp } from 'lucide-react';
import { parseInputToTasks, extractTextsFromParsedJson, md5, TaskItem } from './lib/parser';
import { detectSilences, trimAudioBuffer, pcmToAudioBuffer, AudioSilence } from './lib/audioCutter';
import { audioBufferToMp3Blob } from './lib/mp3Encoder';
import { WaveformViewer } from './components/WaveformViewer';
import { getAllHistory, saveHistory, deleteHistory, getSetting, setSetting, migrateFromLocalStorage, HistoryRecord } from './lib/db';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : 'https://ttsapi.vibequizzing.com';

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

  // Active audio buffer from Gemini generation
  const [rawAudioBuffer, setRawAudioBuffer] = useState<AudioBuffer | null>(null);
  const [rawAudioSilences, setRawAudioSilences] = useState<AudioSilence[]>([]);
  const [activePlayRange, setActivePlayRange] = useState<{ start: number; end: number } | null>(null);
  const [lastEditedIndex, setLastEditedIndex] = useState<number | null>(null);

  const [currentBatchIdx, setCurrentBatchIdx] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
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
    
    // Extract any existing tts overrides, timestamps, and selection state
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
      
      // Restore tts overrides, timestamps, and selections if present
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

    // Save updated overrides to active history item in IndexedDB
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

  // Auth verify
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

  function detectBookKeyFromPath(pathOrName: string): string {
    const clean = pathOrName.trim().replace(/\\/g, '/');
    const segments = clean.split('/').filter(Boolean);

    for (const seg of segments) {
      // 1. Check folder name like "A6A" or "a6a-u3" -> extract "a6a"
      const unitMatch = seg.match(/^([a-zA-Z0-9]+)-u\d+/i);
      if (unitMatch && unitMatch[1]) {
        return unitMatch[1].toLowerCase();
      }

      // 2. Check compound book keys like "raz-b" from "raz-b-u1" or "raz-b"
      const razMatch = seg.match(/^(raz-[a-zA-Z0-9]+)/i);
      if (razMatch && razMatch[1]) {
        return razMatch[1].toLowerCase();
      }

      // 3. Check standalone textbook folder names like "A6A", "SA1", "A3B", "PU1"
      if (/^[a-zA-Z]{1,3}\d{1,2}[a-zA-Z]?$/i.test(seg)) {
        return seg.toLowerCase();
      }
    }

    // 4. Check filename prefix (e.g. "a6a-u3-vocab-guide.json" -> "a6a", "sa1-u0-sentence-architect.json" -> "sa1")
    const filename = segments[segments.length - 1] || clean;
    const fileUnitMatch = filename.match(/^([a-zA-Z0-9]+)(?:-[a-zA-Z0-9]+)?-u\d+/i);
    if (fileUnitMatch && fileUnitMatch[1]) {
      return fileUnitMatch[1].toLowerCase();
    }

    // General prefix before first hyphen (e.g., a6a-u3 -> a6a, sa1-u1 -> sa1)
    const generalPrefix = filename.match(/^([a-zA-Z0-9]+)-/);
    if (generalPrefix && generalPrefix[1]) {
      return generalPrefix[1].toLowerCase();
    }

    return '';
  }

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let detectedBook = '';
    const fileList = Array.from(files);

    // Filter relevant files (.json, .txt, .md) and ignore non-audio files (recall-map, writing-map, grammar-wizard)
    const validFiles = fileList.filter(f => {
      const name = f.name.toLowerCase();
      if (name.includes('-recall-map') || name.includes('-grammar-wizard') || name.endsWith('tongjia.cjs')) {
        return false;
      }
      return name.endsWith('.json') || name.endsWith('.txt') || name.endsWith('.md');
    });

    if (validFiles.length === 0) {
      addLog(`⚠️ No practice JSON or text files found in selection.`);
      return;
    }

    addLog(`📂 Reading and extracting audio texts from ${validFiles.length} file(s)...`);

    const extractedTextsSet = new Set<string>();

    for (const file of validFiles) {
      try {
        const text = await file.text();
        
        // Auto-infer book key from relative path or filename
        if (!detectedBook) {
          const pathToCheck = (file as any).webkitRelativePath || file.name;
          const inferred = detectBookKeyFromPath(pathToCheck);
          if (inferred) {
            detectedBook = inferred;
          }
        }

        if (file.name.endsWith('.json')) {
          try {
            const parsedJson = JSON.parse(text);
            const items = extractTextsFromParsedJson(parsedJson, file.name);
            items.forEach(t => {
              if (t.trim()) extractedTextsSet.add(t.trim());
            });
          } catch (jsonErr) {
            // Fallback plain text parse
            text.split('\n').forEach(line => {
              const clean = line.trim();
              if (clean && !clean.startsWith('{') && !clean.startsWith('}')) {
                extractedTextsSet.add(clean);
              }
            });
          }
        } else {
          // Plain text / Markdown
          text.split('\n').forEach(line => {
            const clean = line.trim();
            if (clean && !clean.startsWith('#') && !clean.startsWith('---')) {
              extractedTextsSet.add(clean);
            }
          });
        }
      } catch (err: any) {
        addLog(`❌ Failed to read ${file.name}: ${err.message}`);
      }
    }

    const currentBook = detectedBook || bookName;
    if (detectedBook) {
      setBookName(detectedBook);
      setBookError('');
      addLog(`🏷️ Auto-detected Book Key: "${detectedBook}"`);
    }

    const finalSentences = Array.from(extractedTextsSet);
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
    addLog(`✨ Extracted ${tasksList.length} unique audio items from ${validFiles.length} file(s) for book "${currentBook.toLowerCase()}".`);
    
    // Reset file inputs so same files can be reselected if desired
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

  // Update item start / end times and mark which item was edited
  const updateTaskTime = (index: number, field: 'startTime' | 'endTime', value: number) => {
    setLastEditedIndex(index);
    setTasks(prev => prev.map((t, idx) => idx === index ? { ...t, [field]: value } : t));
  };

  // Listen to a specific sentence interval in the raw buffer
  const previewInterval = (start: number, end: number) => {
    if (!rawAudioBuffer) return;
    setActivePlayRange({ start, end });
  };

  // Analyze Audio & Recalculate timestamps for items after the edited index (or all items)
  const analyzeAudioForward = () => {
    if (!rawAudioBuffer || tasks.length === 0) return;

    // Detect / use existing silences
    const silences = rawAudioSilences.length > 0 
      ? rawAudioSilences 
      : detectSilences(rawAudioBuffer, silenceThresholdDb, 0.4);
    
    setRawAudioSilences(silences);

    const fromIndex = lastEditedIndex !== null && lastEditedIndex >= 0 && lastEditedIndex < tasks.length - 1 
      ? lastEditedIndex 
      : 0;

    const startFromTime = (fromIndex === 0 && lastEditedIndex === null) 
      ? 0 
      : (tasks[fromIndex].endTime ?? tasks[fromIndex].startTime ?? 0);

    // Filter silence gaps that occur AFTER the starting anchor time
    const subsequentSilences = silences
      .filter(s => s.start >= startFromTime - 0.05)
      .map(s => ({ ...s, duration: s.end - s.start }))
      .sort((a, b) => a.start - b.start);

    const remainingTasksCount = tasks.length - (fromIndex === 0 && lastEditedIndex === null ? 0 : fromIndex + 1);

    addLog(`🔍 Analyzing audio from item #${fromIndex + 1} (${startFromTime.toFixed(2)}s). Found ${subsequentSilences.length} silence gaps for ${remainingTasksCount} remaining item(s)...`);

    let currentAnchor = startFromTime;
    const updated = [...tasks];

    const startIndexToUpdate = (fromIndex === 0 && lastEditedIndex === null) ? 0 : fromIndex + 1;
    let sIdx = 0;

    for (let i = startIndexToUpdate; i < updated.length; i++) {
      // Find next viable silence gap after currentAnchor + minimum spoken duration (e.g. 0.3s)
      while (sIdx < subsequentSilences.length && subsequentSilences[sIdx].start < currentAnchor + 0.25) {
        sIdx++;
      }

      let nextEnd: number;
      if (sIdx < subsequentSilences.length && i < updated.length - 1) {
        const s = subsequentSilences[sIdx];
        nextEnd = (s.start + s.end) / 2;
        sIdx++;
      } else {
        nextEnd = (i === updated.length - 1) ? rawAudioBuffer.duration : Math.min(rawAudioBuffer.duration, currentAnchor + 5);
      }

      updated[i] = {
        ...updated[i],
        startTime: parseFloat(currentAnchor.toFixed(2)),
        endTime: parseFloat(nextEnd.toFixed(2)),
      };
      currentAnchor = nextEnd;
    }

    setTasks(updated);
    addLog(`✅ Audio analysis completed. Realigned items #${startIndexToUpdate + 1} to #${tasks.length}.`);
  };

  // Helper function to partition tasks into batches
  const partitionTasks = (taskList: TaskItem[]): TaskItem[][] => {
    if (taskList.length === 0) return [];
    if (batchMode === 'count') {
      const chunks: TaskItem[][] = [];
      const size = Math.max(1, batchSize);
      for (let i = 0; i < taskList.length; i += size) {
        chunks.push(taskList.slice(i, i + size));
      }
      return chunks;
    }

    // By text size (chars)
    const chunks: TaskItem[][] = [];
    let currentChunk: TaskItem[] = [];
    let currentLength = 0;
    const maxChars = Math.max(50, batchCharLimit);

    for (const item of taskList) {
      const itemLen = item.text.length + 15; // text length plus separator estimate
      if (currentChunk.length > 0 && currentLength + itemLen > maxChars) {
        chunks.push(currentChunk);
        currentChunk = [item];
        currentLength = itemLen;
      } else {
        currentChunk.push(item);
        currentLength += itemLen;
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    return chunks;
  };

  // Step 1: Request TTS Audio & Calculate Initial Cut Boundaries
  const requestTtsOnly = async () => {
    if (tasks.length === 0) return;
    setIsRunning(true);
    stopRequestedRef.current = false;
    setElapsedSec(0);

    const startTime = Date.now();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const batches = partitionTasks(tasks);
    setTotalBatches(batches.length);
    addLog(`Starting TTS generation: ${tasks.length} items across ${batches.length} batch(es) [Partition: ${batchMode === 'chars' ? `${batchCharLimit} chars max` : `${batchSize} items`}]...`);

    if (keyType === 'custom' && customApiKey) {
      setSetting('tts_custom_api_key', customApiKey);
    }

    const audioCtx = getAudioCtx();
    const is31 = model.includes('3.1');
    const WARMUP = "Warmup sentence. Let's begin.";

    let accumulatedBuffer: AudioBuffer | null = null;
    let accumulatedSilences: AudioSilence[] = [];
    let accumulatedTasks: TaskItem[] = [];

    try {
      for (let bIdx = 0; bIdx < batches.length; bIdx++) {
        if (stopRequestedRef.current) {
          addLog('🛑 Process terminated by user.');
          break;
        }

        setCurrentBatchIdx(bIdx + 1);
        const chunk = batches[bIdx];
        const chunkChars = chunk.reduce((sum, c) => sum + c.text.length, 0);
        addLog(`Processing batch ${bIdx + 1}/${batches.length} (${chunk.length} items, ~${chunkChars} chars)...`);

        let combinedPrompt = '';
        if (is31) {
          const parts = [
            "Read the provided sentences one by one. Insert a silent 3-second gap between every single sentence. Do not blend the sentences together. Do not shorten the silence. Treat each line break as a hard stop.\n",
            `${WARMUP} ...`
          ];
          for (let i = 0; i < chunk.length; i++) {
            const spokenText = chunk[i].ttsOverrideText || chunk[i].text;
            if (i === chunk.length - 1) {
              parts.push(`... ${spokenText}`);
            } else {
              parts.push(`... ${spokenText} ...`);
            }
          }
          combinedPrompt = parts.join('\n[long pause: hold silence for 3 seconds]\n');
        } else {
          combinedPrompt = [WARMUP, ...chunk.map(c => c.ttsOverrideText || c.text)].join(' \n\n. . . . . . . . . .\n\n ');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error("TTS request timed out after 180s")), 180000);

        addLog(`⏳ Sending batch ${bIdx + 1} request to Gemini TTS endpoint...`);
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

        clearTimeout(timeoutId);

        if (!ttsRes.ok) {
          const errData = await ttsRes.json().catch(() => ({}));
          const msg = errData.details || errData.error || `HTTP ${ttsRes.status}`;
          throw new Error(`Gemini rejected batch ${bIdx + 1}: ${msg}`);
        }

        const ttsData = await ttsRes.json();
        const base64Audio = ttsData.data;
        addLog(`📡 Batch ${bIdx + 1} response OK in ${(ttsData.elapsedMs ? ttsData.elapsedMs / 1000 : 0).toFixed(1)}s`);

        // Decode PCM to AudioBuffer
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

        // Detect Silences for this batch chunk
        const chunkSilences = detectSilences(chunkBuffer, silenceThresholdDb, 0.4);
        const candidateSilences = chunkSilences.filter(s => s.start > 0.1);

        let warmupSkipped = false;
        let expectedPauses = chunk.length;
        if (candidateSilences.length === chunk.length - 1) {
          warmupSkipped = true;
          expectedPauses = chunk.length - 1;
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

        const updatedChunkTasks = chunk.map((item, i) => {
          const silenceIndex = warmupSkipped ? i : i + 1;
          const s = sortedSilences[silenceIndex];
          const cutEnd = s ? (s.start + s.end) / 2 : (i === chunk.length - 1 ? chunkBuffer.duration : currentCutStart + 15);
          const taskWithTime: TaskItem = {
            ...item,
            status: 'pending',
            startTime: parseFloat((bufferOffset + currentCutStart).toFixed(2)),
            endTime: parseFloat((bufferOffset + cutEnd).toFixed(2)),
          };
          currentCutStart = cutEnd;
          return taskWithTime;
        });

        accumulatedTasks = [...accumulatedTasks, ...updatedChunkTasks];
        setTasks(accumulatedTasks);

        // Concatenate AudioBuffers if multiple batches
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

      setIsConfigFolded(true); // Automatically fold configuration to highlight waveform & table!
      addLog(`✅ All ${batches.length} batch(es) received (${accumulatedBuffer?.duration.toFixed(1)}s total). Adjust timestamps or cut audio below.`);
    } catch (err: any) {
      addLog(`❌ TTS Error: ${err.message}`);
    } finally {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setIsRunning(false);
    }
  };

  // Step 2: Cut Audio based on current timestamps
  const cutAudioSlices = async () => {
    if (!rawAudioBuffer || tasks.length === 0) return;
    setIsCutting(true);
    addLog(`✂️ Cutting ${tasks.length} items using adjusted timestamps...`);

    const audioCtx = getAudioCtx();
    const sampleRate = rawAudioBuffer.sampleRate;

    const newTasks = [...tasks];
    for (let i = 0; i < newTasks.length; i++) {
      const item = newTasks[i];
      const startTime = item.startTime ?? 0;
      const endTime = item.endTime ?? rawAudioBuffer.duration;

      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.min(rawAudioBuffer.length, Math.floor(endTime * sampleRate));
      const sliceLength = Math.max(1, endSample - startSample);

      const sliceBuffer = audioCtx.createBuffer(rawAudioBuffer.numberOfChannels, sliceLength, sampleRate);
      for (let ch = 0; ch < rawAudioBuffer.numberOfChannels; ch++) {
        sliceBuffer.copyToChannel(rawAudioBuffer.getChannelData(ch).subarray(startSample, endSample), ch);
      }

      // Trim silence with small padding
      const trimmed = trimAudioBuffer(audioCtx, sliceBuffer, -32, 0.08);
      // Encode to MP3
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
    addLog(`🎉 All ${tasks.length} items cut to MP3. Ready for preview or Cloudflare R2 Upload.`);
  };

  // Step 3: Upload Checked Cut MP3s to Cloudflare R2
  const uploadToR2 = async () => {
    const selectedTasks = tasks.filter(t => t.selected !== false);
    if (selectedTasks.length === 0) {
      addLog('⚠️ No items selected for upload. Check at least one item.');
      return;
    }

    setIsUploading(true);
    addLog(`🚀 Uploading ${selectedTasks.length} selected MP3 file(s) (of ${tasks.length} total) to Cloudflare R2...`);

    for (let i = 0; i < tasks.length; i++) {
      const item = tasks[i];
      if (item.selected === false) {
        // Skip unselected item
        continue;
      }

      if (!item.audioBlob) {
        addLog(`⚠️ Item #${i + 1} (${item.text}) has no cut audio. Cutting now...`);
        // Fallback cut
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
            setTasks(prev => prev.map(t => t.hash === item.hash ? { ...t, status: 'done', audioUrl: upData.url } : t));
          } else {
            setTasks(prev => prev.map(t => t.hash === item.hash ? { ...t, status: 'error', error: 'Upload failed' } : t));
          }
        } catch (e: any) {
          setTasks(prev => prev.map(t => t.hash === item.hash ? { ...t, status: 'error', error: e.message } : t));
        }
      }
    }

    setIsUploading(false);
    addLog(`✨ Cloudflare R2 Upload Completed for selected items!`);
  };

  if (!isAuthed) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top, #1e293b, #0b0f19)' }}>
        <form onSubmit={handleLogin} style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59,130,246,0.1)', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>
            <KeyRound size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>TTS Studio Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Enter passcode to unlock remote TTS pipeline</p>
          
          <input
            type="password"
            placeholder="Enter passcode"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem', padding: '0.75rem' }}
            required
          />

          {authError && <div style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}

          <button
            type="submit"
            style={{ width: '100%', padding: '0.75rem', background: 'var(--accent-primary)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}
          >
            Unlock Studio
          </button>
        </form>
      </div>
    );
  }

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
        {/* Left Control Panel (Collapsible) */}
        {!isConfigFolded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings2 size={18} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>Configuration</h2>
              </div>
              <button onClick={() => setIsConfigFolded(true)} style={{ color: 'var(--text-muted)' }}>
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
                onClick={() => { setTasks([]); setRawInput(''); setRawAudioBuffer(null); }}
                style={{ padding: '0.6rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-rose)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={requestTtsOnly}
                disabled={isRunning || tasks.length === 0}
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
                  opacity: tasks.length === 0 ? 0.5 : 1
                }}
              >
                {isRunning ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
                {isRunning ? `Generating (${elapsedSec}s)...` : `Generate TTS Audio (${tasks.length} Items)`}
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
        )}

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
                    disabled={isCutting}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--accent-amber)',
                      color: '#000',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <Scissors size={16} />
                    {isCutting ? 'Cutting...' : 'Cut Audio Slices'}
                  </button>

                  <button
                    onClick={uploadToR2}
                    disabled={isUploading || tasks.filter(t => t.selected !== false).length === 0}
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
                      opacity: (isUploading || tasks.filter(t => t.selected !== false).length === 0) ? 0.6 : 1,
                      cursor: (isUploading || tasks.filter(t => t.selected !== false).length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Upload size={16} />
                    {isUploading 
                      ? 'Uploading to R2...' 
                      : `Upload (${tasks.filter(t => t.selected !== false).length}) to R2`}
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

          {/* Task Status Table with Editable Starting/Ending Times */}
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
                  Selected: <strong style={{ color: 'var(--text-primary)' }}>{tasks.filter(t => t.selected !== false).length}</strong> / {tasks.length} • Uploaded: <strong style={{ color: 'var(--accent-emerald)' }}>{tasks.filter(t => t.status === 'done').length}</strong>
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
                    tasks.map((task, idx) => (
                      <tr
                        key={task.hash}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: task.selected === false ? 'rgba(0,0,0,0.2)' : 'transparent',
                          opacity: task.selected === false ? 0.6 : 1,
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
                            background: task.status === 'done' ? 'rgba(16,185,129,0.15)' : task.status === 'error' ? 'rgba(244,63,94,0.15)' : 'rgba(59,130,246,0.15)',
                            color: task.status === 'done' ? 'var(--accent-emerald)' : task.status === 'error' ? 'var(--accent-rose)' : 'var(--accent-primary)',
                          }}>
                            {task.status}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Console */}
          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Activity Log</h3>
            <div style={{ height: '120px', overflowY: 'auto', background: 'var(--bg-main)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>
        </div>
      </div>

      <audio ref={audioPlayerRef} style={{ display: 'none' }} />
    </div>
  );
}
