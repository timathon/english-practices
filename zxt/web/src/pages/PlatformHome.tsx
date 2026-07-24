import React from 'react';

interface PlatformHomeProps {
  navigate: (path: string) => void;
  activeView: 'student' | 'parent' | 'teacher' | 'admin';
  user: any;
}

export const PlatformHome: React.FC<PlatformHomeProps> = ({ navigate, activeView, user }) => {
  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-ink via-slate-900 to-slate-800 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 rounded-b-3xl shadow-xl">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center space-x-2 bg-slate-800/80 border border-jade-500/30 text-jade-300 px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-jade-400 animate-pulse"></span>
            <span>知新堂 (Zhī Xīn Táng) 多学科AI学习平台 v3.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-serif tracking-tight text-white">
            温故而知新，<span className="text-jade-400">可以为师矣</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            融合中国传统儒家教育哲学与现代 SM-2 间隔重复记忆算法，为 K-12 孩子打造无缝连接的语文、数学、英语与科学多学科 AI 学习空间。
          </p>

          {/* Launch Module CTA */}
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => navigate('/blg')}
              className="w-full sm:w-auto px-8 py-3.5 bg-crimson-600 hover:bg-crimson-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 text-base font-serif"
            >
              <span>🪷 进入 flagship 模块：白莲阁 (古诗文)</span>
              <span>→</span>
            </button>
            <a
              href="/plan/guoxue-kids-plan-v3.html"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium text-sm transition text-center"
            >
              📜 查看知新堂 Master Plan 3.0 HTML
            </a>
          </div>

        </div>
      </section>

      {/* Multi-Subject Matrix Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-2xl font-bold font-serif text-ink">学科矩阵 (Multi-Subject Matrix)</h2>
            <p className="text-xs text-slate-500">以白莲阁（语文古诗文）为旗舰锚点，赋能 K-12 核心学科</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-mono font-bold">4 Major Subjects</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Chinese (语文) - Active Flagship */}
          <div
            onClick={() => navigate('/blg')}
            className="bg-white p-6 rounded-2xl border-2 border-crimson-500 shadow-md hover:shadow-xl transition cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-3 right-3 text-[10px] font-bold bg-crimson-600 text-white px-2 py-0.5 rounded">
              已上线 • 旗舰
            </div>
            <div className="text-3xl mb-2">🔴</div>
            <h3 className="text-lg font-bold text-ink font-serif group-hover:text-crimson-700 transition">语文 (Chinese)</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
              <li className="font-bold text-crimson-700 flex items-center">
                <span className="mr-1">🪷</span> 白莲阁 (古诗文75首)
              </li>
              <li>• 识字与笔顺 (Literacy)</li>
              <li>• 现代文阅读 (Reading)</li>
              <li>• 作文架构 (Writing)</li>
            </ul>
            <div className="mt-4 text-xs font-bold text-crimson-600 flex items-center">
              <span>立即体验白莲阁</span>
              <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Math (数学) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-90 hover:opacity-100 transition">
            <div className="text-3xl mb-2">🟢</div>
            <h3 className="text-lg font-bold text-ink font-serif">数学 (Mathematics)</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
              <li>• 口算与速算 (Mental Math)</li>
              <li>• 空间几何 (Geometry 3D)</li>
              <li>• 应用题架构 (Word Problems)</li>
              <li>• 逻辑推理 (Logic Engine)</li>
            </ul>
            <span className="inline-block mt-4 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">规划中 (Coming Soon)</span>
          </div>

          {/* English (英语) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-90 hover:opacity-100 transition">
            <div className="text-3xl mb-2">🔵</div>
            <h3 className="text-lg font-bold text-ink font-serif">英语 (English)</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
              <li>• Vocab Master (词汇大师)</li>
              <li>• Sentence Architect (句型架构)</li>
              <li>• Text Navigator (文本导航)</li>
              <li>• Spelling Hero (拼写英雄)</li>
            </ul>
            <span className="inline-block mt-4 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">规划中 (Coming Soon)</span>
          </div>

          {/* Science (科学) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-90 hover:opacity-100 transition">
            <div className="text-3xl mb-2">🟣</div>
            <h3 className="text-lg font-bold text-ink font-serif">科学与STEAM</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
              <li>• 虚拟实验室 (Virtual Labs)</li>
              <li>• 自然探索 (Nature Explorer)</li>
              <li>• 科技史纪 (Science History)</li>
              <li>• 空间实验 (3D Experiments)</li>
            </ul>
            <span className="inline-block mt-4 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">规划中 (Coming Soon)</span>
          </div>

        </div>
      </section>

      {/* Active View Preview Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-jade-400 font-bold uppercase">Active View Capability</span>
              <h3 className="text-xl font-bold font-serif">当前激活视图: {activeView.toUpperCase()} MODE</h3>
            </div>
            {user ? (
              <span className="text-xs bg-jade-900 text-jade-300 border border-jade-700 px-3 py-1 rounded-full">
                登录身份: {user.name} ({user.className})
              </span>
            ) : (
              <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full">
                游客体验模式 (默认学生视图)
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-300 pt-2">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-1">
              <strong className="text-white block text-sm">🔑 统一账号配置</strong>
              <p>支持管理员 setup 教师账号，教师一键 setup 班级学生/家长账号，免自注册摩擦。</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-1">
              <strong className="text-white block text-sm">📦 微信小程序导出</strong>
              <p>采用 Taro / Uni-App 统一技术栈，保留直接导出为微信小程序 (微信一键登录) 能力。</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-1">
              <strong className="text-white block text-sm">⚡ Cloudflare 边缘计算</strong>
              <p>API 后端部署于 Cloudflare Workers + D1 SQLite，实现极速低延迟响应。</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
