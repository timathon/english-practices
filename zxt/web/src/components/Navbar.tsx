import React, { useState, useEffect, useRef } from 'react';
import { UserSession, canEditQuizLibrary, apiService } from '../services/api';
import { getSyncQueue, subscribeSyncQueue } from '../services/syncQueue';
import { AvatarDisplay, AvatarConfig, DEFAULT_AVATAR_CONFIG } from './AvatarDisplay';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  user: UserSession | null;
  avatarConfig?: AvatarConfig;
  activeView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin';
  onOpenLogin: () => void;
  onOpenViewSwitcher: () => void;
  onOpenPointsHistory?: () => void;
  onOpenSyncQueue?: () => void;
  onLogout: () => void;
  onOpenAvatarShop?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  navigate,
  user,
  avatarConfig,
  activeView,
  onOpenLogin,
  onOpenViewSwitcher,
  onOpenPointsHistory,
  onOpenSyncQueue,
  onLogout,
  onOpenAvatarShop,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [syncQueueCount, setSyncQueueCount] = useState(getSyncQueue().length);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSyncQueueCount(getSyncQueue().length);
    const unsubscribe = subscribeSyncQueue(() => {
      setSyncQueueCount(getSyncQueue().length);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

              {/* Circle Avatar Badge in Navbar (Students/Parents only) */}
              {user.role !== 'teacher' && user.role !== 'admin' && (
                <div
                  onClick={onOpenAvatarShop}
                  className="flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                  title="知新使者形象 (点击进入形象设置)"
                >
                  <AvatarDisplay config={avatarConfig || user.avatarConfig || DEFAULT_AVATAR_CONFIG} size="sm" />
                </div>
              )}

              <div className="text-xs text-right flex items-center space-x-2">
                <span className="font-bold text-white">{user.name}</span>
                {user.role !== 'teacher' && user.className && (
                  <span className="text-[10px] text-slate-400 font-mono">({user.className})</span>
                )}
                {user.role === 'student' && (
                  <button
                    onClick={onOpenPointsHistory}
                    title="点击查看智慧点明细与例表 (Click to view points log & rules)"
                    className="px-2.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 hover:border-amber-400 text-amber-300 rounded-full font-bold text-[11px] flex items-center space-x-1 shadow-xs transition cursor-pointer"
                  >
                    <span>🪙</span>
                    <span>
                      {(() => {
                        const studentId = user?.id || 'usr_stu_001';
                        const history = apiService.getQuizHistorySync(studentId);
                        return apiService.calculateTotalPoints(history);
                      })()} 智慧点
                    </span>
                  </button>
                )}
              </div>

              {/* Nav Hamburger Menu Button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center relative"
                  title="菜单选项"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {syncQueueCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {syncQueueCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-50 animate-fade-in divide-y divide-slate-800">
                    {/* Navigation Workspaces for Role */}
                    <div className="py-1">
                      {user.role === 'teacher' && (
                        <>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/teacher');
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              currentPath === '/teacher'
                                ? 'bg-blue-600/30 text-blue-300 font-bold border-l-2 border-blue-400'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center space-x-2">
                              <span>👩‍🏫</span>
                              <span>教师工作台</span>
                            </span>
                            {currentPath === '/teacher' && (
                              <span className="text-[10px] text-blue-400">当前</span>
                            )}
                          </button>

                          {canEditQuizLibrary(user) && (
                            <button
                              onClick={() => {
                                setIsMenuOpen(false);
                                navigate('/editor');
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                                currentPath === '/editor'
                                  ? 'bg-teal-600/30 text-teal-300 font-bold border-l-2 border-teal-400'
                                  : 'text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center space-x-2">
                                <span>✍️</span>
                                <span>试题管理</span>
                              </span>
                              {currentPath === '/editor' && (
                                <span className="text-[10px] text-teal-400">当前</span>
                              )}
                            </button>
                          )}
                        </>
                      )}

                      {user.role === 'editor' && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            navigate('/editor');
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                            currentPath === '/editor'
                              ? 'bg-teal-600/30 text-teal-300 font-bold border-l-2 border-teal-400'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center space-x-2">
                            <span>✍️</span>
                            <span>试题管理</span>
                          </span>
                          {currentPath === '/editor' && (
                            <span className="text-[10px] text-teal-400">当前</span>
                          )}
                        </button>
                      )}

                      {user.role === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/admin');
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              currentPath === '/admin'
                                ? 'bg-purple-600/30 text-purple-300 font-bold border-l-2 border-purple-400'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center space-x-2">
                              <span>⚙️</span>
                              <span>平台管理中心</span>
                            </span>
                            {currentPath === '/admin' && (
                              <span className="text-[10px] text-purple-400">当前</span>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/teacher');
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              currentPath === '/teacher'
                                ? 'bg-blue-600/30 text-blue-300 font-bold border-l-2 border-blue-400'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center space-x-2">
                              <span>👩‍🏫</span>
                              <span>教师工作台</span>
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/editor');
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              currentPath === '/editor'
                                ? 'bg-teal-600/30 text-teal-300 font-bold border-l-2 border-teal-400'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center space-x-2">
                              <span>✍️</span>
                              <span>试题管理</span>
                            </span>
                          </button>
                        </>
                      )}

                      {(user.role === 'student' || user.role === 'parent') && (
                        <>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/student');
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              currentPath === '/student' || currentPath.startsWith('/student')
                                ? 'bg-emerald-600/30 text-emerald-300 font-bold border-l-2 border-emerald-400'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center space-x-2">
                              <span>🎓</span>
                              <span>学生工作台</span>
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate('/bailiange');
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              currentPath === '/bailiange' || currentPath === '/blg'
                                ? 'bg-teal-600/30 text-teal-300 font-bold border-l-2 border-teal-400'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center space-x-2">
                              <span>🪷</span>
                              <span>白莲阁 (古诗)</span>
                            </span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Sync Queue */}
                    {onOpenSyncQueue && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenSyncQueue();
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center space-x-2">
                            <span>🔄</span>
                            <span>后台同步队列</span>
                          </span>
                          {syncQueueCount > 0 ? (
                            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/40">
                              {syncQueueCount} 待同步
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">已同步</span>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Logout */}
                    <div className="px-3.5 py-1.5">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left text-xs text-slate-400 hover:text-red-400 py-1 transition cursor-pointer flex items-center space-x-2"
                      >
                        <span>🚪</span>
                        <span>退出登录</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

