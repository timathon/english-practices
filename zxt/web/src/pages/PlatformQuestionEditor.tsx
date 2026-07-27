import React, { useState, useEffect, useCallback } from 'react';
import { apiService, canEditQuizLibrary, Poem, PoemQuestion, OrderingItem } from '../services/api';
import { playAnswerSFX } from '../utils/sound';

// ── shared image lightbox ──────────────────────────────────────────────────

const ImageLightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div
    className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
      <img src={src} alt="full-size preview" className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]" />
      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-red-500 font-bold text-sm transition"
      >✕</button>
    </div>
  </div>
);

// ── helpers ────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

const QUESTION_TYPE_LABELS: Record<string, string> = {
  LineAssembly:   '连句组装',
  VerseCloze:    '诗句填空',
  PinyinMatch:   '拼音辨析',
  TextToCn:      '诗意理解',
  CulturalContext:'文化背景',
  ImageOrdering: '插图排序',
  ImageToLine:   '图配句',
};

const ALL_TYPES = Object.keys(QUESTION_TYPE_LABELS);

const TYPE_COLORS: Record<string, string> = {
  LineAssembly:   'bg-violet-100 text-violet-800 border-violet-200',
  VerseCloze:    'bg-teal-100 text-teal-800 border-teal-200',
  PinyinMatch:   'bg-sky-100 text-sky-800 border-sky-200',
  TextToCn:      'bg-amber-100 text-amber-800 border-amber-200',
  CulturalContext:'bg-rose-100 text-rose-800 border-rose-200',
  ImageOrdering: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ImageToLine:   'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function makeBlankQuestion(type: string): PoemQuestion {
  const id = genId();
  if (type === 'LineAssembly') {
    return { id, type: 'LineAssembly', line_index: 0, prompt: '', distractor_chars: [], answer: '' };
  }
  if (type === 'ImageOrdering') {
    return { id, type: 'ImageOrdering', prompt: '', images: [], explanation: '' };
  }
  if (type === 'ImageToLine') {
    return { id, type: 'ImageToLine', prompt: '', image: '', options: ['', '', '', ''], answer: 0, explanation: '' };
  }
  // VerseCloze, PinyinMatch, TextToCn, CulturalContext
  const optCount = type === 'VerseCloze' ? 6 : 4;
  return { id, type: type as any, prompt: '', options: Array(optCount).fill(''), answer: 0, explanation: '' };
}

// ── tag chip input ────────────────────────────────────────────────────────

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}
const TagInput: React.FC<TagInputProps> = ({ label, tags, onChange }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v) { onChange([...tags, v]); setInput(''); }
  };
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-1 p-2 border border-slate-200 rounded-lg bg-slate-50 min-h-[36px]">
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-violet-100 text-violet-800 text-xs px-2 py-0.5 rounded-full font-mono">
            {t}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-violet-400 hover:text-red-500 leading-none">×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder="输入后按 Enter 添加"
          className="flex-1 min-w-[80px] bg-transparent text-xs outline-none"
        />
      </div>
      <p className="text-[10px] text-slate-400">按 Enter 或逗号分隔添加</p>
    </div>
  );
};

// ── per-question editor panels ────────────────────────────────────────────

interface QEditorProps {
  q: PoemQuestion;
  onChange: (q: PoemQuestion) => void;
  onPreview: (src: string) => void;
}

