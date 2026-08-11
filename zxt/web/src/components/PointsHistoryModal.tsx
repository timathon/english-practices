import React, { useState, useEffect } from 'react';
import { UserSession, apiService } from '../services/api';

interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession | null;
}

export const PointsHistoryModal: React.FC<PointsHistoryModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [showExamples, setShowExamples] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      setLoading(true);
      apiService.getQuizHistory(user.id)
        .then((res) => {
          setHistory(res || []);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Calculate actual total points sum from practice history (Single Source of Truth)
  const totalPoints = apiService.calculateTotalPoints(history);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-xs">
              🪙
            </div>
            <div>
              <h2 className="font-bold text-lg font-serif">智慧点明细与规则</h2>
              <p className="text-amber-100 text-xs">学生打卡做题获得智慧点，智慧点可提升文采等级</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white text-lg font-bold"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">

          {/* Current Total Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🏆</span>
              <div>
                <div className="text-xs text-amber-800 font-medium">当前累计智慧点 (Total Points)</div>
                <div className="text-2xl font-bold font-mono text-amber-600">
                  {totalPoints} 智慧点
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full font-bold">
                学海无涯 · 积少成多
              </div>
            </div>
          </div>

          {/* Rules Summary Box */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                <span>📜</span> 智慧点获得三大规则
              </span>
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition flex items-center gap-1 text-[11px]"
              >
                <span>{showExamples ? '🙈 隐藏得分示例表' : '📊 查看智慧点得分示例表'}</span>
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-2 pt-1 text-slate-700">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span className="font-bold text-amber-800 block mb-0.5">1. 每日打卡基础分 (+5 pts)</span>
                <span>每日首次练习该题目即可获得</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span className="font-bold text-amber-800 block mb-0.5">2. 按时提交奖励 (+10 pts)</span>
                <span>首刷且在截止日前提交独享</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span className="font-bold text-amber-800 block mb-0.5">3. 历史正确率突破 (最高25)</span>
                <span>100%: 25pt | 90%: 20pt | 80%: 15pt | 70%: 5pt</span>
              </div>
            </div>
          </div>

          {/* Toggleable Examples Table */}
          {showExamples && (
            <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl space-y-3 animate-in fade-in duration-200 border border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 font-serif flex items-center gap-1.5 text-sm">
                  💡 智慧点计算实操示例表 (Points Scoring Examples)
                </span>
                <span className="text-[10px] text-slate-400">每日首次练习均得基础分+5</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="p-2">练习场景 (Scenario)</th>
                      <th className="p-2 text-center">基础分</th>
                      <th className="p-2 text-center">按时奖</th>
                      <th className="p-2 text-center">正确率突破奖</th>
                      <th className="p-2 text-right font-bold text-amber-400">本次得分</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2">
                        <span className="font-bold text-white block">8月1日 (首次打卡, 按时, 得分75%)</span>
                        <span className="text-[10px] text-slate-500">首刷按时，正确率75%在70-79%档</span>
                      </td>
                      <td className="p-2 text-center text-blue-400 font-mono">+5</td>
                      <td className="p-2 text-center text-emerald-400 font-mono">+10</td>
                      <td className="p-2 text-center text-amber-400 font-mono">+5</td>
                      <td className="p-2 text-right font-bold text-amber-300 font-mono text-sm">20 pts</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2">
                        <span className="font-bold text-white block">8月1日 (同日二刷, 得分提升至90%)</span>
                        <span className="text-[10px] text-slate-500">同日二刷无每日基础分，补正确率差额 (20 - 5)</span>
                      </td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-center text-amber-400 font-mono">+15</td>
                      <td className="p-2 text-right font-bold text-amber-300 font-mono text-sm">15 pts</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2">
                        <span className="font-bold text-white block">8月1日 (同日三刷, 得分达到100%)</span>
                        <span className="text-[10px] text-slate-500">同日三刷无每日基础分，补正确率差额 (25 - 20)</span>
                      </td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-center text-amber-400 font-mono">+5</td>
                      <td className="p-2 text-right font-bold text-amber-300 font-mono text-sm">5 pts</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2">
                        <span className="font-bold text-white block">8月2日 (次日再练, 保持100%满分)</span>
                        <span className="text-[10px] text-slate-500">次日首刷，获得每日基础分+5</span>
                      </td>
                      <td className="p-2 text-center text-blue-400 font-mono">+5</td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-right font-bold text-amber-300 font-mono text-sm">5 pts</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2">
                        <span className="font-bold text-white block">8月3日 (次日再练, 得分60%)</span>
                        <span className="text-[10px] text-slate-500">次日首刷，获得每日基础分+5</span>
                      </td>
                      <td className="p-2 text-center text-blue-400 font-mono">+5</td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-center text-slate-600 font-mono">+0</td>
                      <td className="p-2 text-right font-bold text-amber-300 font-mono text-sm">5 pts</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student History Logs List */}
          <div className="space-y-3">
            <div className="font-bold text-slate-800 text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📝</span> 我的修业打卡记录
              </span>
              <span className="text-[10px] font-normal text-slate-400">显示最近练习记录</span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <span className="animate-spin inline-block mr-1">☯</span> 加载记录中...
              </div>
            ) : history.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                暂无练习打卡记录，去【班级作业】完成第一道题吧！
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item, idx) => {
                  const numScore = Number(item.score) || 0;
                  
                  // Extract embedded or fallback point breakdown
                  const pb = item.details?.pointBreakdown;
                  let basePts = pb?.basePoints;
                  let timelyPts = pb?.timelyBonus;
                  let accBonus = pb?.accuracyBonus;

                  // Determine if this item was the first attempt ever for this poem
                  const isFirstAttempt = pb?.isFirstAttempt !== undefined
                    ? pb.isFirstAttempt
                    : idx === history.length - 1 || !history.slice(idx + 1).some(h => h.poemId === item.poemId || h.poemTitle === item.poemTitle);

                  // Helper for accuracy bonus tier scale
                  const getAccTier = (acc: number) => {
                    if (acc >= 100) return 25;
                    if (acc >= 90) return 20;
                    if (acc >= 80) return 15;
                    if (acc >= 70) return 5;
                    return 0;
                  };

                  // Find historical attempts prior to this attempt (history array is ordered newest-first)
                  const priorAttempts = history.slice(idx + 1).filter(h => h.poemId === item.poemId || h.poemTitle === item.poemTitle);
                  let priorHighestScore = 0;
                  for (const p of priorAttempts) {
                    const pScore = Number(p.score) || 0;
                    if (pScore > priorHighestScore) priorHighestScore = pScore;
                  }

                  // Check if current attempt is on a different day from prior attempt for this poem
                  const itemDateStr = item.completedAt ? item.completedAt.split(' ')[0] : '';
                  const hasSameDayPriorAttempt = priorAttempts.some(p => p.completedAt && p.completedAt.split(' ')[0] === itemDateStr);

                  // Infer/fallback for legacy items
                  if (basePts === undefined) {
                    basePts = !hasSameDayPriorAttempt ? 5 : 0;
                  }
                  if (timelyPts === undefined) {
                    timelyPts = isFirstAttempt ? 10 : 0;
                  }
                  if (accBonus === undefined) {
                    const currentTierBonus = getAccTier(numScore);
                    const priorTierBonus = priorAttempts.length > 0 ? getAccTier(priorHighestScore) : 0;
                    accBonus = Math.max(0, currentTierBonus - priorTierBonus);
                  }

                  const totalItemEarned = basePts + timelyPts + accBonus;

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold font-serif text-slate-800 text-sm flex items-center gap-1">
                              《{item.poemTitle}》
                              {isFirstAttempt && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[10px] font-sans font-bold flex items-center gap-0.5" title="首次答题 (First Attempt)">
                                  <span>⭐</span>
                                  <span>首次答题</span>
                                </span>
                              )}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md text-[10px] font-bold">
                              {item.quizType || '古诗练习'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.completedAt}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className={`font-bold font-mono text-sm block ${numScore >= 90 ? 'text-emerald-600' : numScore >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                              {numScore}% 正确率
                            </span>
                          </div>
                          <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-300/60 rounded-xl text-right">
                            <span className="text-[10px] text-amber-700 block leading-tight">获得智慧点</span>
                            <span className="font-bold font-mono text-amber-600 text-xs">+{totalItemEarned} pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Itemized Points Breakdown Badges: 1. 基础分, 2. 按时, 3. 正确率突破 */}
                      <div className="pt-2 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-sans ${basePts > 0 ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            📅 基础分: +{basePts}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-sans ${timelyPts > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            ⏱️ 按时: +{timelyPts}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-sans ${accBonus > 0 ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            🎯 正确率突破: +{accBonus}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
