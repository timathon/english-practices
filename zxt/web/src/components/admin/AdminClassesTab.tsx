import React from 'react';
import { getClassTeachers } from './adminUtils';

interface AdminClassesTabProps {
  classes: any[];
  allStudentsList: any[];
  isLoading: boolean;
  onOpenAddClass: () => void;
  onEditClass: (cls: any) => void;
}

export const AdminClassesTab: React.FC<AdminClassesTabProps> = ({
  classes,
  allStudentsList,
  isLoading,
  onOpenAddClass,
  onEditClass,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold font-serif text-ink">班级管理</h3>
          <p className="text-xs text-slate-500 mt-0.5">开设全校新班级建制、指定任课教师与汇总入班学额</p>
        </div>
        <button
          onClick={onOpenAddClass}
          className="px-6 py-2.5 min-w-[110px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition text-center tracking-wider cursor-pointer"
        >
          创建班级
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold font-serif text-ink">全校已建班级名册 ({isLoading ? '...' : `${classes.length}个班级`})</h3>
          <p className="text-slate-500 text-[11px] mt-0.5">点击任意班级卡片即可编辑班级名称、指定责任教师并调配学生名册</p>
        </div>
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-500">正在加载班级数据...</span>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
            {classes.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 text-xs">暂无班级数据</div>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => onEditClass(cls)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 flex justify-between items-center text-xs transition cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-ink text-sm flex items-center space-x-2 group-hover:text-emerald-700 transition">
                      <span>{cls.name}</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">ID: {cls.id}</span>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 text-emerald-600 font-normal">✏️ 管理</span>
                    </div>
                    <div className="text-slate-500 mt-1">
                      任课教师: {getClassTeachers(cls).length > 0 ? getClassTeachers(cls).join(', ') : '未指定教师'}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs font-mono">
                    {allStudentsList.filter(s => s.className === cls.name).length} 人
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
