import React from 'react';
import { IdiomGroup, IdiomQuestion } from '../../services/api/types';
import { IdiomQuestionEditor } from './IdiomQuestionTypeEditors';
import { IDIOM_TYPES, QUESTION_TYPE_LABELS, TYPE_COLORS } from './editorConstants';

interface IdiomEditorWorkspaceProps {
  idiomGroups: IdiomGroup[];
  filteredIdiomGroups: IdiomGroup[];
  selectedIdiomGroup: IdiomGroup | null;
  selectedGroupId: number | null;
  idiomQuestions: IdiomQuestion[];
  activeIdiomQId: string | null;
  activeIdiomQuestion: IdiomQuestion | null;
  searchTerm: string;
  idiomAddType: IdiomQuestion['type'];
  canEdit: boolean;
  dirty: boolean;
  mobileTab: 'list' | 'editor';
  onSearchChange: (val: string) => void;
  onSelectIdiomGroup: (group: IdiomGroup) => void;
  onIdiomAddTypeChange: (val: any) => void;
  onAddIdiomQuestion: () => void;
  onSetActiveIdiomQId: (id: string | null) => void;
  onSetMobileTab: (tab: 'list' | 'editor') => void;
  onSetConfirmDeleteId: (id: string | null) => void;
  onUpdateIdiomQuestion: (q: IdiomQuestion) => void;
  onPreviewImage: (src: string) => void;
  onPreviewQuestions: (startIndex: number) => void;
  onSaveIdiom: () => void;
}

export const IdiomEditorWorkspace: React.FC<IdiomEditorWorkspaceProps> = ({
  idiomGroups,
  selectedIdiomGroup,
  selectedGroupId,
  idiomQuestions,
  activeIdiomQId,
  activeIdiomQuestion,
  idiomAddType,
  canEdit,
  dirty,
  mobileTab,
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
  const [questionTypeFilter, setQuestionTypeFilter] = React.useState<string>('all');

  const presentTypes = React.useMemo(() => {
    const typesSet = new Set<string>();
    idiomQuestions.forEach(q => typesSet.add(q.type));
    return Array.from(typesSet);
  }, [idiomQuestions]);

  const displayedQuestions = React.useMemo(() => {
    if (questionTypeFilter === 'all') return idiomQuestions;
    return idiomQuestions.filter(q => q.type === questionTypeFilter);
  }, [idiomQuestions, questionTypeFilter]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-130px)]">
      {/* LEFT: Questions & Filter List */}
      <div className={`w-full lg:w-96 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col ${
        mobileTab === 'list' ? 'flex' : 'hidden lg:flex'
      }`}>
        <div className="p-3 border-b border-slate-100 space-y-2.5">
          {/* Idiom Group Select Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 whitespace-nowrap">选择成语组:</label>
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
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              {idiomGroups.map(g => (
                <option key={g.id} value={g.id}>
                  #{g.id} {g.title} ({g.idioms?.length ?? 16}成语，{g.questions?.length ?? 0}题)
                </option>
              ))}
            </select>
          </div>

          {selectedIdiomGroup && (
            <>
              {/* Question Type Filter Tabs */}
              {idiomQuestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setQuestionTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs ${
                      questionTypeFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                  >
                    <span>全部</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${questionTypeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {idiomQuestions.length}
                    </span>
                  </button>
                  {presentTypes.map(t => {
                    const count = idiomQuestions.filter(q => q.type === t).length;
                    const isSelected = questionTypeFilter === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setQuestionTypeFilter(t)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/30'
                            : `${TYPE_COLORS[t] || 'bg-slate-100 text-slate-700'} hover:opacity-90`
                        }`}
                      >
                        <span>{QUESTION_TYPE_LABELS[t] || t}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {canEdit && (
                <div className="flex gap-1.5 pt-0.5">
                  <select
                    value={idiomAddType}
                    onChange={e => onIdiomAddTypeChange(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium"
                  >
                    {IDIOM_TYPES.map(t => (
                      <option key={t} value={t}>{QUESTION_TYPE_LABELS[t] || t}</option>
                    ))}
                  </select>
                  <button
                    onClick={onAddIdiomQuestion}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer shadow-2xs"
                  >
                    + 添加
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Questions Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {displayedQuestions.map((q) => {
            const globalIdx = idiomQuestions.findIndex(item => item.id === q.id);
            const isActive = activeIdiomQId === q.id;
            return (
              <div
                key={q.id}
                className={`group p-3 transition ${
                  isActive ? 'bg-emerald-50/80 border-l-3 border-l-emerald-500' : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-400">#{globalIdx + 1}</span>
                    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-md border font-semibold ${TYPE_COLORS[q.type] || 'bg-slate-100 text-slate-600'}`}>
                      {QUESTION_TYPE_LABELS[q.type] || q.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPreviewQuestions(globalIdx)}
                      className="w-6 h-6 rounded-md bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 flex items-center justify-center text-xs transition shadow-2xs cursor-pointer"
                      title="预览本题"
                    >
                      👁
                    </button>
                    <button
                      type="button"
                      onClick={() => { onSetActiveIdiomQId(q.id); onSetMobileTab('editor'); }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition shadow-2xs cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                      title="编辑本题"
                    >
                      ✏️
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onSetConfirmDeleteId(q.id)}
                        className="w-6 h-6 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center text-xs transition cursor-pointer"
                        title="删除题目"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs font-serif font-bold text-slate-800 leading-snug line-clamp-2 select-text">
                  {q.type === 'IdiomAssembly'
                    ? `成语：“${q.answer || '____'}”`
                    : (q as any).type === 'ChainAssembly'
                      ? `接龙：“${((q as any).idioms || []).join(' ➡️ ')}”`
                      : (q.prompt || '(无提示文字)')}
                </p>
              </div>
            );
          })}
          {displayedQuestions.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              <div className="text-2xl mb-1">📭</div>
              暂无匹配题目
            </div>
          )}
        </div>
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
                  {QUESTION_TYPE_LABELS[activeIdiomQuestion.type] || activeIdiomQuestion.type}
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
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
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
                  💾 保存《{selectedIdiomGroup?.title}》全部题目
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
