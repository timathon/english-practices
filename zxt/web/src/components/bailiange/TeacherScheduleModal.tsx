import React from 'react';
import { PublishingItem } from './TeacherQuestionReviewModal';

interface TeacherScheduleModalProps {
  selectedClass: string;
  publishingPoem: PublishingItem;
  selectedQuestionCount: number;
  isImmediateStart: boolean;
  newAsgnStartDate: string;
  newAsgnDueDate: string;
  newAsgnReq: string;
  onSetIsImmediateStart: (val: boolean) => void;
  onSetNewAsgnStartDate: (val: string) => void;
  onSetNewAsgnDueDate: (val: string) => void;
  onSetNewAsgnReq: (val: string) => void;
  onClose: () => void;
  onConfirmPublish: () => void;
}

export const TeacherScheduleModal: React.FC<TeacherScheduleModalProps> = ({
  selectedClass,
  publishingPoem,
  selectedQuestionCount,
  isImmediateStart,
  newAsgnStartDate,
  newAsgnDueDate,
  newAsgnReq,
  onSetIsImmediateStart,
  onSetNewAsgnStartDate,
  onSetNewAsgnDueDate,
  onSetNewAsgnReq,
  onClose,
  onConfirmPublish
}) => {
  const formatDateTimeLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 !mt-0 !m-0 z-[115] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h3 className="text-base font-bold font-serif text-slate-800">
              设定作业开始与截止时间
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">发布班级:</span>
            <span className="font-bold text-blue-600">{selectedClass}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">作业内容:</span>
            <span className="font-bold text-slate-800">《{publishingPoem.title}》</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">已选题目:</span>
            <span className="font-bold text-emerald-600">{selectedQuestionCount} 道精选题目</span>
          </div>
        </div>

        {/* Start Date & Time */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs text-slate-700">开始时间 (Start Time)</label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-emerald-700 select-none bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <input
                type="checkbox"
                checked={isImmediateStart}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onSetIsImmediateStart(checked);
                  if (checked) {
                    const d = new Date();
                    d.setMinutes(d.getMinutes() + 5);
                    onSetNewAsgnStartDate(formatDateTimeLocal(d));
                  } else {
                    const d = new Date();
                    d.setHours(d.getHours() + 1);
                    onSetNewAsgnStartDate(formatDateTimeLocal(d));
                  }
                }}
                className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer"
              />
              <span>立即开始 (5分钟后生效)</span>
            </label>
          </div>

          <input
            type="datetime-local"
            disabled={isImmediateStart}
            value={newAsgnStartDate}
            onChange={(e) => onSetNewAsgnStartDate(e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-bold text-xs text-slate-800 outline-none transition ${
              isImmediateStart
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer'
            }`}
          />
          <p className="text-[10px] text-slate-400">
            {isImmediateStart ? '💡 学生端将在发布 5 分钟后正式开放答题' : '💡 未到开始时间前，学生端可浏览但无法进入答题'}
          </p>
        </div>

        {/* End Date & Time */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs text-slate-700">截止时间 (Due Time)</label>
            <span className="text-[10px] text-slate-400">逾期仍可补交（无准时打卡奖励）</span>
          </div>
          <input
            type="datetime-local"
            value={newAsgnDueDate}
            onChange={(e) => onSetNewAsgnDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        <div>
          <label className="block font-bold text-xs text-slate-700 mb-1">作业要求说明</label>
          <textarea
            value={newAsgnReq}
            onChange={(e) => onSetNewAsgnReq(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            ← 返回挑题
          </button>
          <button
            type="button"
            onClick={onConfirmPublish}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            🚀 确认发布作业
          </button>
        </div>
      </div>
    </div>
  );
};
