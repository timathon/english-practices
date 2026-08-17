import React, { useState, useEffect } from 'react';
import { apiService, IdiomGroup } from '../../services/api';

interface TeacherCourseProgressTabProps {
  selectedClass: string;
  poems: any[];
  learntPoemIds: any[];
  animatingPoemId: number | null;
  onToggleLearnt: (poemId: number) => void;
}

export const TeacherCourseProgressTab: React.FC<TeacherCourseProgressTabProps> = ({
  selectedClass,
  poems,
  learntPoemIds,
  animatingPoemId,
  onToggleLearnt,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<'语文' | '数学' | '英语'>('语文');
  const [selectedSection, setSelectedSection] = useState<'古诗' | '成语' | '识字' | '拼音'>('古诗');

  // Available idiom groups from apiService
  const [availableIdiomGroups, setAvailableIdiomGroups] = useState<IdiomGroup[]>(() => apiService.getLocalIdiomGroups());

  useEffect(() => {
    apiService.getIdiomGroups().then(groups => {
      setAvailableIdiomGroups(groups);
    });
  }, []);

  // 成语接龙解锁状态 (支持按班级存储)
  const getInitialLearntIdiomGroups = (): number[] => {
    const stored = localStorage.getItem(`zxt_learnt_idioms_${selectedClass}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.map(Number);
      } catch (_) {}
    }
    return [1]; // 默认解锁第1组
  };

  const [learntIdiomGroups, setLearntIdiomGroups] = useState<number[]>(getInitialLearntIdiomGroups);
  const [animatingIdiomId, setAnimatingIdiomId] = useState<number | null>(null);

  // Sync state when selected class changes
  useEffect(() => {
    setLearntIdiomGroups(getInitialLearntIdiomGroups());
  }, [selectedClass]);

  const handleToggleIdiomGroup = (num: number) => {
    setAnimatingIdiomId(num);
    setTimeout(() => setAnimatingIdiomId(null), 600);

    setLearntIdiomGroups(prev => {
      const updated = prev.includes(num)
        ? prev.filter(n => n !== num)
        : [...prev, num];
      localStorage.setItem(`zxt_learnt_idioms_${selectedClass}`, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      {/* Header Info */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold font-serif text-ink">【{selectedClass}】课程教学进度与自学解锁控制</h3>
        <p className="text-xs text-slate-500">点击勾选已教学单元，勾选后学生端将在“自主拓展学习”中解锁对应单元的知识点、互动练习与拓展赏析。</p>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-2">
        {(['语文', '数学', '英语'] as const).map(sub => (
          <button
            key={sub}
            onClick={() => {
              setSelectedSubject(sub);
              if (sub === '语文') setSelectedSection('古诗');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedSubject === sub
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{sub === '语文' ? '📖' : sub === '数学' ? '📐' : '🔤'}</span>
            <span>{sub}</span>
          </button>
        ))}
      </div>

      {/* Sub-Section Filter */}
      {selectedSubject === '语文' && (
        <div className="flex gap-2 border-b border-slate-100 pb-3">
          {(['古诗', '成语', '识字', '拼音'] as const).map(sec => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedSection === sec
                  ? sec === '古诗'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : sec === '成语'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : sec === '识字'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{sec === '古诗' ? '🪷' : sec === '成语' ? '🐉' : sec === '识字' ? '✍️' : '🔡'}</span>
              <span>{sec}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid Content */}
      {selectedSubject === '语文' && selectedSection === '古诗' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>古诗词进度 (全书共 75 首，已解锁 {learntPoemIds.length} 首)</span>
            <span className="text-teal-700 font-medium">点击卡片即可切换授课/解锁状态</span>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {poems.map((poem) => {
              const isLearnt = learntPoemIds.includes(poem.id);
              const isAnimating = animatingPoemId === poem.id;
              return (
                <div
                  key={poem.id}
                  onClick={() => onToggleLearnt(poem.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 transform flex items-center justify-between ${
                    isAnimating
                      ? isLearnt
                        ? 'scale-105 border-teal-500 bg-teal-100 ring-4 ring-teal-400/50 shadow-lg font-bold'
                        : 'scale-95 border-amber-400 bg-amber-50 ring-4 ring-amber-400/50 shadow-md'
                      : isLearnt
                        ? 'border-teal-500 bg-teal-50/80 font-bold hover:scale-[1.01]'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:scale-[1.01]'
                  }`}
                >
                  <div>
                    <div className="font-bold font-serif text-ink flex items-center gap-1.5">
                      <span>#{poem.id}</span> 《{poem.title}》
                      {isAnimating && (
                        <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-teal-400 opacity-75"></span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">[{poem.dynasty}] {poem.author}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] transition-all duration-300 ${
                    isAnimating ? 'scale-110' : ''
                  } ${isLearnt ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                    {isLearnt ? '🔓 已学 (已解锁)' : '🔒 待学 (已锁定)'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedSubject === '语文' && selectedSection === '成语' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>成语接龙课程进度 (共 {availableIdiomGroups.length} 组可用，已解锁 {learntIdiomGroups.filter(id => availableIdiomGroups.some(g => g.id === id)).length} 组)</span>
            <span className="text-emerald-700 font-medium">点击卡片即可切换授课/解锁状态</span>
          </div>
          {availableIdiomGroups.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {availableIdiomGroups.map((group) => {
                const num = group.id;
                const isLearnt = learntIdiomGroups.includes(num);
                const isAnimating = animatingIdiomId === num;
                const idiomCount = group.idioms?.length || 16;
                const storyCount = (group.idioms || []).filter(i => i.has_story).length;
                const previewWords = group.idioms?.slice(0, 4).map(i => i.word).join(' ➔ ');

                return (
                  <div
                    key={num}
                    onClick={() => handleToggleIdiomGroup(num)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 transform flex items-center justify-between ${
                      isAnimating
                        ? isLearnt
                          ? 'scale-105 border-emerald-500 bg-emerald-100 ring-4 ring-emerald-400/50 shadow-lg font-bold'
                          : 'scale-95 border-amber-400 bg-amber-50 ring-4 ring-amber-400/50 shadow-md'
                        : isLearnt
                          ? 'border-emerald-500 bg-emerald-50/80 font-bold hover:scale-[1.01]'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:scale-[1.01]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-ink flex items-center gap-1.5">
                        <span>🐉</span> {group.title || `成语接龙第${num}组`}
                        {isAnimating && (
                          <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        包含 {idiomCount} 条环形连缀成语 {storyCount > 0 ? `+ ${storyCount}个典故` : ''}
                      </div>
                      {previewWords && (
                        <div className="text-[10px] text-emerald-700/80 font-serif mt-1 truncate max-w-[200px]">
                          {previewWords} ...
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] transition-all duration-300 flex-shrink-0 ${
                      isAnimating ? 'scale-110' : ''
                    } ${isLearnt ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                      {isLearnt ? '🔓 已学 (已解锁)' : '🔒 待学 (已锁定)'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              📭 暂无可用的成语组题库
            </div>
          )}
        </div>
      )}

      {selectedSubject === '语文' && (selectedSection === '识字' || selectedSection === '拼音') && (
        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <div className="text-3xl">{selectedSection === '识字' ? '✍️' : '🔡'}</div>
          <div className="text-sm font-bold text-slate-600">【语文 - {selectedSection}】单元进度管理正在接入中</div>
          <p className="text-xs max-w-sm mx-auto">教材标准生字表与声韵拼读单元进度打卡功能将随下个版本同步上线。</p>
        </div>
      )}

      {selectedSubject !== '语文' && (
        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <div className="text-3xl">{selectedSubject === '数学' ? '📐' : '🔤'}</div>
          <div className="text-sm font-bold text-slate-600">【{selectedSubject}】学科教学进度模块规划中</div>
          <p className="text-xs max-w-sm mx-auto">已支持对应学科作业发布与题库管理，授课章节进度控制模组将同步适配接入。</p>
        </div>
      )}
    </div>
  );
};

export default TeacherCourseProgressTab;
