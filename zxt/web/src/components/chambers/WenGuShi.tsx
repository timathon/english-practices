import React, { useState } from 'react';
import { CachedImage } from '../CachedImage';

interface WenGuShiProps {
  user: any;
  quizHistory: any[];
}

// ── Quiz Record Detail Modal ─────────────────────────────────────────────────
const QuizRecordModal: React.FC<{ record: any; onClose: () => void }> = ({ record, onClose }) => {
  const [mistakesOnly, setMistakesOnly] = useState(false);
  const rawDetails = record?.details;
  const details: any[] = Array.isArray(rawDetails)
    ? rawDetails
    : (rawDetails && typeof rawDetails === 'object' && Array.isArray(rawDetails.questions)
        ? rawDetails.questions
        : (rawDetails && typeof rawDetails === 'object' ? Object.values(rawDetails).filter(v => v && typeof v === 'object' && 'isCorrect' in v) : []));
  const mistakes = details.filter((d: any) => d && !d.isCorrect);
  const displayed = mistakesOnly ? mistakes : details;

  const TYPE_LABELS: Record<string, string> = {
    LineAssembly: '连句组装', VerseCloze: '填空', PinyinMatch: '拼音辨析',
    TextToCn: '诗意理解', CulturalContext: '文化背景', ImageOrdering: '插图排序', ImageToLine: '图配句',
  };
  const TYPE_COLORS: Record<string, string> = {
    LineAssembly:    'bg-violet-100 text-violet-700',
    VerseCloze:      'bg-teal-100 text-teal-700',
    PinyinMatch:     'bg-sky-100 text-sky-700',
    TextToCn:        'bg-amber-100 text-amber-700',
    CulturalContext: 'bg-rose-100 text-rose-700',
    ImageOrdering:   'bg-indigo-100 text-indigo-700',
    ImageToLine:     'bg-emerald-100 text-emerald-700',
  };

  const cleanText = (s: string) => (s ?? '').toString().replace(/^[A-Z]\.\s*/, '').trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-300 mb-1">{record.completedAt || '今日'} · {record.quizType || '班级作业闯关'}</div>
              <h2 className="text-lg font-bold font-serif leading-tight">{record.poemTitle || record.title || '练习题目'}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-bold" style={{ color: (record.score ?? 100) >= 90 ? '#6ee7b7' : (record.score ?? 100) >= 70 ? '#fcd34d' : '#fca5a5' }}>
                  {record.score ?? 100} 分
                </span>
                <span className="text-xs text-emerald-200">共 {details.length} 题 · 错 {mistakes.length} 题</span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none mt-1">✕</button>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setMistakesOnly(false)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${!mistakesOnly ? 'bg-white text-emerald-900 shadow' : 'bg-white/15 text-white/80 hover:bg-white/20'}`}
            >
              📋 全部题目 ({details.length})
            </button>
            <button
              onClick={() => setMistakesOnly(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${mistakesOnly ? 'bg-red-400 text-white shadow' : 'bg-white/15 text-white/80 hover:bg-white/20'}`}
            >
              ❌ 只看错题 ({mistakes.length})
            </button>
          </div>
        </div>

        {/* Question list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {displayed.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">🎉</div>
              <div className="font-medium">全部答对，没有错题！</div>
            </div>
          ) : (
            displayed.map((d: any, i: number) => {
              const hasOptions = d.options && d.options.length > 0;
              const correctClean = cleanText(d.correctAnswerText);
              const userClean    = cleanText(d.userAnswerText);

              // For image types
              const hasImage  = !!d.image;
              const hasImages = d.images && d.images.length > 0;

              return (
                <div
                  key={d.questionId || i}
                  className={`rounded-xl border p-4 ${d.isCorrect ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}
                >
                  {/* Type badge + result */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[d.type] || 'bg-slate-100 text-slate-600'}`}>
                      {TYPE_LABELS[d.type] || d.type}
                    </span>
                    <span className={`text-[11px] font-bold ${d.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                      {d.isCorrect ? '✓ 答对' : '✗ 答错'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">Q{i + 1}</span>
                  </div>

                  {/* Prompt */}
                  <p className="text-sm font-medium text-slate-800 leading-relaxed mb-2">
                    {d.prompt || d.questionText || d.title || '试题'}
                  </p>

                  {/* Image for ImageToLine */}
                  {hasImage && (
                    <div className="mb-3 flex justify-center">
                      <CachedImage src={d.image} alt="题目图片" className="rounded-lg max-h-40 object-contain border border-slate-200" />
                    </div>
                  )}

                  {/* Images grid for ImageOrdering */}
                  {hasImages && (
                    <div className="mb-3 grid grid-cols-3 gap-1.5">
                      {d.images.map((img: string, ii: number) => (
                        <div key={ii} className="relative">
                          <CachedImage src={img} alt={`图片${ii + 1}`} className="rounded-lg w-full h-20 object-cover border border-slate-200" />
                          <span className="absolute top-1 left-1 bg-black/50 text-white text-[10px] font-bold px-1 rounded">{ii + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Options — always show correct highlighted; show wrong pick when 答错 */}
                  {hasOptions ? (
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {d.options.map((opt: string, oi: number) => {
                        const optClean = cleanText(opt);
                        const isCorrectOpt =
                          d.correctAnswerIndex === oi ||
                          optClean === correctClean ||
                          cleanText(d.correctAnswerText) === `${String.fromCharCode(65 + oi)}. ${optClean}`;
                        
                        const isUserWrong =
                          !d.isCorrect &&
                          (d.userAnswerIndex === oi ||
                           optClean === userClean ||
                           cleanText(d.userAnswerText) === `${String.fromCharCode(65 + oi)}. ${optClean}`);

                        let cls = 'bg-white border-slate-200 text-slate-600';
                        let prefix = '';
                        if (isCorrectOpt) {
                          cls = 'bg-emerald-100 border-emerald-400 text-emerald-800 font-bold';
                          prefix = '✓ ';
                        } else if (isUserWrong) {
                          cls = 'bg-red-100 border-red-400 text-red-800 font-bold';
                          prefix = '✗ ';
                        }

                        return (
                          <div key={oi} className={`text-xs px-2.5 py-1.5 rounded-lg border ${cls}`}>
                            {prefix}{opt}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Text answer fallback — no options array */
                    <div className="flex flex-col gap-1 text-xs mb-2">
                      <div className={`p-2.5 rounded-lg border font-semibold ${d.isCorrect ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-red-100 border-red-300 text-red-800'}`}>
                        你的答案: {d.userAnswerText || '(未记录)'}
                      </div>
                      {(!d.isCorrect || d.correctAnswerText) && (
                        <div className="p-2.5 rounded-lg border bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold">
                          正确答案: {d.correctAnswerText || '(无)'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {d.explanation && (
                    <div className="text-xs text-slate-500 bg-white/70 rounded-lg px-3 py-2 leading-relaxed border border-slate-100">
                      💡 {d.explanation}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};



// ── Main WenGuShi Component ──────────────────────────────────────────────────
export const WenGuShi: React.FC<WenGuShiProps> = ({ user, quizHistory }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'chinese' | 'math' | 'english'>('all');
  const [chineseSubCategory, setChineseSubCategory] = useState<'shizi' | 'pinyin' | 'gushi' | 'chengyu'>('shizi');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const totalMistakes = (quizHistory || []).reduce((acc, h) => {
    const rawDet = h?.details;
    const detailsArr: any[] = Array.isArray(rawDet)
      ? rawDet
      : (rawDet && typeof rawDet === 'object' && Array.isArray(rawDet.questions)
          ? rawDet.questions
          : (rawDet && typeof rawDet === 'object' ? Object.values(rawDet).filter(v => v && typeof v === 'object' && 'isCorrect' in v) : []));
    return acc + detailsArr.filter((d: any) => d && !d.isCorrect).length;
  }, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #0f2b1a 0%, #134e2b 50%, #0f172a 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 p-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-emerald-300/80 text-xs font-medium mb-1.5">
              <span>知新堂 · 第二重天</span>
              <span className="opacity-40">•</span>
              <span className="bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-full">温故室 Review Chamber</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight">温故而知新，修业复盘室</h1>
            <p className="text-emerald-200/70 text-sm mt-2">复习错题，查漏补缺，每次复盘都是进步的阶梯。</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <div className="bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{quizHistory.length}</div>
              <div className="text-xs text-emerald-200/70 mt-0.5">次修业记录</div>
            </div>
            <div className="bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-red-300">{totalMistakes}</div>
              <div className="text-xs text-emerald-200/70 mt-0.5">待复习错题</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 overflow-x-auto">
        {([
          { id: 'all',     emoji: '📂', label: '错题汇总' },
          { id: 'chinese', emoji: '📖', label: '语文 4大板块' },
          { id: 'math',    emoji: '📐', label: '数学强化' },
          { id: 'english', emoji: '🔤', label: '英语复习' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedCategory(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === t.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{t.emoji}</span> <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Chinese Sub-sections ── */}
      {selectedCategory === 'chinese' && (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 space-y-4">
          <div className="flex gap-2 border-b border-slate-100 pb-3 flex-wrap">
            {([
              { id: 'shizi',   emoji: '✍️', label: '识字', color: 'bg-red-100 text-red-700' },
              { id: 'pinyin',  emoji: '🔤', label: '拼音', color: 'bg-amber-100 text-amber-700' },
              { id: 'gushi',   emoji: '📜', label: '古诗', color: 'bg-emerald-100 text-emerald-700' },
              { id: 'chengyu', emoji: '💡', label: '成语', color: 'bg-blue-100 text-blue-700' },
            ] as const).map(s => (
              <button
                key={s.id}
                onClick={() => setChineseSubCategory(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${chineseSubCategory === s.id ? s.color : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
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

      {/* ── Quiz History List ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">📓</span>
          <h2 className="text-base font-bold text-slate-800">温故修业历史</h2>
          <span className="text-slate-400 font-normal text-sm">Practice History & Error Logs</span>
        </div>

        {quizHistory.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60">
            <div className="text-3xl mb-2">📖</div>
            <div className="text-slate-500 text-sm font-medium">尚无修业历史记录，去正堂完成第一份作业吧！</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {quizHistory.map((item, idx) => {
              const rawDet = item?.details;
              const detailsArray: any[] = Array.isArray(rawDet)
                ? rawDet
                : (rawDet && typeof rawDet === 'object' && Array.isArray(rawDet.questions)
                    ? rawDet.questions
                    : (rawDet && typeof rawDet === 'object' ? Object.values(rawDet).filter(v => v && typeof v === 'object' && 'isCorrect' in v) : []));
              const mistakeCount = detailsArray.filter((d: any) => d && !d.isCorrect).length;
              const score = item.score ?? 100;
              const scoreColor = score >= 90 ? 'text-emerald-600' : score >= 70 ? 'text-amber-600' : 'text-red-500';
              const scoreBg   = score >= 90 ? 'bg-emerald-50 border-emerald-200' : score >= 70 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

              return (
                <button
                  key={item.id || idx}
                  onClick={() => setSelectedRecord(item)}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border ${scoreBg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}
                >
                  {/* Score circle */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm border-2 ${
                    score >= 90 ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                    : score >= 70 ? 'border-amber-300 bg-amber-100 text-amber-700'
                    : 'border-red-300 bg-red-100 text-red-700'
                  }`}>
                    {score}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-700 transition-colors">
                      {item.poemTitle || item.title || '练习题目'}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">{item.completedAt || '今日'}</span>
                      {item.quizType && <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{item.quizType}</span>}
                      {detailsArray.length > 0 && <span className="text-[11px] text-slate-400">{detailsArray.length} 题</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {mistakeCount > 0 && (
                      <span className="text-[11px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{mistakeCount} 错</span>
                    )}
                    <span className="text-slate-300 group-hover:text-emerald-400 transition-colors text-lg">›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedRecord && (
        <QuizRecordModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
};
