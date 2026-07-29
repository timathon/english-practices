import React from 'react';

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
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold font-serif text-ink">【{selectedClass}】古诗教学进度与学生自学解锁控制</h3>
        <p className="text-xs text-slate-500">点击勾选已教学古诗，勾选后学生端将在“自主拓展学习”中解锁对应古诗的背景故事与赏析。</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        {poems.map((poem) => {
          const isLearnt = learntPoemIds.map(Number).includes(Number(poem.id));
          const isAnimating = animatingPoemId === Number(poem.id);
          return (
            <div
              key={poem.id}
              onClick={() => onToggleLearnt(poem.id)}
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
                <div className="font-serif text-ink font-bold flex items-center gap-1.5">
                  #{poem.id} 《{poem.title}》
                  {isAnimating && (
                    <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">[{poem.dynasty}] {poem.author}</div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] transition-all duration-300 ${
                isAnimating ? 'scale-110' : ''
              } ${isLearnt ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                {isLearnt ? '🔓 已学 (已解锁)' : '🔒 待学 (已锁定)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherCourseProgressTab;
