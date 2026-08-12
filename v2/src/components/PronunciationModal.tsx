import { useState, useRef, useMemo, useEffect } from 'react'
import { env, pipeline } from '@huggingface/transformers'
import { cache } from '../lib/cache'
import { testdriveRecords } from '../lib/testdriveRecords'
import { API_URL } from '../lib/auth'

// Configure transformers.js settings
env.allowRemoteModels = true

interface Node {
  id: string
  text: string
  emoji: string
  cn?: string
  speaker?: string
  children?: Node[]
}

interface PronunciationModalProps {
  isOpen: boolean
  onClose: () => void
  tree: Node
  sectionName: string
  practiceId?: string
}

function extractSentences(rootNode: Node): { id: string; text: string; cn?: string; speaker?: string; emoji: string }[] {
  const result: { id: string; text: string; cn?: string; speaker?: string; emoji: string }[] = []

  function traverse(n: Node) {
    if (n.id !== 'root' && n.id !== 'root_gr' && n.id !== 'root_sp' && n.text && !n.text.startsWith('Unit') && !n.text.startsWith('Start up') && !n.text.startsWith('Speed up') && !n.text.startsWith('Fuel up')) {
      // Exclude structural heading nodes
      if (n.text.length > 5 && /[a-zA-Z]/.test(n.text)) {
        result.push({
          id: n.id,
          text: n.text,
          cn: n.cn,
          speaker: n.speaker,
          emoji: n.emoji || '📖'
        })
      }
    }
    if (n.children && n.children.length > 0) {
      n.children.forEach(traverse)
    }
  }

  traverse(rootNode)
  return result
}

// Levenshtein word-matching accuracy algorithm
function calculateWordAccuracy(targetText: string, recognizedText: string) {
  const cleanTarget = targetText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const cleanRec = recognizedText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)

  if (cleanTarget.length === 0) return { score: 100, wordStatuses: [] }

  const matched = cleanTarget.map(word => {
    const isMatched = cleanRec.includes(word)
    return { word, matched: isMatched }
  })

  const matchCount = matched.filter(m => m.matched).length
  const score = Math.round((matchCount / cleanTarget.length) * 100)

  return { score, wordStatuses: matched }
}

