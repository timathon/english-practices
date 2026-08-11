import React from 'react';

interface StudentAssignmentsTabProps {
  assignments: any[];
  poems: any[];
  onStartAssignment: (assignment: any) => void;
}

export const StudentAssignmentsTab: React.FC<StudentAssignmentsTabProps> = ({
  assignments,
  poems,
  onStartAssignment,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-serif text-ink">我的待办作业 (Assignments To Do)</h2>
      {assignments.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
          🎉 太棒了！当前班级暂无待完成作业。
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {assignments.map((asgn) => {
            const poem = poems.find(p => p.id === asgn.poemId) || poems[0];
            
            // Calculate today's attempts used for this assignment
            const studentId = 'usr_stu_001';
            const historyStored = localStorage.getItem(`zxt_qh_${studentId}`);
            const history: any[] = historyStored ? JSON.parse(historyStored) : [];
            const todayStr = new Date().toLocaleDateString('zh-CN');
            const attemptsUsed = history.filter((h: any) => {
              if (!h || !h.completedAt) return false;
              const hDateStr = new Date(h.completedAt.replace(/\//g, '-')).toLocaleDateString('zh-CN');
              if (hDateStr !== todayStr) return false;
              if (asgn.id && h.assignmentId) return h.assignmentId === asgn.id;
              return h.poemTitle === asgn.poemTitle;
            }).length;

            return (
              <div key={asgn.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">
                        截止时间: {asgn.dueDate}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold">
                        📝 {(asgn.questionIds && asgn.questionIds.length > 0) ? asgn.questionIds.length : (poem?.questions || []).length} 道题目
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-bold">
                        🎯 今日次数: {attemptsUsed} / 3
                      </span>
                    </div>
                    <h3 className="text-lg font-bold font-serif text-ink mt-1.5">《{asgn.poemTitle}》</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${asgn.status === '已打卡' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {asgn.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  📋 老师要求: {asgn.requirement}
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    disabled={attemptsUsed >= 3}
                    onClick={() => onStartAssignment(asgn)}
                    className={`px-4 py-2 font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1 ${
                      attemptsUsed >= 3
                        ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                        : asgn.status === '已打卡'
                        ? 'bg-teal-600 hover:bg-teal-500 text-white cursor-pointer'
                        : 'bg-jade-600 hover:bg-jade-500 text-white cursor-pointer'
                    }`}
                  >
                    <span>{attemptsUsed >= 3 ? '🚫' : asgn.status === '已打卡' ? '🔄' : '🚀'}</span>
                    <span>{attemptsUsed >= 3 ? '今日打卡已达上限' : asgn.status === '已打卡' ? '再次练习' : '立即开始答题闯关'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsTab;
