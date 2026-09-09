import React from 'react';

export interface PublishSuccessData {
  className: string;
  poemTitle: string;
  questionCount: number;
  startDate?: string;
  dueDate: string;
  requirement: string;
}

interface TeacherPublishSuccessModalProps {
  data: PublishSuccessData;
  onClose: () => void;
}

export const TeacherPublishSuccessModal: React.FC<TeacherPublishSuccessModalProps> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 !mt-0 !m-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
          🎉
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold font-serif text-slate-800">
            作业发布成功！
          </h3>
          <p className="text-xs text-slate-500">
            班级【<span className="font-bold text-blue-600">{data.className}</span>】的学生现已可在学生端进行答题打卡。
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left text-xs space-y-2 font-medium">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500">发布古诗篇目</span>
            <span className="font-bold text-slate-800 font-serif text-sm">《{data.poemTitle}》</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">精选试题数量</span>
            <span className="font-bold text-emerald-600">{data.questionCount} 道题</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">截止打卡时间</span>
            <span className="font-bold text-blue-600">{data.dueDate}</span>
          </div>
          {data.requirement && (
            <div className="pt-1 text-slate-600 border-t border-slate-200/60">
              <span className="text-slate-400 block text-[10px]">作业要求:</span>
              <p className="font-sans leading-relaxed">{data.requirement}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
        >
          完成并返回作业列表
        </button>
      </div>
    </div>
  );
};