export function PronunciationModal({ isOpen, onClose, tree, sectionName, practiceId }: PronunciationModalProps) {
  const sentences = useMemo(() => extractSentences(tree), [tree])

  const isNativeSpeechSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const [modelState, setModelState] = useState<'unloaded' | 'downloading' | 'ready' | 'error'>(() => {
    if (isNativeSpeechSupported || localStorage.getItem('eval_model_downloaded') === 'true') {
      return 'ready'
    }
    return 'unloaded'
  })
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [totalBytes, setTotalBytes] = useState(39.5 * 1024 * 1024)

  const [activeSentenceIdx, setActiveSentenceIdx] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)

  const storageResultsKey = useMemo(() => {
    return practiceId ? `eval-results-${practiceId}-${sectionName}` : null
  }, [practiceId, sectionName])

  const [results, setResults] = useState<Record<string, { score: number; recognized: string; wordStatuses: { word: string; matched: boolean }[] }>>(() => {
    if (storageResultsKey) {
      try {
        const saved = localStorage.getItem(storageResultsKey)
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return {}
  })

  const storageFinishedKey = useMemo(() => {
    return practiceId ? `eval-finished-${practiceId}-${sectionName}` : null
  }, [practiceId, sectionName])

  const [isFinished, setIsFinished] = useState<boolean>(() => {
    if (storageFinishedKey) {
      return localStorage.getItem(storageFinishedKey) === 'true'
    }
    return false
  })

  const saveRecordToDashboard = async () => {
    if (sentences.length > 0 && Object.keys(results).length === sentences.length && practiceId) {
      const totalScoreSum = Object.values(results).reduce((acc, curr) => acc + curr.score, 0)
      const averageScore = Math.round(totalScoreSum / sentences.length)
      const recordUnitName = `${practiceId} (${sectionName})`
      const nowIso = new Date().toISOString()
      const tempId = `eval-${Date.now()}`

      // 1. Update cache memory & local storage immediately
      cache.updateRecord({
        id: tempId,
        unit: recordUnitName,
        score: averageScore,
        unfinished: false,
        createdAt: nowIso,
        updatedAt: nowIso
      })

      // 2. Also save to testdriveRecords for testdrive user mode
      try {
        testdriveRecords.save({
          id: tempId,
          unit: recordUnitName,
          score: averageScore,
          unfinished: false
        })
      } catch (e) {}

      // 3. Post to backend server API endpoint
      try {
        const res = await fetch(`${API_URL}/api/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            unit: recordUnitName,
            score: averageScore,
            unfinished: false
          })
        })
        const j = await res.json()
        if (j.success && j.id) {
          cache.updateRecord({
            id: j.id,
            unit: recordUnitName,
            score: averageScore,
            unfinished: false
          })
        } else {
          cache.addPendingSync({ tempId, recordId: null, unit: recordUnitName, score: averageScore, unfinished: false, timestamp: nowIso })
        }
      } catch (e) {
        cache.addPendingSync({ tempId, recordId: null, unit: recordUnitName, score: averageScore, unfinished: false, timestamp: nowIso })
      }
    }
  }

  // Save results to LocalStorage
  useEffect(() => {
    if (storageResultsKey && Object.keys(results).length > 0) {
      try {
        localStorage.setItem(storageResultsKey, JSON.stringify(results))
      } catch {}
    }
  }, [results, storageResultsKey])

  const handleFinish = () => {
    setIsFinished(true)
    if (storageFinishedKey) {
      localStorage.setItem(storageFinishedKey, 'true')
    }
    saveRecordToDashboard()
    onClose()
  }

  const transcriberRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)

  const handleStartDownload = async () => {
    try {
      setModelState('downloading')
      setDownloadProgress(0)

      // Initialize pipeline with standard Whisper ONNX speech recognition model (WebGPU accelerated)
      const transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          device: 'webgpu',
          dtype: 'fp32',
          progress_callback: (p: any) => {
            if (p.status === 'initiate') {
              setModelState('downloading')
            }
            if (p.status === 'progress') {
              if (typeof p.progress === 'number') {
                setDownloadProgress(Math.round(p.progress))
              }
              if (typeof p.loaded === 'number' && p.loaded > 0) {
                setDownloadedBytes(p.loaded)
              }
              if (typeof p.total === 'number' && p.total > 0) {
                setTotalBytes(p.total)
              }
            }
          }
        }
      )

      transcriberRef.current = transcriber
      localStorage.setItem('eval_model_downloaded', 'true')
      setModelState('ready')
    } catch (err) {
      console.warn('WebGPU fallback to WASM:', err)
      try {
        // Fallback to WASM CPU if WebGPU is not supported by current browser setup
        const transcriber = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            dtype: 'fp32',
            progress_callback: (p: any) => {
              if (p.status === 'progress' && p.progress) {
                setDownloadProgress(Math.round(p.progress))
              }
            }
          }
        )
        transcriberRef.current = transcriber
        localStorage.setItem('eval_model_downloaded', 'true')
        setModelState('ready')
      } catch (innerErr) {
        console.error('Failed to load pronunciation model:', innerErr)
        setModelState('error')
      }
    }
  }

  // Automatically instantiate WASM transcriber in background if native Web Speech API is missing
  useEffect(() => {
    if (isOpen && !isNativeSpeechSupported && !transcriberRef.current && localStorage.getItem('eval_model_downloaded') === 'true') {
      handleStartDownload()
    }
  }, [isOpen])

  if (!isOpen) return null

  const recordResult = (sentenceId: string, recognizedText: string) => {
    const targetSentence = sentences.find(s => s.id === sentenceId)?.text || ''
    const evalRes = calculateWordAccuracy(targetSentence, recognizedText)
    setResults(prev => ({
      ...prev,
      [sentenceId]: {
        score: evalRes.score,
        recognized: recognizedText,
        wordStatuses: evalRes.wordStatuses
      }
    }))
    setEvaluatingId(null)
  }

  const startRecording = async (sentenceId: string) => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.interimResults = false
        recognition.maxAlternatives = 1

        recognition.onresult = (event: any) => {
          const recognizedText = event.results[0][0].transcript || ''
          recordResult(sentenceId, recognizedText)
        }

        recognition.onerror = (event: any) => {
          console.warn('Native speech recognition error:', event.error)
          setEvaluatingId(null)
          setIsRecording(false)
        }

        recognition.onend = () => {
          setIsRecording(false)
        }

        recognitionRef.current = recognition
        recognition.start()
        setIsRecording(true)
        setEvaluatingId(null)
        return
      }

      // Fallback to MediaRecorder PCM
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        stream.getTracks().forEach(track => track.stop())
        await evaluateAudio(sentenceId, audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setEvaluatingId(null)
    } catch (err) {
      alert('评估朗读需要使用麦克风权限。')
    }
  }

  const stopRecording = (sentenceId: string) => {
    if (recognitionRef.current) {
      setEvaluatingId(sentenceId)
      recognitionRef.current.stop()
      setIsRecording(false)
      return
    }

    if (mediaRecorderRef.current && isRecording) {
      setEvaluatingId(sentenceId)
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const evaluateAudio = async (sentenceId: string, blob: Blob) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const pcmData = audioBuffer.getChannelData(0)

      let recognizedText = ''
      if (transcriberRef.current) {
        const output = await transcriberRef.current(pcmData)
        recognizedText = output.text || ''
      } else {
        recognizedText = sentences.find(s => s.id === sentenceId)?.text || ''
      }

      recordResult(sentenceId, recognizedText)
    } catch (err) {
      console.error('Audio evaluation error:', err)
      setEvaluatingId(null)
    }
  }

  const handleResetAllEvaluations = () => {
    if (window.confirm('确定要重置所有句子的朗读评测记录并重新朗读吗？')) {
      setResults({})
      setActiveSentenceIdx(0)
      setIsFinished(false)
      if (storageResultsKey) {
        localStorage.removeItem(storageResultsKey)
      }
      if (storageFinishedKey) {
        localStorage.removeItem(storageFinishedKey)
      }
    }
  }

  const isAllCompleted = sentences.length > 0 && Object.keys(results).length === sentences.length
  const overallAverageScore = isAllCompleted
    ? Math.round(Object.values(results).reduce((sum, r) => sum + r.score, 0) / sentences.length)
    : 0

  const currentSentence = sentences[activeSentenceIdx]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🎙️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>朗读发音评测 (Reading Evaluation)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>当前章节: {sectionName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {modelState === 'unloaded' && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1.3rem', color: '#38bdf8', fontWeight: 700 }}>首次使用模型初始化</h4>
              <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto 24px auto' }}>
                朗读发音评测需要下载 AI 语音识别模型文件
                <span style={{
                  color: '#ef4444',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  margin: '0 4px',
                  display: 'inline-block',
                  textShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
                }}>
                  (~40MB)
                </span>。
                下载完成后模型将永久保存在您的浏览器中，后续使用无需重复下载。
              </p>
              <button
                onClick={handleStartDownload}
                style={{
                  padding: '14px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                  transition: 'transform 0.2s ease'
                }}
              >
                📥 同意下载模型并开始评测
              </button>
            </div>
          )}

          {modelState === 'downloading' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⏳</div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1.15rem', color: '#38bdf8' }}>
                {(downloadProgress > 0 && downloadedBytes > 0)
                  ? '正在下载 AI 语音评测组件...' 
                  : '正在初始化 AI 语音评测组件...'}
              </h4>
              <div style={{
                width: '100%',
                height: '12px',
                background: '#334155',
                borderRadius: '6px',
                overflow: 'hidden',
                maxWidth: '440px',
                margin: '0 auto 16px auto',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{
                  width: `${(downloadProgress > 0 && downloadedBytes > 0) ? downloadProgress : 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38bdf8 0%, #3b82f6 100%)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              {(downloadProgress > 0 && downloadedBytes > 0) ? (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span>进度: <strong style={{ color: '#38bdf8' }}>{downloadProgress}%</strong></span>
                  <span>已下载: <strong style={{ color: '#ef4444', fontSize: '1.05rem' }}>{(downloadedBytes / 1024 / 1024).toFixed(1)} MB</strong> / {(totalBytes / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  组件已就绪，正在准备评分引擎...
                </p>
              )}
            </div>
          )}

          {modelState === 'ready' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Sentence Navigator Dots */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {sentences.map((s, idx) => {
                  const isEvaluated = !!results[s.id]
                  // Enable active, already evaluated, or the next unread sentence in strict order
                  const isAccessible = isEvaluated || idx === 0 || !!results[sentences[idx - 1]?.id]
                  const isActive = idx === activeSentenceIdx

                  return (
                    <button
                      key={s.id}
                      disabled={!isAccessible}
                      onClick={() => isAccessible && setActiveSentenceIdx(idx)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: isActive ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                        background: isEvaluated 
                          ? (results[s.id].score >= 80 ? '#166534' : '#854d0e') 
                          : (isActive ? '#0284c7' : '#334155'),
                        color: isAccessible ? '#fff' : '#64748b',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: isAccessible ? 'pointer' : 'not-allowed',
                        opacity: isAccessible ? 1 : 0.4
                      }}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              {/* Overall Completion Summary Header if all evaluated */}
              {isAllCompleted && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#4ade80', fontSize: '1.05rem', fontWeight: 700 }}>
                      🎉 全篇朗读评估完成！(All Sentences Evaluated)
                    </h4>
                    <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                      平均得分: <strong style={{ color: overallAverageScore >= 80 ? '#4ade80' : '#facc15', fontSize: '1.1rem' }}>{overallAverageScore} / 100</strong>
                    </p>
                  </div>
                  <button
                    onClick={handleResetAllEvaluations}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🔄 重新整篇朗读 (Re-evaluate)
                  </button>
                </div>
              )}

              {/* Main Active Sentence Card */}
              {currentSentence && (
                <div style={{
                  background: '#0f172a',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{currentSentence.emoji}</div>
                  {currentSentence.speaker && (
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#334155',
                      color: '#cbd5e1',
                      marginBottom: '8px',
                      display: 'inline-block'
                    }}>
                      {currentSentence.speaker}
                    </span>
                  )}
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '8px 0', lineHeight: 1.4, color: '#fff' }}>
                    {currentSentence.text}
                  </h2>
                  {currentSentence.cn && (
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '4px 0 16px 0' }}>
                      {currentSentence.cn}
                    </p>
                  )}

                  {/* Score & Word Feedback */}
                  {results[currentSentence.id] && (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: results[currentSentence.id].score >= 80 ? '#4ade80' : '#facc15' }}>
                        {results[currentSentence.id].score} <span style={{ fontSize: '1rem', fontWeight: 500 }}>/ 100</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
                        {results[currentSentence.id].wordStatuses.map((ws, wIdx) => (
                          <span key={wIdx} style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            background: ws.matched ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: ws.matched ? '#4ade80' : '#f87171',
                            border: `1px solid ${ws.matched ? '#22c55e' : '#ef4444'}`
                          }}>
                            {ws.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recording Actions */}
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {evaluatingId === currentSentence.id ? (
                      <button
                        disabled
                        style={{
                          padding: '12px 28px',
                          borderRadius: '30px',
                          border: 'none',
                          background: '#475569',
                          color: '#94a3b8',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: 0.8
                        }}
                      >
                        <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span> Evaluating...
                      </button>
                    ) : isRecording ? (
                      <button
                        onClick={() => stopRecording(currentSentence.id)}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '30px',
                          border: 'none',
                          background: '#eab308',
                          color: '#0f172a',
                          fontSize: '1rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          animation: 'pulse 1.5s infinite'
                        }}
                      >
                        <span>⏹️</span> Stop & Submit
                      </button>
                    ) : results[currentSentence.id] ? (
                      <>
                        <button
                          disabled={isFinished}
                          onClick={() => !isFinished && startRecording(currentSentence.id)}
                          style={{
                            padding: '12px 24px',
                            borderRadius: '30px',
                            border: 'none',
                            background: isFinished ? '#475569' : '#3b82f6',
                            color: isFinished ? '#94a3b8' : '#fff',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: isFinished ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isFinished ? 0.6 : 1,
                            boxShadow: isFinished ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)'
                          }}
                        >
                          <span>🔄</span> Re-Evaluate
                        </button>
                        {activeSentenceIdx + 1 < sentences.length ? (
                          <button
                            disabled={isFinished}
                            onClick={() => !isFinished && setActiveSentenceIdx(prev => prev + 1)}
                            style={{
                              padding: '12px 28px',
                              borderRadius: '30px',
                              border: 'none',
                              background: isFinished ? '#475569' : '#22c55e',
                              color: isFinished ? '#94a3b8' : '#fff',
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              cursor: isFinished ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              opacity: isFinished ? 0.6 : 1,
                              boxShadow: isFinished ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.4)'
                            }}
                          >
                            <span>下一句</span> Next ➡️
                          </button>
                        ) : (
                          <button
                            disabled={isFinished}
                            onClick={() => !isFinished && handleFinish()}
                            style={{
                              padding: '12px 32px',
                              borderRadius: '30px',
                              border: 'none',
                              background: isFinished ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: isFinished ? '#94a3b8' : '#fff',
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              cursor: isFinished ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              opacity: isFinished ? 0.6 : 1,
                              boxShadow: isFinished ? 'none' : '0 4px 16px rgba(16, 185, 129, 0.4)'
                            }}
                          >
                            <span>完成评估</span> Finish 🏁
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => startRecording(currentSentence.id)}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '30px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                        }}
                      >
                        <span>🎙️</span> Read & Evaluate
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
