import React from 'react';
import { IdiomGroup, IdiomQuestion } from '../../services/api';
import { IDIOM_TYPES, QUESTION_TYPE_LABELS, TYPE_COLORS } from './editorConstants';
import { IdiomQuestionEditor } from './IdiomQuestionTypeEditors';

interface IdiomEditorWorkspaceProps {
  idiomGroups: IdiomGroup[];
  filteredIdiomGroups: IdiomGroup[];
  selectedIdiomGroup: IdiomGroup | null;
  selectedGroupId: number | null;
  idiomQuestions: IdiomQuestion[];
  activeIdiomQId: string | null;
  activeIdiomQuestion: IdiomQuestion | null;
  searchTerm: string;
  idiomAddType: string;
  canEdit: boolean;
  dirty: boolean;
  mobileTab: 'list' | 'editor';
  onSearchChange: (val: string) => void;
  onSelectIdiomGroup: (group: IdiomGroup) => void;
  onIdiomAddTypeChange: (val: string) => void;
  onAddIdiomQuestion: () => void;
  onSetActiveIdiomQId: (id: string) => void;
  onSetMobileTab: (tab: 'list' | 'editor') => void;
  onSetConfirmDeleteId: (id: string) => void;
  onUpdateIdiomQuestion: (q: IdiomQuestion) => void;
  onPreviewImage: (src: string) => void;
  onPreviewQuestions: (startIndex: number) => void;
  onSaveIdiom: () => void;
}

