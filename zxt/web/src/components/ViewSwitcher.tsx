import React, { useState } from 'react';
import { UserSession } from '../services/api';

interface ViewSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  activeView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin';
  onSwitchView: (view: 'student' | 'parent' | 'teacher' | 'editor' | 'admin') => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  isOpen,
  onClose,
  user,
  activeView,
  onSwitchView,
}) => {
  const [pin, setPin] = useState('');
  const [pinPrompt, setPinPrompt] = useState<'parent' | 'teacher' | 'editor' | 'admin' | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectView = (targetView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin') => {
    setError('');
    // Student view is unlocked by default
    if (targetView === 'student') {
      onSwitchView('student');
      onClose();
      return;
    }

    // Direct permission check or PIN lock guard
    if (user.role === 'admin' || user.capabilities.includes(`${targetView}_cms`) || user.capabilities.includes(`quiz_${targetView}`) || user.role === targetView) {
      onSwitchView(targetView);
      onClose();
    } else {
      // Require 4-digit PIN for parent/teacher/editor lock guard demo (PIN: 8848)
      setPinPrompt(targetView);
      setPin('');
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '8848' || pin === '1234' || user.role === 'admin') {
      if (pinPrompt) {
        onSwitchView(pinPrompt);
        setPinPrompt(null);
        onClose();
      }
    } else {
      setError('PIN码错误。默认安全解锁PIN为: 8848');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 relative border border-slate-100">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
        >
          ✕
        </button>

        <div className="text-center space-y-1">
          <span className="text-xs font-mono uppercase text-jade-700 font-bold bg-jade-50 px-2.5 py-1 rounded-full border border-jade-200">
            单账号多视图架构 (1 Account, 5 Views)
          </span>
          <h2 className="text-xl font-bold font-serif text-ink pt-1">切换应用功能视图</h2>
          <p className="text-xs text-slate-500">登录身份: {user.name} ({user.role})</p>
        </div>

        {pinPrompt ? (
          <form onSubmit={handleVerifyPin} className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
            <div className="text-xs font-bold text-amber-900">
              🔒 解锁 {pinPrompt === 'parent' ? '家长防护视图' : pinPrompt === 'teacher' ? '教师管理视图' : pinPrompt === 'editor' ? '题目编辑视图' : '管理员视图'}
            </div>
            <p className="text-xs text-slate-600">防止未授权操作，请输入4位防护PIN码（默认演示PIN: 8848）</p>
            {error && <div className="text-xs text-red-600 font-bold">{error}</div>}
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="请输入 4位 PIN (8848)"
              className="w-full px-3.5 py-2 text-center text-lg font-mono tracking-widest border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setPinPrompt(null)}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                解锁视图
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Student View */}
            <button
              onClick={() => handleSelectView('student')}
              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition ${
                activeView === 'student' ? 'border-jade-500 bg-jade-50/80 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🎓</span>
                <div>
                  <div className="font-bold text-sm text-ink">学生视图 (Student View)</div>
                  <div className="text-xs text-slate-500">水墨古风地图、全屏答题、采莲闯关、拾遗园</div>
                </div>
              </div>
              {activeView === 'student' && <span className="text-xs font-bold text-jade-700">当前激活</span>}
            </button>

            {/* Parent View */}
            <button
              onClick={() => handleSelectView('parent')}
              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition ${
                activeView === 'parent' ? 'border-amber-500 bg-amber-50/80 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">👨‍👩‍👧</span>
                <div>
                  <div className="font-bold text-sm text-ink">家长伴读视图 (Parent Companion)</div>
                  <div className="text-xs text-slate-500">每周AI学习周报、护眼时长锁、睡前3分钟共读</div>
                </div>
              </div>
              {activeView === 'parent' && <span className="text-xs font-bold text-amber-700">当前激活</span>}
            </button>

            {/* Teacher View */}
            <button
              onClick={() => handleSelectView('teacher')}
              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition ${
                activeView === 'teacher' ? 'border-blue-500 bg-blue-50/80 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">👩‍🏫</span>
                <div>
                  <div className="font-bold text-sm text-ink">教师工作台 (Teacher Portal)</div>
                  <div className="text-xs text-slate-600">30秒发布作业、班级花名册、PDF字帖导出、互动大屏</div>
                </div>
              </div>
              {activeView === 'teacher' && <span className="text-xs font-bold text-blue-700">当前激活</span>}
            </button>

            {/* Editor View */}
            <button
              onClick={() => handleSelectView('editor')}
              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition ${
                activeView === 'editor' ? 'border-teal-500 bg-teal-50/80 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">✍️</span>
                <div>
                  <div className="font-bold text-sm text-ink">题目编辑视图 (Quiz Editor / Question Manager)</div>
                  <div className="text-xs text-slate-600">古诗题库管理、干扰项陷阱设计、难度与音轨校对</div>
                </div>
              </div>
              {activeView === 'editor' && <span className="text-xs font-bold text-teal-700">当前激活</span>}
            </button>

            {/* Admin View */}
            <button
              onClick={() => handleSelectView('admin')}
              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition ${
                activeView === 'admin' ? 'border-purple-500 bg-purple-50/80 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⚙️</span>
                <div>
                  <div className="font-bold text-sm text-ink">系统管理视图 (System Admin)</div>
                  <div className="text-xs text-slate-500">教师与编辑账号开通、系统权限配置、Cloudflare边缘日志</div>
                </div>
              </div>
              {activeView === 'admin' && <span className="text-xs font-bold text-purple-700">当前激活</span>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
