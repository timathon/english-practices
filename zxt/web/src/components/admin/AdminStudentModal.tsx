import React from 'react';

interface AdminStudentModalProps {
  isOpen: boolean;
  editingStudentId: string | null;
  newStudentName: string;
  newStudentUsername: string;
  newStudentPassword: string;
  newStudentClass: string;
  classes: any[];
  onClose: () => void;
  onStudentNameChange: (name: string) => void;
  onStudentUsernameChange: (username: string) => void;
  onStudentPasswordChange: (password: string) => void;
  onStudentClassChange: (cls: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminStudentModal: React.FC<AdminStudentModalProps> = ({
  isOpen,
  editingStudentId,
  newStudentName,
  newStudentUsername,
  newStudentPassword,
  newStudentClass,
  classes,
  onClose,
  onStudentNameChange,
  onStudentUsernameChange,
  onStudentPasswordChange,
  onStudentClassChange,
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
            {editingStudentId ? '编辑学生账号信息' : '创建学生账号'}
          </h3>
          <p className="text-xs text-slate-500">
            {editingStudentId ? '修改学生学号、所属班级或密码' : '生成学生统一学号凭证，分配所属班级名册'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">学生姓名</label>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => onStudentNameChange(e.target.value)}
              placeholder="如: 王小强"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">登录账号 (Login Username)</label>
            <input
              type="text"
              value={newStudentUsername}
              onChange={(e) => onStudentUsernameChange(e.target.value)}
              placeholder="如: stu_1001 (默认自动生成)"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono text-purple-900 focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">自动生成唯一学号，亦可自定义修改</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {editingStudentId ? '重置密码 (Reset Password)' : '登录密码 (Initial Password)'}
            </label>
            <input
              type="text"
              value={newStudentPassword}
              onChange={(e) => onStudentPasswordChange(e.target.value)}
              placeholder={editingStudentId ? '留空表示不重置原密码' : '默认: 1234'}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {editingStudentId ? (
                '若不修改密码请留空；输入新密码保存后将重置'
              ) : (
                <>默认统一初始密码: <span className="font-bold text-purple-700">1234</span></>
              )}
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">入班选择</label>
            <select
              value={newStudentClass}
              onChange={(e) => onStudentClassChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-sm"
            >
              <option value="">-- 暂未分配 (待定) --</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
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
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md text-sm transition cursor-pointer"
            >
              {editingStudentId ? '保存' : '确认创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
