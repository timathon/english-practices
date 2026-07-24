import React, { useState } from 'react';
import { apiService, UserSession } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await apiService.login(username.trim(), password.trim());
    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
      onClose();
    } else {
      setError(res.error || '登录失败，请检查账号密码。');
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 relative border border-slate-100">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
        >
          ✕
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex px-3 py-1 bg-jade-50 text-jade-700 text-xs font-bold rounded-full border border-jade-200">
            知新堂 账号密码登录
          </div>
          <h2 className="text-2xl font-bold font-serif text-ink">登录知新堂平台</h2>
          <p className="text-xs text-slate-500">管理员统一分配账号，无自注册门槛</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">账号 (Username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入账号 (如 mmd, zhang_laoshi, yaming)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-jade-500 focus:border-jade-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">密码 (Password)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-jade-500 focus:border-jade-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-jade-600 hover:bg-jade-500 text-white font-bold rounded-lg text-sm shadow-md transition disabled:opacity-50"
          >
            {loading ? '登录验证中...' : '立即登录'}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            演示快捷填充账号 (Quick Demo Logins)
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => handleQuickFill('mmd', 'zhiyuzhishan')}
              className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded text-purple-900 font-medium text-center"
            >
              <div className="font-bold">⚙️ Admin</div>
              <div className="text-[10px] text-purple-700">mmd</div>
            </button>
            <button
              onClick={() => handleQuickFill('zhang_laoshi', 'teacher123')}
              className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-900 font-medium text-center"
            >
              <div className="font-bold">👩‍🏫 Teacher</div>
              <div className="text-[10px] text-blue-700">zhang_laoshi</div>
            </button>
            <button
              onClick={() => handleQuickFill('yaming', 'student123')}
              className="p-2 bg-jade-50 hover:bg-jade-100 border border-jade-200 rounded text-jade-900 font-medium text-center"
            >
              <div className="font-bold">🎓 Student</div>
              <div className="text-[10px] text-jade-700">yaming</div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
