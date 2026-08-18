import React from 'react';
import { IdiomQuestion } from '../../services/api';
import { TagInput } from './EditorWidgets';
import { ImageToLineEditor, MCEditor } from './PoemQuestionTypeEditors';

export interface IdiomQEditorProps {
  q: IdiomQuestion;
  onChange: (q: IdiomQuestion) => void;
  onPreview: (src: string) => void;
}

export const IdiomAssemblyEditor: React.FC<{ q: IdiomQuestion; onChange: (q: IdiomQuestion) => void }> = ({ q, onChange }) => {
  if (q.type !== 'IdiomAssembly') return null;
  const set = (patch: Partial<typeof q>) => onChange({ ...q, ...patch } as IdiomQuestion);
  const distCount = (q.distractor_chars || []).length;
  const isValidDistCount = distCount === 3;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          目标成语 (Answer — 4字成语)
        </label>
        <input
          value={q.answer || ''}
          onChange={e => set({ answer: e.target.value.trim() })}
          placeholder="例如：神采飞扬"
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-serif font-bold text-slate-800 focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            干扰字 (Distractor Chars) — 必须恰好 3 个
          </label>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            isValidDistCount ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
          }`}>
            {isValidDistCount ? '✓ 符合 3 干扰字规范' : `当前 ${distCount} / 3 个`}
          </span>
        </div>
        <TagInput
          label="1个语义陷阱字 + 2个同音字陷阱"
          tags={q.distractor_chars || []}
          onChange={v => set({ distractor_chars: v })}
        />
        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
          💡 <b>幼小衔接出题规范</b>：1 个语义陷阱（如“风”构成“风采”混淆“神采”），2 个同音/近音字陷阱（如“彩”混淆“采”，“杨”混淆“扬”）。
        </p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          题目引导语 (Prompt，可选自定义，留空自动采用释义提示)
        </label>
        <input
          value={q.prompt || ''}
          onChange={e => set({ prompt: e.target.value })}
          placeholder="默认：请根据成语释义，点击字块拼接出对应的四字成语："
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
        />
      </div>

      {/* Visual Live Preview of Character Blocks */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          字块实时预览 (Students' Tile Pool Preview)
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          {(q.answer || '').split('').map((char, idx) => (
            <span key={idx} className="w-10 h-10 rounded-xl bg-amber-500 text-white font-serif font-bold text-lg flex items-center justify-center shadow-xs">
              {char}
            </span>
          ))}
          {(q.distractor_chars || []).map((char, idx) => (
            <span key={`dist_${idx}`} className="w-10 h-10 rounded-xl bg-rose-500 text-white font-serif font-bold text-lg flex items-center justify-center shadow-xs" title="干扰字">
              {char}
            </span>
          ))}
          {(!q.answer && (!q.distractor_chars || q.distractor_chars.length === 0)) && (
            <span className="text-xs text-slate-400">请输入成语与干扰字以预览字块</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChainAssemblyEditor: React.FC<{ q: IdiomQuestion; onChange: (q: IdiomQuestion) => void }> = ({ q, onChange }) => {
  if (q.type !== 'ChainAssembly') return null;
  const set = (patch: Partial<typeof q>) => onChange({ ...q, ...patch } as IdiomQuestion);
  const idioms = q.idioms || ['', '', ''];
  const distCount = (q.distractor_chars || []).length;
  const isValidDistCount = distCount === 3;

  const updateIdiom = (index: number, val: string) => {
    const next = [...idioms];
    next[index] = val.trim();
    set({ idioms: next });
  };

  // Collect missing chars from current idioms
  const missingChars: string[] = [];
  idioms.forEach(w => {
    if (w.length >= 4) {
      missingChars.push(w[1], w[2]);
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
          接龙 3 成语 (3 Chained Idioms — 每个4字成语)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {idioms.map((w, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400">第 {idx + 1} 个成语</span>
              <input
                value={w}
                onChange={e => updateIdiom(idx, e.target.value)}
                placeholder={`例如：${idx === 0 ? '一字千金' : idx === 1 ? '金枝玉叶' : '叶公好龙'}`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-serif font-bold text-slate-800 focus:ring-2 focus:ring-amber-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            干扰字 (Distractor Chars) — 必须恰好 3 个
          </label>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            isValidDistCount ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
          }`}>
            {isValidDistCount ? '✓ 符合 3 干扰字规范' : `当前 ${distCount} / 3 个`}
          </span>
        </div>
        <TagInput
          label="从各成语干扰项或同音/形近字中选取 3 个干扰字"
          tags={q.distractor_chars || []}
          onChange={v => set({ distractor_chars: v })}
        />
        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
          💡 <b>接龙还原出题规范</b>：挖去 3 个成语的中间两个字（共 6 个待填字），加上 3 个干扰字，学生从 9 字字池中选字填空。
        </p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          题目引导语 (Prompt，可选)
        </label>
        <input
          value={q.prompt || ''}
          onChange={e => set({ prompt: e.target.value })}
          placeholder="默认：成语接龙链条还原：请点击下方字块，将接龙成语中间缺漏的汉字填入正确位置："
          className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
        />
      </div>

      {/* Live Preview of Chain Structure & Tile Pool */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 space-y-3">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          接龙还原预览 (Preview)
        </label>
        
        {/* Interlocking Chain Display */}
        <div className="flex justify-center p-1">
          <div className="inline-grid grid-cols-4 grid-rows-7 gap-1 p-2 bg-white rounded-xl border border-slate-200">
            {/* Idiom 1 Vertical */}
            <span className="col-start-1 row-start-1 w-8 h-8 rounded-lg bg-slate-800 text-white font-serif font-bold text-sm flex items-center justify-center">
              {idioms[0]?.[0] || '?'}
            </span>
            <span className="col-start-1 row-start-2 w-8 h-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-600 font-serif font-bold text-sm flex items-center justify-center">
              {idioms[0]?.[1] || '_'}
            </span>
            <span className="col-start-1 row-start-3 w-8 h-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-600 font-serif font-bold text-sm flex items-center justify-center">
              {idioms[0]?.[2] || '_'}
            </span>
            {/* Intersection 1 */}
            <span className="col-start-1 row-start-4 w-8 h-8 rounded-lg bg-slate-900 ring-2 ring-amber-400 text-amber-300 font-serif font-bold text-sm flex items-center justify-center" title="接龙交汇字">
              {idioms[0]?.[3] || (idioms[1]?.[0] || '?')}
            </span>

            {/* Idiom 2 Horizontal */}
            <span className="col-start-2 row-start-4 w-8 h-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-600 font-serif font-bold text-sm flex items-center justify-center">
              {idioms[1]?.[1] || '_'}
            </span>
            <span className="col-start-3 row-start-4 w-8 h-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-600 font-serif font-bold text-sm flex items-center justify-center">
              {idioms[1]?.[2] || '_'}
            </span>
            {/* Intersection 2 */}
            <span className="col-start-4 row-start-4 w-8 h-8 rounded-lg bg-slate-900 ring-2 ring-amber-400 text-amber-300 font-serif font-bold text-sm flex items-center justify-center" title="接龙交汇字">
              {idioms[1]?.[3] || (idioms[2]?.[0] || '?')}
            </span>

            {/* Idiom 3 Vertical */}
            <span className="col-start-4 row-start-5 w-8 h-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-600 font-serif font-bold text-sm flex items-center justify-center">
              {idioms[2]?.[1] || '_'}
            </span>
            <span className="col-start-4 row-start-6 w-8 h-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-600 font-serif font-bold text-sm flex items-center justify-center">
              {idioms[2]?.[2] || '_'}
            </span>
            <span className="col-start-4 row-start-7 w-8 h-8 rounded-lg bg-slate-800 text-white font-serif font-bold text-sm flex items-center justify-center">
              {idioms[2]?.[3] || '?'}
            </span>
          </div>
        </div>

        {/* Tile Pool Preview */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            字块池预览（共 {missingChars.length + (q.distractor_chars || []).length} 字）:
          </span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {missingChars.map((char, idx) => (
              <span key={`m_${idx}`} className="w-8 h-8 rounded-lg bg-amber-500 text-white font-serif font-bold text-sm flex items-center justify-center shadow-2xs" title="正确字">
                {char}
              </span>
            ))}
            {(q.distractor_chars || []).map((char, idx) => (
              <span key={`d_${idx}`} className="w-8 h-8 rounded-lg bg-rose-500 text-white font-serif font-bold text-sm flex items-center justify-center shadow-2xs" title="干扰字">
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const IdiomQuestionEditor: React.FC<IdiomQEditorProps> = ({ q, onChange, onPreview }) => {
  if (q.type === 'IdiomAssembly') return <IdiomAssemblyEditor q={q} onChange={onChange} />;
  if (q.type === 'ChainAssembly') return <ChainAssemblyEditor q={q} onChange={onChange} />;
  if (q.type === 'ImageToIdiom') {
    return <ImageToLineEditor q={q as any} onChange={onChange as any} onPreview={onPreview} />;
  }
  return <MCEditor q={q as any} onChange={onChange as any} onPreview={onPreview} optCount={4} />;
};
