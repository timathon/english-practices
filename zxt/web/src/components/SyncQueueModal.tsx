import React, { useEffect, useState } from 'react';
import { getSyncQueue, removeSyncTask, clearSyncQueue, subscribeSyncQueue, SyncTask } from '../services/syncQueue';
import { apiService } from '../services/api';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({ isOpen, onClose }) => {
  const [tasks, setTasks] = useState<SyncTask[]>(getSyncQueue());
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setTasks(getSyncQueue());
    const unsubscribe = subscribeSyncQueue(() => {
      setTasks(getSyncQueue());
    });
    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRetryAll = async () => {
    setIsRetrying(true);
    const currentTasks = getSyncQueue();
    for (const task of currentTasks) {
      try {
        if (task.type === 'MARK_ASSIGNMENT_COMPLETED') {
          await apiService.markAssignmentCompletedBackend(task.payload.asgnId, task.payload.score);
        } else if (task.type === 'RECORD_QUIZ_RESULT') {
          await apiService.recordQuizResultBackend(task.payload.studentId, task.payload.result);
        }
        removeSyncTask(task.id);
      } catch (err: any) {
        console.error('Retry failed for task:', task.id, err);
      }
    }
    setIsRetrying(false);
    setTasks(getSyncQueue());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🔄</span>
            <div>
              <h3 className="font-bold text-base">后台同步队列</h3>
              <p className="text-[11px] text-slate-300">本地离线暂存 / 云端延迟重试队列 ({tasks.length})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="text-4xl">✅</div>
              <p className="text-sm font-semibold text-slate-700">队列为空，所有数据已就绪</p>
              <p className="text-xs text-slate-400">练习成绩与历史记录已同步至本地/云端</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500 text-[10px]">{task.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      task.status === 'processing'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : task.retries > 0
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {task.status === 'processing' ? '同步中...' : `等待同步 (已重试 ${task.retries} 次)`}
                  </span>
                </div>

                <div className="text-xs text-slate-800 font-medium">
                  {task.type === 'MARK_ASSIGNMENT_COMPLETED' ? (
                    <div>
                      🏷️ <span className="font-bold text-indigo-600">标记作业打卡:</span> 作业ID {task.payload.asgnId} (得分: {task.payload.score})
                    </div>
                  ) : (
                    <div>
                      📝 <span className="font-bold text-emerald-600">同步练习成绩:</span> 《{task.payload.result?.poemTitle}》 Score: {task.payload.result?.score} ({task.payload.result?.quizType})
                    </div>
                  )}
                </div>

                {task.lastError && (
                  <div className="text-[11px] text-red-500 bg-red-50 p-2 rounded-md font-mono overflow-x-auto">
                    ⚠️ {task.lastError}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                  <span>创建时间: {new Date(task.createdAt).toLocaleTimeString()}</span>
                  <button
                    onClick={() => removeSyncTask(task.id)}
                    className="text-red-500 hover:text-red-700 font-semibold hover:underline"
                  >
                    移除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {tasks.length > 0 ? (
            <button
              onClick={() => clearSyncQueue()}
              className="text-xs text-slate-500 hover:text-red-600 font-medium px-2 py-1"
            >
              清空队列
            </button>
          ) : <div />}
          
          <div className="flex space-x-2">
            {tasks.length > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={isRetrying}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                {isRetrying ? '重试中...' : '立即重试同步'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
