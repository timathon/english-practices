import React from 'react';

interface AdminTeacherModalProps {
  isOpen: boolean;
  editingTeacherId: string | null;
  newTeacherName: string;
  newTeacherUsername: string;
  newTeacherPassword: string;
  newTeacherClasses: string[];
  selectedClassToAdd: string;
  newTeacherIsQuizEditor: boolean;
  classes: any[];
  onClose: () => void;
  onTeacherNameChange: (name: string) => void;
  onTeacherUsernameChange: (username: string) => void;
  onTeacherPasswordChange: (password: string) => void;
  onTeacherClassesChange: (classes: string[]) => void;
  onSelectedClassToAddChange: (cls: string) => void;
  onTeacherIsQuizEditorChange: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminTeacherModal: React.FC<AdminTeacherModalProps> = ({
  isOpen,
  editingTeacherId,
  newTeacherName,
  newTeacherUsername,
  newTeacherPassword,
  newTeacherClasses,
  selectedClassToAdd,
  newTeacherIsQuizEditor,
  classes,
  onClose,
  onTeacherNameChange,
  onTeacherUsernameChange,
  onTeacherPasswordChange,
  onTeacherClassesChange,
  onSelectedClassToAddChange,
  onTeacherIsQuizEditorChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen m-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
        >
          ✕
        </button>

        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-xl font-bold font-serif text-ink">
            {editingTeacherId ? '编辑教师账号信息' : '开设新教师账号'}
          </h3>
          <p className="text-xs text-slate-500">
            {editingTeacherId ? '修改教师工号、管辖班级或重置密码' : '为任课教师开通管理账号，分配教学工作台与管辖班级'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">教师姓名</label>
            <input
              type="text"
              value={newTeacherName}
              onChange={(e) => onTeacherNameChange(e.target.value)}
              placeholder="如: 陈老师"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">登录账号 (Login Username)</label>
            <input
              type="text"
              value={newTeacherUsername}
              onChange={(e) => onTeacherUsernameChange(e.target.value)}
              placeholder="如: tch_8848 (默认自动生成)"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono text-blue-900 focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">自动生成唯一工号，亦可按学校要求手动输入修改</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {editingTeacherId ? '重置密码 (Reset Password)' : '登录密码 (Initial Password)'}
            </label>
            <input
              type="text"
              value={newTeacherPassword}
              onChange={(e) => onTeacherPasswordChange(e.target.value)}
              placeholder={editingTeacherId ? '留空表示不重置原密码' : '默认: abcd'}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {editingTeacherId ? (
                '若不修改密码请留空；输入新密码保存后将重置'
              ) : (
                <>默认统一初始密码: <span className="font-bold text-blue-700">abcd</span></>
              )}
            </p>
          </div>

          {/* Multi-Class Selection for Teacher */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">分配负责班级 (可兼任多个班级)</label>
            
            {/* Badges of currently assigned classes */}
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px] items-center">
              {newTeacherClasses.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic px-1">暂未分配任何班级</span>
              ) : (
                newTeacherClasses.map(clsName => (
                  <span key={clsName} className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-100 text-blue-900 font-bold rounded-lg text-xs">
                    <span>{clsName}</span>
                    <button
                      type="button"
                      onClick={() => onTeacherClassesChange(newTeacherClasses.filter(c => c !== clsName))}
                      className="text-blue-600 hover:text-red-600 font-bold text-xs ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Dropdown to add another class */}
            <div className="flex space-x-2 pt-1">
              <select
                value={selectedClassToAdd}
                onChange={(e) => onSelectedClassToAddChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs"
              >
                <option value="">-- 选择要添加管辖的班级 --</option>
                {classes
                  .filter(c => !newTeacherClasses.includes(c.name))
                  .map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <button
                type="button"
                disabled={!selectedClassToAdd}
                onClick={() => {
                  if (selectedClassToAdd && !newTeacherClasses.includes(selectedClassToAdd)) {
                    onTeacherClassesChange([...newTeacherClasses, selectedClassToAdd]);
                    onSelectedClassToAddChange('');
                  }
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                + 添加班级
              </button>
            </div>
          </div>

          {/* Quiz Editor Role Toggle */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center space-x-1.5 cursor-pointer select-none">
                <span>✍️ 兼任题库编辑</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTeacherIsQuizEditor}
                  onChange={(e) => onTeacherIsQuizEditorChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              开启后该教师账号将兼具【题目编辑视图】权限，可直接管理古诗题库与设计干扰项陷阱
            </p>
          </div>

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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md text-sm transition cursor-pointer"
            >
              {editingTeacherId ? '保存' : '确认创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
