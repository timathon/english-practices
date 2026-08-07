import React, { useState } from 'react';

interface WenGuShiProps {
  user: any;
  quizHistory: any[];
}

export const WenGuShi: React.FC<WenGuShiProps> = ({ user, quizHistory }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'chinese' | 'math' | 'english'>('all');
  const [chineseSubCategory, setChineseSubCategory] = useState<'shizi' | 'pinyin' | 'gushi' | 'chengyu'>('shizi');

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 font-medium mb-1 text-xs">
              <span>知新堂 · 第二重天</span>
              <span>•</span>
              <span className="bg-emerald-800/60 px-2 py-0.5 rounded">温故室 Review Chamber</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight">
              温故而知新，修业复盘室
            </h1>
            <p className="text-emerald-200/80 text-sm mt-1">
              在此复习【语文（识字、拼音、古诗、成语）】、【数学】、【英语】错题，查漏补缺。
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20 text-center">
            <div className="text-xs text-emerald-200">累计复盘题目</div>
            <div className="text-2xl font-bold text-amber-300">{quizHistory.length * 5} 题</div>
          </div>
        </div>
      </div>

      {/* Main Category Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedCategory === 'all'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          📂 错题汇总手册 (Error Logs)
        </button>
        <button
          onClick={() => setSelectedCategory('chinese')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedCategory === 'chinese'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          📖 语文 4大板块 (Chinese)
        </button>
        <button
          onClick={() => setSelectedCategory('math')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedCategory === 'math'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          📐 数学强化 (Math)
        </button>
        <button
          onClick={() => setSelectedCategory('english')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedCategory === 'english'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔤 英语复习 (English)
        </button>
      </div>

      {/* Chinese 4 Sub-sections Details */}
      {selectedCategory === 'chinese' && (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 space-y-4">
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setChineseSubCategory('shizi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                chineseSubCategory === 'shizi' ? 'bg-red-100 text-red-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              ✍️ 识字 (Literacy & Strokes)
            </button>
            <button
              onClick={() => setChineseSubCategory('pinyin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                chineseSubCategory === 'pinyin' ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              🔤 拼音 (Phonetics & Tones)
            </button>
            <button
              onClick={() => setChineseSubCategory('gushi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                chineseSubCategory === 'gushi' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              📜 古诗 (Classical Poetry)
            </button>
            <button
              onClick={() => setChineseSubCategory('chengyu')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                chineseSubCategory === 'chengyu' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              💡 成语 (Idioms & Context)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chineseSubCategory === 'shizi' && (
              <div className="p-4 border rounded-xl bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm mb-1">汉字笔顺与形近字对比</h3>
                <p className="text-xs text-slate-500 mb-3">掌握基础汉字的偏旁、笔画顺序与常见形近字区分。</p>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-semibold">已巩固 12 字</span>
              </div>
            )}
            {chineseSubCategory === 'pinyin' && (
              <div className="p-4 border rounded-xl bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm mb-1">声母、韵母与整体认读音节</h3>
                <p className="text-xs text-slate-500 mb-3">轻声、变调与拼音书写规范练习。</p>
                <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded font-semibold">已巩固 8 组</span>
              </div>
            )}
            {chineseSubCategory === 'gushi' && (
              <div className="p-4 border rounded-xl bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm mb-1">小学生必备古诗词背诵</h3>
                <p className="text-xs text-slate-500 mb-3">古诗名句填空、诗人背景与诗意理解。</p>
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-semibold">已背诵 15 首</span>
              </div>
            )}
            {chineseSubCategory === 'chengyu' && (
              <div className="p-4 border rounded-xl bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm mb-1">常用成语典故与造句</h3>
                <p className="text-xs text-slate-500 mb-3">成语接龙、寓言故事与语境运用。</p>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-semibold">已掌握 20 个</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quiz History Error Log */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📓</span> 温故修业历史 (Practice History & Error Logs)
          </span>
        </h2>

        {quizHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            尚无修业历史记录，去正堂完成第一份作业吧！
          </div>
        ) : (
          <div className="space-y-3">
            {quizHistory.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-4 border border-slate-100 hover:border-emerald-200 rounded-xl bg-slate-50/50 hover:bg-white transition"
              >
                <div>
                  <div className="font-bold text-slate-800 text-sm">{item.poemTitle || item.title || '练习题目'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">完成时间: {item.completedAt || '今日'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-600">得分: {item.score || 100} 分</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                    复盘完成
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
