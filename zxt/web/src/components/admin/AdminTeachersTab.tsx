import React from 'react';
import { getTeacherClasses } from './adminUtils';

interface AdminTeachersTabProps {
  teachersList: any[];
  isLoading: boolean;
  onOpenAddTeacher: () => void;
  onEditTeacher: (teacher: any) => void;
}

export const AdminTeachersTab: React.FC<AdminTeachersTabProps> = ({
  teachersList,
  isLoading,
  onOpenAddTeacher,
  onEditTeacher,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold font-serif text-ink">教师管理</h3>
          <p className="text-xs text-slate-500 mt-0.5">查看及分配教师管辖班级，统一开通教师登录账号（点击列表卡片可编辑信息）</p>
        </div>
        <button
          onClick={onOpenAddTeacher}
          className="px-6 py-2.5 min-w-[110px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md transition text-center tracking-wider cursor-pointer"
        >
          创建教师账号
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold font-serif text-ink">全校教师列表 ({isLoading ? '...' : `${teachersList.length}人`})</h3>
          <p className="text-slate-500 text-[11px] mt-0.5">点击任意教师卡片即可直接编辑账号工号、管辖班级或密码</p>
        </div>
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-500">正在加载教师数据...</span>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
            {teachersList.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 text-xs">暂无教师数据</div>
            ) : (
              teachersList.map((tch) => (
                <div
                  key={tch.id}
                  onClick={() => onEditTeacher(tch)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 flex justify-between items-center text-xs transition cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-ink text-sm group-hover:text-blue-700 transition flex items-center space-x-1.5">
                      <span>{tch.name}</span>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 text-blue-600 font-normal">✏️ 编辑</span>
                    </div>
                    <div className="text-slate-500 font-mono mt-1">账号: {tch.username}</div>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-wrap justify-end gap-y-1">
                    {tch.isQuizEditor && (
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-800 font-bold rounded text-[10px] flex items-center gap-1 border border-teal-200">
                        ✍️ 题库编辑
                      </span>
                    )}
                    {getTeacherClasses(tch).length === 0 ? (
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-600 font-bold rounded-lg text-xs">
                        未分配
                      </span>
                    ) : (
                      getTeacherClasses(tch).map(clsName => (
                        <span key={clsName} className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg text-xs">
                          {clsName}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
