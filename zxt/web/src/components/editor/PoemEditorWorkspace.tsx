import React from 'react';
import { Poem, PoemQuestion } from '../../services/api';
import { ALL_TYPES, QUESTION_TYPE_LABELS, TYPE_COLORS } from './editorConstants';
import { QuestionEditor } from './PoemQuestionTypeEditors';

interface PoemEditorWorkspaceProps {
  poems: Poem[];
  filteredPoems: Poem[];
  selectedPoem: Poem | null;
  selectedPoemId: number | null;
  questions: PoemQuestion[];
  activeQId: string | null;
  activeQuestion: PoemQuestion | null;
  searchTerm: string;
  addType: string;
  canEdit: boolean;
  dirty: boolean;
  mobileTab: 'list' | 'editor';
  onSearchChange: (val: string) => void;
  onSelectPoem: (poem: Poem) => void;
  onAddTypeChange: (val: string) => void;
  onAddQuestion: () => void;
  onSetActiveQId: (id: string) => void;
  onSetMobileTab: (tab: 'list' | 'editor') => void;
  onSetConfirmDeleteId: (id: string) => void;
  onUpdateQuestion: (q: PoemQuestion) => void;
  onPreviewImage: (src: string) => void;
  onPreviewQuestions: (startIndex: number) => void;
  onSave: () => void;
}

export const PoemEditorWorkspace: React.FC<PoemEditorWorkspaceProps> = ({
  poems,
  filteredPoems,
  selectedPoem,
  selectedPoemId,
  questions,
  activeQId,
  activeQuestion,
  searchTerm,
  addType,
  canEdit,
  dirty,
  mobileTab,
  onSearchChange,
  onSelectPoem,
  onAddTypeChange,
  onAddQuestion,
  onSetActiveQId,
  onSetMobileTab,
  onSetConfirmDeleteId,
  onUpdateQuestion,
  onPreviewImage,
  onPreviewQuestions,
  onSave,
}) => {
  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-130px)]">
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
                onSelectPoem(p);
              }
            }}
            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
          >
            {filteredPoems.map(p => (
              <option key={p.id} value={p.id}>
                #{p.id} 《{p.title}》 - [{p.dynasty}] {p.author} ({p.questions?.length ?? 0}题)
              </option>
            ))}
          </select>
        </div>

        <div className="flex border border-slate-200 rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
          <button
            onClick={() => onSetMobileTab('list')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              mobileTab === 'list' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
            }`}
          >
            📜 题目列表 ({questions.length})
          </button>
          <button
            onClick={() => onSetMobileTab('editor')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              mobileTab === 'editor' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
            }`}
          >
            ✏️ 题目编辑
          </button>
        </div>
      </div>

      {/* LEFT: Poem Selector (Desktop side panel) */}
      <div className="hidden lg:flex w-72 flex-shrink-0 border-r border-slate-200 bg-white flex-col">
        <div className="p-3 border-b border-slate-100">
          <input
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
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
                  onSelectPoem(p);
                }}
                className={`w-full text-left px-3 py-2.5 border-b border-slate-100 transition text-xs group cursor-pointer ${
                  isSelected ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold font-serif ${isSelected ? 'text-teal-700' : 'text-slate-800'}`}>
                    #{p.id} 《{p.title}》
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
                  onClick={() => onPreviewQuestions(0)}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="从第一题开始预览全套题目"
                >
                  👁 预览全套
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">{questions.length} 道题目</div>

              {canEdit && (
                <div className="flex gap-1.5 pt-1">
                  <select
                    value={addType}
                    onChange={e => onAddTypeChange(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 font-medium"
                  >
                    {ALL_TYPES.map(t => (
                      <option key={t} value={t}>{QUESTION_TYPE_LABELS[t] || t}</option>
                    ))}
                  </select>
                  <button
                    onClick={onAddQuestion}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-xs font-bold transition flex-shrink-0 cursor-pointer"
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
                  className={`group flex items-start gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer transition ${
                    activeQId === q.id ? 'bg-teal-50 border-l-3 border-l-teal-500' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => { onSetActiveQId(q.id); onSetMobileTab('editor'); }}
                >
                  <span className="text-xs text-slate-400 font-mono w-5 flex-shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-md border font-semibold mb-1 ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                      {QUESTION_TYPE_LABELS[q.type] || q.type}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed truncate">{q.prompt || '(无提示文字)'}</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); onSetConfirmDeleteId(q.id); }}
                      className="text-slate-300 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-0.5 cursor-pointer"
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
            <div className="lg:hidden mb-3">
              <button
                onClick={() => onSetMobileTab('list')}
                className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                ⬅ 返回题目列表 ({questions.length})
              </button>
            </div>
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

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <QuestionEditor
                q={activeQuestion}
                onChange={canEdit ? onUpdateQuestion : () => {}}
                onPreview={onPreviewImage}
              />
            </div>

            <div className="flex justify-end items-center gap-3 pt-4">
              <button
                onClick={() => {
                  const idx = questions.findIndex(q => q.id === activeQId);
                  onPreviewQuestions(idx >= 0 ? idx : 0);
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                👁 预览当前题目
              </button>
              {canEdit && (
                <button
                  onClick={onSave}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer ${
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
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <div className="text-3xl">🪷</div>
            <div>请先从左侧选择一首古诗</div>
          </div>
        )}
      </div>
    </div>
  );
};
