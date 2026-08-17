import React from 'react';
import { PoemQuestion } from '../../services/api';
import { CachedImage } from '../CachedImage';
import { TagInput } from './EditorWidgets';

export interface QEditorProps {
  q: PoemQuestion;
  onChange: (q: PoemQuestion) => void;
  onPreview: (src: string) => void;
}

export const LineAssemblyEditor: React.FC<QEditorProps> = ({ q, onChange }) => {
  if (q.type !== 'LineAssembly') return null;
  const set = (patch: Partial<typeof q>) => onChange({ ...q, ...patch } as PoemQuestion);
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">题目提示 (Prompt)</label>
        <input value={q.prompt} onChange={e => set({ prompt: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
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
            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
        </div>
      </div>
      <TagInput label="干扰字 (Distractor Chars)" tags={q.distractor_chars} onChange={v => set({ distractor_chars: v })} />
    </div>
  );
};

export const MCEditor: React.FC<QEditorProps & { optCount: number }> = ({ q, onChange, optCount }) => {
  if (q.type === 'LineAssembly' || q.type === 'ImageOrdering' || q.type === 'ImageToLine') return null;
  const set = (patch: any) => onChange({ ...q, ...patch } as PoemQuestion);
  const opts = (q.options || []).length === optCount ? q.options! : [...(q.options || []), ...Array(optCount).fill('')].slice(0, optCount);
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">题目提示 (Prompt)</label>
        <textarea value={q.prompt} onChange={e => set({ prompt: e.target.value })} rows={2}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm resize-none" />
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

export const ImageOrderingEditor: React.FC<QEditorProps> = ({ q, onChange, onPreview }) => {
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
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">图片 — 正确顺序 (Correct Order)</label>
            <p className="text-[10px] text-slate-400 mt-0.5">前端出题时自动打乱 · Frontend shuffles at runtime</p>
          </div>
          <button onClick={addImage} className="text-xs text-teal-600 hover:text-teal-500 font-bold flex-shrink-0 cursor-pointer">+ 添加图片</button>
        </div>
        <div className="space-y-2">
          {images.map((img, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-400 font-mono w-4 flex-shrink-0 text-center">{i + 1}</span>
              {img ? (
                <CachedImage src={img} alt={`img-${i}`} onClick={() => onPreview(img)}
                  className="w-12 h-12 object-cover rounded border border-slate-200 flex-shrink-0 cursor-zoom-in hover:opacity-80 transition" />
              ) : (
                <div className="w-12 h-12 rounded border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300 text-xs">🖼</div>
              )}
              <input value={img} onChange={e => updateImage(i, e.target.value)}
                placeholder="/assets/blg/poems/p1_l1.webp"
                className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs font-mono" />
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveImage(i, -1)} disabled={i === 0}
                  className="text-[10px] text-slate-400 hover:text-indigo-500 disabled:opacity-20 leading-none cursor-pointer">▲</button>
                <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1}
                  className="text-[10px] text-slate-400 hover:text-indigo-500 disabled:opacity-20 leading-none cursor-pointer">▼</button>
              </div>
              <button onClick={() => removeImage(i)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer">✕</button>
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

export const ImageToLineEditor: React.FC<QEditorProps> = ({ q, onChange, onPreview }) => {
  if (q.type !== 'ImageToLine') return null;
  const set = (patch: any) => onChange({ ...q, ...patch } as PoemQuestion);
  const opts = q.options || ['', '', '', ''];
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">题目提示 (Prompt)</label>
        <input value={q.prompt} onChange={e => set({ prompt: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">图片路径 (Image URL)</label>
        <input value={q.image} onChange={e => set({ image: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono" />
        {q.image ? (
          <CachedImage src={q.image} alt="preview"
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
                className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-sm"
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

export const QuestionEditor: React.FC<QEditorProps> = ({ q, onChange, onPreview }) => {
  if (q.type === 'LineAssembly') return <LineAssemblyEditor q={q} onChange={onChange} onPreview={onPreview} />;
  if (q.type === 'ImageOrdering') return <ImageOrderingEditor q={q} onChange={onChange} onPreview={onPreview} />;
  if (q.type === 'ImageToLine') return <ImageToLineEditor q={q} onChange={onChange} onPreview={onPreview} />;
  if (q.type === 'VerseCloze') return <MCEditor q={q} onChange={onChange} onPreview={onPreview} optCount={6} />;
  return <MCEditor q={q} onChange={onChange} onPreview={onPreview} optCount={4} />;
};
