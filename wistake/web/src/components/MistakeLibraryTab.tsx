import React from "react";
import {
  PlayCircle,
  Trash2,
  Search,
  BookOpen,
  ChevronRight
} from "lucide-react";
import { MistakeItem, formatRelativeDate } from "../types";

interface MistakeLibraryTabProps {
  mistakes: MistakeItem[];
  selectedMistakeIds: string[];
  selectAllMistakes: () => void;
  toggleSelectMistake: (id: string) => void;
  handleStartBatchPractice: () => void;
  handleDeleteSelectedMistakes: () => void;
  isDeletingBatch: boolean;
  isLoadingDetail: boolean;
  isBatchPracticing: boolean;
  searchFilter: string;
  setSearchFilter: (query: string) => void;
  isLoadingMistakes: boolean;
  handleViewMistakeDetail: (id: string) => void;
}

export const MistakeLibraryTab: React.FC<MistakeLibraryTabProps> = ({
  mistakes,
  selectedMistakeIds,
  selectAllMistakes,
  toggleSelectMistake,
  handleStartBatchPractice,
  handleDeleteSelectedMistakes,
  isDeletingBatch,
  isLoadingDetail,
  isBatchPracticing,
  searchFilter,
  setSearchFilter,
  isLoadingMistakes,
  handleViewMistakeDetail
}) => {
  return (
    <div>
      <div className="mobile-toolbar-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>错题档案集市</h2>
          {mistakes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                onClick={selectAllMistakes}
                style={{
                  padding: "0.3rem 0.7rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#60a5fa"
                }}
              >
                {selectedMistakeIds.length === mistakes.length ? "取消全选" : "全选"}
              </button>
              {selectedMistakeIds.length > 0 && (
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  已选 <strong style={{ color: "#10b981" }}>{selectedMistakeIds.length}</strong> 题
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mobile-toolbar-wrap" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <div className="mobile-btn-group" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button
              onClick={handleStartBatchPractice}
              disabled={selectedMistakeIds.length === 0 || isLoadingDetail}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                background: selectedMistakeIds.length === 0 ? "rgba(255, 255, 255, 0.05)" : "linear-gradient(135deg, #10b981, #059669)",
                color: selectedMistakeIds.length === 0 ? "var(--text-muted)" : "#fff",
                border: selectedMistakeIds.length === 0 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                cursor: selectedMistakeIds.length === 0 || isLoadingDetail ? "not-allowed" : "pointer",
                opacity: selectedMistakeIds.length === 0 ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                whiteSpace: "nowrap"
              }}
            >
              <PlayCircle size={15} />
              批量悟道刷题{selectedMistakeIds.length > 0 ? ` (${selectedMistakeIds.length})` : ""}
            </button>

            <button
              onClick={handleDeleteSelectedMistakes}
              disabled={selectedMistakeIds.length === 0 || isDeletingBatch}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 500,
                background: selectedMistakeIds.length === 0 ? "rgba(255, 255, 255, 0.04)" : "rgba(239, 68, 68, 0.15)",
                color: selectedMistakeIds.length === 0 ? "var(--text-muted)" : "#f87171",
                border: selectedMistakeIds.length === 0 ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(239, 68, 68, 0.3)",
                cursor: selectedMistakeIds.length === 0 || isDeletingBatch ? "not-allowed" : "pointer",
                opacity: selectedMistakeIds.length === 0 ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                whiteSpace: "nowrap"
              }}
            >
              <Trash2 size={15} />
              {isDeletingBatch ? "删除中..." : `删除已选${selectedMistakeIds.length > 0 ? ` (${selectedMistakeIds.length})` : ""}`}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="mobile-search-wrapper">
            <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="按考点、章节搜索..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="mobile-search-input"
              style={{ width: "200px", fontSize: "0.85rem" }}
            />
          </div>
        </div>
      </div>

      {isLoadingDetail && !isBatchPracticing && (
        <div style={{ textAlign: "center", padding: "1rem", color: "#60a5fa", fontSize: "0.9rem" }}>
          正在加载错题悟道档案...
        </div>
      )}

      {isLoadingMistakes ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          正在加载错题本...
        </div>
      ) : mistakes.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <BookOpen size={40} color="var(--text-muted)" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>
            当前错题本空空如也，快去“错题速粘”记录第一道错题吧！
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {mistakes
            .filter((m) => !searchFilter || m.stem.includes(searchFilter) || m.chapter.includes(searchFilter))
            .map((m) => {
              const isFlipped = m.state === "flipped";
              const isSelected = selectedMistakeIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => handleViewMistakeDetail(m.id)}
                  className="glass-panel"
                  style={{
                    padding: "1.2rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border: isSelected
                      ? "1px solid rgba(59, 130, 246, 0.5)"
                      : isFlipped
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid var(--border-color)",
                    background: isSelected
                      ? "rgba(59, 130, 246, 0.08)"
                      : isFlipped
                      ? "rgba(16, 185, 129, 0.04)"
                      : undefined
                  }}
                >
                  <div className="library-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelectMistake(m.id)}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                      <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", borderRadius: "4px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontWeight: 600 }}>
                        {m.subject === "english" ? "英语" : m.subject === "chinese" ? "语文" : m.subject === "physics" ? "物理" : m.subject === "chemistry" ? "化学" : "数学"}
                      </span>
                      <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", borderRadius: "4px", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                        {m.chapter}
                      </span>
                      <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", borderRadius: "4px", background: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)" }}>
                        {m.grade}年级
                      </span>
                      {isFlipped && (
                        <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", borderRadius: "4px", background: "#10b981", color: "#fff", fontWeight: 700 }}>
                          🌟 已悟道
                        </span>
                      )}
                    </div>
                    <div className="library-card-meta">
                      <span style={{ color: "var(--text-muted)" }}>
                        录入:{" "}
                        <span
                          title={m.created_at ? new Date(m.created_at).toLocaleString("zh-CN") : undefined}
                          style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                        >
                          {formatRelativeDate(m.created_at)}
                        </span>
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        复习:{" "}
                        <span
                          title={m.last_reviewed_at ? new Date(m.last_reviewed_at).toLocaleString("zh-CN") : undefined}
                          style={{ color: m.days_since_review > 14 ? "#ef4444" : m.days_since_review === -1 ? "#f59e0b" : "#34d399", fontWeight: 500 }}
                        >
                          {m.days_since_review === -1
                            ? "未复习"
                            : formatRelativeDate(m.last_reviewed_at)}
                        </span>
                      </span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>

                  <div style={{ fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "0.5rem" }}>
                    {m.stem}
                  </div>

                  {m.options && m.options.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.6rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {m.options.map((opt: string, optIdx: number) => (
                        <span key={optIdx} style={{ background: "rgba(255, 255, 255, 0.04)", padding: "0.15rem 0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: "0.85rem", color: "#34d399", background: "rgba(16, 185, 129, 0.08)", padding: "0.5rem 0.8rem", borderRadius: "6px" }}>
                    💡 悟道点：{m.avoid_rule || "牢记考点，仔细审题"}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
