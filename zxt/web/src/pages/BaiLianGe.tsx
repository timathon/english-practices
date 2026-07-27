import React, { useState, useEffect } from 'react';
import { apiService, Poem, PoemQuestion } from '../services/api';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface BaiLianGeProps {
  activeView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin';
  user: any;
}

export const BaiLianGe: React.FC<BaiLianGeProps> = ({ activeView, user }) => {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  
  // Navigation tabs state
  const [studentTab, setStudentTab] = useState<'assignments' | 'history' | 'selfstudy'>('assignments');
  const [teacherTab, setTeacherTab] = useState<'assignments' | 'stats' | 'progress'>('assignments');
  const [adminTab, setAdminTab] = useState<'teachers' | 'students' | 'classes'>('teachers');
  const [showPinyin, setShowPinyin] = useState(true);

  // Student state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [learntPoemIds, setLearntPoemIds] = useState<number[]>([]);
  const [activeQuizPoem, setActiveQuizPoem] = useState<Poem | null>(null);

  useLockBodyScroll(Boolean(activeQuizPoem));
  
  // Quiz runner state
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [scrambledWords, setScrambledWords] = useState<string[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Teacher state
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('三年级A班');
  const [students, setStudents] = useState<any[]>([]);
  const [newAsgnPoemId, setNewAsgnPoemId] = useState<number>(1);
  const [newAsgnDueDate, setNewAsgnDueDate] = useState<string>('2026-08-01');
  const [newAsgnReq, setNewAsgnReq] = useState<string>('完成诗句连线与古诗背诵打卡');
  const [asgnSubject, setAsgnSubject] = useState<string>('语文');
  const [asgnSection, setAsgnSection] = useState<string>('白莲阁');
  const [teacherMsg, setTeacherMsg] = useState<string>('');

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
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const tch = teachersList.find(t => t.name === newClassTeacher);
    const updated = apiService.addClass(newClassName.trim(), tch?.id, tch?.name);
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

  const loadPoems = async () => {
    const data = await apiService.getPoems();
    setPoems(data);
    if (data.length > 0) {
      setSelectedPoem(data[0]);
      setEditingPoem(data[0]);
    }
  };

  const loadRosters = () => {
    const allCls = apiService.getClasses();
    setTeachersList(apiService.getTeachers());
    setAllStudentsList(apiService.getStudents());

    if (user && user.role === 'teacher') {
      const myClasses = allCls.filter((c: any) =>
        c.teacherId === user.id ||
        c.name === user.className ||
        (c.teacherName && c.teacherName.includes(user.name.split(' ')[0]))
      );
      const finalClasses = myClasses.length > 0 ? myClasses : allCls.filter((c: any) => c.name === user.className);
      const activeClasses = finalClasses.length > 0 ? finalClasses : (allCls.length > 0 ? [allCls[0]] : []);
      setClasses(activeClasses);
      if (activeClasses.length > 0) {
        setSelectedClass(activeClasses[0].name);
      }
    } else {
      setClasses(allCls);
    }
  };

  const loadStudentData = () => {
    const studentClassName = user?.className || '三年级A班';
    setAssignments(apiService.getAssignments(studentClassName));
    setQuizHistory(apiService.getQuizHistory(user?.id || 'usr_stu_001'));
    setLearntPoemIds(apiService.getLearntPoemIds(studentClassName));
  };

  const loadTeacherData = () => {
    setStudents(apiService.getStudents(selectedClass));
    setLearntPoemIds(apiService.getLearntPoemIds(selectedClass));
  };

  // --- QUIZ ENGINE FUNCTIONS ---
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
      alert(`差一点点哦！正确顺序是："${targetLine}"`);
    }
  };

  // --- TEACHER ACTIONS ---
  const handlePublishAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const poem = poems.find(p => p.id === Number(newAsgnPoemId));
    if (!poem) return;
    apiService.createAssignment({
      className: selectedClass,
      poemId: poem.id,
      poemTitle: poem.title,
      dueDate: newAsgnDueDate,
      requirement: newAsgnReq
    });
    setTeacherMsg(`成功向【${selectedClass}】发布《${poem.title}》作业！`);
    loadStudentData();
  };

  const handleToggleLearnt = (poemId: number) => {
    const updated = apiService.togglePoemLearntStatus(selectedClass, poemId);
    setLearntPoemIds(updated);
    setTeacherMsg(`已更新【${selectedClass}】诗词解锁进度！`);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
      
      {/* Module Header Banner */}
      {activeView !== 'teacher' && (
        <div className="bg-gradient-to-r from-emerald-900 via-jade-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-jade-700/50">
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center space-x-2 bg-emerald-800/80 border border-emerald-500/40 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
              <span>🪷 知新堂 语文旗舰模块</span>
              <span>•</span>
              <span>当前身份视图: {activeView.toUpperCase()}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-serif tracking-tight bg-gradient-to-r from-emerald-300 via-jade-300 to-teal-100 bg-clip-text text-transparent">
              白莲阁 (古诗文75首)
            </h1>
            <p className="text-emerald-100 text-sm italic font-serif">
              “小娃撑小艇，偷采白莲回。不解藏踪迹，浮萍一道开。” —— 唐·白居易《池上》
            </p>
          </div>

          {/* View Badge */}
          <div className="z-10 bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-xs space-y-1 text-slate-300">
            <div className="font-bold text-emerald-400">👤 {user?.name || '体验用户'}</div>
            <div>所属班级 / 角色: {user?.className || '三年级A班'} ({activeView})</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STUDENT VIEW (学生端: 待办作业 / 答题历史 / 自主学习) */}
      {/* ========================================================================= */}
      {activeView === 'student' && (
        <div className="space-y-6">
          
          {/* Sub Navigation Bar for Student */}
          <div className="flex border-b border-slate-200 space-x-4">
            <button
              onClick={() => setStudentTab('assignments')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                studentTab === 'assignments' ? 'border-jade-600 text-jade-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📝 1. 待办作业 ({assignments.filter(a => a.status === '待完成').length})
            </button>
            <button
              onClick={() => setStudentTab('history')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                studentTab === 'history' ? 'border-jade-600 text-jade-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📊 2. 答题历史 ({quizHistory.length})
            </button>
            <button
              onClick={() => setStudentTab('selfstudy')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                studentTab === 'selfstudy' ? 'border-jade-600 text-jade-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📚 3. 自主拓展学习 ({learntPoemIds.length} 首已解锁)
            </button>
          </div>

          {/* STUDENT TAB 1: ASSIGNMENTS TO DO */}
          {studentTab === 'assignments' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold font-serif text-ink">我的待办作业 (Assignments To Do)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {assignments.map((asgn) => {
                  const poem = poems.find(p => p.id === asgn.poemId) || poems[0];
                  return (
                    <div key={asgn.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">
                            截止时间: {asgn.dueDate}
                          </span>
                          <h3 className="text-lg font-bold font-serif text-ink mt-1">《{asgn.poemTitle}》</h3>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                          asgn.status === '已打卡' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {asgn.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        📋 老师要求: {asgn.requirement}
                      </p>
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => startQuiz(poem)}
                          className="px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white font-bold rounded-xl text-xs shadow-md transition"
                        >
                          🚀 立即开始答题闯关
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STUDENT TAB 2: QUIZ HISTORY */}
          {studentTab === 'history' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xl font-bold font-serif text-ink">答题历史与成绩单 (Quiz History)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">完成时间</th>
                      <th className="p-3">古诗题目</th>
                      <th className="p-3">闯关类型</th>
                      <th className="p-3">得分</th>
                      <th className="p-3">正确率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quizHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono">{item.completedAt}</td>
                        <td className="p-3 font-bold font-serif text-ink">《{item.poemTitle}》</td>
                        <td className="p-3">{item.quizType}</td>
                        <td className="p-3 font-bold text-emerald-600">{item.score}分</td>
                        <td className="p-3 font-bold text-slate-700">{item.accuracy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STUDENT TAB 3: SELF-STUDY (Learnt Poems Extra Knowledge) */}
          {studentTab === 'selfstudy' && (
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Learnt Poems Selector */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 max-h-[500px] overflow-y-auto">
                <h3 className="font-bold font-serif text-ink text-sm">已学古诗库 ({learntPoemIds.length}首)</h3>
                <div className="space-y-2">
                  {poems.filter(p => learntPoemIds.includes(p.id)).map((poem) => (
                    <div
                      key={poem.id}
                      onClick={() => setSelectedPoem(poem)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs font-serif transition ${
                        selectedPoem?.id === poem.id ? 'border-jade-500 bg-jade-50 font-bold' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      《{poem.title}》 - [{poem.dynasty}] {poem.author}
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Knowledge Canvas */}
              {selectedPoem && (
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <span className="px-2 py-0.5 bg-jade-100 text-jade-800 text-xs font-bold rounded">
                        [{selectedPoem.dynasty}] {selectedPoem.author}
                      </span>
                      <h2 className="text-2xl font-bold font-serif text-ink mt-1">《{selectedPoem.title}》拓展自学</h2>
                    </div>
                    <button
                      onClick={() => setShowPinyin(!showPinyin)}
                      className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs"
                    >
                      {showPinyin ? '隐藏拼音' : '显示拼音'}
                    </button>
                  </div>

                  {/* Poem Text */}
                  <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100 space-y-3 text-center">
                    {selectedPoem.lines.map((lineObj, idx) => {
                      const text = typeof lineObj === 'string' ? lineObj : lineObj.text;
                      const pinyin = typeof lineObj === 'string' ? '' : lineObj.pinyin;
                      const cn = typeof lineObj === 'string' ? '' : lineObj.cn;
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="text-xl font-serif font-bold text-slate-800">
                            {showPinyin && pinyin ? (
                              <ruby>{text}<rt className="text-[10px] text-amber-800">{pinyin}</rt></ruby>
                            ) : text}
                          </div>
                          {cn && <div className="text-xs text-slate-500">{cn}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Extra Knowledge Sections */}
                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <strong className="text-ink block font-serif">📖 诗人背景故事</strong>
                      <p className="text-slate-600 leading-relaxed">
                        {selectedPoem.author}是{selectedPoem.dynasty}代著名诗人，其诗风通俗易懂，深受百姓喜爱。作品充满童真与生活气息。
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <strong className="text-ink block font-serif">💡 诗词赏析与意境</strong>
                      <p className="text-slate-600 leading-relaxed">
                        主题：{selectedPoem.theme}。关键词包括: {selectedPoem.keywords?.join(', ')}。展现了自然景象与生动的画面感。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-blue-400/50 rounded-lg text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                {classes.map(c => {
                  const actualCount = apiService.getStudents(c.name).length;
                  return <option key={c.id} value={c.name}>{c.name} ({actualCount}人)</option>;
                })}
              </select>
            </div>
          </div>

          {teacherMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
              {teacherMsg}
            </div>
          )}

          {/* Teacher Sub Navigation */}
          <div className="flex border-b border-slate-200 space-x-6">
            <button
              onClick={() => setTeacherTab('assignments')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                teacherTab === 'assignments' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📌 作业发布
            </button>
            <button
              onClick={() => setTeacherTab('stats')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                teacherTab === 'stats' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📊 作业统计
            </button>
            <button
              onClick={() => setTeacherTab('progress')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                teacherTab === 'progress' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              🧭 课程进度
            </button>
          </div>

          {/* TEACHER TAB 1: ASSIGNMENTS PUBLISHING */}
          {teacherTab === 'assignments' && (
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Form to publish */}
              <form onSubmit={handlePublishAssignment} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <h3 className="text-base font-bold font-serif text-ink">发布新作业到【{selectedClass}】</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">学科 (Subject)</label>
                    <select
                      value={asgnSubject}
                      onChange={(e) => {
                        const sub = e.target.value;
                        setAsgnSubject(sub);
                        let sec = '白莲阁';
                        if (sub === '数学') sec = '数理逻辑';
                        else if (sub === '英语') sec = '语法与阅读';
                        else if (sub === '科学') sec = '自然科学';
                        setAsgnSection(sec);
                        
                        const reqMap: Record<string, string> = {
                          '语文-白莲阁': '完成诗句连线与古诗背诵打卡',
                          '语文-现代文阅读': '完成篇章阅读理解与重点词句赏析',
                          '数学-数理逻辑': '完成逻辑推理与应用题训练',
                          '数学-几何基础': '完成图形识别与几何面积计算',
                          '英语-语法与阅读': '完成语法选择题与短文阅读理解',
                          '英语-听力口语': '完成听力录音理解与口语朗读打卡',
                          '科学-自然科学': '完成自然现象观察与科学知识测试',
                          '科学-物理与化学': '完成基础物理化学实验常识问答',
                        };
                        setNewAsgnReq(reqMap[`${sub}-${sec}`] || `完成【${sub} - ${sec}】相关单元练习`);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="语文">语文</option>
                      <option value="数学">数学</option>
                      <option value="英语">英语</option>
                      <option value="科学">科学</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">分区 (Section)</label>
                    <select
                      value={asgnSection}
                      onChange={(e) => {
                        const sec = e.target.value;
                        setAsgnSection(sec);
                        const reqMap: Record<string, string> = {
                          '语文-白莲阁': '完成诗句连线与古诗背诵打卡',
                          '语文-现代文阅读': '完成篇章阅读理解与重点词句赏析',
                          '数学-数理逻辑': '完成逻辑推理与应用题训练',
                          '数学-几何基础': '完成图形识别与几何面积计算',
                          '英语-语法与阅读': '完成语法选择题与短文阅读理解',
                          '英语-听力口语': '完成听力录音理解与口语朗读打卡',
                          '科学-自然科学': '完成自然现象观察与科学知识测试',
                          '科学-物理与化学': '完成基础物理化学实验常识问答',
                        };
                        setNewAsgnReq(reqMap[`${asgnSubject}-${sec}`] || `完成【${asgnSubject} - ${sec}】相关单元练习`);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
                    >
                      {asgnSubject === '语文' && (
                        <>
                          <option value="白莲阁">白莲阁 (古诗文)</option>
                          <option value="现代文阅读">现代文阅读</option>
                        </>
                      )}
                      {asgnSubject === '数学' && (
                        <>
                          <option value="数理逻辑">数理逻辑</option>
                          <option value="几何基础">几何基础</option>
                        </>
                      )}
                      {asgnSubject === '英语' && (
                        <>
                          <option value="语法与阅读">语法与阅读</option>
                          <option value="听力口语">听力口语</option>
                        </>
                      )}
                      {asgnSubject === '科学' && (
                        <>
                          <option value="自然科学">自然科学</option>
                          <option value="物理与化学">物理与化学</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {asgnSubject === '语文' && (asgnSection === '白莲阁' || asgnSection.includes('白莲阁')) ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">选择古诗 (已完成授课/已解锁)</label>
                    <select
                      value={newAsgnPoemId}
                      onChange={(e) => setNewAsgnPoemId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer"
                    >
                      {poems.filter(p => learntPoemIds.includes(p.id)).length > 0 ? (
                        poems.filter(p => learntPoemIds.includes(p.id)).map(p => {
                          const classAsgns = apiService.getAssignments(selectedClass);
                          const pubCount = classAsgns.filter((a: any) => a.poemId === p.id || a.poemTitle === p.title).length;
                          return (
                            <option key={p.id} value={p.id}>
                              《{p.title}》 - [{p.dynasty}] {p.author}{pubCount > 0 ? ` (已发布 ${pubCount} 次)` : ''}
                            </option>
                          );
                        })
                      ) : (
                        <option value="" disabled>⚠️ 当前班级暂无已解锁古诗 (请在【课程进度】页切换授课状态)</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">选择学习任务 (Select Task)</label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 cursor-pointer">
                      <option value="task_1">【{asgnSubject} - {asgnSection}】第 1 单元综合练习</option>
                      <option value="task_2">【{asgnSubject} - {asgnSection}】第 2 单元能力拓展</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">截止时间</label>
                  <input
                    type="date"
                    value={newAsgnDueDate}
                    onChange={(e) => setNewAsgnDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">作业要求说明</label>
                  <textarea
                    value={newAsgnReq}
                    onChange={(e) => setNewAsgnReq(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition"
                >
                  🚀 立即向【{selectedClass}】发布作业
                </button>
              </form>

              {/* Published assignments list */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold font-serif text-ink">【{selectedClass}】已发布作业列表</h3>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {apiService.getAssignments(selectedClass).map((asgn: any) => (
                    <div key={asgn.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-ink">
                        <span>《{asgn.poemTitle}》</span>
                        <span className="text-blue-600">截止: {asgn.dueDate}</span>
                      </div>
                      <p className="text-slate-600">{asgn.requirement}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TEACHER TAB 2: QUIZ STATS */}
          {teacherTab === 'stats' && (
            <div className="space-y-6">
              
              {/* Overall Summary Cards */}
              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-slate-500">班级平均分</span>
                  <div className="text-2xl font-bold text-blue-600 font-mono">91.5 分</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-slate-500">作业打卡率</span>
                  <div className="text-2xl font-bold text-emerald-600 font-mono">96.4 %</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-slate-500">需关注易错诗句</span>
                  <div className="text-sm font-bold text-amber-800 font-serif">“浮萍一道开” (混淆率22%)</div>
                </div>
              </div>

              {/* Student Individual Stats Table */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold font-serif text-ink">【{selectedClass}】学生个人答题明细</h3>
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3">学生姓名</th>
                      <th className="p-3">账号 ID</th>
                      <th className="p-3">完成闯关数</th>
                      <th className="p-3">平均得分</th>
                      <th className="p-3">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-ink">{stu.name}</td>
                        <td className="p-3 font-mono">{stu.username}</td>
                        <td className="p-3">{stu.completedQuizzes} 首</td>
                        <td className="p-3 font-bold text-emerald-600">{stu.avgScore} 分</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">正常</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TEACHER TAB 3: LEARNING PROGRESS (Unlock self study) */}
          {teacherTab === 'progress' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold font-serif text-ink">【{selectedClass}】古诗教学进度与学生自学解锁控制</h3>
                <p className="text-xs text-slate-500">点击勾选已教学古诗，勾选后学生端将在“自主拓展学习”中解锁对应古诗的背景故事与赏析。</p>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {poems.map((poem) => {
                  const isLearnt = learntPoemIds.includes(poem.id);
                  return (
                    <div
                      key={poem.id}
                      onClick={() => handleToggleLearnt(poem.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isLearnt ? 'border-emerald-500 bg-emerald-50/80 font-bold' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="font-serif text-ink">《{poem.title}》</div>
                        <div className="text-[10px] text-slate-500">[{poem.dynasty}] {poem.author}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] ${isLearnt ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {isLearnt ? '已学 (已解锁)' : '待学 (已锁定)'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default BaiLianGe;
