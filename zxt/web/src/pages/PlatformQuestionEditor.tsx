import React, { useState, useEffect } from 'react';
import { apiService, Poem } from '../services/api';

interface PlatformQuestionEditorProps {
  user: any;
}

export const PlatformQuestionEditor: React.FC<PlatformQuestionEditorProps> = ({ user }) => {
  const [selectedSubject, setSelectedSubject] = useState<'chinese' | 'math' | 'english' | 'science'>('chinese');
  const [selectedModule, setSelectedModule] = useState<'blg' | 'literacy' | 'reading'>('blg');
  
  // Chinese / BaiLianGe editor state
  const [poems, setPoems] = useState<Poem[]>([]);
  const [editingPoem, setEditingPoem] = useState<Poem | null>(null);
  const [editorSuccessMsg, setEditorSuccessMsg] = useState('');

  useEffect(() => {
    loadPoems();
  }, []);

  const loadPoems = async () => {
    const data = await apiService.getPoems();
    setPoems(data);
    if (data.length > 0) {
      setEditingPoem(data[0]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-teal-700/40">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 bg-teal-900/60 border border-teal-500/40 text-teal-200 px-3 py-1 rounded-full text-xs font-semibold">
            <span>✍️ 知新堂 平台级全量题库编辑中心</span>
            <span>•</span>
            <span>Platform Question Bank Editor</span>
          </div>
          <h1 className="text-3xl font-black font-serif bg-gradient-to-r from-teal-200 via-emerald-200 to-white bg-clip-text text-transparent">
            多学科题库、混淆陷阱与试题编辑
          </h1>
          <p className="text-teal-200 text-xs">
            编辑全平台核心学科题目：语文（白莲阁古诗文75首、识字）、数学（口算速算）、英语（Vocab Master、Sentence Architect）与科学。
          </p>
        </div>

        <div className="bg-slate-800/80 border border-teal-500/30 p-3 rounded-xl text-xs space-y-1 text-teal-200">
          <div className="font-bold">编辑权限: {user?.name || 'Content Editor'}</div>
          <div>审核范围: 跨学科题库 (Cross-Subject)</div>
        </div>
      </div>

      {/* Subject Selection Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setSelectedSubject('chinese')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            selectedSubject === 'chinese' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔴 语文 (Chinese) - 白莲阁古诗75首
        </button>
        <button
          onClick={() => setSelectedSubject('math')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            selectedSubject === 'math' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🟢 数学 (Mathematics)
        </button>
        <button
          onClick={() => setSelectedSubject('english')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            selectedSubject === 'english' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔵 英语 (English)
        </button>
        <button
          onClick={() => setSelectedSubject('science')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            selectedSubject === 'science' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🟣 科学与STEAM (Science)
        </button>
      </div>

      {/* CHINESE SUBJECT QUESTION EDITOR */}
      {selectedSubject === 'chinese' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <span className="text-xs text-teal-600 font-bold uppercase">语文学科 • 白莲阁板块</span>
              <h2 className="text-xl font-bold font-serif text-ink mt-0.5">古诗文75首题目、拼音与干扰项编辑</h2>
            </div>
            {editorSuccessMsg && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                {editorSuccessMsg}
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Left: Poems List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto border border-slate-200 p-3 rounded-xl bg-slate-50 text-xs">
              <strong className="block text-ink font-serif mb-2">选择古诗 ({poems.length}首)</strong>
              {poems.map(p => (
                <div
                  key={p.id}
                  onClick={() => setEditingPoem(p)}
                  className={`p-2.5 rounded-lg border cursor-pointer font-serif transition ${
                    editingPoem?.id === p.id ? 'border-teal-500 bg-teal-50 font-bold' : 'border-slate-200 hover:bg-white'
                  }`}
                >
                  #{p.id} 《{p.title}》 - [{p.dynasty}] {p.author}
                </div>
              ))}
            </div>

            {/* Right: Question Editor Canvas */}
            {editingPoem && (
              <div className="md:col-span-2 space-y-4 text-xs">
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-2">
                  <h3 className="font-bold font-serif text-teal-900 text-sm">编辑《{editingPoem.title}》题目与选项</h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editingPoem.title}
                      onChange={(e) => setEditingPoem({ ...editingPoem, title: e.target.value })}
                      className="px-3 py-1.5 border border-slate-300 rounded font-bold font-serif"
                    />
                    <input
                      type="text"
                      value={editingPoem.author}
                      onChange={(e) => setEditingPoem({ ...editingPoem, author: e.target.value })}
                      className="px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="font-bold text-slate-700 block">诗句与拼音译文列表 (Lines & Translations)</label>
                  {editingPoem.lines.map((lineObj, idx) => {
                    const text = typeof lineObj === 'string' ? lineObj : lineObj.text;
                    const pinyin = typeof lineObj === 'string' ? '' : lineObj.pinyin;
                    const cn = typeof lineObj === 'string' ? '' : lineObj.cn || '';
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={text}
                            onChange={(e) => {
                              const updated = [...editingPoem.lines];
                              updated[idx] = { text: e.target.value, pinyin, cn };
                              setEditingPoem({ ...editingPoem, lines: updated });
                            }}
                            className="w-1/2 px-2.5 py-1 border border-slate-300 rounded font-serif font-bold"
                          />
                          <input
                            type="text"
                            value={pinyin}
                            onChange={(e) => {
                              const updated = [...editingPoem.lines];
                              updated[idx] = { text, pinyin: e.target.value, cn };
                              setEditingPoem({ ...editingPoem, lines: updated });
                            }}
                            className="w-1/2 px-2.5 py-1 border border-slate-300 rounded font-mono"
                          />
                        </div>
                        <input
                          type="text"
                          value={cn}
                          onChange={(e) => {
                            const updated = [...editingPoem.lines];
                            updated[idx] = { text, pinyin, cn: e.target.value };
                            setEditingPoem({ ...editingPoem, lines: updated });
                          }}
                          className="w-full px-2.5 py-1 border border-slate-300 rounded text-slate-600"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setEditorSuccessMsg(`已更新《${editingPoem.title}》全量题目与混淆项数据！`);
                      setPoems(poems.map(p => p.id === editingPoem.id ? editingPoem : p));
                    }}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md transition"
                  >
                    💾 保存题目校对改动
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* OTHER SUBJECTS PLACEHOLDERS */}
      {selectedSubject !== 'chinese' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="text-4xl">📚</div>
          <h3 className="text-lg font-bold font-serif text-ink">跨学科题库编辑器 (Coming Soon)</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {selectedSubject.toUpperCase()} 学科的在线试题编辑工具正随新课程标准陆续开放。
          </p>
        </div>
      )}

    </div>
  );
};

export default PlatformQuestionEditor;
