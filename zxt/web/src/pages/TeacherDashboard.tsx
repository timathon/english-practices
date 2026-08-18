import React, { useState, useEffect } from 'react';
import { apiService, Poem, PoemQuestion, IdiomQuestion } from '../services/api';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { StudentQuizPreviewModal } from '../components/StudentQuizPreviewModal';
import { CachedImage } from '../components/CachedImage';
import { TeacherAssignmentsPublishTab } from '../components/bailiange/TeacherAssignmentsPublishTab';
import { TeacherStatsTab } from '../components/bailiange/TeacherStatsTab';
import { TeacherCourseProgressTab } from '../components/bailiange/TeacherCourseProgressTab';

interface PublishingItem {
  id: number;
  title: string;
  questions?: (PoemQuestion | IdiomQuestion)[];
  isIdiom?: boolean;
}

interface TeacherDashboardProps {
  user: any;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  // Helper to initialize cached selected class
  const getInitialSelectedClass = () => {
    const userId = user?.id || 'default';
    const userClass = user?.className || '三年级A班';
    const cached = localStorage.getItem(`zxt_selected_class_${userId}`);
    return cached || userClass;
  };

  const [classes, setClasses] = useState<any[]>(() => apiService.getClassesSync());
  const [selectedClass, setSelectedClass] = useState<string>(getInitialSelectedClass);
  const [allStudentsList, setAllStudentsList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [poems, setPoems] = useState<Poem[]>(() => apiService.getQuizLibrary());
  const [learntPoemIds, setLearntPoemIds] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [teacherTab, setTeacherTab] = useState<'assignments' | 'stats' | 'progress'>('assignments');
  const [teacherMsg, setTeacherMsg] = useState<string>('');

  // Helper to format datetime-local string (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to get default start datetime (+1 hour)
  const getDefaultStartDateTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return formatDateTimeLocal(d);
  };

