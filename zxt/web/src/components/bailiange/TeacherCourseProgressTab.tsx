import React, { useState, useEffect, useRef } from 'react';
import { apiService, IdiomGroup } from '../../services/api';
import { CachedImage } from '../CachedImage';
import { StudentQuizPreviewModal } from '../StudentQuizPreviewModal';
import { PoemStudyDetailModal } from './StudentSelfStudyTab';

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

  // Preview Modals State
  const [previewLinesPoem, setPreviewLinesPoem] = useState<any | null>(null);
  const [previewQuizPoem, setPreviewQuizPoem] = useState<any | null>(null);

  const [previewLinesIdiom, setPreviewLinesIdiom] = useState<IdiomGroup | null>(null);
  const [previewQuizIdiom, setPreviewQuizIdiom] = useState<IdiomGroup | null>(null);

  // Available idiom groups from apiService
  const [availableIdiomGroups, setAvailableIdiomGroups] = useState<IdiomGroup[]>(() => apiService.getLocalIdiomGroups());

  // Fast-scroll slider state for Teacher Ancient Poems view
  const [sliderIndex, setSliderIndex] = useState<number>(1);
  const poemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleSliderChange = (newIndex: number) => {
    setSliderIndex(newIndex);
    const targetPoem = poems[newIndex - 1];
    if (targetPoem && poemRefs.current[targetPoem.id]) {
      const el = poemRefs.current[targetPoem.id];
      if (el) {
        const yOffset = -140;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (selectedSubject !== '语文' || selectedSection !== '古诗') return;

    const handleScroll = () => {
      if (!poems || poems.length === 0) return;
      const scrollY = window.scrollY + 180;
      let closestIdx = 0;
      let minDistance = Infinity;

      poems.forEach((p, idx) => {
        const el = poemRefs.current[p.id];
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          const dist = Math.abs(top - scrollY);
          if (dist < minDistance) {
            minDistance = dist;
            closestIdx = idx + 1;
          }
        }
      });

      if (closestIdx > 0) {
        setSliderIndex(closestIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [poems, selectedSubject, selectedSection]);

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
        <p className="text-xs text-slate-500">点击【解锁/锁定】按钮控制学生端自学权限，点击【诗句】、【习题】可快速预览教学内容与配套练习。</p>
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
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

      {/* Grid Content: 古诗 */}
      {selectedSubject === '语文' && selectedSection === '古诗' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>古诗词进度 (全书共 {poems.length} 首，已解锁 {learntPoemIds.length} 首)</span>
          </div>

          {/* Sticky Fast-Scroll Slider Bar for Teacher (Stick directly under 64px top navbar) */}
          <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md border-y border-emerald-100/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                <span>🚀</span>
                <span>快速定位:</span>
              </span>
              <span className="text-xs px-2.5 py-0.5 bg-emerald-600 text-white font-mono font-extrabold rounded-full shadow-2xs whitespace-nowrap">
                #{sliderIndex} 《{poems[sliderIndex - 1]?.title || ''}》
              </span>
            </div>

            {/* Range Slider */}
            <div className="flex items-center gap-3 w-full sm:flex-1 max-w-md">
              <span className="text-[11px] font-mono text-slate-400 font-bold">#1</span>
              <input
                type="range"
                min={1}
                max={Math.max(1, poems.length)}
                value={sliderIndex}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 hover:accent-emerald-700 transition"
              />
              <span className="text-[11px] font-mono text-slate-400 font-bold">#{poems.length}</span>
            </div>

            {/* Quick-Jump Step Buttons */}
            <div className="hidden md:flex items-center gap-1 text-[11px]">
              {[1, 15, 30, 45, 60, poems.length].map((targetId) => (
                <button
                  key={targetId}
                  type="button"
                  onClick={() => handleSliderChange(targetId)}
                  className={`px-2 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                    sliderIndex === targetId
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800'
                  }`}
                >
                  #{targetId}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
            {poems.map((poem) => {
              const isLearnt = learntPoemIds.includes(poem.id);
              const isAnimating = animatingPoemId === poem.id;
              const questionCount = poem.questions?.length || 0;

              return (
                <div
                  key={poem.id}
                  ref={(el) => { poemRefs.current[poem.id] = el; }}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 group hover:shadow-md ${
                    isAnimating
                      ? isLearnt
                        ? 'border-emerald-500 bg-emerald-100/60 ring-4 ring-emerald-400/50 shadow-lg'
                        : 'border-amber-400 bg-amber-50 ring-4 ring-amber-400/50 shadow-md'
                      : isLearnt
                        ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold font-serif text-ink text-sm flex items-center gap-1.5 group-hover:text-emerald-800">
                        <span className="text-teal-700 font-mono">#{poem.id}</span>
                        <span>《{poem.title}》</span>
                        {isAnimating && (
                          <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        [{poem.dynasty}] {poem.author}
                        {poem.theme && <span className="ml-1.5 text-slate-400">· {poem.theme}</span>}
                      </div>
                    </div>

                    {/* 解锁 / 已解锁 Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLearnt(poem.id);
                      }}
                      className={`text-xs px-2 py-0.5 font-sans font-bold rounded whitespace-nowrap transition cursor-pointer border shadow-2xs flex items-center gap-1 active:scale-95 ${
                        isLearnt
                          ? 'bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-600 border-slate-300'
                      }`}
                      title={isLearnt ? '已解锁给学生自学 (点击锁定)' : '未解锁 (点击解锁)'}
                    >
                      <span>{isLearnt ? '🔓' : '🔒'}</span>
                      <span>{isLearnt ? '已解锁' : '解锁'}</span>
                    </button>
                  </div>

                  {/* Card Footer Buttons: 详情 & 习题 */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      {poem.lines?.length || 4} 句 / {questionCount} 题
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* 1. 详情 Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewLinesPoem(poem);
                        }}
                        className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        title="查看古诗全文、拼音、译文与意境"
                      >
                        <span>📖</span>
                        <span>详情</span>
                      </button>

                      {/* 2. 习题 Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (questionCount > 0) {
                            setPreviewQuizPoem(poem);
                          } else {
                            alert(`《${poem.title}》暂无配套习题`);
                          }
                        }}
                        className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-800 border border-indigo-200/80 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        title="免计分预览自测全部题目"
                      >
                        <span>📝</span>
                        <span>习题</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Content: 成语 */}
      {selectedSubject === '语文' && selectedSection === '成语' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>成语接龙课程进度 (共 {availableIdiomGroups.length} 组可用，已解锁 {learntIdiomGroups.filter(id => availableIdiomGroups.some(g => g.id === id)).length} 组)</span>
          </div>
          {availableIdiomGroups.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {availableIdiomGroups.map((group) => {
                const num = group.id;
                const isLearnt = learntIdiomGroups.includes(num);
                const isAnimating = animatingIdiomId === num;
                const idiomCount = group.idioms?.length || 16;
                const storyCount = (group.idioms || []).filter(i => i.has_story).length;
                const questionCount = (group as any).questions?.length || 0;

                return (
                  <div
                    key={num}
                    className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
                      isAnimating
                        ? isLearnt
                          ? 'border-emerald-500 bg-emerald-100/60 ring-4 ring-emerald-400/50 shadow-lg'
                          : 'border-amber-400 bg-amber-50 ring-4 ring-amber-400/50 shadow-md'
                        : isLearnt
                          ? 'border-emerald-400/80 bg-emerald-50/40 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Header: Idiom Group Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-ink text-sm flex items-center gap-1.5">
                          <span>🐉</span>
                          <span>{group.title || `成语接龙第 ${num} 组`}</span>
                          {isAnimating && (
                            <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          包含 {idiomCount} 条环形成语 {storyCount > 0 ? `· ${storyCount} 个成语典故` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600 font-medium">
                        {questionCount} 题
                      </span>
                    </div>

                    {/* 3 Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                      {/* 1. 成语词条 Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewLinesIdiom(group);
                        }}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                        title="查看本组成语词条、拼音与典故"
                      >
                        <span>📖</span>
                        <span>词句</span>
                      </button>

                      {/* 2. 习题 Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (questionCount > 0) {
                            setPreviewQuizIdiom(group);
                          } else {
                            alert(`成语接龙第 ${num} 组暂无配套练习题`);
                          }
                        }}
                        className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-800 border border-indigo-200/80 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                        title="预览成语互动习题"
                      >
                        <span>📝</span>
                        <span>习题</span>
                      </button>

                      {/* 3. Lock/Unlock Switch Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleIdiomGroup(num);
                        }}
                        className={`flex-1.2 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all duration-200 cursor-pointer shadow-2xs ${
                          isLearnt
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700'
                        }`}
                        title={isLearnt ? '已解锁给学生自学 (点击锁定)' : '锁定未授课 (点击解锁)'}
                      >
                        <span>{isLearnt ? '🔓' : '🔒'}</span>
                        <span>{isLearnt ? '已解锁' : '未解锁'}</span>
                      </button>
                    </div>
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

      {/* Modules under development */}
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

      {/* 📜 MODAL 1: 古诗 详情 (PoemStudyDetailModal identical to Student dashboard) */}
      {previewLinesPoem && (() => {
        const currentIndex = poems.findIndex((p: any) => Number(p.id) === Number(previewLinesPoem.id));
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex >= 0 && currentIndex < poems.length - 1;

        return (
          <PoemStudyDetailModal
            poem={previewLinesPoem}
            isLearnt={learntPoemIds.map(Number).includes(Number(previewLinesPoem.id))}
            isTeacher={true}
            onClose={() => setPreviewLinesPoem(null)}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onStartPractice={(poemToPractice) => {
              setPreviewLinesPoem(null);
              setPreviewQuizPoem(poemToPractice);
            }}
            onPrev={() => {
              if (hasPrev) {
                setPreviewLinesPoem(poems[currentIndex - 1]);
              }
            }}
            onNext={() => {
              if (hasNext) {
                setPreviewLinesPoem(poems[currentIndex + 1]);
              }
            }}
          />
        );
      })()}

      {/* 📖 MODAL 2: 成语词条 Preview Modal */}
      {previewLinesIdiom && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewLinesIdiom(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    第 {previewLinesIdiom.id} 组
                  </span>
                  <h3 className="text-lg font-bold font-serif text-slate-900">
                    {previewLinesIdiom.title || `成语接龙第 ${previewLinesIdiom.id} 组`}
                  </h3>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  环形连缀成语表（首尾字符衔接流转）
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLinesIdiom(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 16 Idioms */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(previewLinesIdiom.idioms || []).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-emerald-700 font-mono">#{idx + 1}</span>
                      <span className="text-base font-bold font-serif text-slate-900">{item.word}</span>
                      {item.pinyin && (
                        <span className="text-xs text-slate-400 font-mono font-medium">({item.pinyin})</span>
                      )}
                    </div>
                    {item.has_story && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium">
                        📜 典故
                      </span>
                    )}
                  </div>
                  {item.meaning && (
                    <div className="text-xs text-slate-600 pl-5">
                      <span className="text-slate-400">释义：</span>{item.meaning}
                    </div>
                  )}
                  {item.story && (
                    <div className="text-[11px] text-amber-800 bg-amber-50/40 p-2 rounded-lg border border-amber-100/60 mt-1">
                      <span className="font-bold">典故：</span>{item.story}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const targetGroup = previewLinesIdiom;
                  setPreviewLinesIdiom(null);
                  if ((targetGroup as any).questions && (targetGroup as any).questions.length > 0) {
                    setPreviewQuizIdiom(targetGroup);
                  } else {
                    alert(`成语接龙第 ${targetGroup.id} 组暂无配套练习题`);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>📝</span>
                <span>查看配套习题 ({(previewLinesIdiom as any).questions?.length || 0} 题)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewLinesIdiom(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 MODAL 3: 古诗 习题 StudentQuizPreviewModal */}
      {previewQuizPoem && (
        <StudentQuizPreviewModal
          poemTitle={previewQuizPoem.title}
          questions={previewQuizPoem.questions || []}
          initialIndex={0}
          isPurePreview={true}
          onClose={() => setPreviewQuizPoem(null)}
        />
      )}

      {/* 📝 MODAL 4: 成语 习题 StudentQuizPreviewModal */}
      {previewQuizIdiom && (
        <StudentQuizPreviewModal
          poemTitle={previewQuizIdiom.title || `成语接龙第 ${previewQuizIdiom.id} 组`}
          questions={(previewQuizIdiom as any).questions || []}
          initialIndex={0}
          isPurePreview={true}
          onClose={() => setPreviewQuizIdiom(null)}
        />
      )}
    </div>
  );
};

export default TeacherCourseProgressTab;
