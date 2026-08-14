import React, { useState, useEffect } from 'react';
import { ActivityWeeklyChart } from '../ActivityWeeklyChart';
import { CachedImage } from '../CachedImage';
import { StudentSelfStudyTab } from '../bailiange/StudentSelfStudyTab';
import { apiService } from '../../services/api';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface WenGuShiProps {
  user: any;
  quizHistory: any[];
  poems?: any[];
  learntPoemIds?: any[];
  selectedPoem?: any;
  onSelectPoem?: (poem: any) => void;
}

// ── Quiz Record Detail Modal ─────────────────────────────────────────────────
const QuizRecordModal: React.FC<{ record: any; onClose: () => void }> = ({ record, onClose }) => {
  useLockBodyScroll(true);
  const [mistakesOnly, setMistakesOnly] = useState(false);
  const [fullRecord, setFullRecord] = useState<any>(record);

  useEffect(() => {
    setFullRecord(record);
    if (record?.id) {
      apiService.getQuizHistoryDetail(record.id).then((res) => {
        if (res && res.details) {
          setFullRecord(res);
        }
      });
    }
  }, [record]);

  const activeRecord = fullRecord || record;
  const rawDetails = activeRecord?.details;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl max-h-[88vh] rounded-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-300 mb-1">{activeRecord.completedAt || '今日'} · {activeRecord.quizType || '班级作业闯关'}</div>
              <h2 className="text-lg font-bold font-serif leading-tight">{activeRecord.poemTitle || activeRecord.title || '练习题目'}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-bold" style={{ color: (activeRecord.score ?? 100) >= 90 ? '#6ee7b7' : (activeRecord.score ?? 100) >= 70 ? '#fcd34d' : '#fca5a5' }}>
                  {activeRecord.score ?? 100} 分
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
export const WenGuShi: React.FC<WenGuShiProps> = ({ user, quizHistory, poems = [], learntPoemIds = [], selectedPoem, onSelectPoem }) => {
  const [activeMainTab, setActiveMainTab] = useState<'history' | 'mistakes' | 'selfstudy'>('history');
  const [activeSubjectTab, setActiveSubjectTab] = useState<'chinese' | 'math' | 'english'>('chinese');
  const [showFirstAttemptOnly, setShowFirstAttemptOnly] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Helper to identify first ever attempt for each poem/assignment
  const getIsFirstEverAttempt = (item: any): boolean => {
    if (!item) return false;
    const itemTime = new Date(item.completedAt?.replace(/\//g, '-') || 0).getTime();
    const targetTitle = item.poemTitle || item.title || '';
    
    // Find all records for the same poem/assignment
    const allMatches = (quizHistory || []).filter((h: any) => {
      const hTitle = h.poemTitle || h.title || '';
      return hTitle === targetTitle;
    });

    if (allMatches.length === 0) return true;

    // The oldest attempt has the smallest timestamp
    const oldestTime = Math.min(...allMatches.map((h: any) => new Date(h.completedAt?.replace(/\//g, '-') || 0).getTime()));
    return itemTime === oldestTime;
  };

  const [enrichedHistory, setEnrichedHistory] = useState<any[]>(quizHistory || []);

  useEffect(() => {
    setEnrichedHistory(quizHistory || []);
    (quizHistory || []).forEach((h) => {
      if ((h.mistakeCount > 0 || (h.score !== undefined && h.score < 100)) && (!h.details || h.details.length === 0) && h.id) {
        apiService.getQuizHistoryDetail(h.id).then((det) => {
          if (det && det.details) {
            setEnrichedHistory(prev => prev.map(item => item.id === h.id ? { ...item, details: det.details } : item));
          }
        });
      }
    });
  }, [quizHistory]);

  // Extract all mistakes across quiz history
  const allMistakeItems = (enrichedHistory || []).flatMap((h) => {
    const rawDet = h?.details;
    const detailsArr: any[] = Array.isArray(rawDet)
      ? rawDet
      : (rawDet && typeof rawDet === 'object' && Array.isArray(rawDet.questions)
          ? rawDet.questions
          : (rawDet && typeof rawDet === 'object' ? Object.values(rawDet).filter((v: any) => v && typeof v === 'object' && 'isCorrect' in v) : []));
    
    return detailsArr
      .filter((d: any) => d && !d.isCorrect)
      .map((d: any, index: number) => ({
        id: `${h.id}_m_${index}`,
        poemTitle: h.poemTitle || h.title || '修业练习',
        quizType: h.quizType || '练习',
        completedAt: h.completedAt,
        subject: h.subject || (h.poemTitle?.includes('数学') ? 'math' : h.poemTitle?.includes('英语') ? 'english' : 'chinese'),
        question: d,
        parentRecord: h,
      }));
  });

  const formatToYYYYMMDD = (dateStrOrObj: any): string => {
    if (!dateStrOrObj) return '';
    if (typeof dateStrOrObj === 'string') {
      const cleaned = dateStrOrObj.replace(/\//g, '-').trim();
      const firstPart = cleaned.split(' ')[0].split('T')[0];
      const parts = firstPart.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getTodayDateStr = () => formatToYYYYMMDD(new Date());

  const [historyDateFilter, setHistoryDateFilter] = useState<string>(getTodayDateStr);

  // Filter history by subject, date & first-attempt-only toggle
  const filteredHistory = (quizHistory || []).filter((item) => {
    const title = item.poemTitle || item.title || '';
    const subject = item.subject || (title.includes('数学') ? 'math' : title.includes('英语') ? 'english' : 'chinese');
    if (subject !== activeSubjectTab) return false;
    if (showFirstAttemptOnly && !getIsFirstEverAttempt(item)) return false;
    if (historyDateFilter) {
      const rawDate = item.completedAt || item.timestamp || item.createdAt || '';
      if (rawDate) {
        const itemDateStr = formatToYYYYMMDD(rawDate);
        if (itemDateStr && itemDateStr !== historyDateFilter) return false;
      }
    }
    return true;
  });

  // Filter mistakes by subject
  const filteredMistakes = allMistakeItems.filter((item) => {
    const title = item.poemTitle || '';
    const subject = item.subject || (title.includes('数学') ? 'math' : title.includes('英语') ? 'english' : 'chinese');
    return subject === activeSubjectTab;
  });

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
            <p className="text-emerald-200/70 text-sm mt-2">复习错题，查漏补缺，自主学习，每次复盘都是进步的阶梯。</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <div className="bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{quizHistory.length}</div>
              <div className="text-xs text-emerald-200/70 mt-0.5 font-medium">次修业记录</div>
            </div>
            <div className="bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-red-300">{allMistakeItems.length}</div>
              <div className="text-xs text-emerald-200/70 mt-0.5 font-medium">待复习错题</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout Tabs: Practice History vs. Mistake List ── */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Main Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('history')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeMainTab === 'history'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📜 修业历史 <span className="text-xs ml-1 opacity-70">({quizHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveMainTab('mistakes')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeMainTab === 'mistakes'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ❌ 错题归纳 <span className="text-xs ml-1 opacity-70">({allMistakeItems.length})</span>
          </button>
          <button
            onClick={() => setActiveMainTab('selfstudy')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeMainTab === 'selfstudy'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📚 自主学习 <span className="text-xs ml-1 opacity-70">({poems.length})</span>
          </button>
        </div>

        {/* Subtabs: 3 Subjects with dynamic count */}
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 gap-1">
          {[
            { id: 'chinese', emoji: '📖', label: '语文' },
            { id: 'math',    emoji: '📐', label: '数学' },
            { id: 'english', emoji: '🔤', label: '英语' },
          ].map((sub) => {
            const count = activeMainTab === 'history'
              ? (quizHistory || []).filter((item) => {
                  const title = item.poemTitle || item.title || '';
                  const subject = item.subject || (title.includes('数学') ? 'math' : title.includes('英语') ? 'english' : 'chinese');
                  return subject === sub.id;
                }).length
              : activeMainTab === 'mistakes'
              ? allMistakeItems.filter((item) => {
                  const title = item.poemTitle || '';
                  const subject = item.subject || (title.includes('数学') ? 'math' : title.includes('英语') ? 'english' : 'chinese');
                  return subject === sub.id;
                }).length
              : sub.id === 'chinese' ? (poems || []).length : 0;

            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubjectTab(sub.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeSubjectTab === sub.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{sub.emoji}</span>
                <span>{sub.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeSubjectTab === sub.id ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Tab 3: Self Study (自主学习) ── */}
      {activeMainTab === 'selfstudy' && (
        <StudentSelfStudyTab
          poems={poems}
          learntPoemIds={learntPoemIds}
          selectedPoem={selectedPoem}
          onSelectPoem={onSelectPoem || (() => {})}
          subject={activeSubjectTab}
        />
      )}

      {/* ── Main Tab 1: Practice History ── */}
      {activeMainTab === 'history' && (
        <div className="space-y-4">
          {/* Weekly Activity Diagram (Practices Count & Avg Score) */}
          <ActivityWeeklyChart
            quizHistory={quizHistory}
            activeSubjectTab={activeSubjectTab}
            selectedDate={historyDateFilter}
            onSelectDate={(dateStr) => {
              // Toggle date filter on click
              if (historyDateFilter === dateStr) {
                setHistoryDateFilter('');
              } else {
                setHistoryDateFilter(dateStr);
              }
            }}
          />

          <div className="flex items-center justify-between mb-3 px-1 flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">📓</span>
                {activeSubjectTab === 'chinese' ? '语文' : activeSubjectTab === 'math' ? '数学' : '英语'} · 修业记录明细
              </h2>

              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter('')}
                  className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold hover:bg-blue-100 transition flex items-center gap-1"
                  title="清除日期筛选"
                >
                  <span>📅</span>
                  <span>已筛选: {historyDateFilter}</span>
                  <span className="ml-1 text-blue-400">✕</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFirstAttemptOnly(!showFirstAttemptOnly)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                  showFirstAttemptOnly
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⭐</span>
                <span>{showFirstAttemptOnly ? '已开启：仅看首次答题' : '仅看首次答题'}</span>
              </button>

              <span className="text-xs text-slate-400 font-normal">
                显示 {filteredHistory.length} 条记录
              </span>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60">
              <div className="text-3xl mb-2">📖</div>
              <div className="text-slate-500 text-sm font-medium">
                暂无{showFirstAttemptOnly ? '首次答题' : ''}{activeSubjectTab === 'chinese' ? '语文' : activeSubjectTab === 'math' ? '数学' : '英语'}修业历史记录
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(() => {
                const seenIds = new Set<string>();
                const uniqueHistory = filteredHistory.filter(item => {
                  if (!item || !item.id) return true;
                  if (seenIds.has(item.id)) return false;
                  seenIds.add(item.id);
                  return true;
                });

                const sortedHistory = [...uniqueHistory].sort((a, b) => {
                  const timeA = new Date(a.completedAt?.replace(/\//g, '-') || 0).getTime();
                  const timeB = new Date(b.completedAt?.replace(/\//g, '-') || 0).getTime();
                  return timeB - timeA;
                });

                return sortedHistory.map((item, idx) => {
                  const rawDet = item?.details;
                  const detailsArray: any[] = Array.isArray(rawDet)
                    ? rawDet
                    : (rawDet && typeof rawDet === 'object' && Array.isArray(rawDet.questions)
                        ? rawDet.questions
                        : (rawDet && typeof rawDet === 'object' ? Object.values(rawDet).filter((v: any) => v && typeof v === 'object' && 'isCorrect' in v) : []));
                  const mistakeCount = detailsArray.filter((d: any) => d && !d.isCorrect).length;
                  const score = item.score ?? 100;
                  const scoreBg = score >= 90 ? 'bg-emerald-50 border-emerald-200' : score >= 70 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
                  const isFirstEver = getIsFirstEverAttempt(item);

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
                        <div className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                          <span>{item.poemTitle || item.title || '练习题目'}</span>
                          {isFirstEver && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300/80 px-1.5 py-0.2 rounded font-sans font-bold flex items-center gap-0.5 flex-shrink-0">
                              <span>⭐</span>
                              <span>首次答题</span>
                            </span>
                          )}
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
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Main Tab 2: Mistake List ── */}
      {activeMainTab === 'mistakes' && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-sm">❌</span>
              {activeSubjectTab === 'chinese' ? '语文' : activeSubjectTab === 'math' ? '数学' : '英语'} · 错题宝典
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              共 {filteredMistakes.length} 道待复盘错题
            </span>
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60">
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-slate-500 text-sm font-medium">
                太棒了！{activeSubjectTab === 'chinese' ? '语文' : activeSubjectTab === 'math' ? '数学' : '英语'}学科暂无需要复习的错题
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMistakes.map((m) => {
                const q = m.question;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedRecord(m.parentRecord)}
                    className="bg-white border border-red-100 hover:border-red-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                          {m.poemTitle}
                        </span>
                        <span className="text-[10px] text-slate-400">{m.completedAt}</span>
                      </div>

                      <div className="text-sm font-bold text-slate-800 mb-2">
                        {q.prompt || q.questionText || '错题题目'}
                      </div>

                      {q.userAnswer !== undefined && (
                        <div className="text-xs bg-red-50 text-red-700 p-2 rounded-lg mb-1">
                          ❌ 我的回答: <span className="font-semibold">{String(q.userAnswer)}</span>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg leading-relaxed">
                          💡 解析: {q.explanation}
                        </div>
                      )}
                    </div>

                    <div className="text-right border-t border-slate-100 pt-2 text-xs font-bold text-emerald-600 hover:underline">
                      查看完整试卷复盘 ›
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedRecord && (
        <QuizRecordModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
};
