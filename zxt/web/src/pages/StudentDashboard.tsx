import React, { useState, useEffect } from 'react';
import { apiService, Poem, PoemQuestion, IdiomQuestion, formatLocalTime } from '../services/api';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { StudentQuizPreviewModal } from '../components/StudentQuizPreviewModal';
import { HistoryDetailModal } from '../components/bailiange/HistoryDetailModal';
import { DEFAULT_AVATAR_CONFIG, AvatarConfig } from '../components/AvatarDisplay';
import { ZhengTang } from '../components/chambers/ZhengTang';
import { WenGuShi } from '../components/chambers/WenGuShi';
import { ZhiXinFang } from '../components/chambers/ZhiXinFang';
import { GuanXingTai } from '../components/chambers/GuanXingTai';

interface StudentDashboardProps {
  activeView: 'student' | 'parent';
  user: any;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ activeView, user }) => {
  const getChamberFromUrl = (): 'zheng_tang' | 'wen_gu_shi' | 'zhi_xin_fang' | 'guan_xing_tai' => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('chamber');
    if (c === 'zhi_xin_fang' || c === 'wen_gu_shi' || c === 'guan_xing_tai' || c === 'zheng_tang') {
      return c;
    }
    return 'zheng_tang';
  };

  const [activeChamber, setActiveChamber] = useState<'zheng_tang' | 'wen_gu_shi' | 'zhi_xin_fang' | 'guan_xing_tai'>(getChamberFromUrl);
  const [userAvatarConfig, setUserAvatarConfig] = useState<AvatarConfig>(() => user?.avatarConfig || DEFAULT_AVATAR_CONFIG);
  const [pendingChamber, setPendingChamber] = useState<string | null>(null);
  const [zxfLatestConfig, setZxfLatestConfig] = useState<AvatarConfig>(() => user?.avatarConfig || DEFAULT_AVATAR_CONFIG);
  const [zxfIsDirty, setZxfIsDirty] = useState(false);
  const [poems, setPoems] = useState<Poem[]>(() => apiService.getQuizLibrary());
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(() => {
    const lib = apiService.getQuizLibrary();
    return lib.length > 0 ? lib[0] : null;
  });

  // Student state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [learntPoemIds, setLearntPoemIds] = useState<number[]>([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [activeStudentQuiz, setActiveStudentQuiz] = useState<{
    poemTitle: string;
    questions: (PoemQuestion | IdiomQuestion)[];
    assignmentId?: string;
  } | null>(null);

  // Modals state
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [pointAwardModal, setPointAwardModal] = useState<{
    basePoints: number;
    timelyBonus: number;
    accuracyBonus: number;
    totalEarnedPoints: number;
    newTotalPoints: number;
    isLockedToday: boolean;
  } | null>(null);

  useLockBodyScroll(Boolean(activeStudentQuiz) || Boolean(selectedHistoryItem) || Boolean(pointAwardModal));

  // Guard: intercept tab switch when ZhiXinFang has unsaved changes
  const handleChamberSwitch = (chamber: string) => {
    if (activeChamber === 'zhi_xin_fang' && zxfIsDirty && chamber !== 'zhi_xin_fang') {
      setPendingChamber(chamber);
      return;
    }
    setActiveChamber(chamber as any);
  };

  useEffect(() => {
    const syncFromUrl = () => {
      setActiveChamber(getChamberFromUrl());
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('pushstate', syncFromUrl);
    syncFromUrl();
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('pushstate', syncFromUrl);
    };
  }, []);

  useEffect(() => {
    loadPoems();
    loadStudentData();

    const handlePoemsUpdated = (e: any) => {
      if (e?.detail?.poems && Array.isArray(e.detail.poems)) {
        setPoems(e.detail.poems);
        if (e.detail.poems.length > 0 && !selectedPoem) {
          setSelectedPoem(e.detail.poems[0]);
        }
      } else {
        loadPoems();
      }
    };

    window.addEventListener('zxt_poems_updated', handlePoemsUpdated);
    return () => {
      window.removeEventListener('zxt_poems_updated', handlePoemsUpdated);
    };
  }, [user]);

  const loadPoems = async () => {
    const data = await apiService.getPoems();
    setPoems(data);
    if (data.length > 0) {
      setSelectedPoem(data[0]);
    }
  };

  const loadStudentData = async () => {
    const targetClass = user?.className || '三年级A班';
    setLearntPoemIds(apiService.getLearntPoemIdsSync(targetClass));

    const cachedStr = localStorage.getItem('zxt_assignments');
    let hasCache = false;
    if (cachedStr) {
      try {
        const cachedAll: any[] = JSON.parse(cachedStr);
        const filtered = cachedAll.filter((a: any) => a.className === targetClass);
        if (filtered.length > 0) {
          setAssignments(filtered);
          hasCache = true;
        }
      } catch (_) { }
    }

    if (!hasCache) {
      setIsAssignmentsLoading(true);
    }

    try {
      const asgns = await apiService.getAssignments(targetClass);
      setAssignments(asgns);
      const history = await apiService.getQuizHistory(user?.id || 'usr_stu_001');
      setQuizHistory(history);
      const dbLearnt = await apiService.getLearntPoemIds(targetClass);
      setLearntPoemIds(dbLearnt);
    } catch (err) {
      console.warn('Failed to load student data:', err);
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 py-8">
      {/* 4 Chambers Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-md border border-slate-200/80 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => handleChamberSwitch('zheng_tang')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
              activeChamber === 'zheng_tang'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📜 正堂</span>
          </button>
          <button
            onClick={() => handleChamberSwitch('wen_gu_shi')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
              activeChamber === 'wen_gu_shi'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📖 温故室</span>
          </button>
          <button
            onClick={() => setActiveChamber('zhi_xin_fang')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
              activeChamber === 'zhi_xin_fang'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🎨 知新坊</span>
          </button>
          <button
            onClick={() => handleChamberSwitch('guan_xing_tai')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
              activeChamber === 'guan_xing_tai'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🔭 观星台</span>
          </button>
        </div>
      </div>

      {/* Chamber Content Views */}
      {activeChamber === 'zheng_tang' && (
        <ZhengTang
          user={user}
          assignments={assignments}
          quizHistory={quizHistory}
          onStartQuiz={(title: string, questions: (PoemQuestion | IdiomQuestion)[], asgnId?: string) => {
            let finalQuestions = questions;
            if (!finalQuestions || finalQuestions.length === 0) {
              const asgn = assignments.find((a: any) => a.id === asgnId);

              // 1. Check if it's an idiom group
              const idiomGroups = apiService.getLocalIdiomGroups();
              const idiomGroup = idiomGroups.find(g =>
                g.title === title ||
                g.id === Number(asgn?.poemId) ||
                `成语接龙第${g.id}组` === title ||
                title.includes(`第${g.id}组`)
              );

              if (idiomGroup && idiomGroup.questions) {
                if (asgn?.questionIds && asgn.questionIds.length > 0) {
                  finalQuestions = idiomGroup.questions.filter((q: any) => asgn.questionIds.includes(q.id));
                } else {
                  finalQuestions = idiomGroup.questions;
                }
              } else {
                // 2. Check if it's a poem
                const poem = poems.find(p => p.title === title || p.id === Number(asgn?.poemId));
                if (poem && poem.questions) {
                  if (asgn?.questionIds && asgn.questionIds.length > 0) {
                    finalQuestions = poem.questions.filter((q: PoemQuestion) => asgn.questionIds.includes(q.id));
                  } else {
                    finalQuestions = poem.questions;
                  }
                }
              }
            }

            if (!finalQuestions || finalQuestions.length === 0) {
              alert('未找到该作业包含的题目数据，请联系教师确认。');
              return;
            }

            setActiveStudentQuiz({ poemTitle: title, questions: finalQuestions, assignmentId: asgnId });
          }}
        />
      )}

      {activeChamber === 'wen_gu_shi' && (
        <WenGuShi
          user={user}
          quizHistory={quizHistory}
          poems={poems}
          learntPoemIds={learntPoemIds}
          selectedPoem={selectedPoem}
          onSelectPoem={setSelectedPoem}
        />
      )}

      {activeChamber === 'zhi_xin_fang' && (
        <ZhiXinFang
          user={user}
          initialConfig={userAvatarConfig}
          onUpdateAvatar={(cfg: AvatarConfig) => {
            setUserAvatarConfig(cfg);
            setZxfIsDirty(false);
          }}
          onDirtyChange={(dirty, cfg) => {
            setZxfIsDirty(dirty);
            setZxfLatestConfig(cfg);
          }}
        />
      )}

      {/* Unsaved Avatar Changes Modal */}
      {pendingChamber && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-slate-800">形象设置未保存</h3>
              <p className="text-sm text-slate-500 mt-1">您的使者形象有未保存的修改，离开前是否保存？</p>
            </div>
            <div className="flex flex-col gap-2 mt-5">
              <button
                onClick={() => {
                  setUserAvatarConfig(zxfLatestConfig);
                  setZxfIsDirty(false);
                  setActiveChamber(pendingChamber as any);
                  setPendingChamber(null);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition"
              >
                💾 保存并离开
              </button>
              <button
                onClick={() => {
                  setZxfIsDirty(false);
                  setActiveChamber(pendingChamber as any);
                  setPendingChamber(null);
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
              >
                不保存，直接离开
              </button>
              <button
                onClick={() => setPendingChamber(null)}
                className="w-full py-2.5 rounded-xl text-purple-600 font-medium hover:bg-purple-50 transition"
              >
                继续编辑
              </button>
            </div>
          </div>
        </div>
      )}

      {activeChamber === 'guan_xing_tai' && (
        <GuanXingTai user={user} />
      )}

      {/* Student Assignment Quiz Runner Modal */}
      {activeStudentQuiz && (
        <StudentQuizPreviewModal
          poemTitle={activeStudentQuiz.poemTitle}
          questions={activeStudentQuiz.questions}
          initialIndex={0}
          onClose={(res) => {
            const quizInfo = activeStudentQuiz;
            setActiveStudentQuiz(null);
            if (res && res.completed) {
              const finalScore = res.score !== undefined ? res.score : 100;
              const studentId = user?.id || 'usr_stu_001';

              // 1. Record quiz result synchronously for ZERO-delay points calculation & local storage
              let resolvedPoemId = 1;
              const matchedPoem = poems.find(p => p.title === quizInfo.poemTitle);
              if (matchedPoem) {
                resolvedPoemId = matchedPoem.id;
              } else {
                const idiomGroups = apiService.getLocalIdiomGroups();
                const ig = idiomGroups.find(g => g.title === quizInfo.poemTitle || `成语接龙第${g.id}组` === quizInfo.poemTitle || quizInfo.poemTitle.includes(`第${g.id}组`));
                if (ig) {
                  resolvedPoemId = 10000 + ig.id;
                }
              }

              const pb = apiService.recordQuizResult(studentId, {
                poemTitle: quizInfo.poemTitle,
                poemId: resolvedPoemId,
                score: finalScore,
                accuracy: `${finalScore}%`,
                quizType: quizInfo.assignmentId ? '班级作业闯关' : '自主修业练习',
                details: res.details || [],
                assignmentId: quizInfo.assignmentId
              });

              // 2. Open points award modal INSTANTLY
              if (pb) {
                setPointAwardModal(pb);
              }

              // 3. Update history list INSTANTLY
              const syncHistory = apiService.getQuizHistorySync(studentId);
              setQuizHistory([...syncHistory]);

              // 4. Background sync
              if (quizInfo.assignmentId) {
                apiService.markAssignmentCompleted(quizInfo.assignmentId, finalScore).catch(console.error);
              }

              loadStudentData();
            }
          }}
        />
      )}

      {/* Quiz Record Answer Detail Modal */}
      {selectedHistoryItem && (
        <HistoryDetailModal
          selectedHistoryItem={selectedHistoryItem}
          poems={poems}
          formatLocalTime={formatLocalTime}
          onClose={() => setSelectedHistoryItem(null)}
        />
      )}

      {/* Point Reward Breakdown Modal */}
      {pointAwardModal && (
        <div className="fixed inset-0 !mt-0 !m-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPointAwardModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 max-w-sm w-full p-6 text-center space-y-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-900 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg ring-4 ring-amber-100">
              🪙
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black font-serif text-slate-800">
                获得 +{pointAwardModal.totalEarnedPoints} 智慧点！
              </h3>
              <p className="text-xs text-slate-500">
                知新堂智慧点总计: <span className="font-bold text-amber-600 font-mono text-sm">{pointAwardModal.newTotalPoints} 智慧点</span>
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center text-slate-700">
                <span>📅 每日打卡基础分</span>
                <span className="font-bold text-slate-900 font-mono">+{pointAwardModal.basePoints} pts</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>⏱️ 按时提交奖励</span>
                <span className="font-bold text-slate-900 font-mono">+{pointAwardModal.timelyBonus} pts</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>🎯 正确率突破奖励</span>
                <span className="font-bold text-amber-600 font-mono font-bold">+{pointAwardModal.accuracyBonus} pts</span>
              </div>
            </div>

            {pointAwardModal.isLockedToday && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-800 font-bold flex items-center justify-center gap-1">
                <span>🔒 100% 满分成就！今日已锁定，明天可再练习</span>
              </div>
            )}

            <button
              onClick={() => setPointAwardModal(null)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              太棒了 (Awesome!)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
