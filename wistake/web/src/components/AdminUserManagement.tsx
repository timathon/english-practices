import React, { useState, useEffect } from "react";
import {
  Shield,
  UserPlus,
  RefreshCw,
  X,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "../api";

export interface AdminUser {
  id: string;
  username: string;
  display_name?: string;
  role: string;
  is_active: number;
  stage: string;
  grade: number;
  ai_daily_limit: number;
  created_at: string;
  mistake_count: number;
  today_ai_used: number;
}

interface AdminUserManagementProps {
  onClose: () => void;
  currentUserId?: string;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  onClose,
  currentUserId
}) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState("student");
  const [newGrade, setNewGrade] = useState<number>(3);
  const [newAiLimit, setNewAiLimit] = useState<number>(20);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Reset Password State
  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Role Confirmation Modal State
  const [roleConfirmUser, setRoleConfirmUser] = useState<AdminUser | null>(null);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("/api/admin/users");
      setUsers(res.users || []);
    } catch (err: any) {
      setError(err.message || "获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmittingAdd(true);
    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          display_name: newDisplayName || newUsername,
          role: newRole,
          grade: newGrade,
          ai_daily_limit: newAiLimit
        })
      });
      setNotice(`成功开通账号：${newUsername}`);
      setShowAddModal(false);
      setNewUsername("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("student");
      setNewGrade(3);
      setNewAiLimit(20);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "创建用户失败");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleToggleStatus = async (target: AdminUser) => {
    const nextActive = target.is_active === 1 ? 0 : 1;
    setError(null);
    try {
      await apiRequest(`/api/admin/users/${target.id}/access`, {
        method: "PUT",
        body: JSON.stringify({ is_active: nextActive })
      });
      setNotice(`已将用户 ${target.username} 状态更新为：${nextActive === 1 ? "正常激活" : "已停用"}`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "更新状态失败");
    }
  };

  const handleRequestToggleRole = (target: AdminUser) => {
    setError(null);
    setRoleConfirmUser(target);
  };

  const handleConfirmRoleSwitch = async () => {
    if (!roleConfirmUser) return;
    const target = roleConfirmUser;
    const nextRole = target.role === "admin" ? "student" : "admin";
    setError(null);
    setIsSubmittingRole(true);
    try {
      await apiRequest(`/api/admin/users/${target.id}/access`, {
        method: "PUT",
        body: JSON.stringify({ role: nextRole })
      });
      setNotice(`已更新用户 ${target.username} 身份为：${nextRole === "admin" ? "管理员" : "学员"}`);
      setRoleConfirmUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "更新角色失败");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleGradeChange = async (target: AdminUser, grade: number) => {
    setError(null);
    try {
      await apiRequest(`/api/admin/users/${target.id}/access`, {
        method: "PUT",
        body: JSON.stringify({ grade })
      });
      setNotice(`已将用户 ${target.username} 年级设置为 ${grade} 年级`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "更新年级失败");
    }
  };

  const handleAiLimitChange = async (target: AdminUser, ai_daily_limit: number) => {
    setError(null);
    try {
      await apiRequest(`/api/admin/users/${target.id}/access`, {
        method: "PUT",
        body: JSON.stringify({ ai_daily_limit })
      });
      setNotice(`已将用户 ${target.username} 每日 AI 额度调整为 ${ai_daily_limit}`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "调整额度失败");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setError(null);
    setIsSubmittingReset(true);
    try {
      await apiRequest(`/api/admin/users/${resetModalUser.id}/password`, {
        method: "PUT",
        body: JSON.stringify({ password: resetPasswordVal })
      });
      setNotice(`已为用户 ${resetModalUser.username} 重置密码`);
      setResetModalUser(null);
      setResetPasswordVal("");
    } catch (err: any) {
      setError(err.message || "重置密码失败");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleDeleteUser = async (target: AdminUser) => {
    if (!confirm(`确定要彻底删除用户 ${target.username} 及其全部错题记录吗？此操作无法撤销。`)) {
      return;
    }
    setError(null);
    try {
      await apiRequest(`/api/admin/users/${target.id}`, {
        method: "DELETE"
      });
      setNotice(`已彻底删除用户 ${target.username}`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "删除用户失败");
    }
  };

  return (
    <div className="modal-wrapper-padding" style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.82)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 150,
      padding: "1rem"
    }}>
      <div
        className="glass-panel animate-fade-in responsive-modal-inner"
        style={{
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "#0d1321",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          borderRadius: "14px",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div className="modal-header-compact" style={{
          padding: "1.25rem 1.75rem",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          background: "rgba(15, 23, 42, 0.7)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Shield size={20} color="#60a5fa" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.3 }}>
                Wistake · 用户与权限管理中心
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                系统管理员专区：统一开通账号、分配年级阶段、调整每日 AI 剖析额度与密码管控
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={loadUsers}
              title="刷新列表"
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.06)",
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <RefreshCw size={15} />
              <span>刷新</span>
            </button>

            <button
              onClick={() => {
                setNewUsername("");
                setNewPassword("");
                setNewDisplayName("");
                setNewRole("student");
                setNewGrade(3);
                setNewAiLimit(20);
                setError(null);
                setShowAddModal(true);
              }}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <UserPlus size={15} />
              <span>新建账号</span>
            </button>

            <button
              onClick={onClose}
              title="关闭"
              style={{ background: "transparent", color: "var(--text-muted)", padding: "0.4rem" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notices */}
        {error && (
          <div style={{ margin: "1rem 1.75rem 0", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div style={{ margin: "1rem 1.75rem 0", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#6ee7b7", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {/* Table Content */}
        <div className="modal-inner-padding" style={{ padding: "1.25rem 1.75rem", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              正在加载系统用户档案...
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              暂无用户记录
            </div>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    <th style={{ padding: "0.75rem 0.5rem" }}>用户名 / 姓名</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>角色权限</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>年级学段</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>每日 AI 额度</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>今日使用</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>错题总数</th>
                    <th style={{ padding: "0.75rem 0.5rem" }}>账号状态</th>
                    <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>管理操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = currentUserId === u.id;
                    const isBuiltinAdmin = u.username === "admin";
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "0.85rem 0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                            <strong style={{ color: "#fff" }}>{u.username}</strong>
                            {u.display_name && u.display_name !== u.username && (
                              <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>({u.display_name})</span>
                            )}
                            {isBuiltinAdmin && (
                              <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                                根管理
                              </span>
                            )}
                            {isSelf && (
                              <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                                当前
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "0.85rem 0.5rem" }}>
                          <button
                            disabled={isBuiltinAdmin}
                            onClick={() => handleRequestToggleRole(u)}
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              background: u.role === "admin" ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.06)",
                              color: u.role === "admin" ? "#c084fc" : "var(--text-secondary)",
                              border: `1px solid ${u.role === "admin" ? "rgba(168, 85, 247, 0.4)" : "var(--border-color)"}`,
                              cursor: isBuiltinAdmin ? "not-allowed" : "pointer"
                            }}
                            title={isBuiltinAdmin ? "默认管理员不可更改" : "点击切换角色 (学员 / 管理员)"}
                          >
                            {u.role === "admin" ? "管理员 (Admin)" : "学员 (Student)"}
                          </button>
                        </td>

                        <td style={{ padding: "0.85rem 0.5rem" }}>
                          <select
                            value={u.grade}
                            disabled={u.role === "admin"}
                            onChange={(e) => handleGradeChange(u, parseInt(e.target.value, 10))}
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              opacity: u.role === "admin" ? 0.45 : 1,
                              cursor: u.role === "admin" ? "not-allowed" : "pointer"
                            }}
                            title={u.role === "admin" ? "管理员无需设置年级" : "更改年级学段"}
                          >
                            <option value={1}>1年级 (小学)</option>
                            <option value={2}>2年级 (小学)</option>
                            <option value={3}>3年级 (小学)</option>
                            <option value={4}>4年级 (小学)</option>
                            <option value={5}>5年级 (小学)</option>
                            <option value={6}>6年级 (小学)</option>
                            <option value={7}>7年级 (初一)</option>
                            <option value={8}>8年级 (初二)</option>
                            <option value={9}>9年级 (初三)</option>
                          </select>
                        </td>

                        <td style={{ padding: "0.85rem 0.5rem" }}>
                          <select
                            value={u.ai_daily_limit}
                            onChange={(e) => handleAiLimitChange(u, parseInt(e.target.value, 10))}
                            style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#60a5fa" }}
                          >
                            <option value={10}>10 次/天</option>
                            <option value={20}>20 次/天 (标准)</option>
                            <option value={50}>50 次/天 (畅玩)</option>
                            <option value={100}>100 次/天</option>
                            <option value={999}>999 次/天 (无限)</option>
                          </select>
                        </td>

                        <td style={{ padding: "0.85rem 0.5rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: u.today_ai_used >= u.ai_daily_limit ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                            {u.today_ai_used}
                          </span> / {u.ai_daily_limit}
                        </td>

                        <td style={{ padding: "0.85rem 0.5rem", color: "var(--text-secondary)" }}>
                          {u.mistake_count} 题
                        </td>

                        <td style={{ padding: "0.85rem 0.5rem" }}>
                          <button
                            disabled={isBuiltinAdmin}
                            onClick={() => handleToggleStatus(u)}
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              background: u.is_active === 1 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: u.is_active === 1 ? "#34d399" : "#f87171",
                              border: `1px solid ${u.is_active === 1 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                              cursor: isBuiltinAdmin ? "not-allowed" : "pointer"
                            }}
                            title={isBuiltinAdmin ? "默认管理员不可停用" : "点击停用或激活"}
                          >
                            {u.is_active === 1 ? "正常激活" : "已停用"}
                          </button>
                        </td>

                        <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.4rem" }}>
                            <button
                              onClick={() => { setResetModalUser(u); setResetPasswordVal(""); }}
                              style={{
                                padding: "0.3rem 0.6rem",
                                borderRadius: "4px",
                                background: "rgba(255, 255, 255, 0.06)",
                                color: "#60a5fa",
                                fontSize: "0.8rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem"
                              }}
                              title="重置密码"
                            >
                              <KeyRound size={13} />
                              <span>重置密码</span>
                            </button>

                            {!isBuiltinAdmin && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                style={{
                                  padding: "0.3rem 0.5rem",
                                  borderRadius: "4px",
                                  background: "rgba(239, 68, 68, 0.12)",
                                  color: "#f87171",
                                  fontSize: "0.8rem"
                                }}
                                title="删除用户"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 250,
          padding: "1.5rem"
        }}>
          <div
            className="glass-panel animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "460px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
              background: "#111827",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>新建学员 / 管理员账号</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Fake hidden inputs to absorb browser autofill heuristics */}
              <input type="text" style={{ display: "none" }} />
              <input type="password" style={{ display: "none" }} />

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  用户名 (登录标识) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="new_wistake_username"
                  autoComplete="off"
                  required
                  placeholder="如: student01"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  姓名 / 真实姓名
                </label>
                <input
                  type="text"
                  name="new_wistake_displayname"
                  autoComplete="off"
                  placeholder="如: 张小华"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  初始密码 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="password"
                  name="new_wistake_password"
                  autoComplete="new-password"
                  required
                  placeholder="至少 4 位"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    年级阶段
                  </label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(parseInt(e.target.value, 10))}
                    style={{ width: "100%" }}
                  >
                    <option value={1}>1年级 (小学)</option>
                    <option value={2}>2年级 (小学)</option>
                    <option value={3}>3年级 (小学)</option>
                    <option value={4}>4年级 (小学)</option>
                    <option value={5}>5年级 (小学)</option>
                    <option value={6}>6年级 (小学)</option>
                    <option value={7}>7年级 (初一)</option>
                    <option value={8}>8年级 (初二)</option>
                    <option value={9}>9年级 (初三)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    角色权限
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="student">学员 (Student)</option>
                    <option value="admin">管理员 (Admin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  每日 AI 剖析额度
                </label>
                <select
                  value={newAiLimit}
                  onChange={(e) => setNewAiLimit(parseInt(e.target.value, 10))}
                  style={{ width: "100%" }}
                >
                  <option value={10}>10 次/天</option>
                  <option value={20}>20 次/天 (标准)</option>
                  <option value={50}>50 次/天</option>
                  <option value={999}>999 次/天 (无限)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: "0.6rem 1.1rem", borderRadius: "6px", background: "rgba(255, 255, 255, 0.08)", color: "var(--text-secondary)", border: "1px solid var(--border-color)", cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  style={{ padding: "0.6rem 1.3rem", borderRadius: "6px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#fff", fontWeight: 600, border: "none", cursor: isSubmittingAdd ? "not-allowed" : "pointer" }}
                >
                  {isSubmittingAdd ? "开通中..." : "确认开通"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUser && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 250,
          padding: "1.5rem"
        }}>
          <div
            className="glass-panel animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "400px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
              background: "#111827",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>重置登录密码</h3>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              正在为用户 <strong style={{ color: "#60a5fa" }}>{resetModalUser.username}</strong> 设置新密码：
            </p>

            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <input
                  type="password"
                  required
                  placeholder="输入新密码 (至少 4 位)"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  style={{ padding: "0.6rem 1.1rem", borderRadius: "6px", background: "rgba(255, 255, 255, 0.08)", color: "var(--text-secondary)", border: "1px solid var(--border-color)", cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  style={{ padding: "0.6rem 1.3rem", borderRadius: "6px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 600, border: "none", cursor: isSubmittingReset ? "not-allowed" : "pointer" }}
                >
                  {isSubmittingReset ? "更新中..." : "确认重置"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Role Switch */}
      {roleConfirmUser && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 260,
          padding: "1.5rem"
        }}>
          <div
            className="glass-panel animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "420px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
              background: "#111827",
              border: "1px solid rgba(168, 85, 247, 0.45)",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>确认变更用户权限</h3>
              <button
                type="button"
                onClick={() => setRoleConfirmUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              您确定要将用户 <strong style={{ color: "#60a5fa" }}>{roleConfirmUser.username}</strong>
              {roleConfirmUser.display_name && ` (${roleConfirmUser.display_name})`} 的身份角色由
              <span style={{
                display: "inline-block",
                margin: "0 0.35rem",
                padding: "0.1rem 0.45rem",
                borderRadius: "4px",
                fontWeight: 600,
                background: roleConfirmUser.role === "admin" ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.1)",
                color: roleConfirmUser.role === "admin" ? "#c084fc" : "#cbd5e1"
              }}>
                {roleConfirmUser.role === "admin" ? "管理员 (Admin)" : "学员 (Student)"}
              </span>
              切换为
              <span style={{
                display: "inline-block",
                margin: "0 0.35rem",
                padding: "0.1rem 0.45rem",
                borderRadius: "4px",
                fontWeight: 600,
                background: roleConfirmUser.role === "admin" ? "rgba(255, 255, 255, 0.1)" : "rgba(168, 85, 247, 0.25)",
                color: roleConfirmUser.role === "admin" ? "#cbd5e1" : "#c084fc"
              }}>
                {roleConfirmUser.role === "admin" ? "学员 (Student)" : "管理员 (Admin)"}
              </span>
              吗？
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => setRoleConfirmUser(null)}
                style={{
                  padding: "0.6rem 1.1rem",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                取消
              </button>
              <button
                type="button"
                disabled={isSubmittingRole}
                onClick={handleConfirmRoleSwitch}
                style={{
                  padding: "0.6rem 1.3rem",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #a855f7, #7e22ce)",
                  color: "#fff",
                  fontWeight: 600,
                  border: "none",
                  cursor: isSubmittingRole ? "not-allowed" : "pointer"
                }}
              >
                {isSubmittingRole ? "切换中..." : "确认切换"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
