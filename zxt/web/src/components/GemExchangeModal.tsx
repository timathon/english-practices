import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface GemExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onExchangeSuccess?: () => void;
}

export const GemExchangeModal: React.FC<GemExchangeModalProps> = ({
  isOpen,
  onClose,
  user,
  onExchangeSuccess,
}) => {
  const studentId = user?.id || 'usr_stu_001';
  const [pointsInput, setPointsInput] = useState<string>('100');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [historyTab, setHistoryTab] = useState<'exchange' | 'history'>('exchange');

  const history = apiService.getQuizHistorySync(studentId);
  const currentPoints = apiService.calculateTotalPoints(history);
  const currentGems = apiService.getGemsSync(studentId);
  const gemsHistory = apiService.getGemsHistorySync(studentId);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setPointsInput('100');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExchange = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const pts = parseInt(pointsInput, 10);

    if (isNaN(pts) || pts <= 0) {
      setErrorMsg('请输入有效的智慧点数量！');
      return;
    }

    if (pts % 100 !== 0) {
      setErrorMsg('兑换数量必须为 100 的整数倍（例如：100, 200, 500）！');
      return;
    }

    if (pts > currentPoints) {
      setErrorMsg(`智慧点不足！当前可用 ${currentPoints} 智慧点。`);
      return;
    }

    const res = apiService.exchangePointsForGems(studentId, pts);
    if (res.success) {
      setSuccessMsg(`🎉 成功消耗 ${pts} 智慧点，兑换 +${res.gemsEarned} 知新星石！`);
      if (onExchangeSuccess) onExchangeSuccess();
    } else {
      setErrorMsg(res.error || '兑换失败，请稍后再试。');
    }
  };

  const quickOptions = [100, 200, 500, 1000];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl border border-white/20 shadow-xs">
              💎
            </div>
            <div>
              <h2 className="font-bold text-lg font-serif">知新星石兑换中心与账单明细</h2>
              <p className="text-purple-200 text-xs">100 智慧点 = 1 知新星石 (整百兑换)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-white text-lg font-bold"
          >
            ×
          </button>
        </div>

        {/* Current Balances Header */}
        <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-around text-center flex-shrink-0">
          <div>
            <div className="text-xs text-slate-500 font-medium">当前可用智慧点</div>
            <div className="text-xl font-bold font-mono text-amber-600">🪙 {currentPoints}</div>
          </div>
          <div className="h-8 w-px bg-purple-200" />
          <div>
            <div className="text-xs text-slate-500 font-medium">当前持有知新星石</div>
            <div className="text-xl font-bold font-mono text-purple-700">💎 {currentGems}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setHistoryTab('exchange')}
            className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 ${
              historyTab === 'exchange'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🔀 智慧点兑换星石
          </button>
          <button
            onClick={() => setHistoryTab('history')}
            className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 ${
              historyTab === 'history'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📜 星石与智慧点变动账单 ({gemsHistory.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {historyTab === 'exchange' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  输入消耗智慧点数量 (必须为 100 的整数倍)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none text-slate-800 font-mono font-bold text-base"
                    placeholder="如: 100, 200, 500"
                  />
                  <div className="absolute right-3 top-2.5 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    可兑换 = {Math.floor((parseInt(pointsInput || '0', 10) || 0) / 100)} 星石 💎
                  </div>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div>
                <div className="text-[11px] text-slate-500 mb-1 font-semibold">快速选择数量：</div>
                <div className="flex gap-2">
                  {quickOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPointsInput(opt.toString())}
                      disabled={opt > currentPoints}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                        pointsInput === opt.toString()
                          ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                          : opt > currentPoints
                          ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'
                      }`}
                    >
                      {opt} pts
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Alerts */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <span>✅</span>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Confirm Exchange Button */}
              <button
                onClick={handleExchange}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition text-sm flex items-center justify-center gap-2 mt-2"
              >
                ⚡ 确认兑换星石
              </button>
            </div>
          ) : (
            /* Gem & Points Transaction History List */
            <div className="space-y-3">
              {gemsHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  暂无兑换记录。快去上面的兑换界面试试吧！
                </div>
              ) : (
                gemsHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between hover:border-purple-200 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.description}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.timestamp}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600 font-mono">
                        +{item.gemsChanged} 💎
                      </div>
                      {item.pointsDeducted && (
                        <div className="text-[10px] text-amber-700 font-mono">
                          -{item.pointsDeducted} 🪙
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
