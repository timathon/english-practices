import React, { useState, useEffect } from 'react';
import { apiService, Poem, PoemQuestion, IdiomQuestion } from '../services/api';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { StudentQuizPreviewModal } from '../components/StudentQuizPreviewModal';
import { TeacherAssignmentsPublishTab } from '../components/bailiange/TeacherAssignmentsPublishTab';
import { TeacherStatsTab } from '../components/bailiange/TeacherStatsTab';
import { TeacherCourseProgressTab } from '../components/bailiange/TeacherCourseProgressTab';
import { TeacherQuestionReviewModal, PublishingItem } from '../components/bailiange/TeacherQuestionReviewModal';
import { TeacherScheduleModal } from '../components/bailiange/TeacherScheduleModal';
import { TeacherPublishSuccessModal, PublishSuccessData } from '../components/bailiange/TeacherPublishSuccessModal';

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
  const [publishSuccessData, setPublishSuccessData] = useState<PublishSuccessData | null>(null);
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

    const handlePoemsUpdated = (e: any) => {
      if (e?.detail?.poems && Array.isArray(e.detail.poems)) {
        setPoems(e.detail.poems);
      } else {
        loadPoems();
      }
    };

    window.addEventListener('zxt_poems_updated', handlePoemsUpdated);
    window.addEventListener('zxt_idioms_updated', loadTeacherData);

    return () => {
      window.removeEventListener('zxt_poems_updated', handlePoemsUpdated);
      window.removeEventListener('zxt_idioms_updated', loadTeacherData);
    };
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

    // 🚀 Instant Cross-Tab & Cross-Window Broadcast
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('zxt_sync_channel');
        bc.postMessage({
          type: 'ZXT_LEARNT_UPDATED',
          className: selectedClass,
          learntPoemIds: updated,
          poemId: numId,
          isLearnt: !isCurrentlyLearnt,
        });
        bc.close();
      }
      window.dispatchEvent(new CustomEvent('zxt_learnt_updated', {
        detail: { className: selectedClass, learntPoemIds: updated, poemId: numId }
      }));
    } catch (_) {}

    try {
      await apiService.saveLearntPoemIdsToDB(selectedClass, updated, 30000);
      setTeacherMsg(`已成功同步【${selectedClass}】古诗解锁状态至数据库！`);
    } catch (err: any) {
      console.error('Failed to sync learnt status to DB:', err);
      setLearntPoemIds(prevLearnt);
      localStorage.setItem(`zxt_learnt_${selectedClass}`, JSON.stringify(prevLearnt));
      setTeacherMsg(`⚠️ 解锁状态同步失败，已还原修改。`);

      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('zxt_sync_channel');
          bc.postMessage({
            type: 'ZXT_LEARNT_UPDATED',
            className: selectedClass,
            learntPoemIds: prevLearnt,
            poemId: numId,
            isLearnt: isCurrentlyLearnt,
          });
          bc.close();
        }
      } catch (_) {}

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
        <TeacherQuestionReviewModal
          publishingPoem={publishingPoem}
          selectedClass={selectedClass}
          newAsgnDueDate={newAsgnDueDate}
          selectedQuestionIds={selectedQuestionIds}
          modalQuestionFilter={modalQuestionFilter}
          onSetSelectedQuestionIds={setSelectedQuestionIds}
          onSetModalQuestionFilter={setModalQuestionFilter}
          onPreviewQuestion={(idx) => setPreviewStartIndex(idx)}
          onConfirmPublish={confirmPublishAssignment}
          onClose={() => setPublishingPoem(null)}
        />
      )}

      {/* Schedule Due Date Confirmation Modal */}
      {showScheduleModal && publishingPoem && (
        <TeacherScheduleModal
          selectedClass={selectedClass}
          publishingPoem={publishingPoem}
          selectedQuestionCount={selectedQuestionIds.length}
          isImmediateStart={isImmediateStart}
          newAsgnStartDate={newAsgnStartDate}
          newAsgnDueDate={newAsgnDueDate}
          newAsgnReq={newAsgnReq}
          onSetIsImmediateStart={setIsImmediateStart}
          onSetNewAsgnStartDate={setNewAsgnStartDate}
          onSetNewAsgnDueDate={setNewAsgnDueDate}
          onSetNewAsgnReq={setNewAsgnReq}
          onClose={() => setShowScheduleModal(false)}
          onConfirmPublish={handleFinalPublishAssignment}
        />
      )}

      {/* Teacher Publish Success Modal */}
      {publishSuccessData && (
        <TeacherPublishSuccessModal
          data={publishSuccessData}
          onClose={() => setPublishSuccessData(null)}
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
