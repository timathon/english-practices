import { useState, useEffect } from "react";
import { Sparkles, Shield, LogOut } from "lucide-react";
import { apiRequest, getToken, setToken } from "./api";
import { UserProfile, QuotaInfo, MistakeItem } from "./types";
import { LoginScreen } from "./components/LoginScreen";
import { AdminUserManagement } from "./components/AdminUserManagement";
import { QuickPasteTab, CandidateItem, BatchAnalysisItem } from "./components/QuickPasteTab";
import { MistakeLibraryTab } from "./components/MistakeLibraryTab";
import { MistakeDetailModal } from "./components/MistakeDetailModal";
import { BatchReviewModal } from "./components/BatchReviewModal";

export default function App() {
  const [token, setAuthToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [quota, setQuota] = useState<QuotaInfo>({ used: 0, limit: 20, remaining: 20 });
  const [tab, setTab] = useState<"paste" | "library" | "admin">("paste");
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Quick Paste state
  const [pasteText, setPasteText] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number>(() => {
    const saved = localStorage.getItem("wistake_grade");
    return saved ? parseInt(saved, 10) : 3;
  });
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [parsedCandidates, setParsedCandidates] = useState<CandidateItem[]>([]);
  const [selectedCandidateIndices, setSelectedCandidateIndices] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchAnalyses, setBatchAnalyses] = useState<BatchAnalysisItem[]>([]);

  // Library state
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [isLoadingMistakes, setIsLoadingMistakes] = useState(false);
  const [selectedMistakeDetail, setSelectedMistakeDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedMistakeIds, setSelectedMistakeIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [batchPracticeQueue, setBatchPracticeQueue] = useState<any[]>([]);
  const [batchPracticeCurrentIdx, setBatchPracticeCurrentIdx] = useState(0);
  const [isBatchPracticing, setIsBatchPracticing] = useState(false);

  // Load user profile & quota
  useEffect(() => {
    if (!token) return;
    apiRequest("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        setQuota(data.quota);
        if (!localStorage.getItem("wistake_grade") && data.user?.grade) {
          setSelectedGrade(data.user.grade);
        }
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
        handleLogout();
      });
  }, [token]);

  const handleGradeChange = (g: number) => {
    setSelectedGrade(g);
    localStorage.setItem("wistake_grade", g.toString());
  };

  // Load library when switching to library tab
  useEffect(() => {
    if (tab === "library" && token) {
      loadMistakes();
    }
  }, [tab, token]);

  const loadMistakes = async () => {
    setIsLoadingMistakes(true);
    try {
      const data = await apiRequest("/api/mistakes");
      setMistakes(data.items || []);
    } catch (err: any) {
      alert("加载错题本失败: " + err.message);
    } finally {
      setIsLoadingMistakes(false);
    }
  };

  const handleViewMistakeDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await apiRequest(`/api/mistakes/${id}`);
      setSelectedMistakeDetail(detail);
    } catch (err: any) {
      alert("获取错题详情失败: " + err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleFlipStatus = async (mistakeId: string, currentFlipped: boolean) => {
    try {
      await apiRequest(`/api/mistakes/${mistakeId}/flip`, {
        method: "POST",
        body: JSON.stringify({ flip: !currentFlipped })
      });
      if (selectedMistakeDetail && selectedMistakeDetail.mistake.id === mistakeId) {
        setSelectedMistakeDetail({
          ...selectedMistakeDetail,
          mistake: {
            ...selectedMistakeDetail.mistake,
            state: !currentFlipped ? "flipped" : "practicing"
          }
        });
      }
      loadMistakes();
    } catch (err: any) {
      alert("更新状态失败: " + err.message);
    }
  };

  const toggleSelectMistake = (id: string) => {
    setSelectedMistakeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllMistakes = () => {
    const visibleIds = mistakes
      .filter((m) => !searchFilter || m.stem.includes(searchFilter) || m.chapter.includes(searchFilter))
      .map((m) => m.id);

    if (selectedMistakeIds.length === visibleIds.length && visibleIds.length > 0) {
      setSelectedMistakeIds([]);
    } else {
      setSelectedMistakeIds(visibleIds);
    }
  };

  const handleDeleteSelectedMistakes = async () => {
    if (selectedMistakeIds.length === 0) return;
    if (!confirm(`确定要从错题集市中彻底删除选中的 ${selectedMistakeIds.length} 道错题吗？此操作不可逆。`)) {
      return;
    }

    setIsDeletingBatch(true);
    try {
      await apiRequest("/api/mistakes/batch-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedMistakeIds })
      });
      setSelectedMistakeIds([]);
      loadMistakes();
    } catch (err: any) {
      alert("批量删除失败: " + err.message);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleStartBatchPractice = async () => {
    if (selectedMistakeIds.length === 0) return;
    setIsLoadingDetail(true);
    try {
      const loaded: any[] = [];
      for (const id of selectedMistakeIds) {
        const detail = await apiRequest(`/api/mistakes/${id}`);
        loaded.push(detail);
      }
      setBatchPracticeQueue(loaded);
      setBatchPracticeCurrentIdx(0);
      setIsBatchPracticing(true);
    } catch (err: any) {
      alert("启动批量刷题失败: " + err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setAuthToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setToken(null);
    setAuthToken(null);
    setUser(null);
  };

  const handleSplitQuestions = async () => {
    if (!pasteText.trim()) return;
    setIsSplitting(true);
    setParsedCandidates([]);
    setSelectedCandidateIndices([]);
    setBatchAnalyses([]);

    try {
      const res = await apiRequest("/api/mistakes/parse-paste", {
        method: "POST",
        body: JSON.stringify({ text: pasteText })
      });

      if (!res.items || res.items.length === 0) {
        throw new Error("未能识别出错题，请检查题干及 answer: 错答格式");
      }

      setParsedCandidates(res.items);
      setSelectedCandidateIndices(res.items.map((_: any, idx: number) => idx));
    } catch (err: any) {
      alert("错题识别失败: " + err.message);
    } finally {
      setIsSplitting(false);
    }
  };

  const toggleCandidateSelection = (index: number) => {
    setSelectedCandidateIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const selectAllCandidates = () => {
    if (selectedCandidateIndices.length === parsedCandidates.length) {
      setSelectedCandidateIndices([]);
    } else {
      setSelectedCandidateIndices(parsedCandidates.map((_, i) => i));
    }
  };

  const handleOpenAnalyzeModal = () => {
    if (selectedCandidateIndices.length === 0) {
      alert("请至少勾选一道待分析错题");
      return;
    }
    setShowGradeModal(true);
  };

  const doConfirmAnalyze = async () => {
    setShowGradeModal(false);
    setIsAnalyzing(true);
    setBatchAnalyses([]);

    const targets = selectedCandidateIndices.map((i) => parsedCandidates[i]);
    const results: any[] = [];

    try {
      for (const target of targets) {
        const analyzeRes = await apiRequest("/api/mistakes/analyze", {
          method: "POST",
          body: JSON.stringify({
            stem: target.stem,
            user_answer: target.user_answer,
            options: target.options,
            grade: selectedGrade
          })
        });

        results.push({
          mistake_id: analyzeRes.mistake_id,
          stem: target.stem,
          options: target.options,
          user_answer: target.user_answer,
          analysis: analyzeRes.analysis
        });
        setQuota(analyzeRes.quota);
      }

      setBatchAnalyses(results);
    } catch (err: any) {
      alert("AI 深度剖析出错: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <header style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(11, 15, 25, 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50, padding: "0.75rem 1rem" }}>
        <div className="app-header-container">
          <div className="app-header-left">
            <div style={{ display: "inline-flex", alignItems: "baseline", letterSpacing: "-0.02em" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#10b981", lineHeight: 1 }}>W</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, lineHeight: 1 }}>istake</span>
            </div>

            {/* Navigation tabs */}
            <nav style={{ display: "flex", gap: "0.4rem" }}>
              <button
                onClick={() => setTab("paste")}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  background: tab === "paste" ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: tab === "paste" ? "#60a5fa" : "var(--text-secondary)"
                }}
              >
                📋 错题速粘
              </button>
              <button
                onClick={() => setTab("library")}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  background: tab === "library" ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: tab === "library" ? "#60a5fa" : "var(--text-secondary)"
                }}
              >
                📚 错题集市
              </button>
            </nav>
          </div>

          <div className="app-header-right">
            {/* AI Quota pill */}
            <div style={{ fontSize: "0.8rem", padding: "0.25rem 0.65rem", borderRadius: "9999px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Sparkles size={13} color="#60a5fa" />
              <span style={{ color: "var(--text-secondary)" }}>AI 额度:</span>
              <strong style={{ color: quota.remaining > 0 ? "#10b981" : "#ef4444" }}>
                {quota.remaining}/{quota.limit}
              </strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {user?.role === "admin"
                  ? (user?.display_name || user?.username)
                  : `${user?.display_name || user?.username} (${user?.grade}年级)`}
              </span>

              {/* Admin Management Button (only visible to admin role) */}
              {user?.role === "admin" && (
                <button
                  onClick={() => setAdminModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.3rem 0.65rem",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background: "rgba(168, 85, 247, 0.15)",
                    color: "#c084fc",
                    border: "1px solid rgba(168, 85, 247, 0.3)"
                  }}
                >
                  <Shield size={13} />
                  <span>用户管理</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                title="退出登录"
                style={{ background: "transparent", color: "var(--text-muted)", padding: "0.35rem" }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin User Management Modal */}
      {adminModalOpen && (
        <AdminUserManagement
          currentUserId={user?.id}
          onClose={() => setAdminModalOpen(false)}
        />
      )}

      {/* Main Container */}
      <main style={{ maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "1.5rem", flex: 1 }}>
        {tab === "paste" && (
          <QuickPasteTab
            quota={quota}
            pasteText={pasteText}
            setPasteText={setPasteText}
            isSplitting={isSplitting}
            handleSplitQuestions={handleSplitQuestions}
            parsedCandidates={parsedCandidates}
            selectedCandidateIndices={selectedCandidateIndices}
            toggleCandidateSelection={toggleCandidateSelection}
            selectAllCandidates={selectAllCandidates}
            selectedGrade={selectedGrade}
            handleGradeChange={handleGradeChange}
            isAnalyzing={isAnalyzing}
            handleOpenAnalyzeModal={handleOpenAnalyzeModal}
            showGradeModal={showGradeModal}
            setShowGradeModal={setShowGradeModal}
            doConfirmAnalyze={doConfirmAnalyze}
            batchAnalyses={batchAnalyses}
          />
        )}

        {tab === "library" && (
          <MistakeLibraryTab
            mistakes={mistakes}
            selectedMistakeIds={selectedMistakeIds}
            selectAllMistakes={selectAllMistakes}
            toggleSelectMistake={toggleSelectMistake}
            handleStartBatchPractice={handleStartBatchPractice}
            handleDeleteSelectedMistakes={handleDeleteSelectedMistakes}
            isDeletingBatch={isDeletingBatch}
            isLoadingDetail={isLoadingDetail}
            isBatchPracticing={isBatchPracticing}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            isLoadingMistakes={isLoadingMistakes}
            handleViewMistakeDetail={handleViewMistakeDetail}
          />
        )}

        {/* Batch Practice Modal */}
        {isBatchPracticing && (
          <BatchReviewModal
            queue={batchPracticeQueue}
            currentIndex={batchPracticeCurrentIdx}
            onClose={() => {
              setIsBatchPracticing(false);
              loadMistakes();
            }}
            onNext={() => setBatchPracticeCurrentIdx((prev) => prev + 1)}
            onPrev={() => setBatchPracticeCurrentIdx((prev) => prev - 1)}
          />
        )}

        {/* Mistake Detail & Retest Modal */}
        <MistakeDetailModal
          detail={selectedMistakeDetail}
          onClose={() => setSelectedMistakeDetail(null)}
          onFlipStatus={handleFlipStatus}
          onPracticeSuccess={() => loadMistakes()}
        />
      </main>
    </div>
  );
}