export const IdiomEditorWorkspace: React.FC<IdiomEditorWorkspaceProps> = ({
  idiomGroups,
  filteredIdiomGroups,
  selectedIdiomGroup,
  selectedGroupId,
  idiomQuestions,
  activeIdiomQId,
  activeIdiomQuestion,
  searchTerm,
  idiomAddType,
  canEdit,
  dirty,
  mobileTab,
  onSearchChange,
  onSelectIdiomGroup,
  onIdiomAddTypeChange,
  onAddIdiomQuestion,
  onSetActiveIdiomQId,
  onSetMobileTab,
  onSetConfirmDeleteId,
  onUpdateIdiomQuestion,
  onPreviewImage,
  onPreviewQuestions,
  onSaveIdiom,
}) => {
  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-130px)]">
      {/* Mobile Controls for Idioms */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-3 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">选择成语组:</label>
          <select
            value={selectedGroupId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const g = idiomGroups.find(x => x.id === id);
              if (g) {
                if (dirty && !window.confirm('有未保存的更改，确定切换？')) return;
                onSelectIdiomGroup(g);
              }
            }}
            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {filteredIdiomGroups.map(g => (
              <option key={g.id} value={g.id}>
                #{g.id} {g.title} ({g.questions?.length ?? 0}题)
              </option>
            ))}
          </select>
        </div>

        <div className="flex border border-slate-200 rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
          <button
            onClick={() => onSetMobileTab('list')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              mobileTab === 'list' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
            }`}
          >
            📜 成语与题目 ({idiomQuestions.length})
          </button>
          <button
            onClick={() => onSetMobileTab('editor')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              mobileTab === 'editor' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
            }`}
          >
            ✏️ 题目编辑
          </button>
        </div>
      </div>

      {/* LEFT: Idiom Group Selector */}
      <div className="hidden lg:flex w-72 flex-shrink-0 border-r border-slate-200 bg-white flex-col">
        <div className="p-3 border-b border-slate-100">
          <input
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="搜索组名、成语词汇…"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-emerald-400"
          />
          <p className="text-[10px] text-slate-400 mt-1 pl-1">{filteredIdiomGroups.length} / {idiomGroups.length} 组</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredIdiomGroups.map(g => {
            const qCount = g.questions?.length ?? 0;
            const isSelected = g.id === selectedGroupId;
            return (
              <button
                key={g.id}
                onClick={() => {
                  if (dirty && !window.confirm('有未保存的更改，确定切换？')) return;
                  onSelectIdiomGroup(g);
                }}
                className={`w-full text-left px-3 py-2.5 border-b border-slate-100 transition text-xs group cursor-pointer ${
                  isSelected ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold font-serif ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                    #{g.id} {g.title}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    qCount > 0 ? 'bg-emerald-100 text-emerald-600 font-bold' : 'bg-slate-100 text-slate-400'
                  }`}>{qCount}题</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {g.idioms?.map(i => i.word).slice(0, 4).join(' ➔ ')} ...
                </div>
              </button>
            );
          })}
          {filteredIdiomGroups.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              未找到匹配的成语组
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE: Idiom Questions List */}
      <div className={`w-full lg:w-72 flex-shrink-0 border-r border-slate-200 bg-white flex-col ${
        mobileTab === 'list' ? 'flex' : 'hidden lg:flex'
      }`}>
        {selectedIdiomGroup ? (
          <>
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="font-bold font-serif text-sm text-slate-800 flex items-center justify-between">
                <span>{selectedIdiomGroup.title}</span>
                <button
                  onClick={() => onPreviewQuestions(0)}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="从第一题开始预览全套成语题目"
                >
                  👁 预览全套
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">{idiomQuestions.length} 道题目 (共 {selectedIdiomGroup.idioms?.length || 16} 个成语)</div>

              {canEdit && (
                <div className="flex gap-1.5 pt-1">
                  <select
                    value={idiomAddType}
                    onChange={e => onIdiomAddTypeChange(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 font-medium"
                  >
                    {IDIOM_TYPES.map(t => (
                      <option key={t} value={t}>{QUESTION_TYPE_LABELS[t] || t}</option>
                    ))}
                  </select>
                  <button
                    onClick={onAddIdiomQuestion}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition flex-shrink-0 cursor-pointer"
                  >
                    + 添加
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {idiomQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`group flex items-start gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer transition ${
                    activeIdiomQId === q.id ? 'bg-emerald-50 border-l-3 border-l-emerald-500' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => { onSetActiveIdiomQId(q.id); onSetMobileTab('editor'); }}
                >
                  <span className="text-xs text-slate-400 font-mono w-5 flex-shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-md border font-semibold mb-1 ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                      {QUESTION_TYPE_LABELS[q.type] || q.type}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {q.type === 'IdiomAssembly' ? `成语：“${q.answer || '____'}”` : (q.prompt || '(无提示文字)')}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); onSetConfirmDeleteId(q.id); }}
                      className="text-slate-300 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-0.5 cursor-pointer"
                    >✕</button>
                  )}
                </div>
              ))}
              {idiomQuestions.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  <div className="text-2xl mb-1">📭</div>
                  暂无成语题目
                  {canEdit && <div className="mt-1">使用上方"添加"按钮新增题目</div>}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">← 选择一个成语组</div>
        )}
      </div>

      {/* RIGHT: Idiom Question Editor Canvas */}
      <div className={`w-full lg:flex-1 overflow-y-auto bg-slate-50 flex-col ${
        mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
      }`}>
        {activeIdiomQuestion ? (
          <div className="p-4 sm:p-5 flex-1">
            <div className="lg:hidden mb-3">
              <button
                onClick={() => onSetMobileTab('list')}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                ⬅ 返回题目列表 ({idiomQuestions.length})
              </button>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${TYPE_COLORS[activeIdiomQuestion.type]}`}>
                  {QUESTION_TYPE_LABELS[activeIdiomQuestion.type]}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {activeIdiomQuestion.id}</span>
              </div>
              {canEdit && dirty && (
                <span className="text-[10px] text-amber-500 font-bold animate-pulse">● 未保存</span>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <IdiomQuestionEditor
                q={activeIdiomQuestion}
                onChange={canEdit ? onUpdateIdiomQuestion : () => {}}
                onPreview={onPreviewImage}
              />
            </div>

            <div className="flex justify-end items-center gap-3 pt-4">
              <button
                onClick={() => {
                  const idx = idiomQuestions.findIndex(q => q.id === activeIdiomQId);
                  onPreviewQuestions(idx >= 0 ? idx : 0);
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                👁 预览当前题目
              </button>
              {canEdit && (
                <button
                  onClick={onSaveIdiom}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer ${
                    dirty
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-default'
                  }`}
                  disabled={!dirty}
                >
                  💾 保存 {selectedIdiomGroup?.title} 全部题目
                </button>
              )}
            </div>
          </div>
        ) : selectedIdiomGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <div className="text-3xl">📝</div>
            <div>从左侧选择题目进行编辑</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <div className="text-3xl">🐉</div>
            <div>请先从左侧选择一个成语组</div>
          </div>
        )}
      </div>
    </div>
  );
};
