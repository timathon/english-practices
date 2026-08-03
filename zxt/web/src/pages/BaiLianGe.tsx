import React, { useState, useEffect } from 'react';
import { apiService, Poem, PoemQuestion, formatLocalTime } from '../services/api';
import { playAnswerSFX } from '../utils/sound';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { StudentQuizPreviewModal } from '../components/StudentQuizPreviewModal';
import { CachedImage } from '../components/CachedImage';
import { HistoryDetailModal } from '../components/bailiange/HistoryDetailModal';
import { StudentAssignmentsTab } from '../components/bailiange/StudentAssignmentsTab';
import { StudentQuizHistoryTab } from '../components/bailiange/StudentQuizHistoryTab';
import { StudentSelfStudyTab } from '../components/bailiange/StudentSelfStudyTab';
import { TeacherAssignmentsPublishTab } from '../components/bailiange/TeacherAssignmentsPublishTab';
import { TeacherStatsTab } from '../components/bailiange/TeacherStatsTab';
import { TeacherCourseProgressTab } from '../components/bailiange/TeacherCourseProgressTab';

interface BaiLianGeProps {
  activeView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin';
  user: any;
}

export const BaiLianGe: React.FC<BaiLianGeProps> = ({ activeView, user }) => {
  const [poems, setPoems] = useState<Poem[]>(() => apiService.getQuizLibrary());
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(() => {
    const lib = apiService.getQuizLibrary();
    return lib.length > 0 ? lib[0] : null;
  });

  // Helper to read tab from URL query params
  const getTabFromUrl = (): 'assignments' | 'history' | 'selfstudy' => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'selfstudy') return 'selfstudy';
    if (t === 'history') return 'history';
    return 'assignments';
  };

  // Navigation tabs state
  const [studentTab, setStudentTab] = useState<'assignments' | 'history' | 'selfstudy'>(getTabFromUrl);
  const [teacherTab, setTeacherTab] = useState<'assignments' | 'stats' | 'progress'>('assignments');
  const [adminTab, setAdminTab] = useState<'teachers' | 'students' | 'classes'>('teachers');
  const [showPinyin, setShowPinyin] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [showFirstAttemptOnly, setShowFirstAttemptOnly] = useState(false);
  const [isRefreshingAssignments, setIsRefreshingAssignments] = useState(false);

  useEffect(() => {
    const syncTab = () => setStudentTab(getTabFromUrl());
    window.addEventListener('popstate', syncTab);
    window.addEventListener('pushstate', syncTab);
    // Initial sync
    syncTab();
    return () => {
      window.removeEventListener('popstate', syncTab);
      window.removeEventListener('pushstate', syncTab);
    };
  }, []);

  const switchStudentTab = (tab: 'assignments' | 'history' | 'selfstudy') => {
    setStudentTab(tab);
    window.history.pushState({}, '', `/student?tab=${tab}`);
    window.dispatchEvent(new Event('pushstate'));
  };

  // Student state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [learntPoemIds, setLearntPoemIds] = useState<number[]>([]);
  const [activeQuizPoem, setActiveQuizPoem] = useState<Poem | null>(null);
  const [activeStudentQuiz, setActiveStudentQuiz] = useState<{
    poemTitle: string;
    questions: PoemQuestion[];
    assignmentId?: string;
  } | null>(null);

  useLockBodyScroll(Boolean(activeQuizPoem) || Boolean(activeStudentQuiz));

  // Quiz runner state
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [scrambledWords, setScrambledWords] = useState<string[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Helper to initialize cached selected class and classes roster
  const getInitialSelectedClass = () => {
    const userStored = localStorage.getItem('zxt_user');
    let userId = 'default';
    let userClass = '三年级A班';
    if (userStored) {
      try {
        const u = JSON.parse(userStored);
        userId = u.id || 'default';
        userClass = u.className || '三年级A班';
      } catch (_) { }
    }
    const cached = localStorage.getItem(`zxt_selected_class_${userId}`);
    return cached || userClass;
  };

  // Teacher state
  const [classes, setClasses] = useState<any[]>(() => apiService.getClassesSync());
  const [selectedClass, setSelectedClass] = useState<string>(getInitialSelectedClass);
  const [students, setStudents] = useState<any[]>([]);
  const [newAsgnPoemId, setNewAsgnPoemId] = useState<number>(1);
  const [newAsgnDueDate, setNewAsgnDueDate] = useState<string>('2026-08-01');
  const [newAsgnReq, setNewAsgnReq] = useState<string>('完成诗句连线与古诗背诵打卡');
  const [asgnSubject, setAsgnSubject] = useState<string>('语文');
  const [asgnSection, setAsgnSection] = useState<string>('白莲阁');
  const [teacherMsg, setTeacherMsg] = useState<string>('');

  // Assignment Question Review Modal state
  const [publishingPoem, setPublishingPoem] = useState<Poem | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [previewStartIndex, setPreviewStartIndex] = useState<number | null>(null);

  // Quiz History Detail Modal state
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  // Sync Error Modal state
  const [syncErrorModal, setSyncErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [pointAwardModal, setPointAwardModal] = useState<{
    basePoints: number;
    timelyBonus: number;
    accuracyBonus: number;
    totalEarnedPoints: number;
    newTotalPoints: number;
    isLockedToday: boolean;
  } | null>(null);

  // Animating Poem ID state for unlock toggle transition
  const [animatingPoemId, setAnimatingPoemId] = useState<number | null>(null);

  useLockBodyScroll(publishingPoem !== null || selectedHistoryItem !== null || syncErrorModal !== null || pointAwardModal !== null);

  // Admin state
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [allStudentsList, setAllStudentsList] = useState<any[]>([]);
  const [adminMsg, setAdminMsg] = useState<string>('');

  // Admin Form input state
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherClass, setNewTeacherClass] = useState('三年级A班');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('三年级A班');
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeacher, setNewClassTeacher] = useState('');

  // Handle Add Class
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const tch = teachersList.find(t => t.name === newClassTeacher);
    const updated = await apiService.addClass(newClassName.trim(), tch?.id, tch?.name);
    setClasses(updated);
    setAdminMsg(`新班级【${newClassName.trim()}】开设成功！`);
    setNewClassName('');
  };

  // Editor state
  const [editingPoem, setEditingPoem] = useState<Poem | null>(null);
  const [editorSuccessMsg, setEditorSuccessMsg] = useState('');

  useEffect(() => {
    loadPoems();
    loadRosters();
  }, []);

  useEffect(() => {
    loadStudentData();
    loadTeacherData();
  }, [selectedClass]);

  // Keep selected poem ID valid based on cached/DB unlocked poems
  useEffect(() => {
    const unlocked = poems.filter(p => learntPoemIds.map(Number).includes(Number(p.id)));
    if (unlocked.length > 0 && !unlocked.some(p => Number(p.id) === Number(newAsgnPoemId))) {
      setNewAsgnPoemId(Number(unlocked[0].id));
    }
  }, [learntPoemIds, poems]);

  // Auto-hide teacher message banner after 6 seconds
  useEffect(() => {
    if (!teacherMsg) return;
    const timer = setTimeout(() => {
      setTeacherMsg('');
    }, 6000);
    return () => clearTimeout(timer);
  }, [teacherMsg]);

  // Auto fetch new assignments every 60 seconds when on student assignments tab
  useEffect(() => {
    if (activeView === 'student' && studentTab === 'assignments') {
      const interval = setInterval(() => {
        loadStudentData();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [activeView, studentTab, selectedClass]);

  const loadPoems = async () => {
    const data = await apiService.getPoems();
    setPoems(data);
    if (data.length > 0) {
      setSelectedPoem(data[0]);
      setEditingPoem(data[0]);
    }
  };

  const loadRosters = async () => {
    // 1. Instant load from localStorage cache
    const cachedClasses = apiService.getClassesSync();
    if (cachedClasses && cachedClasses.length > 0) {
      if (user && user.role === 'teacher') {
        const myClasses = cachedClasses.filter((c: any) =>
          c.teacherId === user.id ||
          c.name === user.className ||
          (c.teacherName && c.teacherName.includes(user.name.split(' ')[0]))
        );
        const finalClasses = myClasses.length > 0 ? myClasses : cachedClasses.filter((c: any) => c.name === user.className);
        const activeClasses = finalClasses.length > 0 ? finalClasses : [cachedClasses[0]];
        setClasses(activeClasses);
        const cachedSelected = localStorage.getItem(`zxt_selected_class_${user.id}`);
        if (cachedSelected && activeClasses.some((c: any) => c.name === cachedSelected)) {
          setSelectedClass(cachedSelected);
        } else if (activeClasses.length > 0) {
          setSelectedClass(activeClasses[0].name);
        }
      } else {
        setClasses(cachedClasses);
      }
    }

    // 2. Fetch fresh roster data from DB in background
    try {
      const allCls = await apiService.getClasses();
      const allTchs = await apiService.getTeachers();
      const allStus = await apiService.getStudents();

      setTeachersList(allTchs);
      setAllStudentsList(allStus);

      if (user && user.role === 'teacher') {
        const myClasses = allCls.filter((c: any) =>
          c.teacherId === user.id ||
          c.name === user.className ||
          (c.teacherName && c.teacherName.includes(user.name.split(' ')[0]))
        );
        const finalClasses = myClasses.length > 0 ? myClasses : allCls.filter((c: any) => c.name === user.className);
        const activeClasses = finalClasses.length > 0 ? finalClasses : (allCls.length > 0 ? [allCls[0]] : []);
        setClasses(activeClasses);

        const cachedSelected = localStorage.getItem(`zxt_selected_class_${user.id}`);
        if (cachedSelected && activeClasses.some((c: any) => c.name === cachedSelected)) {
          setSelectedClass(cachedSelected);
        } else if (activeClasses.length > 0 && !activeClasses.some((c: any) => c.name === selectedClass)) {
          setSelectedClass(activeClasses[0].name);
        }
      } else {
        setClasses(allCls);
      }
    } catch (err) {
      console.warn('Failed to load rosters from DB:', err);
    }
  };

  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);

  const loadStudentData = async () => {
    const targetClass = (user && user.role === 'teacher') ? (selectedClass || '三年级A班') : (user?.className || '三年级A班');
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

  const loadTeacherData = async () => {
    const targetClass = selectedClass || user?.className || '三年级A班';
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
      const classStudents = await apiService.getStudents(targetClass);
      setStudents(classStudents);
      const dbLearnt = await apiService.getLearntPoemIds(targetClass);
      setLearntPoemIds(dbLearnt);
      const teacherAsgns = await apiService.getAssignments(targetClass);
      setAssignments(teacherAsgns);
    } catch (err) {
      console.warn('Failed to load teacher data:', err);
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  // --- QUIZ ENGINE FUNCTIONS ---
  const handleStartStudentAssignment = (asgn: any) => {
    const poem = poems.find(p => p.id === asgn.poemId) || poems[0];
    const allQs = poem?.questions || [];
    const asgnQs = (asgn.questionIds && asgn.questionIds.length > 0)
      ? allQs.filter(q => asgn.questionIds.includes(q.id))
      : allQs;

    setActiveStudentQuiz({
      poemTitle: poem ? poem.title : asgn.poemTitle,
      questions: asgnQs.length > 0 ? asgnQs : allQs,
      assignmentId: asgn.id,
    });
  };

  const startQuiz = (poem: Poem) => {
    setActiveQuizPoem(poem);
    if (!poem || !poem.lines || poem.lines.length === 0) return;
    const firstLineObj = poem.lines[0];
    const targetLine = typeof firstLineObj === 'string' ? firstLineObj : firstLineObj.text;
    const chars = targetLine.split('');
    const shuffled = [...chars].sort(() => Math.random() - 0.5);
    setScrambledWords(shuffled);
    setSelectedWords([]);
    setQuizCompleted(false);
  };

  const handleSelectChar = (char: string, index: number) => {
    setSelectedWords([...selectedWords, char]);
    const updated = [...scrambledWords];
    updated.splice(index, 1);
    setScrambledWords(updated);
  };

  const handleRemoveChar = (char: string, index: number) => {
    const updated = [...selectedWords];
    updated.splice(index, 1);
    setSelectedWords(updated);
    setScrambledWords([...scrambledWords, char]);
  };

  const handleVerifyQuiz = () => {
    if (!activeQuizPoem) return;
    const answer = selectedWords.join('');
    const firstLineObj = activeQuizPoem.lines[0];
    const targetLine = typeof firstLineObj === 'string' ? firstLineObj : firstLineObj.text;
    if (answer === targetLine) {
      playAnswerSFX('correct');
      setQuizScore(quizScore + 10);
      setQuizCompleted(true);
      // Record history
      apiService.recordQuizResult(user?.id || 'usr_stu_001', {
        poemTitle: activeQuizPoem.title,
        poemId: activeQuizPoem.id,
        score: 100,
        accuracy: '100%',
        quizType: '采莲连句闯关'
      });
      loadStudentData();
    } else {
      playAnswerSFX('wrong');
      alert(`差一点点哦！正确顺序是："${targetLine}"`);
    }
  };

  // --- TEACHER ACTIONS ---
  const handlePublishAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const poem = poems.find(p => p.id === Number(newAsgnPoemId));
    if (!poem) return;
    const allQs = poem.questions || [];
    setPublishingPoem(poem);
    setSelectedQuestionIds(allQs.map(q => q.id));
  };

  const [publishSuccessData, setPublishSuccessData] = useState<{
    className: string;
    poemTitle: string;
    questionCount: number;
    dueDate: string;
    requirement: string;
  } | null>(null);

  const confirmPublishAssignment = async () => {
    if (!publishingPoem) return;
    if (selectedQuestionIds.length === 0) {
      alert('请至少勾选 1 道题目后再发布作业！');
      return;
    }
    await apiService.createAssignment({
      className: selectedClass,
      poemId: publishingPoem.id,
      poemTitle: publishingPoem.title,
      dueDate: newAsgnDueDate,
      requirement: newAsgnReq,
      questionIds: selectedQuestionIds,
    });

    const successInfo = {
      className: selectedClass,
      poemTitle: publishingPoem.title,
      questionCount: selectedQuestionIds.length,
      dueDate: newAsgnDueDate,
      requirement: newAsgnReq,
    };

    setTeacherMsg(`成功向【${selectedClass}】发布《${publishingPoem.title}》作业（已精选 ${selectedQuestionIds.length} 道题目）！`);
    setPublishingPoem(null);
    setPublishSuccessData(successInfo);
    await loadTeacherData();
    await loadStudentData();
  };

  const handleToggleLearnt = async (poemId: number) => {
    const numId = Number(poemId);
    setAnimatingPoemId(numId);
    setTimeout(() => setAnimatingPoemId(null), 600);

    const prevLearnt = [...learntPoemIds];
    const isCurrentlyLearnt = prevLearnt.map(Number).includes(numId);

    // 1. Instant optimistic UI update (0ms delay)
    const updated = isCurrentlyLearnt
      ? prevLearnt.filter(id => Number(id) !== numId)
      : [...prevLearnt, numId];

    setLearntPoemIds(updated);
    localStorage.setItem(`zxt_learnt_${selectedClass}`, JSON.stringify(updated));
    setTeacherMsg(`已更新【${selectedClass}】古诗解锁状态...`);

    // 2. Background DB update with 30s timeout
    try {
      await apiService.saveLearntPoemIdsToDB(selectedClass, updated, 30000);
      setTeacherMsg(`已成功同步【${selectedClass}】古诗解锁状态至数据库！`);
    } catch (err: any) {
      console.error('Failed to sync learnt status to DB:', err);
      // Revert optimistic change on failure
      setLearntPoemIds(prevLearnt);
      localStorage.setItem(`zxt_learnt_${selectedClass}`, JSON.stringify(prevLearnt));
      setTeacherMsg(`⚠️ 解锁状态同步失败，已还原修改。`);

      const poemObj = poems.find(p => Number(p.id) === numId);
      const poemName = poemObj ? `《${poemObj.title}》` : `古诗 #${poemId}`;
      setSyncErrorModal({
        title: '云端同步失败 (Sync Failed)',
        message: `未能将 ${poemName} 的解锁状态保存至云端数据库。原因：${err.message || '网络连接超时 (30秒)'}。本地更改已自动恢复。`
      });
    }
  };

  // --- ADMIN ACTIONS ---
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName) return;
    const updated = [...teachersList, {
      id: `usr_tch_${Date.now()}`,
      username: `tch_${Date.now().toString().slice(-4)}`,
      name: newTeacherName,
      assignedClass: newTeacherClass
    }];
    apiService.saveTeachers(updated);
    setTeachersList(updated);
    setAdminMsg(`教师【${newTeacherName}】创建成功并分配至【${newTeacherClass}】！`);
    setNewTeacherName('');
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName) return;
    const updated = [...allStudentsList, {
      id: `usr_stu_${Date.now()}`,
      username: `stu_${Date.now().toString().slice(-4)}`,
      name: newStudentName,
      className: newStudentClass,
      completedQuizzes: 0,
      avgScore: 100
    }];
    apiService.saveStudents(updated);
    setAllStudentsList(updated);
    setAdminMsg(`学生【${newStudentName}】创建成功并加入【${newStudentClass}】！`);
    setNewStudentName('');
  };

  return (
    <>
      {/* Floating HUD Toast Overlay - Zero impact on page layout flow */}
      {teacherMsg && (
        <div className="fixed top-16 left-0 right-0 z-50 pointer-events-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
            <div className="pointer-events-auto p-3 bg-emerald-50/95 backdrop-blur-md border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <span className="text-base">✅</span>
                <span>{teacherMsg}</span>
              </div>
              <button
                onClick={() => setTeacherMsg('')}
                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/50 p-1 rounded-lg transition text-xs font-bold"
                title="关闭提示"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">

      {/* ========================================================================= */}
      {/* 1. STUDENT VIEW (学生端: 班级作业 / 自主学习 / 答题历史) */}
      {/* ========================================================================= */}
      {activeView === 'student' && (
        <div className="space-y-6">

          {/* Student Banner Header Card */}
          {studentTab === 'selfstudy' ? (
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-emerald-700/40">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                  <span>📖 自主拓展学习</span>
                </div>
                <h1 className="text-3xl font-black font-serif bg-gradient-to-r from-emerald-200 via-teal-200 to-white bg-clip-text text-transparent">
                  古诗图文赏析与自由探索
                </h1>
                <p className="text-emerald-200/90 text-xs">
                  自主探索全量古诗词与试题资源，拼音诵读、诗人背景故事与互动答题练习。
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-teal-700/40">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 bg-teal-900/60 border border-teal-500/40 text-teal-200 px-3 py-1 rounded-full text-xs font-semibold">
                  <span>📝 班级作业</span>
                </div>
                <h1 className="text-3xl font-black font-serif bg-gradient-to-r from-teal-200 via-emerald-200 to-white bg-clip-text text-transparent">
                  班级作业与答题打卡
                </h1>
                <p className="text-teal-200/90 text-xs">
                  查看并完成教师发布的跨学科互动作业，实时掌握试题测试与答题打卡学情进度。
                </p>
              </div>
            </div>
          )}

          {/* Sub Navigation Bar for Student Assignments View */}
          {studentTab !== 'selfstudy' && (
            <div className="flex border-b border-slate-200 space-x-6">
              <div
                onClick={() => switchStudentTab('assignments')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  studentTab === 'assignments' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>📝 待办作业 ({assignments.filter(a => a.status === '待完成').length})</span>
                <span
                  role="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isRefreshingAssignments) return;
                    setIsRefreshingAssignments(true);
                    setTeacherMsg('⏳ 正在同步获取最新作业...');
                    try {
                      await loadStudentData();
                      setTeacherMsg('✅ 待办作业已成功刷新！');
                    } catch (err) {
                      setTeacherMsg('✕ 获取最新作业失败，请稍后重试');
                    } finally {
                      setIsRefreshingAssignments(false);
                    }
                  }}
                  title="刷新待办作业 (Fetch new assignment)"
                  className="p-1 text-xs hover:bg-teal-100/60 rounded-md text-slate-400 hover:text-teal-700 transition cursor-pointer flex items-center justify-center"
                >
                  <span className={`inline-block transition-transform duration-700 ${isRefreshingAssignments ? 'animate-spin' : ''}`}>
                    🔄
                  </span>
                </span>
              </div>
              <button
                onClick={() => switchStudentTab('history')}
                className={`pb-3 text-sm font-bold border-b-2 transition ${
                  studentTab === 'history' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                📊 作业历史 ({quizHistory.length})
              </button>
            </div>
          )}

          {/* STUDENT TAB 1: ASSIGNMENTS TO DO */}
          {studentTab === 'assignments' && (
            <StudentAssignmentsTab
              assignments={assignments}
              poems={poems}
              onStartAssignment={handleStartStudentAssignment}
            />
          )}

          {/* STUDENT TAB 2: QUIZ HISTORY */}
          {studentTab === 'history' && (
            <StudentQuizHistoryTab
              quizHistory={quizHistory}
              formatLocalTime={formatLocalTime}
              onSelectHistoryItem={setSelectedHistoryItem}
            />
          )}

          {/* STUDENT TAB 3: SELF-STUDY (Learnt Poems Extra Knowledge) */}
          {studentTab === 'selfstudy' && (
            <StudentSelfStudyTab
              poems={poems}
              learntPoemIds={learntPoemIds}
              selectedPoem={selectedPoem}
              onSelectPoem={setSelectedPoem}
            />
          )}

          {/* ACTIVE QUIZ MODAL FOR STUDENT */}
          {activeQuizPoem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setActiveQuizPoem(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
                <div className="text-center space-y-1">
                  <span className="px-2.5 py-1 bg-jade-100 text-jade-800 rounded-full text-xs font-bold">
                    采莲连句闯关 - 《{activeQuizPoem.title}》
                  </span>
                  <h3 className="text-xl font-bold font-serif text-ink">组合正确的诗句顺序</h3>
                </div>

                {!quizCompleted ? (
                  <div className="space-y-6">
                    {/* Selected Char Target Line */}
                    <div className="min-h-[60px] bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-4 flex flex-wrap gap-2 justify-center items-center">
                      {selectedWords.length === 0 ? (
                        <span className="text-xs text-amber-700 italic">点击下方汉字连成正确诗句</span>
                      ) : (
                        selectedWords.map((char, index) => (
                          <button
                            key={index}
                            onClick={() => handleRemoveChar(char, index)}
                            className="w-10 h-10 bg-amber-500 text-white font-bold rounded-lg shadow-sm text-lg hover:bg-amber-600 font-serif"
                          >
                            {char}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Scrambled Pool */}
                    <div className="flex flex-wrap gap-3 justify-center">
                      {scrambledWords.map((char, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectChar(char, index)}
                          className="w-12 h-12 bg-slate-100 hover:bg-jade-100 border border-slate-300 hover:border-jade-400 text-slate-800 font-serif font-bold rounded-xl text-xl shadow-xs transition"
                        >
                          {char}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={handleVerifyQuiz}
                        className="w-full py-3 bg-jade-600 hover:bg-jade-500 text-white font-bold rounded-xl text-sm shadow-md transition"
                      >
                        ✅ 提交验证答案
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <span className="text-5xl">🎉</span>
                    <h4 className="text-2xl font-bold font-serif text-jade-700">闯关成功！得分 +10</h4>
                    <p className="text-xs text-slate-600">你已成功完成《{activeQuizPoem.title}》诗句连线打卡！</p>
                    <button
                      onClick={() => setActiveQuizPoem(null)}
                      className="px-6 py-2.5 bg-jade-600 text-white font-bold rounded-xl text-xs"
                    >
                      完成并返回
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TEACHER VIEW (教师端: 班级列表 -> 作业发布 / 答题统计 / 进度解锁) */}
      {/* ========================================================================= */}
      {activeView === 'teacher' && (
        <div className="space-y-6">

          {/* Teacher Banner Header Card with integrated Class Selector */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-blue-700/40">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 bg-blue-900/60 border border-blue-500/40 text-blue-200 px-3 py-1 rounded-full text-xs font-semibold">
                <span>👩‍🏫 教师工作台 (Teacher Portal)</span>
              </div>
              <h1 className="text-3xl font-black font-serif bg-gradient-to-r from-blue-200 via-sky-200 to-white bg-clip-text text-transparent">
                班级教学与作业管理
              </h1>
              <p className="text-blue-200 text-xs">
                管理班级学生学情、发布古诗关卡作业、监控学生答题进度与打卡记录。
              </p>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-800/80 border border-blue-500/30 p-3 rounded-xl text-xs text-blue-200 flex-shrink-0">
              <label className="font-bold text-blue-200 whitespace-nowrap">当前班级:</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedClass(val);
                  const userId = user?.id || 'default';
                  localStorage.setItem(`zxt_selected_class_${userId}`, val);
                }}
                className="px-3 py-1.5 bg-slate-900 border border-blue-400/50 rounded-lg text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                {classes.map(c => {
                  const actualCount = allStudentsList.filter((s: any) => s.className === c.name).length;
                  return <option key={c.id} value={c.name}>{c.name} ({actualCount}人)</option>;
                })}
              </select>
            </div>
          </div>

          {/* Teacher Sub Navigation */}
          <div className="flex border-b border-slate-200 space-x-6">
            <button
              onClick={() => setTeacherTab('assignments')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${teacherTab === 'assignments' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              📌 作业发布
            </button>
            <button
              onClick={() => setTeacherTab('stats')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${teacherTab === 'stats' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              📊 作业统计
            </button>
            <button
              onClick={() => setTeacherTab('progress')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${teacherTab === 'progress' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              🧭 课程进度
            </button>
          </div>

          {/* TEACHER TAB 1: ASSIGNMENTS PUBLISHING */}
          {teacherTab === 'assignments' && (
            <TeacherAssignmentsPublishTab
              selectedClass={selectedClass}
              asgnSubject={asgnSubject}
              setAsgnSubject={setAsgnSubject}
              asgnSection={asgnSection}
              setAsgnSection={setAsgnSection}
              newAsgnReq={newAsgnReq}
              setNewAsgnReq={setNewAsgnReq}
              newAsgnPoemId={newAsgnPoemId}
              setNewAsgnPoemId={setNewAsgnPoemId}
              newAsgnDueDate={newAsgnDueDate}
              setNewAsgnDueDate={setNewAsgnDueDate}
              poems={poems}
              learntPoemIds={learntPoemIds}
              assignments={assignments}
              isAssignmentsLoading={isAssignmentsLoading}
              onPublishAssignment={handlePublishAssignment}
              onPreviewAssignment={handleStartStudentAssignment}
            />
          )}

          {/* TEACHER TAB 2: QUIZ STATS */}
          {teacherTab === 'stats' && (
            <TeacherStatsTab
              selectedClass={selectedClass}
              students={students}
            />
          )}

          {/* TEACHER TAB 3: LEARNING PROGRESS (Unlock self study) */}
          {teacherTab === 'progress' && (
            <TeacherCourseProgressTab
              selectedClass={selectedClass}
              poems={poems}
              learntPoemIds={learntPoemIds}
              animatingPoemId={animatingPoemId}
              onToggleLearnt={handleToggleLearnt}
            />
          )}

        </div>
      )}

      {/* Assignment Question Review & Selection Modal */}
      {publishingPoem && (
        <div className="fixed inset-0 !mt-0 !m-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPublishingPoem(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full border border-blue-200 mb-1">
                  <span>📌 教师发布前审题与挑题</span>
                </div>
                <h3 className="text-xl font-bold font-serif text-ink">
                  《{publishingPoem.title}》作业试题勾选
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  发布班级: <strong className="text-blue-600 font-bold">{selectedClass}</strong> | 截止时间: {newAsgnDueDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublishingPoem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
              {(() => {
                const totalCount = (publishingPoem.questions || []).length;
                const isAllSelected = totalCount > 0 && selectedQuestionIds.length === totalCount;
                const isIndeterminate = selectedQuestionIds.length > 0 && selectedQuestionIds.length < totalCount;

                return (
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={el => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestionIds((publishingPoem.questions || []).map(q => q.id));
                        } else {
                          setSelectedQuestionIds([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>
                      已勾选 <span className="text-blue-600 text-sm font-black">{selectedQuestionIds.length}</span> / {totalCount} 道题目
                    </span>
                  </label>
                );
              })()}
            </div>

            {/* Questions List with Checkboxes */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(publishingPoem.questions || []).map((q, idx) => {
                const isChecked = selectedQuestionIds.includes(q.id);
                const typeLabels: Record<string, string> = {
                  LineAssembly: '连句组装',
                  VerseCloze: '诗句填空',
                  PinyinMatch: '拼音辨析',
                  TextToCn: '诗意理解',
                  CulturalContext: '文化背景',
                  ImageOrdering: '插图排序',
                  ImageToLine: '图配句',
                };
                const typeColors: Record<string, string> = {
                  LineAssembly: 'bg-violet-100 text-violet-800 border-violet-200',
                  VerseCloze: 'bg-teal-100 text-teal-800 border-teal-200',
                  PinyinMatch: 'bg-sky-100 text-sky-800 border-sky-200',
                  TextToCn: 'bg-amber-100 text-amber-800 border-amber-200',
                  CulturalContext: 'bg-rose-100 text-rose-800 border-rose-200',
                  ImageOrdering: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                  ImageToLine: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                };

                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== q.id));
                      } else {
                        setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 group ${isChecked
                      ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-80'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => { }}
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${typeColors[q.type] || 'bg-slate-100 text-slate-700'}`}>
                            {typeLabels[q.type] || q.type}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewStartIndex(idx);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition opacity-80 group-hover:opacity-100 flex items-center gap-0.5"
                          title="测试此题学生界面"
                        >
                          👁 试做
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-800 font-serif leading-relaxed">
                        {q.prompt || '(全自动互动拼图/排序关联题)'}
                      </p>
                      {(q as any).image && (
                        <div className="my-1.5">
                          <CachedImage src={(q as any).image} alt="题目图片" className="max-h-24 rounded-lg border border-slate-200 object-cover" />
                        </div>
                      )}
                      {q.type === 'ImageOrdering' && Array.isArray((q as any).images) && (q as any).images.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 my-1.5">
                          {(q as any).images.map((img: string, iIdx: number) => (
                            <CachedImage key={iIdx} src={img} alt={`插图-${iIdx + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-2xs" />
                          ))}
                        </div>
                      )}
                      {(q as any).options && Array.isArray((q as any).options) && (q as any).options.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {(q as any).options.slice(0, 4).map((opt: string, oIdx: number) => (
                            <span
                              key={oIdx}
                              className={`text-[10px] px-2 py-0.5 rounded ${(q as any).answer === oIdx
                                ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                                : 'bg-white text-slate-600 border border-slate-200'
                                }`}
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPublishingPoem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedQuestionIds.length === 0) {
                    alert('请至少勾选 1 道题目后再预览！');
                    return;
                  }
                  setPreviewStartIndex(0);
                }}
                disabled={selectedQuestionIds.length === 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                👁 预览 ({selectedQuestionIds.length} 道精选题目)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Teacher Publish Success Modal */}
      {publishSuccessData && (
        <div className="fixed inset-0 !mt-0 !m-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPublishSuccessData(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              🎉
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-serif text-slate-800">
                作业发布成功！
              </h3>
              <p className="text-xs text-slate-500">
                班级【<span className="font-bold text-blue-600">{publishSuccessData.className}</span>】的学生现已可在学生端进行答题打卡。
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left text-xs space-y-2 font-medium">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">发布古诗篇目</span>
                <span className="font-bold text-slate-800 font-serif text-sm">《{publishSuccessData.poemTitle}》</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">精选试题数量</span>
                <span className="font-bold text-emerald-600">{publishSuccessData.questionCount} 道题</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">截止打卡时间</span>
                <span className="font-bold text-blue-600">{publishSuccessData.dueDate}</span>
              </div>
              {publishSuccessData.requirement && (
                <div className="pt-1 text-slate-600 border-t border-slate-200/60">
                  <span className="text-slate-400 block text-[10px]">作业要求:</span>
                  <p className="font-sans leading-relaxed">{publishSuccessData.requirement}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPublishSuccessData(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              完成并返回作业列表
            </button>
          </div>
        </div>
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
            if (res && res.completed && quizInfo.assignmentId) {
              const finalScore = res.score !== undefined ? res.score : 100;
              (async () => {
                try {
                  await apiService.markAssignmentCompleted(quizInfo.assignmentId!, finalScore);
                  const pb = await apiService.recordQuizResult(user?.id || 'usr_stu_001', {
                    poemTitle: quizInfo.poemTitle,
                    poemId: poems.find(p => p.title === quizInfo.poemTitle)?.id || 1,
                    score: finalScore,
                    accuracy: `${finalScore}%`,
                    quizType: '班级作业闯关',
                    details: res.details || [],
                    assignmentId: quizInfo.assignmentId
                  });
                  if (pb) {
                    setPointAwardModal(pb);
                  }
                  await loadStudentData();
                } catch (err) {
                  console.error('Failed to submit assignment completion:', err);
                }
              })();
            }
          }}
        />
      )}

      {/* Interactive Teacher Question Preview Modal */}
      {previewStartIndex !== null && publishingPoem && (
        <StudentQuizPreviewModal
          poemTitle={publishingPoem.title}
          questions={(publishingPoem.questions || []).filter(q => selectedQuestionIds.includes(q.id))}
          initialIndex={Math.max(0, (publishingPoem.questions || []).filter(q => selectedQuestionIds.includes(q.id)).findIndex(q => q.id === publishingPoem.questions?.[previewStartIndex]?.id))}
          selectedQuestionIds={selectedQuestionIds}
          onToggleSelectQuestion={(qId) => {
            setSelectedQuestionIds(prev =>
              prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
            );
          }}
          onConfirmPublish={confirmPublishAssignment}
          onClose={() => setPreviewStartIndex(null)}
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
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm rounded-xl shadow-md transition"
            >
              太棒了 (Awesome!)
            </button>
          </div>
        </div>
      )}

      {/* Sync Error Modal */}
      {syncErrorModal && (
        <div className="fixed inset-0 !mt-0 !m-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSyncErrorModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-md w-full p-6 space-y-4 text-xs" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 text-red-600 font-bold text-base border-b border-slate-100 pb-3">
              <span className="text-xl">⚠️</span>
              <h3>{syncErrorModal.title}</h3>
            </div>
            <p className="text-slate-700 leading-relaxed font-sans">{syncErrorModal.message}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSyncErrorModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition"
              >
                我知道了 (Close)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
};

export default BaiLianGe;
