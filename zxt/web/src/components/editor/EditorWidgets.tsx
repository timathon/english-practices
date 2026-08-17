import React, { useState } from 'react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export const ImageLightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
  useLockBodyScroll(true);
  return (
    <div
      className="fixed inset-0 !mt-0 !m-0 bg-black/80 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <img src={src} alt="full-size preview" className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]" />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-red-500 font-bold text-sm transition cursor-pointer"
        >✕</button>
      </div>
    </div>
  );
};

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const TagInput: React.FC<TagInputProps> = ({ label, tags, onChange }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v) { onChange([...tags, v]); setInput(''); }
  };
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-lg bg-slate-50 min-h-[42px] items-center">
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-900 text-sm sm:text-base px-2.5 py-1 rounded-md font-semibold">
            {t}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-violet-400 hover:text-red-500 text-sm leading-none font-bold cursor-pointer">×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder="输入字并按回车添加"
          className="flex-1 min-w-[120px] text-xs bg-transparent outline-none text-slate-700"
        />
        {input && (
          <button onClick={add} className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded font-medium cursor-pointer">添加</button>
        )}
      </div>
      <p className="text-[10px] text-slate-400">输入干扰字后按回车，推荐添加 2~4 个易混字</p>
    </div>
  );
};
