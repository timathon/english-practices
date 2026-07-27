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
            <h1 className="text-xl font-extrabold font-serif tracking-wider bg-gradient-to-r from-emerald-400 via-jade-400 to-teal-300 bg-clip-text text-transparent">
              知新堂
            </h1>
          </div>
          <span className="hidden md:inline-block text-xs text-slate-400 border-l border-slate-700 pl-3">
            多学科AI学习平台
          </span>
        </div>

        {/* Navigation Routes */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
          <button
            onClick={() => navigate('/')}
            className={`px-3 py-1.5 rounded-lg transition ${
              currentPath === '/' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            🌐 平台首页
          </button>
          <button
            onClick={() => navigate('/blg')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 transition ${
              currentPath === '/blg' ? 'bg-jade-900/80 border border-jade-500/50 text-jade-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>🪷</span>
            <span>白莲阁 (古诗文)</span>
          </button>
          {(activeView === 'admin') && (
            <button
              onClick={() => navigate('/admin')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 transition ${
                currentPath === '/admin' ? 'bg-purple-900/80 border border-purple-500/50 text-purple-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>⚙️</span>
              <span>平台管理</span>
            </button>
          )}
          {(user?.role === 'teacher' || activeView === 'teacher') && (
            <button
              onClick={() => navigate('/teacher')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 transition ${
                currentPath === '/teacher' ? 'bg-blue-900/80 border border-blue-500/50 text-blue-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>👩‍🏫</span>
              <span>教师工作台</span>
            </button>
          )}
          {canEditQuizLibrary(user) && (
            <button
              onClick={() => navigate('/editor')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 transition ${
                currentPath === '/editor' ? 'bg-teal-900/80 border border-teal-500/50 text-teal-300 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>✍️</span>
              <span>平台题库编辑</span>
            </button>
          )}
        </nav>

        {/* User Controls / Auth */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
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