  // Helper to get default due datetime (tomorrow 23:59)
  const getDefaultDueDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    return formatDateTimeLocal(d);
  };

  // Assignment form state
  const [newAsgnPoemId, setNewAsgnPoemId] = useState<number>(1);
  const [newAsgnIdiomGroupId, setNewAsgnIdiomGroupId] = useState<number>(1);
  const [isImmediateStart, setIsImmediateStart] = useState<boolean>(false);
  const [newAsgnStartDate, setNewAsgnStartDate] = useState<string>(getDefaultStartDateTime);
  const [newAsgnDueDate, setNewAsgnDueDate] = useState<string>(getDefaultDueDateTime);
  const [newAsgnReq, setNewAsgnReq] = useState<string>('请认真完成本单元练习，注意书写与拼音。');
  const [asgnSubject, setAsgnSubject] = useState<string>('语文');
  const [asgnSection, setAsgnSection] = useState<string>('古诗');

  // Assignment Question Review Modal state
  const [publishingPoem, setPublishingPoem] = useState<PublishingItem | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [previewStartIndex, setPreviewStartIndex] = useState<number | null>(null);
  const [modalQuestionFilter, setModalQuestionFilter] = useState<string>('all');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);

  // Publish success & sync error modal state
  const [publishSuccessData, setPublishSuccessData] = useState<{
    className: string;
    poemTitle: string;
    questionCount: number;
    dueDate: string;
    requirement: string;
  } | null>(null);
  const [syncErrorModal, setSyncErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [animatingPoemId, setAnimatingPoemId] = useState<number | null>(null);
  const [previewAssignmentData, setPreviewAssignmentData] = useState<{
    title: string;
    questions: (PoemQuestion | IdiomQuestion)[];
  } | null>(null);

  useLockBodyScroll(publishingPoem !== null || showScheduleModal || publishSuccessData !== null || syncErrorModal !== null || previewAssignmentData !== null);

  useEffect(() => {
    loadPoems();
    loadRosters();
  }, []);

  useEffect(() => {
    loadTeacherData();
  }, [selectedClass, user]);

  useEffect(() => {
    const unlocked = poems.filter(p => learntPoemIds.map(Number).includes(Number(p.id)));
    if (unlocked.length > 0) {
      setNewAsgnPoemId(Number(unlocked[unlocked.length - 1].id));
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

  const loadPoems = async () => {
    const data = await apiService.getPoems();
    setPoems(data);
  };

  const loadRosters = async () => {
    const cachedClasses = apiService.getClassesSync();
    if (cachedClasses && cachedClasses.length > 0) {
      if (user && user.role === 'teacher') {
        const myClasses = cachedClasses.filter((c: any) =>
          c.teacherId === user.id ||
          c.name === user.className ||
          (c.teacherName && c.teacherName.includes(user.name?.split(' ')[0]))
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

    try {
      const allCls = await apiService.getClasses();
      const allStus = await apiService.getStudents();
      setAllStudentsList(allStus);

      if (user && user.role === 'teacher') {
        const myClasses = allCls.filter((c: any) =>
          c.teacherId === user.id ||
          c.name === user.className ||
          (c.teacherName && c.teacherName.includes(user.name?.split(' ')[0]))
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

  const handlePublishAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (asgnSubject === '语文' && (asgnSection === '成语' || asgnSection.includes('成语'))) {
      const idiomGroups = await apiService.getIdiomGroups();
      const group = idiomGroups.find(g => g.id === Number(newAsgnIdiomGroupId)) || idiomGroups[0];
      if (!group) {
        alert('未找到选中的成语组题库！');
        return;
      }
      const allQs = group.questions || [];
      setPublishingPoem({ id: group.id, title: group.title, questions: allQs, isIdiom: true } as any);
      setSelectedQuestionIds(allQs.map(q => q.id));
      setModalQuestionFilter('all');
      return;
    }
    const poem = poems.find(p => p.id === Number(newAsgnPoemId));
    if (!poem) return;
    const allQs = poem.questions || [];
    setPublishingPoem(poem);
    setSelectedQuestionIds(allQs.map(q => q.id));
    setModalQuestionFilter('all');
  };

  const confirmPublishAssignment = () => {
    if (!publishingPoem) return;
    if (selectedQuestionIds.length === 0) {
      alert('请至少勾选 1 道题目后再发布作业！');
      return;
    }
    setPreviewStartIndex(null);
    setShowScheduleModal(true);
  };

  const handleFinalPublishAssignment = async () => {
    if (!publishingPoem) return;
    if (selectedQuestionIds.length === 0) {
      alert('请至少勾选 1 道题目后再发布作业！');
      return;
    }
    await apiService.createAssignment({
      className: selectedClass,
      poemId: publishingPoem.id,
      poemTitle: publishingPoem.title,
      startDate: newAsgnStartDate,
      dueDate: newAsgnDueDate,
      requirement: newAsgnReq,
      questionIds: selectedQuestionIds,
      createdTeacherId: user?.id || 'usr_tea_001',
    });

    const successInfo = {
      className: selectedClass,
      poemTitle: publishingPoem.title,
      questionCount: selectedQuestionIds.length,
      startDate: newAsgnStartDate,
      dueDate: newAsgnDueDate,
      requirement: newAsgnReq,
    };

    setTeacherMsg(`成功向【${selectedClass}】发布《${publishingPoem.title}》作业（已精选 ${selectedQuestionIds.length} 道题目）！`);
    setShowScheduleModal(false);
    setPublishingPoem(null);
    setPublishSuccessData(successInfo);
    await loadTeacherData();
  };

  const handleToggleLearnt = async (poemId: number) => {
    const numId = Number(poemId);
    setAnimatingPoemId(numId);
    setTimeout(() => setAnimatingPoemId(null), 600);

    const prevLearnt = [...learntPoemIds];
    const isCurrentlyLearnt = prevLearnt.map(Number).includes(numId);

    const updated = isCurrentlyLearnt
      ? prevLearnt.filter(id => Number(id) !== numId)
      : [...prevLearnt, numId];

    setLearntPoemIds(updated);
    localStorage.setItem(`zxt_learnt_${selectedClass}`, JSON.stringify(updated));
    setTeacherMsg(`已更新【${selectedClass}】古诗解锁状态...`);

    try {
      await apiService.saveLearntPoemIdsToDB(selectedClass, updated, 30000);
      setTeacherMsg(`已成功同步【${selectedClass}】古诗解锁状态至数据库！`);
    } catch (err: any) {
      console.error('Failed to sync learnt status to DB:', err);
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

  return (
    <>
      {/* Floating HUD Toast Overlay */}
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

      {/* Main Container Wrapper */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 py-8">
        
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
            className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              teacherTab === 'assignments' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📌 作业发布
          </button>
          <button
            onClick={() => setTeacherTab('stats')}
            className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              teacherTab === 'stats' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📊 作业统计
          </button>
          <button
            onClick={() => setTeacherTab('progress')}
            className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer ${
              teacherTab === 'progress' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
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
            newAsgnIdiomGroupId={newAsgnIdiomGroupId}
            setNewAsgnIdiomGroupId={setNewAsgnIdiomGroupId}
            newAsgnDueDate={newAsgnDueDate}
            setNewAsgnDueDate={setNewAsgnDueDate}
            poems={poems}
            learntPoemIds={learntPoemIds}
            assignments={assignments}
            isAssignmentsLoading={isAssignmentsLoading}
            onPublishAssignment={handlePublishAssignment}
            onPreviewAssignment={(asgn) => {
              // 1. Check if it's an idiom group
              const idiomGroups = apiService.getLocalIdiomGroups();
              const idiomGroup = idiomGroups.find(g =>
                g.title === asgn.poemTitle ||
                g.id === Number(asgn.poemId) ||
                (Number(asgn.poemId) >= 10000 && g.id === Number(asgn.poemId) - 10000) ||
                `成语接龙第${g.id}组` === asgn.poemTitle ||
                asgn.poemTitle?.includes(`第${g.id}组`)
              );

              if (idiomGroup && idiomGroup.questions) {
                const allQs = idiomGroup.questions || [];
                const asgnQs = (asgn.questionIds && asgn.questionIds.length > 0)
                  ? allQs.filter((q: any) => asgn.questionIds.includes(q.id))
                  : allQs;
                setPreviewAssignmentData({
                  title: idiomGroup.title,
                  questions: asgnQs.length > 0 ? asgnQs : allQs,
                });
                return;
              }

              // 2. Check if it's a poem
              const poem = poems.find(p => p.id === Number(asgn.poemId) || p.title === asgn.poemTitle) || poems[0];
              const allQs = poem?.questions || [];
              const asgnQs = (asgn.questionIds && asgn.questionIds.length > 0)
                ? allQs.filter(q => asgn.questionIds.includes(q.id))
                : allQs;
              setPreviewAssignmentData({
                title: poem?.title || asgn.poemTitle,
                questions: asgnQs.length > 0 ? asgnQs : allQs,
              });
            }}
          />
        )}

        {/* TEACHER TAB 2: QUIZ STATS */}
        {teacherTab === 'stats' && (
          <TeacherStatsTab
            selectedClass={selectedClass}
            students={students}
          />
        )}

        {/* TEACHER TAB 3: LEARNING PROGRESS */}
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

      {/* Assignment Question Review & Selection Modal */}
      {publishingPoem && (
        <div className="fixed inset-0 !mt-0 !m-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPublishingPoem(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 space-y-4 h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

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
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selection Toolbar & Filter Tabs */}
            {(() => {
              const allQuestions = publishingPoem.questions || [];
              const totalCount = allQuestions.length;
              const typeLabels: Record<string, string> = {
                LineAssembly: '连句组装',
                VerseCloze: '诗句填空',
                PinyinMatch: '拼音辨析',
                TextToCn: '诗意理解',
                CulturalContext: '文化背景',
                ImageOrdering: '插图排序',
                ImageToLine: '图配句',
                IdiomAssembly: '成语还原',
                ChainAssembly: '接龙还原',
                IdiomSolitaire: '首尾接龙',
                IdiomCloze: '成语填空',
                HomophoneMatch: '字音字形',
                IdiomMeaning: '成语释义',
                StoryComprehension: '故事问答',
                ImageToIdiom: '看图识成语',
                EmotionMatch: '情感归类',
              };

              const typeColors: Record<string, { active: string; inactive: string; countActive: string; countInactive: string }> = {
                LineAssembly: {
                  active: 'bg-violet-600 text-white shadow-xs border border-violet-700',
                  inactive: 'bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-violet-200/70 text-violet-900',
                },
                VerseCloze: {
                  active: 'bg-teal-600 text-white shadow-xs border border-teal-700',
                  inactive: 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-teal-200/70 text-teal-900',
                },
                PinyinMatch: {
                  active: 'bg-sky-600 text-white shadow-xs border border-sky-700',
                  inactive: 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-sky-200/70 text-sky-900',
                },
                TextToCn: {
                  active: 'bg-amber-600 text-white shadow-xs border border-amber-700',
                  inactive: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-amber-200/70 text-amber-900',
                },
                CulturalContext: {
                  active: 'bg-rose-600 text-white shadow-xs border border-rose-700',
                  inactive: 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-rose-200/70 text-rose-900',
                },
                ImageOrdering: {
                  active: 'bg-indigo-600 text-white shadow-xs border border-indigo-700',
                  inactive: 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-indigo-200/70 text-indigo-900',
                },
                ImageToLine: {
                  active: 'bg-emerald-600 text-white shadow-xs border border-emerald-700',
                  inactive: 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-emerald-200/70 text-emerald-900',
                },
                IdiomAssembly: {
                  active: 'bg-emerald-600 text-white shadow-xs border border-emerald-700',
                  inactive: 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-emerald-200/70 text-emerald-900',
                },
                ChainAssembly: {
                  active: 'bg-amber-600 text-white shadow-xs border border-amber-700',
                  inactive: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-amber-200/70 text-amber-900',
                },
                IdiomSolitaire: {
                  active: 'bg-indigo-600 text-white shadow-xs border border-indigo-700',
                  inactive: 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-indigo-200/70 text-indigo-900',
                },
                IdiomCloze: {
                  active: 'bg-teal-600 text-white shadow-xs border border-teal-700',
                  inactive: 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-teal-200/70 text-teal-900',
                },
                HomophoneMatch: {
                  active: 'bg-sky-600 text-white shadow-xs border border-sky-700',
                  inactive: 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-sky-200/70 text-sky-900',
                },
                IdiomMeaning: {
                  active: 'bg-amber-600 text-white shadow-xs border border-amber-700',
                  inactive: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-amber-200/70 text-amber-900',
                },
                StoryComprehension: {
                  active: 'bg-purple-600 text-white shadow-xs border border-purple-700',
                  inactive: 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-purple-200/70 text-purple-900',
                },
                ImageToIdiom: {
                  active: 'bg-teal-600 text-white shadow-xs border border-teal-700',
                  inactive: 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-teal-200/70 text-teal-900',
                },
                EmotionMatch: {
                  active: 'bg-rose-600 text-white shadow-xs border border-rose-700',
                  inactive: 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100',
                  countActive: 'bg-white/20 text-white',
                  countInactive: 'bg-rose-200/70 text-rose-900',
                },
              };

              const presentTypes = Array.from(new Set(allQuestions.map(q => q.type)));
              const isAllSelected = totalCount > 0 && selectedQuestionIds.length === totalCount;
              const isIndeterminate = selectedQuestionIds.length > 0 && selectedQuestionIds.length < totalCount;

              return (
                <>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestionIds(allQuestions.map(q => q.id));
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
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setModalQuestionFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                        modalQuestionFilter === 'all'
                          ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <span>全部</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${modalQuestionFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {totalCount}
                      </span>
                    </button>

                    {presentTypes.map(t => {
                      const count = allQuestions.filter(q => q.type === t).length;
                      const isSelected = modalQuestionFilter === t;
                      const style = typeColors[t] || {
                        active: 'bg-blue-600 text-white border-blue-700 shadow-xs',
                        inactive: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
                        countActive: 'bg-white/20 text-white',
                        countInactive: 'bg-slate-200 text-slate-600'
                      };

                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setModalQuestionFilter(t)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isSelected ? style.active : style.inactive
                          }`}
                        >
                          <span>{typeLabels[t] || t}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? style.countActive : style.countInactive}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const allQuestions = publishingPoem.questions || [];
                const filteredQuestions = modalQuestionFilter === 'all'
                  ? allQuestions
                  : allQuestions.filter(q => q.type === modalQuestionFilter);

                const typeLabels: Record<string, string> = {
                  LineAssembly: '连句组装',
                  VerseCloze: '诗句填空',
                  PinyinMatch: '拼音辨析',
                  TextToCn: '诗意理解',
                  CulturalContext: '文化背景',
                  ImageOrdering: '插图排序',
                  ImageToLine: '图配句',
                  IdiomAssembly: '成语还原',
                  ChainAssembly: '接龙还原',
                  IdiomSolitaire: '首尾接龙',
                  IdiomCloze: '成语填空',
                  HomophoneMatch: '字音字形',
                  IdiomMeaning: '成语释义',
                  StoryComprehension: '故事问答',
                  ImageToIdiom: '看图识成语',
                  EmotionMatch: '情感归类',
                };
                const typeColors: Record<string, string> = {
                  LineAssembly: 'bg-violet-50 text-violet-800 border-violet-200',
                  VerseCloze: 'bg-teal-50 text-teal-800 border-teal-200',
                  PinyinMatch: 'bg-sky-50 text-sky-800 border-sky-200',
                  TextToCn: 'bg-amber-50 text-amber-800 border-amber-200',
                  CulturalContext: 'bg-rose-50 text-rose-800 border-rose-200',
                  ImageOrdering: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                  ImageToLine: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  IdiomAssembly: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  ChainAssembly: 'bg-amber-50 text-amber-800 border-amber-200',
                  IdiomSolitaire: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                  IdiomCloze: 'bg-teal-50 text-teal-800 border-teal-200',
                  HomophoneMatch: 'bg-sky-50 text-sky-800 border-sky-200',
                  IdiomMeaning: 'bg-amber-50 text-amber-800 border-amber-200',
                  StoryComprehension: 'bg-purple-50 text-purple-800 border-purple-200',
                  ImageToIdiom: 'bg-teal-50 text-teal-800 border-teal-200',
                  EmotionMatch: 'bg-rose-50 text-rose-800 border-rose-200',
                };

                return filteredQuestions.map((q) => {
                  const globalIdx = allQuestions.findIndex(item => item.id === q.id);
                  const isChecked = selectedQuestionIds.includes(q.id);

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
                            <span className="text-[10px] font-mono text-slate-400 font-bold">#{globalIdx + 1}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${typeColors[q.type] || 'bg-slate-100 text-slate-700'}`}>
                              {typeLabels[q.type] || q.type}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewStartIndex(globalIdx);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition opacity-80 group-hover:opacity-100 flex items-center gap-0.5 cursor-pointer"
                            title="测试此题学生界面"
                          >
                            👁 试做
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-800 font-serif leading-relaxed">
                          {(q as any).type === 'IdiomAssembly' ? `成语还原：“${(q as any).answer}”` : (q.prompt || '(全自动互动拼图/排序关联题)')}
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
                });
              })()}
            </div>

            {/* Modal Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPublishingPoem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
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
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                👁 预览题目并发布 ({selectedQuestionIds.length} 题) →
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Schedule Due Date Confirmation Modal */}
      {showScheduleModal && publishingPoem && (
        <div className="fixed inset-0 !mt-0 !m-0 z-[115] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h3 className="text-base font-bold font-serif text-slate-800">
                  设定作业开始与截止时间
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">发布班级:</span>
                <span className="font-bold text-blue-600">{selectedClass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">作业内容:</span>
                <span className="font-bold text-slate-800">《{publishingPoem.title}》</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">已选题目:</span>
                <span className="font-bold text-emerald-600">{selectedQuestionIds.length} 道精选题目</span>
              </div>
            </div>

            {/* Start Date & Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-slate-700">开始时间 (Start Time)</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-emerald-700 select-none bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <input
                    type="checkbox"
                    checked={isImmediateStart}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsImmediateStart(checked);
                      if (checked) {
                        const d = new Date();
                        d.setMinutes(d.getMinutes() + 5);
                        setNewAsgnStartDate(formatDateTimeLocal(d));
                      } else {
                        const d = new Date();
                        d.setHours(d.getHours() + 1);
                        setNewAsgnStartDate(formatDateTimeLocal(d));
                      }
                    }}
                    className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer"
                  />
                  <span>立即开始 (5分钟后生效)</span>
                </label>
              </div>

              <input
                type="datetime-local"
                disabled={isImmediateStart}
                value={newAsgnStartDate}
                onChange={(e) => setNewAsgnStartDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl font-bold text-xs text-slate-800 outline-none transition ${
                  isImmediateStart
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer'
                }`}
              />
              <p className="text-[10px] text-slate-400">
                {isImmediateStart ? '💡 学生端将在发布 5 分钟后正式开放答题' : '💡 未到开始时间前，学生端可浏览但无法进入答题'}
              </p>
            </div>

            {/* End Date & Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-slate-700">截止时间 (Due Time)</label>
                <span className="text-[10px] text-slate-400">逾期仍可补交（无准时打卡奖励）</span>
              </div>
              <input
                type="datetime-local"
                value={newAsgnDueDate}
                onChange={(e) => setNewAsgnDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-700 mb-1">作业要求说明</label>
              <textarea
                value={newAsgnReq}
                onChange={(e) => setNewAsgnReq(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                ← 返回挑题
              </button>
              <button
                type="button"
                onClick={handleFinalPublishAssignment}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                🚀 确认发布作业
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              完成并返回作业列表
            </button>
          </div>
        </div>
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

      {/* Direct Assignment Preview Modal for Published Assignments */}
      {previewAssignmentData && (
        <StudentQuizPreviewModal
          poemTitle={previewAssignmentData.title}
          questions={previewAssignmentData.questions}
          initialIndex={0}
          onClose={() => setPreviewAssignmentData(null)}
        />
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
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                我知道了 (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherDashboard;
