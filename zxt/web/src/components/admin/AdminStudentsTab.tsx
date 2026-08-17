import React from 'react';

interface AdminStudentsTabProps {
  allStudentsList: any[];
  isLoading: boolean;
  onOpenAddStudent: () => void;
  onEditStudent: (student: any) => void;
}

export const AdminStudentsTab: React.FC<AdminStudentsTabProps> = ({
  allStudentsList,
  isLoading,
  onOpenAddStudent,
  onEditStudent,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold font-serif text-ink">学生管理</h3>
          <p className="text-xs text-slate-500 mt-0.5">管理全校学生统一学号、所属班级与学习进度（点击名册卡片可编辑信息）</p>
        </div>
        <button
          onClick={onOpenAddStudent}
          className="px-6 py-2.5 min-w-[110px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-md transition text-center tracking-wider cursor-pointer"
        >
          创建学生账号
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold font-serif text-ink">全校学生名册 ({isLoading ? '...' : `${allStudentsList.length}人`})</h3>
          <p className="text-slate-500 text-[11px] mt-0.5">点击任意学生卡片即可直接编辑学号、所属班级或密码</p>
        </div>
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-500">正在加载学生数据...</span>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
            {allStudentsList.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 text-xs">暂无学生数据</div>
            ) : (
              allStudentsList.map((stu) => (
                <div
                  key={stu.id}
                  onClick={() => onEditStudent(stu)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50/50 hover:border-purple-300 flex justify-between items-center text-xs transition cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-ink text-sm group-hover:text-purple-700 transition flex items-center space-x-1.5">
                      <span>{stu.name}</span>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 text-purple-600 font-normal">✏️ 编辑</span>
                    </div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">账号: {stu.username}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold">
                      {stu.className}
                    </span>
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
