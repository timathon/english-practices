import React, { useState, useEffect } from 'react';
import { apiService, IdiomGroup } from '../../services/api';

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
  newAsgnIdiomGroupId?: number;
  setNewAsgnIdiomGroupId?: (id: number) => void;
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
  newAsgnIdiomGroupId = 1,
  setNewAsgnIdiomGroupId,
  newAsgnDueDate,
  setNewAsgnDueDate,
  poems,
  learntPoemIds,
  assignments,
  isAssignmentsLoading,
  onPublishAssignment,
  onPreviewAssignment,
}) => {
  const [availableIdiomGroups, setAvailableIdiomGroups] = useState<IdiomGroup[]>(() => apiService.getLocalIdiomGroups());

  useEffect(() => {
    apiService.getIdiomGroups().then(groups => {
      setAvailableIdiomGroups(groups);
    });
  }, []);
  return (
    <div className="grid md:grid-cols-2 gap-6">

      {/* Form to publish */}
      <form onSubmit={onPublishAssignment} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
        <h3 className="text-base font-bold font-serif text-ink">发布新作业到【{selectedClass}】</h3>

        {/* Level 1: Subject Tabs */}
        <div className="flex flex-wrap gap-2">
          {(['语文', '数学', '英语', '科学'] as const).map(sub => (
            <button
              key={sub}
              type="button"
              onClick={() => {
                setAsgnSubject(sub);
                let sec = '古诗';
                if (sub === '数学') sec = '数理逻辑';
                else if (sub === '英语') sec = '语法与阅读';
                else if (sub === '科学') sec = '自然科学';
                setAsgnSection(sec);

                const reqMap: Record<string, string> = {
                  '语文-古诗': '完成诗句连线与古诗背诵打卡',
                  '语文-成语': '完成成语接龙、释义与典故运用测试',
                  '语文-识字': '完成汉字笔顺、部首与形近字辨析打卡',
                  '语文-拼音': '完成声母、韵母、整体认读与拼读打卡',
                  '数学-数理逻辑': '完成逻辑推理与应用题训练',
                  '数学-几何基础': '完成图形识别与几何面积计算',
                  '英语-语法与阅读': '完成语法选择题与短文阅读理解',
                  '英语-听力口语': '完成听力录音理解与口语朗读打卡',
                  '科学-自然科学': '完成自然现象观察与科学知识测试',
                  '科学-物理与化学': '完成基础物理化学实验常识问答',
                };
                setNewAsgnReq(reqMap[`${sub}-${sec}`] || `完成【${sub} - ${sec}】相关单元练习`);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                asgnSubject === sub
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{sub === '语文' ? '📖' : sub === '数学' ? '📐' : sub === '英语' ? '🔤' : '🔬'}</span>
              <span>{sub}</span>
            </button>
          ))}
        </div>

        {/* Level 2: Section Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {asgnSubject === '语文' &&
            [
              { key: '古诗', label: '古诗', icon: '🪷', activeBg: 'bg-teal-600' },
              { key: '成语', label: '成语', icon: '🐉', activeBg: 'bg-emerald-600' },
              { key: '识字', label: '识字', icon: '✍️', activeBg: 'bg-amber-600' },
              { key: '拼音', label: '拼音', icon: '🔡', activeBg: 'bg-indigo-600' },
            ].map(secItem => (
              <button
                key={secItem.key}
                type="button"
                onClick={() => {
                  setAsgnSection(secItem.key);
                  const reqMap: Record<string, string> = {
                    '语文-古诗': '完成诗句连线与古诗背诵打卡',
                    '语文-成语': '完成成语接龙、释义与典故运用测试',
                    '语文-识字': '完成汉字笔顺、部首与形近字辨析打卡',
                    '语文-拼音': '完成声母、韵母、整体认读与拼读打卡',
                  };
                  setNewAsgnReq(reqMap[`语文-${secItem.key}`] || `完成【语文 - ${secItem.key}】相关单元练习`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  asgnSection === secItem.key
                    ? `${secItem.activeBg} text-white shadow-xs`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{secItem.icon}</span>
                <span>{secItem.label}</span>
              </button>
            ))}

          {asgnSubject === '数学' &&
            [
              { key: '数理逻辑', label: '数理逻辑', icon: '🔢' },
              { key: '几何基础', label: '几何基础', icon: '📐' },
            ].map(secItem => (
              <button
                key={secItem.key}
                type="button"
                onClick={() => {
                  setAsgnSection(secItem.key);
                  setNewAsgnReq(`完成【数学 - ${secItem.key}】相关单元练习`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  asgnSection === secItem.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{secItem.icon}</span>
                <span>{secItem.label}</span>
              </button>
            ))}

          {asgnSubject === '英语' &&
            [
              { key: '语法与阅读', label: '语法与阅读', icon: '📖' },
              { key: '听力口语', label: '听力口语', icon: '🎧' },
            ].map(secItem => (
              <button
                key={secItem.key}
                type="button"
                onClick={() => {
                  setAsgnSection(secItem.key);
                  setNewAsgnReq(`完成【英语 - ${secItem.key}】相关单元练习`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  asgnSection === secItem.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{secItem.icon}</span>
                <span>{secItem.label}</span>
              </button>
            ))}

          {asgnSubject === '科学' &&
            [
              { key: '自然科学', label: '自然科学', icon: '🌿' },
              { key: '物理与化学', label: '物理与化学', icon: '🧪' },
            ].map(secItem => (
              <button
                key={secItem.key}
                type="button"
                onClick={() => {
                  setAsgnSection(secItem.key);
                  setNewAsgnReq(`完成【科学 - ${secItem.key}】相关单元练习`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  asgnSection === secItem.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{secItem.icon}</span>
                <span>{secItem.label}</span>
              </button>
            ))}
        </div>

        {asgnSubject === '语文' && (asgnSection === '古诗' || asgnSection.includes('古诗') || asgnSection.includes('白莲阁')) ? (
          <div>
            <label className="block font-bold text-slate-700 mb-1">选择单元 (已解锁)</label>
            <select
              value={newAsgnPoemId}
              onChange={(e) => setNewAsgnPoemId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
            >
              {poems.filter(p => learntPoemIds.map(Number).includes(Number(p.id))).length > 0 ? (
                [...poems.filter(p => learntPoemIds.map(Number).includes(Number(p.id)))].reverse().map(p => {
                  const pubCount = assignments.filter((a: any) => a.poemId === p.id || a.poemTitle === p.title).length;
                  return (
                    <option key={p.id} value={p.id}>
                      #{p.id} 《{p.title}》 - [{p.dynasty}] {p.author}{pubCount > 0 ? ` (已发布 ${pubCount} 次)` : ''}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>⚠️ 当前班级暂无已解锁单元 (请在【课程进度】页切换授课状态)</option>
              )}
            </select>
          </div>
        ) : asgnSubject === '语文' && (asgnSection === '成语' || asgnSection.includes('成语')) ? (
          <div>
            <label className="block font-bold text-slate-700 mb-1">选择单元 (已解锁)</label>
            <select
              value={newAsgnIdiomGroupId}
              onChange={e => setNewAsgnIdiomGroupId && setNewAsgnIdiomGroupId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
            >
              {(() => {
                const getUnlockedIdiomIds = (): number[] => {
                  const stored = localStorage.getItem(`zxt_learnt_idioms_${selectedClass}`);
                  if (stored) {
                    try {
                      const parsed = JSON.parse(stored);
                      if (Array.isArray(parsed)) return parsed.map(Number);
                    } catch (_) {}
                  }
                  return [1];
                };
                const unlockedIds = getUnlockedIdiomIds();
                const unlockedGroups = availableIdiomGroups.filter(g => unlockedIds.includes(Number(g.id)));

                return unlockedGroups.length > 0 ? (
                  unlockedGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      #{group.id} {group.title || `成语接龙第${group.id}组`} ({group.idioms?.length || 16}条成语)
                    </option>
                  ))
                ) : (
                  <option value="" disabled>⚠️ 当前班级暂无已解锁成语单元 (请在【课程进度】页切换授课状态)</option>
                );
              })()}
            </select>
          </div>
        ) : (
          <div>
            <label className="block font-bold text-slate-700 mb-1">选择单元 (已解锁)</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer">
              <option value="task_2">【{asgnSubject} - {asgnSection}】第 2 单元能力拓展</option>
              <option value="task_1">【{asgnSubject} - {asgnSection}】第 1 单元综合练习</option>
            </select>
          </div>
        )}
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
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🎯 审题与挑选作业题目</span>
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
