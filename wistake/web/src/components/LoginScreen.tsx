import React, { useState } from "react";
import { BrainCircuit, AlertCircle } from "lucide-react";
import { apiRequest, setToken } from "../api";
import { UserProfile, QuotaInfo } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: UserProfile, quota: QuotaInfo) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      setToken(res.token);
      onLoginSuccess(res.token, res.user, res.quota);
    } catch (err: any) {
      setLoginError(err.message || "登录失败，请检查用户名与密码");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#10b981", marginBottom: "0.75rem" }}>
            <BrainCircuit size={28} />
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Wistake</h2>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "2rem" }}>
            <span className="explode-container">
              {/* 1. Exploding Mistakes */}
              <span className="anim-mistake">
                <span style={{ color: "#ef4444", fontWeight: 800 }}>M</span>
                <span style={{ color: "#f87171" }}>istakes</span>
              </span>

              {/* Particle sparks when exploding */}
              <svg className="anim-sparks" viewBox="0 0 100 40" fill="none">
                <circle cx="20" cy="15" r="2.5" fill="#ef4444" opacity="0.9" />
                <circle cx="50" cy="8" r="2" fill="#f59e0b" opacity="0.8" />
                <circle cx="75" cy="18" r="3" fill="#10b981" opacity="0.9" />
                <circle cx="35" cy="28" r="2" fill="#3b82f6" opacity="0.7" />
                <circle cx="65" cy="30" r="2.5" fill="#10b981" opacity="0.9" />
                <path d="M 45 10 L 55 30" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
              </svg>

              {/* 2. Revealed Wisdom */}
              <span className="anim-wisdom">
                <span style={{ color: "#10b981", fontWeight: 800 }}>W</span>
                <span style={{ color: "#34d399" }}>isdom</span>
              </span>
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {loginError && (
            <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem", color: "#fca5a5", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
              用户名
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
              style={{ width: "100%" }}
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
              密码
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              style={{ width: "100%" }}
              placeholder="请输入密码"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              marginTop: "0.5rem",
              padding: "0.8rem",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#fff",
              fontWeight: 600,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            {isLoggingIn ? "登录中..." : "开启悟道之旅"}
          </button>

          <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            如需开通账号或重置密码，请联系管理员
          </div>
        </form>
      </div>
    </div>
  );
};
