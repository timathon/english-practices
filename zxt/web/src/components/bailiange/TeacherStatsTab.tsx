import React from 'react';

interface TeacherStatsTabProps {
  selectedClass: string;
  students: any[];
}

export const TeacherStatsTab: React.FC<TeacherStatsTabProps> = ({
  selectedClass,
  students,
}) => {
  return (
    <div className="space-y-6">

      {/* Overall Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-500">班级平均分</span>
          <div className="text-2xl font-bold text-blue-600 font-mono">91.5 分</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-500">作业打卡率</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono">96.4 %</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-500">需关注易错诗句</span>
          <div className="text-sm font-bold text-amber-800 font-serif">“浮萍一道开” (混淆率22%)</div>
        </div>
      </div>

      {/* Student Individual Stats Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold font-serif text-ink">【{selectedClass}】学生个人答题明细</h3>
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th className="p-3">学生姓名</th>
              <th className="p-3">账号 ID</th>
              <th className="p-3">完成闯关数</th>
              <th className="p-3">平均得分</th>
              <th className="p-3">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((stu) => (
              <tr key={stu.id} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-ink">{stu.name}</td>
                <td className="p-3 font-mono">{stu.username}</td>
                <td className="p-3">{stu.completedQuizzes} 首</td>
                <td className="p-3 font-bold text-emerald-600">{stu.avgScore} 分</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">正常</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default TeacherStatsTab;
