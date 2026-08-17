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

export const IdiomQuestionEditor: React.FC<IdiomQEditorProps> = ({ q, onChange, onPreview }) => {
  if (q.type === 'IdiomAssembly') return <IdiomAssemblyEditor q={q} onChange={onChange} />;
  if (q.type === 'ImageToIdiom') {
    return <ImageToLineEditor q={q as any} onChange={onChange as any} onPreview={onPreview} />;
  }
  return <MCEditor q={q as any} onChange={onChange as any} onPreview={onPreview} optCount={4} />;
};
