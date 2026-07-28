import React from 'react';

interface PlatformHomeProps {
  navigate: (path: string) => void;
  activeView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin';
  user: any;
  onOpenLogin: () => void;
}

export const PlatformHome: React.FC<PlatformHomeProps> = ({ navigate, activeView, user, onOpenLogin }) => {
  // Config per role for dashboard button
  const dashboardConfig = {
    student: {
      title: '进入学生工作台',
      subtitle: '查看待办作业、答题历史与古诗拓展学习',
      icon: '🎓',
      path: '/student',
      bgClass: 'bg-emerald-600 hover:bg-emerald-500',
    },
    teacher: {
      title: '进入教师工作台',
      subtitle: '发布作业、查看班级答题统计与控制课程进度',
      icon: '👩‍🏫',
      path: '/teacher',
      bgClass: 'bg-blue-600 hover:bg-blue-500',
    },
    admin: {
      title: '进入平台级管理中心',
      subtitle: '开设全校班级、配置教师账号与学生入班',
      icon: '⚙️',
      path: '/admin',
      bgClass: 'bg-purple-600 hover:bg-purple-500',
    },
    editor: {
      title: '进入平台级全量题库编辑中心',
      subtitle: '编辑跨学科题目、音轨校对与混淆陷阱设计',
      icon: '✍️',
      path: '/editor',
      bgClass: 'bg-teal-600 hover:bg-teal-500',
    },
    parent: {
      title: '进入家长伴读工作台',
      subtitle: '查看每周AI学习周报、护眼时长锁与共读指引',
      icon: '👨‍👩‍👧',
      path: '/student',
      bgClass: 'bg-amber-600 hover:bg-amber-500',
    },
  };

  const currentDashboard = dashboardConfig[activeView] || dashboardConfig.student;

  return (
    <div
      className="flex-1 w-full min-h-[calc(100vh-64px)] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-cover bg-center bg-no-repeat relative overflow-hidden"
      style={{ backgroundImage: "url('/zxt_home_bg.webp')" }}
    >
      {/* Soft gradient vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-900/10 to-slate-900/30 backdrop-blur-[1.5px]"></div>

      <div className="max-w-2xl w-full text-center space-y-8 bg-white/50 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-white/80 shadow-2xl relative z-10 my-auto">
        
        {/* Brand Tag */}
        <div className="inline-flex items-center space-x-2 bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>知新堂</span>
        </div>

        {/* Main Couplet & Welcome Title */}
        <div className="space-y-4">
          <div className="text-3xl sm:text-4xl md:text-5xl font-black font-serif tracking-[0.2em] text-slate-800 flex flex-col items-center justify-center space-y-3 leading-snug">
            <div>温故<span className="text-emerald-600">知新</span></div>
            <div>笃行致远</div>
          </div>
          <p className="text-base sm:text-lg font-serif text-emerald-800/90 font-bold pt-1">
            欢迎来到知新堂 -- 少儿互动学习平台
          </p>
        </div>

        {/* Dynamic State Section */}
        {!user ? (
          /* UNLOGGED IN STATE: SHOW LOGIN CONTROLS ONLY */
          <div className="pt-4 max-w-sm mx-auto">
            <button
              onClick={onOpenLogin}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg font-serif tracking-wider"
            >
              登录
            </button>
          </div>
        ) : (
          /* LOGGED IN STATE: SHOW DASHBOARD BUTTON (DIFFERENT PER ROLE) */
          <div className="pt-4 space-y-4 max-w-lg mx-auto">
            
            <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs backdrop-blur-sm">
              <div className="flex items-center space-x-3 text-left">
                <span className="text-2xl">{currentDashboard.icon}</span>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{user.name} ({user.className})</div>
                  <div className="text-slate-500 text-[11px]">当前视角: {activeView.toUpperCase()} MODE</div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                已登录
              </span>
            </div>

            <button
              onClick={() => navigate(currentDashboard.path)}
              className={`w-full p-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-between space-x-4 text-left ${currentDashboard.bgClass}`}
            >
              <div className="space-y-0.5">
                <div className="text-base font-serif flex items-center space-x-2">
                  <span>{currentDashboard.icon}</span>
                  <span>{currentDashboard.title}</span>
                </div>
                <div className="text-xs text-white/80 font-normal">
                  {currentDashboard.subtitle}
                </div>
              </div>
              <span className="text-xl">→</span>
            </button>

          </div>
        )}

      </div>

    </div>
  );
};

export default PlatformHome;
