import React from 'react';

interface TeacherAssignmentsPublishTabProps {
  selectedClass: string;
  asgnSubject: string;
  setAsgnSubject: (sub: string) => void;
  asgnSection: string;
  setAsgnSection: (sec: string) => void;
  newAsgnReq: string;
  setNewAsgnReq: (req: string) => void;
  newAsgnPoemId: number;
  setNewAsgnPoemId: (id: number) => void;
  newAsgnDueDate: string;
  setNewAsgnDueDate: (date: string) => void;
  poems: any[];
  learntPoemIds: any[];
  assignments: any[];
  isAssignmentsLoading: boolean;
  onPublishAssignment: (e: React.FormEvent) => void;
  onPreviewAssignment: (asgn: any) => void;
}

export const TeacherAssignmentsPublishTab: React.FC<TeacherAssignmentsPublishTabProps> = ({
  selectedClass,
  asgnSubject,
  setAsgnSubject,
  asgnSection,
  setAsgnSection,
  newAsgnReq,
  setNewAsgnReq,
  newAsgnPoemId,
  setNewAsgnPoemId,
  newAsgnDueDate,
  setNewAsgnDueDate,
  poems,
  learntPoemIds,
  assignments,
  isAssignmentsLoading,
  onPublishAssignment,
  onPreviewAssignment,
}) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">

      {/* Form to publish */}
      <form onSubmit={onPublishAssignment} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
        <h3 className="text-base font-bold font-serif text-ink">发布新作业到【{selectedClass}】</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">学科 (Subject)</label>
            <select
              value={asgnSubject}
              onChange={(e) => {
                const sub = e.target.value;
                setAsgnSubject(sub);
                let sec = '白莲阁';
                if (sub === '数学') sec = '数理逻辑';
                else if (sub === '英语') sec = '语法与阅读';
                else if (sub === '科学') sec = '自然科学';
                setAsgnSection(sec);

                const reqMap: Record<string, string> = {
                  '语文-白莲阁': '完成诗句连线与古诗背诵打卡',
                  '语文-现代文阅读': '完成篇章阅读理解与重点词句赏析',
                  '数学-数理逻辑': '完成逻辑推理与应用题训练',
                  '数学-几何基础': '完成图形识别与几何面积计算',
                  '英语-语法与阅读': '完成语法选择题与短文阅读理解',
                  '英语-听力口语': '完成听力录音理解与口语朗读打卡',
                  '科学-自然科学': '完成自然现象观察与科学知识测试',
                  '科学-物理与化学': '完成基础物理化学实验常识问答',
                };
                setNewAsgnReq(reqMap[`${sub}-${sec}`] || `完成【${sub} - ${sec}】相关单元练习`);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
            >
              <option value="语文">语文</option>
              <option value="数学">数学</option>
              <option value="英语">英语</option>
              <option value="科学">科学</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">分区 (Section)</label>
            <select
              value={asgnSection}
              onChange={(e) => {
                const sec = e.target.value;
                setAsgnSection(sec);
                const reqMap: Record<string, string> = {
                  '语文-白莲阁': '完成诗句连线与古诗背诵打卡',
                  '语文-现代文阅读': '完成篇章阅读理解与重点词句赏析',
                  '数学-数理逻辑': '完成逻辑推理与应用题训练',
                  '数学-几何基础': '完成图形识别与几何面积计算',
                  '英语-语法与阅读': '完成语法选择题与短文阅读理解',
                  '英语-听力口语': '完成听力录音理解与口语朗读打卡',
                  '科学-自然科学': '完成自然现象观察与科学知识测试',
                  '科学-物理与化学': '完成基础物理化学实验常识问答',
                };
                setNewAsgnReq(reqMap[`${asgnSubject}-${sec}`] || `完成【${asgnSubject} - ${sec}】相关单元练习`);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
            >
              {asgnSubject === '语文' && (
                <>
                  <option value="白莲阁">白莲阁 (古诗文)</option>
                  <option value="现代文阅读">现代文阅读</option>
                </>
              )}
              {asgnSubject === '数学' && (
                <>
                  <option value="数理逻辑">数理逻辑</option>
                  <option value="几何基础">几何基础</option>
                </>
              )}
              {asgnSubject === '英语' && (
                <>
                  <option value="语法与阅读">语法与阅读</option>
                  <option value="听力口语">听力口语</option>
                </>
              )}
              {asgnSubject === '科学' && (
                <>
                  <option value="自然科学">自然科学</option>
                  <option value="物理与化学">物理与化学</option>
                </>
              )}
            </select>
          </div>
        </div>

        {asgnSubject === '语文' && (asgnSection === '白莲阁' || asgnSection.includes('白莲阁')) ? (
          <div>
            <label className="block font-bold text-slate-700 mb-1">选择古诗 (已完成授课/已解锁)</label>
            <select
              value={newAsgnPoemId}
              onChange={(e) => setNewAsgnPoemId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
            >
              {poems.filter(p => learntPoemIds.map(Number).includes(Number(p.id))).length > 0 ? (
                poems.filter(p => learntPoemIds.map(Number).includes(Number(p.id))).map(p => {
                  const pubCount = assignments.filter((a: any) => a.poemId === p.id || a.poemTitle === p.title).length;
                  return (
                    <option key={p.id} value={p.id}>
                      #{p.id} 《{p.title}》 - [{p.dynasty}] {p.author}{pubCount > 0 ? ` (已发布 ${pubCount} 次)` : ''}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>⚠️ 当前班级暂无已解锁古诗 (请在【课程进度】页切换授课状态)</option>
              )}
            </select>
          </div>
        ) : (
          <div>
            <label className="block font-bold text-slate-700 mb-1">选择学习任务 (Select Task)</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer">
              <option value="task_1">【{asgnSubject} - {asgnSection}】第 1 单元综合练习</option>
              <option value="task_2">【{asgnSubject} - {asgnSection}】第 2 单元能力拓展</option>
            </select>
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 mb-1">截止时间</label>
          <input
            type="date"
            value={newAsgnDueDate}
            onChange={(e) => setNewAsgnDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">作业要求说明</label>
          <textarea
            value={newAsgnReq}
            onChange={(e) => setNewAsgnReq(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          🚀 立即向【{selectedClass}】发布作业
        </button>
      </form>

      {/* Published assignments list */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-serif text-ink">【{selectedClass}】已发布作业列表</h3>
          {isAssignmentsLoading && (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5 animate-pulse">
              <svg className="animate-spin h-3.5 w-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中...
            </span>
          )}
        </div>

        {isAssignmentsLoading && assignments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <svg className="animate-spin h-6 w-6 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-xs">正在从数据库加载【{selectedClass}】作业...</div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            【{selectedClass}】暂无已发布作业
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {assignments.map((asgn: any) => (
              <div
                key={asgn.id}
                onClick={() => onPreviewAssignment(asgn)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition cursor-pointer space-y-1 text-xs group"
                title="点击预览此份已发布作业的学生答题体验"
              >
                <div className="flex justify-between items-center font-bold text-ink">
                  <span className="flex items-center gap-1.5 font-serif text-sm">
                    《{asgn.poemTitle}》
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 font-sans font-normal border border-indigo-200 rounded opacity-0 group-hover:opacity-100 transition">
                      👁 预览体验
                    </span>
                  </span>
                  <span className="text-blue-600 font-sans">截止: {asgn.dueDate}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{asgn.requirement}</p>
                {asgn.questionIds && asgn.questionIds.length > 0 && (
                  <div className="pt-1 text-[10px] font-bold text-slate-400">
                    包含 {asgn.questionIds.length} 道精选题目
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default TeacherAssignmentsPublishTab;
