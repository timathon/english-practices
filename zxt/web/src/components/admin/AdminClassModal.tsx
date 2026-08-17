import React from 'react';

interface AdminClassModalProps {
  isOpen: boolean;
  editingClassId: string | null;
  newClassName: string;
  newClassTeachers: string[];
  selectedTeacherToAdd: string;
  selectedStudentToAdd: string;
  teachersList: any[];
  allStudentsList: any[];
  onClose: () => void;
  onClassNameChange: (name: string) => void;
  onClassTeachersChange: (teachers: string[]) => void;
  onSelectedTeacherToAddChange: (tch: string) => void;
  onSelectedStudentToAddChange: (stu: string) => void;
  onAddStudentToClass: (studentId: string) => void;
  onRemoveStudentFromClass: (studentId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminClassModal: React.FC<AdminClassModalProps> = ({
  isOpen,
  editingClassId,
  newClassName,
  newClassTeachers,
  selectedTeacherToAdd,
  selectedStudentToAdd,
  teachersList,
  allStudentsList,
  onClose,
  onClassNameChange,
  onClassTeachersChange,
  onSelectedTeacherToAddChange,
  onSelectedStudentToAddChange,
  onAddStudentToClass,
  onRemoveStudentFromClass,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen m-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
        >
          ✕
        </button>

        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-xl font-bold font-serif text-ink">
            {editingClassId ? `班级建制与名册管理 - ${newClassName || '设置'}` : '开设新班级建制'}
          </h3>
          <p className="text-xs text-slate-500">
            {editingClassId ? '调整班级名称、重新指定任课教师，并调配入班学生名册' : '创建新班级，并为其指定首任责任教师与初始开课计划'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">班级名称 (Class Name)</label>
            <input
              type="text"
              value={newClassName}
              onChange={(e) => onClassNameChange(e.target.value)}
              placeholder="如: 四年级B班 / 六年级创新班"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
              required
            />
          </div>

          {/* Multi-Teacher Selection for Class */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">指定任课教师 (可设置多位任课教师)</label>
            
            {/* Badges of currently assigned teachers */}
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px] items-center">
              {newClassTeachers.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic px-1">暂未指定任课教师</span>
              ) : (
                newClassTeachers.map(tchName => (
                  <span key={tchName} className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-lg text-xs">
                    <span>👩‍🏫 {tchName}</span>
                    <button
                      type="button"
                      onClick={() => onClassTeachersChange(newClassTeachers.filter(t => t !== tchName))}
                      className="text-emerald-600 hover:text-red-600 font-bold text-xs ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Dropdown to add another teacher */}
            <div className="flex space-x-2 pt-1">
              <select
                value={selectedTeacherToAdd}
                onChange={(e) => onSelectedTeacherToAddChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs"
              >
                <option value="">-- 选择要添加的任课教师 --</option>
                {teachersList
                  .filter(t => !newClassTeachers.includes(t.name))
                  .map(t => <option key={t.id} value={t.name}>{t.name} ({t.username})</option>)}
              </select>
              <button
                type="button"
                disabled={!selectedTeacherToAdd}
                onClick={() => {
                  if (selectedTeacherToAdd && !newClassTeachers.includes(selectedTeacherToAdd)) {
                    onClassTeachersChange([...newClassTeachers, selectedTeacherToAdd]);
                    onSelectedTeacherToAddChange('');
                  }
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                + 添加教师
              </button>
            </div>
          </div>

          {/* Full Student Roster Management for Editing Class */}
          {editingClassId && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                  <span>🎓 本班在册学生名册 ({allStudentsList.filter(s => s.className === newClassName.trim()).length}人)</span>
                </label>
              </div>

              {/* Current Students List */}
              <div className="max-h-40 overflow-y-auto space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {allStudentsList.filter(s => s.className === newClassName.trim()).length === 0 ? (
                  <div className="text-center text-[11px] text-slate-400 py-3">
                    暂无在册学生，可在下方从待调配名单中添加入班
                  </div>
                ) : (
                  allStudentsList.filter(s => s.className === newClassName.trim()).map(stu => (
                    <div key={stu.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{stu.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">({stu.username})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveStudentFromClass(stu.id)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] rounded-md border border-red-200 transition cursor-pointer"
                      >
                        移除入班
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Unassigned Students Section */}
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-slate-700 text-xs">
                  ➕ 添加未分配学生入本班
                </label>
                <div className="flex space-x-2">
                  <select
                    value={selectedStudentToAdd}
                    onChange={(e) => onSelectedStudentToAddChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs"
                  >
                    <option value="">-- 选择待调配学生 --</option>
                    {allStudentsList
                      .filter(s => !s.className || s.className === '未分配')
                      .map(stu => (
                        <option key={stu.id} value={stu.id}>
                          {stu.name} ({stu.username}) - [未分配]
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedStudentToAdd}
                    onClick={() => onAddStudentToClass(selectedStudentToAdd)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    确认加入
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md text-sm transition cursor-pointer"
            >
              {editingClassId ? '保存更改' : '确认创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
