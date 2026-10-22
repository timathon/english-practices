import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Shield, KeyRound, Trash2, CheckCircle2, 
  XCircle, BookCheck, AlertCircle, RefreshCw, X 
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/authContext";

interface AdminUser {
  id: string;
  username: string;
  display_name?: string;
  role: string;
  allowed_textbooks: string[];
  status: string;
  created_at: number;
}

const AVAILABLE_TEXTBOOKS = [
  { id: "M7A-BS", name: "北师大版 七年级上册" },
  { id: "M7B-BS", name: "北师大版 七年级下册" },
  { id: "M8A-BS", name: "北师大版 八年级上册" },
  { id: "M8B-BS", name: "北师大版 八年级下册" }
];

export const AdminUserManagement: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { token, user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Add User Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newTextbooks, setNewTextbooks] = useState<string[]>(["M7A-BS"]);

  // Reset Password State
  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminGetUsers(token);
      setUsers(res.users || []);
    } catch (err: any) {
      setError(err.message || "获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await api.adminCreateUser(token, {
        username: newUsername,
        password: newPassword,
        displayName: newDisplayName || newUsername,
        role: newRole,
        allowedTextbooks: newTextbooks
      });
      setNotice(`成功创建用户：${newUsername}`);
      setShowAddModal(false);
      setNewUsername("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("user");
      setNewTextbooks(["M7A-BS"]);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "创建用户失败");
    }
  };

  // Toggle user status (active / disabled)
  const handleToggleStatus = async (user: AdminUser) => {
    if (!token) return;
    const targetStatus = user.status === "active" ? "disabled" : "active";
    try {
      await api.adminUpdateAccess(token, user.id, { status: targetStatus });
      setNotice(`已更新用户 ${user.username} 状态为：${targetStatus === "active" ? "正常" : "已禁用"}`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "更新状态失败");
    }
  };

  // Toggle user role (admin / user)
  const handleToggleRole = async (user: AdminUser) => {
    if (!token) return;
    const targetRole = user.role === "admin" ? "user" : "admin";
    try {
      await api.adminUpdateAccess(token, user.id, { role: targetRole });
      setNotice(`已将用户 ${user.username} 权限调整为：${targetRole === "admin" ? "管理员" : "普通学生"}`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "调整角色失败");
    }
  };

  // Toggle textbook permission
  const handleToggleTextbook = async (user: AdminUser, tbId: string) => {
    if (!token) return;
    const currentList = user.allowed_textbooks || [];
    const nextList = currentList.includes(tbId)
      ? currentList.filter(t => t !== tbId)
      : [...currentList, tbId];
    
    try {
      await api.adminUpdateAccess(token, user.id, { allowedTextbooks: nextList });
      loadUsers();
    } catch (err: any) {
      setError(err.message || "修改教材授权失败");
    }
  };

  // Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resetModalUser) return;
    try {
      await api.adminResetPassword(token, resetModalUser.id, resetPasswordVal);
      setNotice(`已重置用户 ${resetModalUser.username} 的登录密码`);
      setResetModalUser(null);
      setResetPasswordVal("");
    } catch (err: any) {
      setError(err.message || "重置密码失败");
    }
  };

  // Delete User
  const handleDeleteUser = async (user: AdminUser) => {
    if (!token) return;
    if (!window.confirm(`确定要彻底删除用户 "${user.username}" 及其所有诊断记录与知识点掌握档案吗？此操作不可逆！`)) {
      return;
    }
    try {
      await api.adminDeleteUser(token, user.id);
      setNotice(`已删除用户：${user.username}`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "删除用户失败");
    }
  };

  return (
    <div className="admin-page-overlay">
      <div className="admin-container">
        {/* Top Header */}
        <div className="admin-header">
          <div className="admin-header-title">
            <Shield className="admin-badge-icon" size={24} />
            <div>
              <h2>冲之阁 · 用户与权限管理中心</h2>
              <p>系统管理员专区：统一开通学生账号、分配教材访问权限、重置密码与账号管控</p>
            </div>
          </div>
          <div className="admin-header-actions">
            <button className="btn-secondary" onClick={loadUsers} title="刷新列表">
              <RefreshCw size={16} />
              <span>刷新</span>
            </button>
            <button className="btn-primary" onClick={() => { setShowAddModal(true); setError(null); }}>
              <UserPlus size={16} />
              <span>新建用户</span>
            </button>
            <button className="btn-close-admin" onClick={onClose} title="返回平台">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notices & Alerts */}
        {error && (
          <div className="admin-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="admin-alert success">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {/* User Table */}
        <div className="admin-table-card">
          {loading ? (
            <div className="admin-loading">正在加载用户档案...</div>
          ) : users.length === 0 ? (
            <div className="admin-empty">暂无注册用户数据</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>用户名 / 姓名</th>
                    <th>角色权限</th>
                    <th>账号状态</th>
                    <th>授权教材目录</th>
                    <th>注册时间</th>
                    <th style={{ textAlign: "right" }}>管理操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = currentAdmin?.id === u.id;
                    const isBuiltinAdmin = u.username === "admina";
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="u-name-col">
                            <span className="u-username">{u.username}</span>
                            {u.display_name && u.display_name !== u.username && (
                              <span className="u-displayname">({u.display_name})</span>
                            )}
                            {isBuiltinAdmin && <span className="u-tag-primary">超级管理</span>}
                            {isSelf && <span className="u-tag-subtle">当前操作者</span>}
                          </div>
                        </td>
                        <td>
                          <button 
                            className={`tag-role ${u.role === "admin" ? "admin" : "user"}`}
                            disabled={isBuiltinAdmin}
                            onClick={() => handleToggleRole(u)}
                            title={isBuiltinAdmin ? "内置主管理员不可降权" : "点击切换角色"}
                          >
                            {u.role === "admin" ? "管理员 (Admin)" : "学员 (Student)"}
                          </button>
                        </td>
                        <td>
                          <button 
                            className={`tag-status ${u.status === "active" ? "active" : "disabled"}`}
                            disabled={isBuiltinAdmin}
                            onClick={() => handleToggleStatus(u)}
                            title={isBuiltinAdmin ? "内置主管理员不可停用" : "点击停用/激活账号"}
                          >
                            {u.status === "active" ? "正常激活" : "已停用"}
                          </button>
                        </td>
                        <td>
                          <div className="tb-chips">
                            {AVAILABLE_TEXTBOOKS.map((tb) => {
                              const active = (u.allowed_textbooks || []).includes(tb.id);
                              return (
                                <span
                                  key={tb.id}
                                  className={`tb-chip ${active ? "active" : "inactive"}`}
                                  onClick={() => handleToggleTextbook(u, tb.id)}
                                  title={`点击${active ? "移除" : "授予"} [${tb.name}] 权限`}
                                >
                                  {tb.id}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td>
                          <span className="u-date">
                            {new Date(u.created_at).toLocaleDateString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit"
                            })}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="admin-action-btns">
                            <button
                              className="btn-action-icon"
                              onClick={() => { setResetModalUser(u); setResetPasswordVal(""); }}
                              title="重置密码"
                            >
                              <KeyRound size={15} />
                            </button>
                            {!isBuiltinAdmin && (
                              <button
                                className="btn-action-icon delete"
                                onClick={() => handleDeleteUser(u)}
                                title="删除用户"
                              >
                                <Trash2 size={15} />
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

        {/* Modal: Add User */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="auth-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
              <div className="auth-header">
                <h3>新建学员 / 管理员账号</h3>
                <p>为学生开通冲之阁数学自适应诊断专属账号</p>
              </div>

              <form onSubmit={handleAddUser} className="auth-form">
                <div className="form-group">
                  <label>用户名 (登录标识)</label>
                  <input
                    type="text"
                    placeholder="例如: student01"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>姓名 / 真实姓名</label>
                  <input
                    type="text"
                    placeholder="例如: 张小华"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>初始登录密码</label>
                  <input
                    type="password"
                    placeholder="至少 6 位密码"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>账号角色</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    <option value="user">普通学员 (Student)</option>
                    <option value="admin">管理员 (Admin)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>授权教材 (默认已开通七上)</label>
                  <div className="tb-chips select-chips">
                    {AVAILABLE_TEXTBOOKS.map((tb) => {
                      const active = newTextbooks.includes(tb.id);
                      return (
                        <span
                          key={tb.id}
                          className={`tb-chip ${active ? "active" : "inactive"}`}
                          onClick={() => {
                            if (active) setNewTextbooks(newTextbooks.filter(t => t !== tb.id));
                            else setNewTextbooks([...newTextbooks, tb.id]);
                          }}
                        >
                          {tb.name} ({tb.id})
                        </span>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="btn-submit">
                  确认创建账号
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Reset Password */}
        {resetModalUser && (
          <div className="modal-overlay" onClick={() => setResetModalUser(null)}>
            <div className="auth-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="btn-close" onClick={() => setResetModalUser(null)}>
                <X size={20} />
              </button>
              <div className="auth-header">
                <h3>重置用户密码</h3>
                <p>为用户 <strong>{resetModalUser.username}</strong> 设置新密码</p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="auth-form">
                <div className="form-group">
                  <label>新密码</label>
                  <input
                    type="password"
                    placeholder="请输入不少于 6 位的新密码"
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-submit">
                  确认修改密码
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
