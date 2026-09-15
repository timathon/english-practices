import React from 'react';
import { PoemQuestion, IdiomQuestion } from '../../services/api';
import { CachedImage } from '../CachedImage';

export interface PublishingItem {
  id: number;
  title: string;
  questions?: (PoemQuestion | IdiomQuestion)[];
  isIdiom?: boolean;
}

interface TeacherQuestionReviewModalProps {
  publishingPoem: PublishingItem;
  selectedClass?: string;
  newAsgnDueDate?: string;
  selectedQuestionIds?: string[];
  modalQuestionFilter: string;
  onSetSelectedQuestionIds?: React.Dispatch<React.SetStateAction<string[]>>;
  onSetModalQuestionFilter: (filter: string) => void;
  onPreviewQuestion: (index: number) => void;
  onConfirmPublish?: () => void;
  onClose: () => void;
  isReadOnly?: boolean;
}

export const TeacherQuestionReviewModal: React.FC<TeacherQuestionReviewModalProps> = ({
  publishingPoem,
  selectedClass = '',
  newAsgnDueDate = '',
  selectedQuestionIds = [],
  modalQuestionFilter,
  onSetSelectedQuestionIds,
  onSetModalQuestionFilter,
  onPreviewQuestion,
  onConfirmPublish,
  onClose,
  isReadOnly = false,
}) => {
  const allQuestions = publishingPoem.questions || [];
  const totalCount = allQuestions.length;

  const typeLabels: Record<string, string> = {
    LineAssembly: '连句组装',
    VerseCloze: '诗句填空',
    PinyinMatch: '拼音辨析',
    TextToCn: '诗意理解',
    CulturalContext: '文化背景',
    ImageOrdering: '插图排序',
    ImageToLine: '图配句',
    IdiomAssembly: '成语还原',
    ChainAssembly: '接龙还原',
    IdiomSolitaire: '首尾接龙',
    IdiomCloze: '成语填空',
    HomophoneMatch: '字音字形',
    IdiomMeaning: '成语释义',
    StoryComprehension: '故事问答',
    ImageToIdiom: '看图识成语',
    EmotionMatch: '情感归类',
    TyposSpotting: '错字辨析',
  };

  const typeColors: Record<string, { active: string; inactive: string; countActive: string; countInactive: string }> = {
    LineAssembly: {
      active: 'bg-violet-600 text-white shadow-xs border border-violet-700',
      inactive: 'bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-violet-200/70 text-violet-900',
    },
    VerseCloze: {
      active: 'bg-teal-600 text-white shadow-xs border border-teal-700',
      inactive: 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-teal-200/70 text-teal-900',
    },
    PinyinMatch: {
      active: 'bg-sky-600 text-white shadow-xs border border-sky-700',
      inactive: 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-sky-200/70 text-sky-900',
    },
    TextToCn: {
      active: 'bg-amber-600 text-white shadow-xs border border-amber-700',
      inactive: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-amber-200/70 text-amber-900',
    },
    CulturalContext: {
      active: 'bg-rose-600 text-white shadow-xs border border-rose-700',
      inactive: 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-rose-200/70 text-rose-900',
    },
    ImageOrdering: {
      active: 'bg-indigo-600 text-white shadow-xs border border-indigo-700',
      inactive: 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-indigo-200/70 text-indigo-900',
    },
    ImageToLine: {
      active: 'bg-emerald-600 text-white shadow-xs border border-emerald-700',
      inactive: 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-emerald-200/70 text-emerald-900',
    },
    IdiomAssembly: {
      active: 'bg-emerald-600 text-white shadow-xs border border-emerald-700',
      inactive: 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-emerald-200/70 text-emerald-900',
    },
    ChainAssembly: {
      active: 'bg-amber-600 text-white shadow-xs border border-amber-700',
      inactive: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-amber-200/70 text-amber-900',
    },
    IdiomSolitaire: {
      active: 'bg-indigo-600 text-white shadow-xs border border-indigo-700',
      inactive: 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-indigo-200/70 text-indigo-900',
    },
    IdiomCloze: {
      active: 'bg-teal-600 text-white shadow-xs border border-teal-700',
      inactive: 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-teal-200/70 text-teal-900',
    },
    HomophoneMatch: {
      active: 'bg-sky-600 text-white shadow-xs border border-sky-700',
      inactive: 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-sky-200/70 text-sky-900',
    },
    IdiomMeaning: {
      active: 'bg-amber-600 text-white shadow-xs border border-amber-700',
      inactive: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-amber-200/70 text-amber-900',
    },
    StoryComprehension: {
      active: 'bg-purple-600 text-white shadow-xs border border-purple-700',
      inactive: 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-purple-200/70 text-purple-900',
    },
    ImageToIdiom: {
      active: 'bg-teal-600 text-white shadow-xs border border-teal-700',
      inactive: 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-teal-200/70 text-teal-900',
    },
    EmotionMatch: {
      active: 'bg-rose-600 text-white shadow-xs border border-rose-700',
      inactive: 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-rose-200/70 text-rose-900',
    },
    TyposSpotting: {
      active: 'bg-rose-600 text-white shadow-xs border border-rose-700',
      inactive: 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100',
      countActive: 'bg-white/20 text-white',
      countInactive: 'bg-rose-200/70 text-rose-900',
    },
  };

  const badgeColors: Record<string, string> = {
    LineAssembly: 'bg-violet-50 text-violet-800 border-violet-200',
    VerseCloze: 'bg-teal-50 text-teal-800 border-teal-200',
    PinyinMatch: 'bg-sky-50 text-sky-800 border-sky-200',
    TextToCn: 'bg-amber-50 text-amber-800 border-amber-200',
    CulturalContext: 'bg-rose-50 text-rose-800 border-rose-200',
    ImageOrdering: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    ImageToLine: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    IdiomAssembly: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    ChainAssembly: 'bg-amber-50 text-amber-800 border-amber-200',
    IdiomSolitaire: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    IdiomCloze: 'bg-teal-50 text-teal-800 border-teal-200',
    HomophoneMatch: 'bg-sky-50 text-sky-800 border-sky-200',
    IdiomMeaning: 'bg-amber-50 text-amber-800 border-amber-200',
    StoryComprehension: 'bg-purple-50 text-purple-800 border-purple-200',
    ImageToIdiom: 'bg-teal-50 text-teal-800 border-teal-200',
    EmotionMatch: 'bg-rose-50 text-rose-800 border-rose-200',
    TyposSpotting: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const presentTypes = Array.from(new Set(allQuestions.map(q => q.type)));
  const isAllSelected = totalCount > 0 && selectedQuestionIds.length === totalCount;
  const isIndeterminate = selectedQuestionIds.length > 0 && selectedQuestionIds.length < totalCount;

  const filteredQuestions = modalQuestionFilter === 'all'
    ? allQuestions
    : allQuestions.filter(q => q.type === modalQuestionFilter);

  return (
    <div className="fixed inset-0 !mt-0 !m-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-4 h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full border mb-1 ${
              isReadOnly ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <span>{isReadOnly ? '📝 单元配套习题总览' : '📌 教师发布前审题与挑题'}</span>
            </div>
            <h3 className="text-xl font-bold font-serif text-ink">
              《{publishingPoem.title}》{isReadOnly ? '全部配套习题' : '作业试题勾选'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isReadOnly ? (
                <>共 <strong className="text-indigo-600 font-bold">{totalCount}</strong> 道练习题 · 支持按题型筛选与单题试做体验</>
              ) : (
                <>发布班级: <strong className="text-blue-600 font-bold">{selectedClass}</strong> | 截止时间: {newAsgnDueDate}</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Selection Toolbar & Filter Tabs */}
        {!isReadOnly && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={el => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={(e) => {
                  if (onSetSelectedQuestionIds) {
                    if (e.target.checked) {
                      onSetSelectedQuestionIds(allQuestions.map(q => q.id));
                    } else {
                      onSetSelectedQuestionIds([]);
                    }
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>
                已勾选 <span className="text-blue-600 text-sm font-black">{selectedQuestionIds.length}</span> / {totalCount} 道题目
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onSetModalQuestionFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
              modalQuestionFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span>全部</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${modalQuestionFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {totalCount}
            </span>
          </button>

          {presentTypes.map(type => {
            const count = allQuestions.filter(q => q.type === type).length;
            const isSelected = modalQuestionFilter === type;
            const style = typeColors[type] || {
              active: 'bg-slate-800 text-white shadow-xs border border-slate-900',
              inactive: 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200',
              countActive: 'bg-white/20 text-white',
              countInactive: 'bg-slate-200 text-slate-700',
            };

            return (
              <button
                key={type}
                type="button"
                onClick={() => onSetModalQuestionFilter(type)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected ? style.active : style.inactive
                }`}
              >
                <span>{typeLabels[type] || type}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? style.countActive : style.countInactive
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
          {filteredQuestions.map((q) => {
            const isChecked = selectedQuestionIds.includes(q.id);
            const globalIdx = allQuestions.findIndex(item => item.id === q.id);

            return (
              <div
                key={q.id}
                onClick={() => {
                  if (!isReadOnly && onSetSelectedQuestionIds) {
                    onSetSelectedQuestionIds(prev =>
                      isChecked ? prev.filter(id => id !== q.id) : [...prev, q.id]
                    );
                  }
                }}
                className={`p-3 rounded-2xl border transition flex items-start gap-3 group ${
                  isReadOnly
                    ? 'bg-slate-50/80 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                    : isChecked
                      ? 'border-2 bg-blue-50/50 border-blue-300 shadow-2xs cursor-pointer'
                      : 'border-2 bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-80 cursor-pointer'
                }`}
              >
                {!isReadOnly && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => { }}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">#{globalIdx + 1}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badgeColors[q.type] || 'bg-slate-100 text-slate-700'}`}>
                        {typeLabels[q.type] || q.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewQuestion(globalIdx);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="进入学生作答界面测试此题"
                    >
                      <span>👁</span>
                      <span>试做</span>
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-800 font-serif leading-relaxed">
                    {(q as any).type === 'IdiomAssembly' ? `成语还原：“${(q as any).answer}”` : (q.prompt || '(全自动互动拼图/排序关联题)')}
                  </p>
                  {(q as any).image && (
                    <div className="my-1.5">
                      <CachedImage src={(q as any).image} alt="题目图片" className="max-h-24 rounded-lg border border-slate-200 object-cover" />
                    </div>
                  )}
                  {q.type === 'ImageOrdering' && Array.isArray((q as any).images) && (q as any).images.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 my-1.5">
                      {(q as any).images.map((img: string, iIdx: number) => (
                        <CachedImage key={iIdx} src={img} alt={`插图-${iIdx + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-2xs" />
                      ))}
                    </div>
                  )}
                  {(q as any).options && Array.isArray((q as any).options) && (q as any).options.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(q as any).options.slice(0, 4).map((opt: string, oIdx: number) => (
                        <span
                          key={oIdx}
                          className={`text-[10px] px-2 py-0.5 rounded ${(q as any).answer === oIdx
                            ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                            : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {isReadOnly ? (
            <>
              <div className="text-xs text-slate-500 font-medium">
                点击每道题目的【👁 试做】可单独测试该题
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPreviewQuestion(0)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📝</span>
                  <span>从第 1 题开始完整自测 ({totalCount} 题)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedQuestionIds.length === 0) {
                    alert('请至少勾选 1 道题目后再预览！');
                    return;
                  }
                  if (onConfirmPublish) {
                    onConfirmPublish();
                  }
                }}
                disabled={selectedQuestionIds.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                👁 预览题目并发布 ({selectedQuestionIds.length} 题) →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
