import React from 'react';
import { UserSession, canEditQuizLibrary } from '../services/api';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  user: UserSession | null;
  activeView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin';
  onOpenLogin: () => void;
  onOpenViewSwitcher: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  navigate,
  user,
  activeView,
  onOpenLogin,
  onOpenViewSwitcher,
  onLogout,
}) => {
  const viewBadgeColor = {
    student: 'bg-emerald-500 text-white border-emerald-400',
    parent: 'bg-amber-500 text-white border-amber-400',
    teacher: 'bg-blue-600 text-white border-blue-500',
    editor: 'bg-teal-600 text-white border-teal-500',
    admin: 'bg-purple-600 text-white border-purple-500',
  };

  const viewBadgeLabel = {
    student: '🎓 学生视图 (Student)',
    parent: '👨‍👩‍👧 家长视图 (Parent)',
    teacher: '👩‍🏫 教师视图 (Teacher)',
    editor: '✍️ 编辑视图 (Editor)',
    admin: '⚙️ 管理员视图 (Admin)',
  };

  return (
    <header className="bg-ink text-white fixed top-0 left-0 right-0 z-30 shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-4 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold font-serif tracking-wider bg-gradient-to-r from-emerald-400 via-jade-400 to-teal-300 bg-clip-text text-transparent" title={__APP_VERSION__}>
              知新堂
            </h1>
          </div>
          <span className="hidden md:inline-block text-xs text-slate-400 border-l border-slate-700 pl-3">
            多学科AI学习平台
          </span>
        </div>



        {/* User Controls / Auth */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              {/* View Selecting Dropdown (placed to the left of user name) */}
              <div className="relative">
                <select
                  value={(() => {
                    if (currentPath.startsWith('/student') || currentPath.startsWith('/blg')) {
                      return window.location.search.includes('tab=selfstudy') ? '/student?tab=selfstudy' : '/student?tab=assignments';
                    }
                    return currentPath;
                  })()}
                  onChange={(e) => navigate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg text-xs font-bold text-slate-200 outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-xs"
                >
                  {user.role === 'admin' && (
                    <>
                      <option value="/teacher">👩‍🏫 教师工作台</option>
                      <option value="/editor">✍️ 平台题库编辑</option>
                      <option value="/admin">⚙️ 平台管理中心</option>
                    </>
                  )}
                  {user.role === 'teacher' && canEditQuizLibrary(user) && (
                    <>
                      <option value="/teacher">👩‍🏫 教师工作台</option>
                      <option value="/editor">✍️ 平台题库编辑</option>
                    </>
                  )}
                  {user.role === 'teacher' && !canEditQuizLibrary(user) && (
                    <>
                      <option value="/teacher">👩‍🏫 教师工作台</option>
                    </>
                  )}
                  {user.role !== 'teacher' && user.role !== 'admin' && (
                    <>
                      <option value="/student?tab=assignments">📝 班级作业</option>
                      <option value="/student?tab=selfstudy">📖 自主学习</option>
                    </>
                  )}
                </select>
              </div>

              <div className="text-xs text-right">
                <span className="font-bold text-white">{user.name}</span>
                {user.role !== 'teacher' && user.className && (
                  <span className="text-[10px] text-slate-400 ml-1 font-mono">({user.className})</span>
                )}
              </div>
              <button
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 transition"
              >
                退出
              </button>
            </div>
          ) : (
            currentPath !== '/' && (
              <button
                onClick={onOpenLogin}
                className="px-4 py-1.5 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-xs font-bold shadow-md transition"
              >
                登录账号
              </button>
            )
          )}
        </div>

      </div>
    </header>
  );
};
