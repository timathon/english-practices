import React, { useState, useEffect, useRef } from "react";
import { BookOpen, User as UserIcon, LogOut, CheckCircle, ChevronDown, Sparkles, Shield, Menu, X } from "lucide-react";
import { useAuth } from "../lib/authContext";

interface NavbarProps {
  currentTextbook: string;
  onOpenAuth: () => void;
  onSelectTextbook: (id: string) => void;
  onOpenAdmin?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTextbook, 
  onOpenAuth, 
  onSelectTextbook, 
  onOpenAdmin,
  onToggleSidebar,
  isSidebarOpen
}) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleSidebar && (
          <button 
            className="btn-sidebar-toggle" 
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "收起章节目录" : "展开章节目录"}
            aria-label="切换目录"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        <div className="brand-logo" title="冲之阁 · 纪念数学家祖冲之，专注数学课标知识图谱与自适应诊断">
          <Sparkles className="logo-icon" size={22} />
          <span className="brand-title">冲之阁</span>
          <span className="brand-badge">数学课标诊断</span>
        </div>

        {/* Textbook selector */}
        <div className="textbook-selector" ref={dropdownRef}>
          <button 
            className="textbook-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="切换教材版本"
          >
            <BookOpen size={16} className="textbook-icon" />
            <span className="textbook-title-full">北师大版 七年级上册 (M7A-BS)</span>
            <span className="textbook-title-short">七上 (M7A)</span>
            <ChevronDown size={14} className={`caret ${dropdownOpen ? 'rotate' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="textbook-dropdown">
              <div className="dropdown-item active" onClick={() => { onSelectTextbook("M7A-BS"); setDropdownOpen(false); }}>
                <div className="item-title">北师大版 七年级上册</div>
                <div className="item-sub">全书 7 章 · 21 节 · 2022课标对齐</div>
              </div>
              <div className="dropdown-item disabled">
                <div className="item-title">北师大版 七年级下册 (M7B-BS)</div>
                <div className="item-sub">即将发布 · 架构即插即用</div>
              </div>
              <div className="dropdown-item disabled">
                <div className="item-title">北师大版 八年级上册 (M8A-BS)</div>
                <div className="item-sub">即将发布</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-profile">
            {user.role === "admin" && onOpenAdmin && (
              <button className="btn-admin-nav" onClick={onOpenAdmin} title="用户与权限管理中心">
                <Shield size={14} />
                <span className="admin-btn-text">用户管理</span>
              </button>
            )}
            <span className="user-badge" title={user.displayName || user.username}>
              <UserIcon size={14} className="user-icon" />
              <span className="user-name-text">{user.displayName || user.username}</span>
              {user.role === "admin" && <span className="admin-pill">Admin</span>}
            </span>
            <button className="btn-logout" onClick={logout} title="退出登录">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn-login" onClick={onOpenAuth}>
            <UserIcon size={16} />
            <span className="login-btn-text">登录账号</span>
          </button>
        )}
      </div>
    </header>
  );
};
