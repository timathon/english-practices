import React from 'react';

export interface DataChangeNotification {
  type: 'poems' | 'idioms';
  title: string;
  message: string;
  diffSummary?: string[];
  onApply: () => void;
  onDismiss: () => void;
}

interface DataChangeAlertModalProps {
  notification: DataChangeNotification | null;
}

export const DataChangeAlertModal: React.FC<DataChangeAlertModalProps> = ({ notification }) => {
  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">🔔</span>
            <div>
              <h3 className="font-bold text-base">{notification.title}</h3>
              <p className="text-xs text-amber-100/90">检测到云端题库数据已更新</p>
            </div>
          </div>
          <button
            onClick={notification.onDismiss}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-600 bg-slate-50/50">
          <p className="text-slate-700 leading-relaxed font-medium">
            {notification.message}
          </p>

          {notification.diffSummary && notification.diffSummary.length > 0 && (
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 max-h-48 overflow-y-auto space-y-1.5 shadow-2xs font-mono text-[11px]">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                更新明细预览：
              </div>
              {notification.diffSummary.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={notification.onDismiss}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition cursor-pointer"
            >
              稍后同步
            </button>
            <button
              type="button"
              onClick={notification.onApply}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm hover:shadow transition cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>立即更新本地题库</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