const LineAssemblyEditor: React.FC<QEditorProps> = ({ q, onChange }) => {
  if (q.type !== 'LineAssembly') return null;
  const set = (patch: Partial<typeof q>) => onChange({ ...q, ...patch } as PoemQuestion);
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">题目提示 (Prompt)</label>
        <input value={q.prompt} onChange={e => set({ prompt: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-serif" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">诗句行号 (Line Index)</label>
          <input type="number" min={0} value={q.line_index} onChange={e => set({ line_index: Number(e.target.value) })}
            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">正确答案 (Answer)</label>
          <input value={q.answer as string} onChange={e => set({ answer: e.target.value })}
            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-serif" />
        </div>
      </div>
      <TagInput label="干扰字 (Distractor Chars)" tags={q.distractor_chars} onChange={v => set({ distractor_chars: v })} />
    </div>
  );
};

const MCEditor: React.FC<QEditorProps & { optCount: number }> = ({ q, onChange, optCount }) => {
  if (q.type === 'LineAssembly' || q.type === 'ImageOrdering' || q.type === 'ImageToLine') return null;
  const set = (patch: any) => onChange({ ...q, ...patch } as PoemQuestion);
  const opts = (q.options || []).length === optCount ? q.options! : [...(q.options || []), ...Array(optCount).fill('')].slice(0, optCount);
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">题目提示 (Prompt)</label>
        <textarea value={q.prompt} onChange={e => set({ prompt: e.target.value })} rows={2}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-serif resize-none" />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">选项 (Options) — 点击⭐选为正确答案</label>
        <div className="mt-1 space-y-1.5">
          {opts.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => set({ answer: i, options: opts })}
                className={`w-6 h-6 rounded-full flex-shrink-0 border-2 text-xs font-bold transition ${
                  q.answer === i ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 text-slate-400 hover:border-teal-400'
                }`}
              >{i}</button>
              <input
                value={opt}
                onChange={e => {
                  const updated = [...opts];
                  updated[i] = e.target.value;
                  set({ options: updated });
                }}
                className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-sm"
                placeholder={`选项 ${i}`}
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">当前正确答案: 选项 {q.answer}</p>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">解析 (Explanation)</label>
        <textarea value={(q as any).explanation || ''} onChange={e => set({ explanation: e.target.value })} rows={2}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm resize-none" />
      </div>
    </div>
  );
};

const ImageOrderingEditor: React.FC<QEditorProps> = ({ q, onChange, onPreview }) => {
  if (q.type !== 'ImageOrdering') return null;
  const set = (patch: Partial<typeof q>) => onChange({ ...q, ...patch } as PoemQuestion);
  const images: string[] = q.images || [];
  const addImage = () => set({ images: [...images, ''] });
  const removeImage = (i: number) => set({ images: images.filter((_: string, j: number) => j !== i) });
  const updateImage = (i: number, val: string) => { const u = [...images]; u[i] = val; set({ images: u }); };
  const moveImage = (i: number, dir: -1 | 1) => {
    const u = [...images]; const ni = i + dir;
    if (ni < 0 || ni >= u.length) return;
    [u[i], u[ni]] = [u[ni], u[i]]; set({ images: u });
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">题目提示 (Prompt)</label>
        <input value={q.prompt} onChange={e => set({ prompt: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-serif" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">图片 — 正确顺序 (Correct Order)</label>
            <p className="text-[10px] text-slate-400 mt-0.5">前端出题时自动打乱 · Frontend shuffles at runtime</p>
          </div>
          <button onClick={addImage} className="text-xs text-teal-600 hover:text-teal-500 font-bold flex-shrink-0">+ 添加图片</button>
        </div>
        <div className="space-y-2">
          {images.map((img, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-400 font-mono w-4 flex-shrink-0 text-center">{i + 1}</span>
              {img ? (
                <img src={img} alt={`img-${i}`} onClick={() => onPreview(img)}
                  className="w-12 h-12 object-cover rounded border border-slate-200 flex-shrink-0 cursor-zoom-in hover:opacity-80 transition" />
              ) : (
                <div className="w-12 h-12 rounded border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300 text-xs">🖼</div>
              )}
              <input value={img} onChange={e => updateImage(i, e.target.value)}
                placeholder="/assets/blg/poems/p1_l1.webp"
                className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs font-mono" />
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveImage(i, -1)} disabled={i === 0}
                  className="text-[10px] text-slate-400 hover:text-indigo-500 disabled:opacity-20 leading-none">▲</button>
                <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1}
                  className="text-[10px] text-slate-400 hover:text-indigo-500 disabled:opacity-20 leading-none">▼</button>
              </div>
              <button onClick={() => removeImage(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          ))}
          {images.length === 0 && (
            <div className="text-xs text-slate-400 text-center py-3">暂无图片，点击"添加图片"</div>
          )}
        </div>
      </div>
    </div>
  );
};
const ImageToLineEditor: React.FC<QEditorProps> = ({ q, onChange, onPreview }) => {
  if (q.type !== 'ImageToLine') return null;
  const set = (patch: any) => onChange({ ...q, ...patch } as PoemQuestion);
  const opts = q.options || ['', '', '', ''];
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">题目提示 (Prompt)</label>
        <input value={q.prompt} onChange={e => set({ prompt: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-serif" />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">图片路径 (Image URL)</label>
        <input value={q.image} onChange={e => set({ image: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono" />
        {q.image ? (
          <img src={q.image} alt="preview"
            onClick={() => onPreview(q.image)}
            className="mt-2 h-28 rounded-lg border border-slate-200 object-cover cursor-zoom-in hover:opacity-80 transition" />
        ) : (
          <div className="mt-2 h-28 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300 text-sm">🖼 图片预览</div>
        )}
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">选项 (Options) — 点击序号选为正确答案</label>
        <div className="mt-1 space-y-1.5">
          {opts.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => set({ answer: i })}
                className={`w-6 h-6 rounded-full flex-shrink-0 border-2 text-xs font-bold transition ${
                  q.answer === i ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-slate-400 hover:border-emerald-400'
                }`}
              >{i}</button>
              <input value={opt} onChange={e => {
                const updated = [...opts]; updated[i] = e.target.value; set({ options: updated });
              }}
                className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-sm font-serif"
                placeholder={`诗句选项 ${i}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">解析 (Explanation)</label>
        <textarea value={q.explanation || ''} onChange={e => set({ explanation: e.target.value })} rows={2}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm resize-none" />
      </div>
    </div>
  );
};

function QuestionEditor({ q, onChange, onPreview }: QEditorProps) {
  if (q.type === 'LineAssembly') return <LineAssemblyEditor q={q} onChange={onChange} onPreview={onPreview} />;
  if (q.type === 'ImageOrdering') return <ImageOrderingEditor q={q} onChange={onChange} onPreview={onPreview} />;
  if (q.type === 'ImageToLine') return <ImageToLineEditor q={q} onChange={onChange} onPreview={onPreview} />;
  if (q.type === 'VerseCloze') return <MCEditor q={q} onChange={onChange} onPreview={onPreview} optCount={6} />;
  return <MCEditor q={q} onChange={onChange} onPreview={onPreview} optCount={4} />;
}

// ── student quiz preview modal ─────────────────────────────────────────────

interface StudentQuizPreviewModalProps {
  poemTitle: string;
  questions: PoemQuestion[];
  initialIndex: number;
  onClose: () => void;
}

const StudentQuizPreviewModal: React.FC<StudentQuizPreviewModalProps> = ({
  poemTitle,
  questions,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [scrambledPool, setScrambledPool] = useState<string[]>([]);
  const [mcSelection, setMcSelection] = useState<number | null>(null);

  // Sampled options & mapped answer index (used for VerseCloze 4-option sampling)
  const [displayedOptions, setDisplayedOptions] = useState<string[]>([]);
  const [mappedAnswerIndex, setMappedAnswerIndex] = useState<number>(0);
  
  // ImageOrdering state: Bank, Placed Slots, Selected Source
  const [bankImages, setBankImages] = useState<string[]>([]);
  const [placedSlots, setPlacedSlots] = useState<(string | null)[]>([]);
  const [selectedSource, setSelectedSource] = useState<{ type: 'bank' | 'slot'; index: number } | null>(null);

  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);

  const q = questions[currentIndex];

  useEffect(() => {
    setFeedback(null);
    setMcSelection(null);
    if (!q) return;

    if (q.type === 'LineAssembly') {
      const ansChars = (q.answer || '').split('');
      const distChars = q.distractor_chars || [];
      const all = [...ansChars, ...distChars];
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      setScrambledPool(shuffled);
      setSelectedChars([]);
    } else if (q.type === 'ImageOrdering') {
      const imgs = [...(q.images || [])];
      const shuffled = [...imgs].sort(() => Math.random() - 0.5);
      setBankImages(shuffled);
      setPlacedSlots(Array(imgs.length).fill(null));
      setSelectedSource(null);
    }

    if (q.type === 'VerseCloze') {
      const rawOpts = q.options || [];
      const correctOpt = rawOpts[q.answer] ?? rawOpts[0] ?? '';
      const distractors = rawOpts.filter((_, idx) => idx !== q.answer);
      const sampledDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
      const combined = [correctOpt, ...sampledDistractors].sort(() => Math.random() - 0.5);
      setDisplayedOptions(combined);
      setMappedAnswerIndex(combined.indexOf(correctOpt));
    } else if (q.type !== 'LineAssembly' && q.type !== 'ImageOrdering') {
      setDisplayedOptions(q.options || []);
      setMappedAnswerIndex(q.answer);
    }
  }, [currentIndex, q]);

  if (!q) return null;

  const handleVerify = () => {
    if (q.type === 'LineAssembly') {
      const studentAns = selectedChars.join('');
      if (studentAns === q.answer) {
        playAnswerSFX('correct');
        setFeedback({ isCorrect: true, text: '🎉 回答正确！精准拼接出了正确的诗句。' });
      } else {
        playAnswerSFX('wrong');
        setFeedback({ isCorrect: false, text: `❌ 还需要加油哦！正确诗句是：“${q.answer}”` });
      }
    } else if (q.type === 'ImageOrdering') {
      if (placedSlots.some(slot => slot === null)) {
        alert('请将所有备选图片放入对应的目标位置后再提交！');
        return;
      }
      const isMatch = (q.images || []).every((img, idx) => img === placedSlots[idx]);
      if (isMatch) {
        playAnswerSFX('correct');
        setFeedback({ isCorrect: true, text: '🎉 排序正确！插图与诗句发展顺序完全一致。' });
      } else {
        playAnswerSFX('wrong');
        setFeedback({ isCorrect: false, text: '❌ 图片顺序不对哦，请参照古诗故事情节重新排列。' });
      }
    } else {
      if (mcSelection === null) {
        alert('请先选择一个答案选项！');
        return;
      }
      if (mcSelection === q.answer) {
        playAnswerSFX('correct');
        setFeedback({
          isCorrect: true,
          text: `🎉 回答正确！${q.explanation ? `
解析：${q.explanation}` : ''}`
        });
      } else {
        playAnswerSFX('wrong');
        setFeedback({
          isCorrect: false,
          text: `❌ 回答错误。正确答案是选项 ${q.answer + 1}${q.options ? `: ${q.options[q.answer]}` : ''}${q.explanation ? `
解析：${q.explanation}` : ''}`
        });
      }
    }
  };

  // ImageOrdering click handling
  const handleBankImageClick = (bankIdx: number) => {
    if (selectedSource?.type === 'bank' && selectedSource.index === bankIdx) {
      setSelectedSource(null);
    } else {
      setSelectedSource({ type: 'bank', index: bankIdx });
    }
  };

  const handleSlotClick = (targetSlotIdx: number) => {
    if (!selectedSource) {
      // If no image is selected, but slot has an image, select this slot image
      if (placedSlots[targetSlotIdx] !== null) {
        setSelectedSource({ type: 'slot', index: targetSlotIdx });
      }
      return;
    }

    // Determine the source image to move
    let sourceImg: string | null = null;
    if (selectedSource.type === 'bank') {
      sourceImg = bankImages[selectedSource.index];
    } else {
      sourceImg = placedSlots[selectedSource.index];
    }

    if (!sourceImg) return;

    const existingTargetImg = placedSlots[targetSlotIdx];
    const newPlaced = [...placedSlots];
    const newBank = [...bankImages];

    // Remove source from its original location
    if (selectedSource.type === 'bank') {
      newBank.splice(selectedSource.index, 1);
    } else {
      newPlaced[selectedSource.index] = null;
    }

    // If target slot had an existing image, return it to bank
    if (existingTargetImg) {
      newBank.push(existingTargetImg);
    }

    // Place source into target slot
    newPlaced[targetSlotIdx] = sourceImg;

    setPlacedSlots(newPlaced);
    setBankImages(newBank);
    setSelectedSource(null);
  };

  const returnSlotToBank = (slotIdx: number) => {
    const img = placedSlots[slotIdx];
    if (!img) return;
    const newPlaced = [...placedSlots];
    newPlaced[slotIdx] = null;
    setPlacedSlots(newPlaced);
    setBankImages([...bankImages, img]);
    if (selectedSource?.type === 'slot' && selectedSource.index === slotIdx) {
      setSelectedSource(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold rounded-full">
              👁 学生答题预览
            </span>
            <h3 className="font-serif font-bold text-base text-indigo-100">《{poemTitle}》</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-indigo-300 font-mono">
              题目 {currentIndex + 1} / {questions.length}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${TYPE_COLORS[q.type] || 'bg-slate-100'}`}>
                {QUESTION_TYPE_LABELS[q.type] || q.type}
              </span>
            </div>
            <h4 className="text-lg font-serif font-bold text-slate-800 leading-snug">
              {q.prompt || '(未设置题目提示)'}
            </h4>
          </div>

          {q.type === 'LineAssembly' && (
            <div className="space-y-5">
              {/* Selected Chars Container */}
              <div className={`min-h-[64px] rounded-2xl p-3 flex flex-wrap gap-2 justify-center items-center border-2 transition ${
                feedback
                  ? feedback.isCorrect
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : 'bg-rose-50/80 border-rose-300'
                  : 'bg-amber-50/80 border-dashed border-amber-300'
              }`}>
                {selectedChars.length === 0 ? (
                  <span className="text-xs text-amber-700/70 font-medium">点击下方汉字块组成诗句</span>
                ) : (
                  selectedChars.map((char, idx) => {
                    const isSubmitted = feedback !== null;
                    const targetChar = (q.answer || '')[idx];
                    const isCharRight = isSubmitted && char === targetChar;

                    return (
                      <button
                        key={idx}
                        disabled={isSubmitted}
                        onClick={() => {
                          if (isSubmitted) return;
                          const nextSelected = [...selectedChars];
                          nextSelected.splice(idx, 1);
                          setSelectedChars(nextSelected);
                          setScrambledPool([...scrambledPool, char]);
                        }}
                        className={`w-10 h-10 font-bold rounded-xl text-lg font-serif transition transform ${
                          isSubmitted
                            ? isCharRight
                              ? 'bg-emerald-500 text-white shadow-sm cursor-default'
                              : 'bg-rose-500 text-white shadow-sm cursor-default'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 cursor-pointer'
                        }`}
                      >
                        {char}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Pool */}
              <div className="flex flex-wrap gap-2.5 justify-center p-2">
                {scrambledPool.map((char, idx) => {
                  const isSubmitted = feedback !== null;
                  return (
                    <button
                      key={idx}
                      disabled={isSubmitted}
                      onClick={() => {
                        if (isSubmitted) return;
                        setSelectedChars([...selectedChars, char]);
                        const nextPool = [...scrambledPool];
                        nextPool.splice(idx, 1);
                        setScrambledPool(nextPool);
                      }}
                      className={`w-12 h-12 border font-serif font-bold rounded-2xl text-xl shadow-xs transition transform ${
                        isSubmitted
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                          : 'bg-white hover:bg-teal-50 border-slate-200 hover:border-teal-400 text-slate-800 hover:-translate-y-0.5 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {q.type === 'ImageOrdering' && (
            <div className="space-y-5">
              {/* Guidance Message Banner */}
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                selectedSource
                  ? 'bg-indigo-100 border border-indigo-300 text-indigo-900 animate-pulse'
                  : 'bg-slate-100 border border-slate-200 text-slate-600'
              }`}>
                <span>
                  {selectedSource
                    ? '👉 已选中图片！请点击下方的【目标位置 (第 1 ~ ' + placedSlots.length + ' 幅)】将图片放入。'
                    : '💡 请先点击图片（备选库或已放置图片），再点击目标位置。'}
                </span>
                {selectedSource?.type === 'slot' && (
                  <button
                    onClick={() => returnSlotToBank(selectedSource.index)}
                    className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold"
                  >
                    ↩ 放回备选库
                  </button>
                )}
              </div>

              {/* 1. Image Bank (备选图片库) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    �� 备选图片库 (Image Bank) — [{bankImages.length} 张待放置]
                  </span>
                </div>
                <div className="min-h-[100px] bg-slate-100/70 border-2 border-dashed border-slate-300 rounded-2xl p-3 flex flex-wrap gap-3 items-center">
                  {bankImages.length === 0 ? (
                    <span className="text-xs text-slate-400 italic mx-auto">✓ 所有图片均已放入下方目标位置</span>
                  ) : (
                    bankImages.map((img, bIdx) => {
                      const isSelected = selectedSource?.type === 'bank' && selectedSource.index === bIdx;
                      return (
                        <div
                          key={bIdx}
                          onClick={() => handleBankImageClick(bIdx)}
                          className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition transform active:scale-95 ${
                            isSelected
                              ? 'border-indigo-600 ring-4 ring-indigo-400/50 shadow-xl scale-105'
                              : 'border-white hover:border-indigo-300 shadow-xs'
                          }`}
                        >
                          <img src={img} alt={`bank-${bIdx}`} className="w-24 h-24 object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                已选中
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Target Places (目标位置 1 ~ N) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  🎯 诗句排序位置 (Target Places)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {placedSlots.map((slotImg, sIdx) => {
                    const isSelected = selectedSource?.type === 'slot' && selectedSource.index === sIdx;
                    return (
                      <div
                        key={sIdx}
                        onClick={() => handleSlotClick(sIdx)}
                        className={`bg-white border-2 rounded-2xl p-2.5 flex flex-col items-center gap-2 cursor-pointer transition ${
                          isSelected
                            ? 'border-indigo-600 ring-4 ring-indigo-400/50 shadow-xl'
                            : slotImg
                              ? 'border-slate-200 hover:border-indigo-300 shadow-xs'
                              : selectedSource
                                ? 'border-indigo-400 border-dashed bg-indigo-50/40 hover:bg-indigo-100/60'
                                : 'border-slate-300 border-dashed bg-slate-50 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            slotImg ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            第 {sIdx + 1} 幅
                          </span>
                          {slotImg && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                returnSlotToBank(sIdx);
                              }}
                              className="text-slate-400 hover:text-rose-500 text-xs font-bold"
                              title="放回备选库"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {slotImg ? (
                          <img src={slotImg} alt={`slot-${sIdx}`} className="w-full h-28 object-cover rounded-xl border border-slate-100" />
                        ) : (
                          <div className="w-full h-28 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1">
                            <span className="text-xl">📥</span>
                            <span className="text-[10px] font-bold">点击放入</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {q.type === 'ImageToLine' && (
            <div className="space-y-4">
              {q.image && (
                <div className="flex justify-center">
                  <img src={q.image} alt="target" className="h-44 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                </div>
              )}
              <div className="space-y-2">
                {displayedOptions.map((opt, idx) => {
                  const isSubmitted = feedback !== null;
                  const isCorrectOpt = idx === mappedAnswerIndex;
                  const isSelectedOpt = mcSelection === idx;
                  const isWrongPick = isSubmitted && isSelectedOpt && !isCorrectOpt;

                  let cardStyle = 'bg-white border-slate-200 hover:border-slate-300 text-slate-700';
                  let badgeStyle = 'bg-slate-100 text-slate-500';

                  if (isSubmitted) {
                    if (isCorrectOpt) {
                      cardStyle = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-bold shadow-xs';
                      badgeStyle = 'bg-emerald-600 text-white';
                    } else if (isWrongPick) {
                      cardStyle = 'bg-rose-50 border-2 border-rose-500 text-rose-900 font-bold shadow-xs';
                      badgeStyle = 'bg-rose-600 text-white';
                    } else {
                      cardStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                      badgeStyle = 'bg-slate-200 text-slate-400';
                    }
                  } else if (isSelectedOpt) {
                    cardStyle = 'bg-teal-50 border-2 border-teal-500 text-teal-900 font-bold shadow-xs';
                    badgeStyle = 'bg-teal-600 text-white';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isSubmitted}
                      onClick={() => setMcSelection(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-sm font-serif transition flex items-center gap-3 ${cardStyle}`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-sans font-bold flex-shrink-0 ${badgeStyle}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(q.type === 'VerseCloze' || q.type === 'PinyinMatch' || q.type === 'TextToCn' || q.type === 'CulturalContext') && (
            <div className="space-y-2.5">
              {displayedOptions.map((opt, idx) => {
                const isSubmitted = feedback !== null;
                const isCorrectOpt = idx === mappedAnswerIndex;
                const isSelectedOpt = mcSelection === idx;
                const isWrongPick = isSubmitted && isSelectedOpt && !isCorrectOpt;

                let cardStyle = 'bg-white border-slate-200 hover:border-slate-300 text-slate-700';
                let badgeStyle = 'bg-slate-100 text-slate-500';

                if (isSubmitted) {
                  if (isCorrectOpt) {
                    cardStyle = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-bold shadow-xs';
                    badgeStyle = 'bg-emerald-600 text-white';
                  } else if (isWrongPick) {
                    cardStyle = 'bg-rose-50 border-2 border-rose-500 text-rose-900 font-bold shadow-xs';
                    badgeStyle = 'bg-rose-600 text-white';
                  } else {
                    cardStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                    badgeStyle = 'bg-slate-200 text-slate-400';
                  }
                } else if (isSelectedOpt) {
                  cardStyle = 'bg-teal-50 border-2 border-teal-500 text-teal-900 font-bold shadow-xs';
                  badgeStyle = 'bg-teal-600 text-white';
                }

                return (
                  <button
                    key={idx}
                    disabled={isSubmitted}
                    onClick={() => setMcSelection(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm transition flex items-center gap-3 ${cardStyle}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-sans font-bold flex-shrink-0 ${badgeStyle}`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 font-serif">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {feedback && (
            <div className={`p-4 rounded-2xl border text-sm font-medium whitespace-pre-line animate-in fade-in slide-in-from-bottom-2 ${
              feedback.isCorrect
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              {feedback.text}
            </div>
          )}

        </div>

        <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-30 transition"
            >
              ← 上一题
            </button>
            <button
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-30 transition"
            >
              下一题 →
            </button>
          </div>

          <button
            onClick={handleVerify}
            disabled={feedback !== null}
            className={`px-6 py-2.5 font-bold text-sm rounded-xl transition ${
              feedback !== null
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
          >
            {feedback !== null ? '✓ 已提交答案' : '✅ 提交答案'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ── main page ─────────────────────────────────────────────────────────────

interface PlatformQuestionEditorProps {
  user: any;
}

export const PlatformQuestionEditor: React.FC<PlatformQuestionEditorProps> = ({ user }) => {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [selectedPoemId, setSelectedPoemId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<PoemQuestion[]>([]);
  const [activeQId, setActiveQId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [addType, setAddType] = useState<string>(ALL_TYPES[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [previewStartIndex, setPreviewStartIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('list');
  const [selectedSubject, setSelectedSubject] = useState<string>('语文');
  const [selectedSection, setSelectedSection] = useState<string>('白莲阁');

  // Load all poems from quiz library
  useEffect(() => {
    const data = apiService.getQuizLibrary();
    setPoems(data);
    if (data.length > 0) selectPoem(data[0], data);
  }, []);

  const selectPoem = useCallback((poem: Poem, allPoems?: Poem[]) => {
    setSelectedPoemId(poem.id);
    const source = allPoems ?? poems;
    const found = source.find(p => p.id === poem.id);
    const qs = found?.questions ?? [];
    setQuestions(qs);
    setActiveQId(qs.length > 0 ? qs[0].id : null);
    setDirty(false);
    setMobileTab('list');
  }, [poems]);

  const selectedPoem = poems.find(p => p.id === selectedPoemId) ?? null;

  const updateQuestion = (updated: PoemQuestion) => {
    setQuestions(qs => qs.map(q => q.id === updated.id ? updated : q));
    setDirty(true);
  };

  const addQuestion = () => {
    const blank = makeBlankQuestion(addType);
    setQuestions(qs => [...qs, blank]);
    setActiveQId(blank.id);
    setDirty(true);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(qs => {
      const remaining = qs.filter(q => q.id !== id);
      setActiveQId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });
    setConfirmDeleteId(null);
    setDirty(true);
  };

  const save = () => {
    if (!selectedPoemId) return;
    apiService.savePoemQuestions(selectedPoemId, questions);
    // Sync local poems state
    setPoems(ps => ps.map(p => p.id === selectedPoemId ? { ...p, questions } : p));
    setDirty(false);
    setSuccessMsg(`《${selectedPoem?.title}》题目已保存！`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const filteredPoems = poems.filter(p =>
    p.title.includes(searchTerm) ||
    p.author.includes(searchTerm) ||
    p.dynasty.includes(searchTerm) ||
    String(p.id).includes(searchTerm)
  );

  const activeQuestion = questions.find(q => q.id === activeQId) ?? null;

  const isBaiLianGe = selectedSubject === '语文' && (selectedSection === '白莲阁' || selectedSection.includes('白莲阁'));

  const canEdit = canEditQuizLibrary(user);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Editor Banner Header Card */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-teal-700/40">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-teal-900/60 border border-teal-500/40 text-teal-200 px-3 py-1 rounded-full text-xs font-semibold">
              <span>✍️ 题库编辑中心 (Quiz Library Editor)</span>
            </div>
            <h1 className="text-3xl font-black font-serif bg-gradient-to-r from-teal-200 via-emerald-200 to-white bg-clip-text text-transparent">
              全学科题库管理
            </h1>
            <p className="text-teal-200 text-xs">
              跨学科试题全量维护：配置试题内容、校验答案解析、实时预览学生答题体验。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-800/80 border border-teal-500/30 p-3.5 rounded-xl text-xs text-teal-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <label className="font-bold text-teal-200 whitespace-nowrap">学科:</label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  const sub = e.target.value;
                  setSelectedSubject(sub);
                  if (sub === '语文') setSelectedSection('白莲阁');
                  else if (sub === '数学') setSelectedSection('数理逻辑');
                  else if (sub === '英语') setSelectedSection('语法与阅读');
                  else if (sub === '科学') setSelectedSection('自然科学');
                }}
                className="px-3 py-1.5 bg-slate-900 border border-teal-400/50 rounded-lg text-xs font-bold text-white outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
              >
                <option value="语文">语文</option>
                <option value="数学">数学</option>
                <option value="英语">英语</option>
                <option value="科学">科学</option>
              </select>
            </div>

            <div className="h-6 border-l border-teal-500/30 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-teal-200 whitespace-nowrap">分区:</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-teal-400/50 rounded-lg text-xs font-bold text-white outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
              >
                {selectedSubject === '语文' && (
                  <>
                    <option value="白莲阁">白莲阁 (古诗文)</option>
                    <option value="现代文阅读">现代文阅读</option>
                  </>
                )}
                {selectedSubject === '数学' && (
                  <>
                    <option value="数理逻辑">数理逻辑</option>
                    <option value="几何基础">几何基础</option>
                  </>
                )}
                {selectedSubject === '英语' && (
                  <>
                    <option value="语法与阅读">语法与阅读</option>
                    <option value="听力口语">听力口语</option>
                  </>
                )}
                {selectedSubject === '科学' && (
                  <>
                    <option value="自然科学">自然科学</option>
                    <option value="物理与化学">物理与化学</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

            {!isBaiLianGe ? (
        <div className="max-w-4xl mx-auto my-8 p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-4xl shadow-inner">
            {selectedSubject === '数学' ? '📐' : selectedSubject === '英语' ? '🔤' : selectedSubject === '科学' ? '🔬' : '📖'}
          </div>
          <div className="space-y-2">
            <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">
              知新堂 • 学科题库规划中
            </span>
            <h2 className="text-2xl font-bold font-serif text-ink">
              【{selectedSubject} - {selectedSection}】题库模块建设中
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              该学科分区的题库编辑与AI智能出题模组正在开发推进中。如需测试编辑，请在上方导航中切换至【语文 - 白莲阁 (古诗文)】。
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                setSelectedSubject('语文');
                setSelectedSection('白莲阁');
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center gap-1.5"
            >
              <span>🪷 切换至【语文 - 白莲阁】题库</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Controls Header (visible only on small viewports) */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-3 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">选择古诗:</label>
          <select
            value={selectedPoemId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const p = poems.find(x => x.id === id);
              if (p) {
                if (dirty && !window.confirm('有未保存的更改，确定切换？')) return;
                selectPoem(p);
              }
            }}
            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
          >
            {poems.map(p => (
              <option key={p.id} value={p.id}>
                《{p.title}》 - [{p.dynasty}] {p.author} ({p.questions?.length ?? 0}题)
              </option>
            ))}
          </select>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex border border-slate-200 rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-1.5 rounded-lg text-center transition ${
              mobileTab === 'list' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
            }`}
          >
            📜 题目列表 ({questions.length})
          </button>
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-1.5 rounded-lg text-center transition ${
              mobileTab === 'editor' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
            }`}
          >
            ✏️ 题目编辑
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-130px)]">

        {/* LEFT: Poem Selector (Desktop side panel) */}
        <div className="hidden lg:flex w-72 flex-shrink-0 border-r border-slate-200 bg-white flex-col">
          <div className="p-3 border-b border-slate-100">
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜索诗名、作者、朝代…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-teal-400"
            />
            <p className="text-[10px] text-slate-400 mt-1 pl-1">{filteredPoems.length} / {poems.length} 首</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPoems.map(p => {
              const qCount = p.questions?.length ?? 0;
              const isSelected = p.id === selectedPoemId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (dirty && !window.confirm('有未保存的更改，确定切换？')) return;
                    selectPoem(p);
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 transition text-xs group ${
                    isSelected ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold font-serif ${isSelected ? 'text-teal-700' : 'text-slate-800'}`}>
                      《{p.title}》
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      qCount > 0 ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'
                    }`}>{qCount}题</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">[{p.dynasty}] {p.author} · #{p.id}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MIDDLE: Question List */}
        <div className={`w-full lg:w-64 flex-shrink-0 border-r border-slate-200 bg-white flex-col ${
          mobileTab === 'list' ? 'flex' : 'hidden lg:flex'
        }`}>
          {selectedPoem ? (
            <>
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="font-bold font-serif text-sm text-slate-800 flex items-center justify-between">
                  <span>《{selectedPoem.title}》</span>
                  <button
                    onClick={() => setPreviewStartIndex(0)}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center gap-1 shadow-2xs"
                    title="从第一题开始预览全套题目"
                  >
                    👁 预览全套
                  </button>
                </div>
                <div className="text-[10px] text-slate-500">{questions.length} 道题目</div>

                {/* Add New Question */}
                {canEdit && (
                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={addType}
                      onChange={e => setAddType(e.target.value)}
                      className="flex-1 text-[10px] border border-slate-200 rounded px-1.5 py-1 bg-slate-50"
                    >
                      {ALL_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      onClick={addQuestion}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold transition flex-shrink-0"
                    >
                      + 添加
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`group flex items-start gap-1.5 px-2.5 py-2 border-b border-slate-100 cursor-pointer transition ${
                      activeQId === q.id ? 'bg-teal-50 border-l-2 border-l-teal-400' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => { setActiveQId(q.id); setMobileTab('editor'); }}
                  >
                    <span className="text-[10px] text-slate-400 font-mono w-5 flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium mb-0.5 ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                        {QUESTION_TYPE_LABELS[q.type] || q.type}
                      </span>
                      <p className="text-[11px] text-slate-600 font-serif leading-snug truncate">{q.prompt || '(无提示文字)'}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(q.id); }}
                        className="text-slate-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-0.5"
                      >✕</button>
                    )}
                  </div>
                ))}
                {questions.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <div className="text-2xl mb-1">📭</div>
                    暂无题目
                    {canEdit && <div className="mt-1">使用上方"添加"按钮新增题目</div>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">← 选择一首古诗</div>
          )}
        </div>

        {/* RIGHT: Question Editor Canvas */}
        <div className={`w-full lg:flex-1 overflow-y-auto bg-slate-50 flex-col ${
          mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
        }`}>
          {activeQuestion ? (
            <div className="p-4 sm:p-5 flex-1">
              {/* Mobile Back Button */}
              <div className="lg:hidden mb-3">
                <button
                  onClick={() => setMobileTab('list')}
                  className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1 shadow-2xs"
                >
                  ⬅ 返回题目列表 ({questions.length})
                </button>
              </div>
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${TYPE_COLORS[activeQuestion.type]}`}>
                    {QUESTION_TYPE_LABELS[activeQuestion.type]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {activeQuestion.id}</span>
                </div>
                {canEdit && dirty && (
                  <span className="text-[10px] text-amber-500 font-bold animate-pulse">● 未保存</span>
                )}
              </div>

              {/* Type-specific editor */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <QuestionEditor
                  q={activeQuestion}
                  onChange={canEdit ? updateQuestion : () => {}}
                  onPreview={setLightboxSrc}
                />
              </div>

              {/* Action bar (Preview + Save) */}
              <div className="flex justify-end items-center gap-3 pt-4">
                <button
                  onClick={() => {
                    const idx = questions.findIndex(q => q.id === activeQId);
                    setPreviewStartIndex(idx >= 0 ? idx : 0);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm transition flex items-center gap-1.5"
                >
                  👁 预览当前题目
                </button>
                {canEdit && (
                  <button
                    onClick={save}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition ${
                      dirty
                        ? 'bg-teal-600 hover:bg-teal-500 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-default'
                    }`}
                    disabled={!dirty}
                  >
                    💾 保存《{selectedPoem?.title}》全部题目
                  </button>
                )}
              </div>
            </div>
          ) : selectedPoem ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <div className="text-3xl">📝</div>
              <div>从左侧选择题目进行编辑</div>
              {canEdit && <div className="text-xs">或使用"添加题目"按钮新增</div>}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <div className="text-3xl">🪷</div>
              <div>请先从左侧选择一首古诗</div>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Delete Confirm Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-xl font-bold text-slate-800 mb-2">删除题目？</div>
            <p className="text-sm text-slate-500 mb-5">此操作不可撤销。确认删除这道题目吗？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">取消</button>
              <button onClick={() => deleteQuestion(confirmDeleteId)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Student Quiz Preview Modal */}
      {previewStartIndex !== null && selectedPoem && (
        <StudentQuizPreviewModal
          poemTitle={selectedPoem.title}
          questions={questions}
          initialIndex={previewStartIndex}
          onClose={() => setPreviewStartIndex(null)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
};

export default PlatformQuestionEditor;
