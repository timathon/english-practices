import React, { useState } from "react";
import { X, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({ username, password, displayName });
        login(res.token, res.user);
      } else {
        const res = await api.login({ username, password });
        login(res.token, res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "登录/注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <h3>{isRegister ? "创建学习账号" : "登录学习账号"}</h3>
          <p>登录后即可将诊断结果与知识点掌握情况永久保存在云端数据库</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>用户名</label>
            <div className="input-wrap">
              <User size={16} />
              <input
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>昵称 / 姓名 (选填)</label>
              <div className="input-wrap">
                <User size={16} />
                <input
                  type="text"
                  placeholder="展示昵称"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>密码</label>
            <div className="input-wrap">
              <Lock size={16} />
              <input
                type="password"
                placeholder="请输入登录密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "登录中..." : "立即登录"}
          </button>
        </form>

        <div className="auth-footer">
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            🔒 系统当前为内部受控测试模式，暂停开放公开注册。如需学习账号请联系管理员开通。
          </p>
        </div>
      </div>
    </div>
  );
};
