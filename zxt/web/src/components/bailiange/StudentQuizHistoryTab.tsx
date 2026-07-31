import React, { useState } from 'react';
import { parseDate } from '../../services/api';

interface StudentQuizHistoryTabProps {
  quizHistory: any[];
  formatLocalTime: (isoStr: string) => string;
  onSelectHistoryItem: (item: any) => void;
}

export const StudentQuizHistoryTab: React.FC<StudentQuizHistoryTabProps> = ({
  quizHistory,
  formatLocalTime,
  onSelectHistoryItem,
}) => {
  const [showFirstAttemptOnly, setShowFirstAttemptOnly] = useState(false);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-xl font-bold font-serif text-ink">答题历史与成绩单 (Quiz History)</h2>
        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap">
          <span>💡 点击任意历史记录可查看试题明细与标准解析</span>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-lg text-[11px] font-sans shadow-2xs">
            <button
              type="button"
              onClick={() => setShowFirstAttemptOnly(!showFirstAttemptOnly)}
              className={`px-2.5 py-1 rounded-md font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                showFirstAttemptOnly
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100/60'
              }`}
              title="点击切换：仅显示首次答题 / 显示全部记录"
            >
              <span>⭐ 首次答题</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setShowFirstAttemptOnly(false)}
              className={`px-2 py-1 rounded-md font-medium transition-all duration-200 cursor-pointer ${
                !showFirstAttemptOnly ? 'text-slate-700 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>🔄 再次练习</span>
            </button>
          </div>
        </div>
      </div>
      <div className="w-full">
        <table className="w-full text-center text-xs text-slate-600 table-fixed">
          <colgroup>
            <col style={{ width: '25%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 text-center whitespace-nowrap">完成时间</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">古诗题目</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">闯关类型</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">标记</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">得分</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(() => {
              const firstAttemptMap = new Map<string, string>();
              quizHistory.forEach(item => {
                const key = `${item.poemTitle}_${item.quizType}`;
                const existing = firstAttemptMap.get(key);
                if (!existing) {
                  firstAttemptMap.set(key, item.id);
                } else {
                  const existingItem = quizHistory.find(h => h.id === existing);
                  if (existingItem) {
                    const tExisting = parseDate(existingItem.completedAt)?.getTime() || 0;
                    const tCurr = parseDate(item.completedAt)?.getTime() || 0;
                    if (tCurr < tExisting) {
                      firstAttemptMap.set(key, item.id);
                    }
                  }
                }
              });

              const listToDisplay = quizHistory.filter(item => {
                if (!showFirstAttemptOnly) return true;
                const key = `${item.poemTitle}_${item.quizType}`;
                return firstAttemptMap.get(key) === item.id || item.isFirstAttempt;
              });

              if (listToDisplay.length === 0) {
                return (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                      暂无首次答题记录
                    </td>
                  </tr>
                );
              }

              return listToDisplay.map((item) => {
                const key = `${item.poemTitle}_${item.quizType}`;
                const isFirst = firstAttemptMap.get(key) === item.id || item.isFirstAttempt;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectHistoryItem(item)}
                    className="hover:bg-indigo-50/60 cursor-pointer transition group"
                  >
                    <td className="px-3 py-3 font-mono text-center">{formatLocalTime(item.completedAt)}</td>
                    <td className="px-3 py-3 font-bold font-serif text-ink group-hover:text-indigo-700 text-center">《{item.poemTitle}》</td>
                    <td className="px-3 py-3 text-center">{item.quizType}</td>
                    <td className="px-3 py-3 text-center">
                      {isFirst ? (
                        <span className="inline-block text-base" title="⭐ 首次答题">⭐</span>
                      ) : (
                        <span className="inline-block text-base opacity-75" title="🔄 再次练习">🔄</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-bold text-emerald-600 text-center">{item.score}</td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentQuizHistoryTab;
