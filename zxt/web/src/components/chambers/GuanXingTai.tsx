import React from 'react';

interface GuanXingTaiProps {
  user: any;
}

export const GuanXingTai: React.FC<GuanXingTaiProps> = ({ user }) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-medium mb-1 text-xs">
              <span>知新堂 · 第四重天</span>
              <span>•</span>
              <span className="bg-indigo-900/80 px-2 py-0.5 rounded">观星台 Observatory</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight">
              知新堂结界能量 & 观星台
            </h1>
            <p className="text-indigo-200/80 text-sm mt-1">
              监视结界防御度，统计全班学者温故能量，洞察地球生态危机（Season 1 预热）。
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20 text-center">
            <div className="text-xs text-indigo-200">知新结界防御值</div>
            <div className="text-2xl font-bold text-amber-300">98.5% (极安全)</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80">
          <div className="text-slate-500 text-xs font-semibold">全班提交率 (Submission Rate)</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">100%</div>
          <div className="text-xs text-emerald-600 mt-1">↑ 达到班级全勤成就</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80">
          <div className="text-slate-500 text-xs font-semibold">个人连续修业 (Streak Days)</div>
          <div className="text-3xl font-bold text-amber-500 mt-2">{user?.streakDays || 7} 天</div>
          <div className="text-xs text-amber-700 mt-1">🔥 触发双倍星石加成</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/80">
          <div className="text-slate-500 text-xs font-semibold">三学科综合正确率 (Accuracy)</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">96%</div>
          <div className="text-xs text-purple-700 mt-1">✨ 领跑全班知新榜</div>
        </div>
      </div>

      {/* Global Crisis Preview (Phase 2 teaser) */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>🌍</span> 地球生态危机探测 (Global Crisis Radar - Phase 2 Teaser)
          </h2>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold">
            Season 1 敬请期待
          </span>
        </div>

        <div className="bg-slate-900 text-slate-300 rounded-xl p-6 relative overflow-hidden border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div>
              <div className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                [ 探测区 01 ]: 塑料海岸 (Plastic Coast)
              </div>
              <h3 className="text-lg font-bold text-white mb-2">海洋垃圾危机</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                全班同学每日完成的作业能量将直接转化为【海洋净滤宝器】的充能。当能量达到 1000 点时，将恢复海岸线蔚蓝原貌！
              </p>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700/60 flex flex-col justify-center">
              <div className="flex justify-between text-xs mb-1">
                <span>净化进度</span>
                <span className="text-amber-400 font-bold">350 / 1000 能量</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[35%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
