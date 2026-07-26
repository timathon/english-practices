import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface PlatformAdminPanelProps {
  user: any;
}

export const PlatformAdminPanel: React.FC<PlatformAdminPanelProps> = ({ user }) => {
  const [adminTab, setAdminTab] = useState<'students' | 'teachers' | 'classes'>('students');
  const [classes, setClasses] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [allStudentsList, setAllStudentsList] = useState<any[]>([]);
  const [adminMsg, setAdminMsg] = useState<string>('');

  // Form states
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeacher, setNewClassTeacher] = useState('');
  
  // Teacher form state
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('abcd');
  const [newTeacherClass, setNewTeacherClass] = useState('');
  
  // Student form state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('1234');
  const [newStudentClass, setNewStudentClass] = useState('');

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setClasses(apiService.getClasses());
    setTeachersList(apiService.getTeachers());
    setAllStudentsList(apiService.getStudents());
  };

  // Auto-generate placeholder for teacher username
  const handleTeacherNameChange = (val: string) => {
    setNewTeacherName(val);
    if (!editingTeacherId && (!newTeacherUsername || newTeacherUsername.startsWith('tch_'))) {
      const stamp = Date.now().toString().slice(-4);
      setNewTeacherUsername(`tch_${stamp}`);
    }
  };

  // Auto-generate placeholder for student username
  const handleStudentNameChange = (val: string) => {
    setNewStudentName(val);
    if (!editingStudentId && (!newStudentUsername || newStudentUsername.startsWith('stu_'))) {
      const stamp = Date.now().toString().slice(-4);
      setNewStudentUsername(`stu_${stamp}`);
    }
  };

  const handleOpenAddTeacher = () => {
    setEditingTeacherId(null);
    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPassword('abcd');
    setNewTeacherClass('');
    setIsTeacherModalOpen(true);
  };

  const handleEditTeacher = (tch: any) => {
    setEditingTeacherId(tch.id);
    setNewTeacherName(tch.name);
    setNewTeacherUsername(tch.username);
    setNewTeacherPassword(''); // Empty means "no reset" when editing
    setNewTeacherClass(tch.assignedClass === '未分配' ? '' : tch.assignedClass);
    setIsTeacherModalOpen(true);
  };

  const handleOpenAddStudent = () => {
    setEditingStudentId(null);
    setNewStudentName('');
    setNewStudentUsername('');
    setNewStudentPassword('1234');
    setNewStudentClass('');
    setIsStudentModalOpen(true);
  };

  const handleEditStudent = (stu: any) => {
    setEditingStudentId(stu.id);
    setNewStudentName(stu.name);
    setNewStudentUsername(stu.username);
    setNewStudentPassword(''); // Empty means "no reset" when editing
    setNewStudentClass(stu.className === '未分配' ? '' : stu.className);
    setIsStudentModalOpen(true);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const tch = teachersList.find(t => t.name === newClassTeacher);
    const updated = apiService.addClass(newClassName.trim(), tch?.id, tch?.name);
    setClasses(updated);
    setAdminMsg(`新班级【${newClassName.trim()}】开设成功！`);
    setNewClassName('');
    setNewClassTeacher('');
    setIsClassModalOpen(false);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;
    const finalUsername = newTeacherUsername.trim() || `tch_${Date.now().toString().slice(-4)}`;
    const assignedClass = newTeacherClass || '未分配';

    const editingTeacherObj = teachersList.find(t => t.id === editingTeacherId);
    const currentUsername = editingTeacherObj?.username?.toLowerCase();

    // Duplicate username check across system
    const isTeacherDuplicate = teachersList.some(t => t.id !== editingTeacherId && t.username.toLowerCase() === finalUsername.toLowerCase());
    const isStudentDuplicate = allStudentsList.some(s => s.username.toLowerCase() === finalUsername.toLowerCase());
    const isSystemDuplicate = ['mmd', 'editor_li'].includes(finalUsername.toLowerCase()) || 
      (finalUsername.toLowerCase() !== currentUsername && ['zhang_laoshi', 'yaming'].includes(finalUsername.toLowerCase()));

    if (isTeacherDuplicate || isStudentDuplicate || isSystemDuplicate) {
      alert(`账号名称【${finalUsername}】已被其他用户使用，请换一个唯一的登录账号！`);
      return;
    }

    let updated: any[];
    if (editingTeacherId) {
      const existing = teachersList.find(t => t.id === editingTeacherId);
      const isPasswordReset = newTeacherPassword.trim().length > 0;

      if (isPasswordReset) {
        alert(`该教师的密码将被重置为：${newTeacherPassword.trim()}`);
      }

      // Edit existing teacher
      updated = teachersList.map(t => t.id === editingTeacherId ? {
        ...t,
        name: newTeacherName.trim(),
        username: finalUsername,
        password: isPasswordReset ? newTeacherPassword.trim() : (existing?.password || 'abcd'),
        assignedClass: assignedClass,
      } : t);
      setAdminMsg(`教师【${newTeacherName.trim()}】账号信息已成功修改！${isPasswordReset ? `(密码已重置)` : ''}`);
    } else {
      // Create new teacher
      const finalPassword = newTeacherPassword.trim() || 'abcd';
      updated = [...teachersList, {
        id: `usr_tch_${Date.now()}`,
        username: finalUsername,
        password: finalPassword,
        name: newTeacherName.trim(),
        assignedClass: assignedClass
      }];
      setAdminMsg(`教师【${newTeacherName.trim()}】账号(${finalUsername})创建成功！密码: ${finalPassword}`);
    }

    apiService.saveTeachers(updated);
    setTeachersList(updated);
    setEditingTeacherId(null);
    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPassword('abcd');
    setNewTeacherClass('');
    setIsTeacherModalOpen(false);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const finalUsername = newStudentUsername.trim() || `stu_${Date.now().toString().slice(-4)}`;
    const assignedClass = newStudentClass || '未分配';

    const editingStudentObj = allStudentsList.find(s => s.id === editingStudentId);
    const currentUsername = editingStudentObj?.username?.toLowerCase();

    // Duplicate username check (excluding current student if editing)
    const isStudentDuplicate = allStudentsList.some(s => s.id !== editingStudentId && s.username.toLowerCase() === finalUsername.toLowerCase());
    const isTeacherDuplicate = teachersList.some(t => t.username.toLowerCase() === finalUsername.toLowerCase());
    const isSystemDuplicate = ['mmd', 'editor_li'].includes(finalUsername.toLowerCase()) || 
      (finalUsername.toLowerCase() !== currentUsername && ['zhang_laoshi', 'yaming'].includes(finalUsername.toLowerCase()));

    if (isStudentDuplicate || isTeacherDuplicate || isSystemDuplicate) {
      alert(`账号名称【${finalUsername}】已被其他用户使用，请换一个唯一的登录账号！`);
      return;
    }

    let updated: any[];
    if (editingStudentId) {
      const existing = allStudentsList.find(s => s.id === editingStudentId);
      const isPasswordReset = newStudentPassword.trim().length > 0;
      
      if (isPasswordReset) {
        alert(`该用户的密码将被重置为：${newStudentPassword.trim()}`);
      }

      // Edit existing student
      updated = allStudentsList.map(s => s.id === editingStudentId ? {
        ...s,
        name: newStudentName.trim(),
        username: finalUsername,
        password: isPasswordReset ? newStudentPassword.trim() : (existing?.password || '1234'),
        className: assignedClass,
      } : s);
      setAdminMsg(`学生【${newStudentName.trim()}】账号信息已成功修改！${isPasswordReset ? `(密码已重置)` : ''}`);
    } else {
      // Create new student
      const finalPassword = newStudentPassword.trim() || '1234';
      updated = [...allStudentsList, {
        id: `usr_stu_${Date.now()}`,
        username: finalUsername,
        password: finalPassword,
        name: newStudentName.trim(),
        className: assignedClass,
        completedQuizzes: 0,
        avgScore: 100
      }];
      setAdminMsg(`学生【${newStudentName.trim()}】账号(${finalUsername})创建成功！密码: ${finalPassword}`);
    }

    apiService.saveStudents(updated);
    setAllStudentsList(updated);
    setEditingStudentId(null);
    setNewStudentName('');
    setNewStudentUsername('');
    setNewStudentPassword('1234');
    setNewStudentClass('');
    setIsStudentModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-purple-700/40 mb-8">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 bg-purple-900/60 border border-purple-500/40 text-purple-200 px-3 py-1 rounded-full text-xs font-semibold">
            <span>⚙️ 知新堂 平台级管理中心</span>
          </div>
          <h1 className="text-3xl font-black font-serif bg-gradient-to-r from-purple-200 via-pink-200 to-white bg-clip-text text-transparent">
            平台级师生账号与班级建制管理
          </h1>
          <p className="text-purple-200 text-xs">
            跨学科统一控制：配置教师账号、生成学生账号与入班规则、开设全校班级建制。
          </p>
        </div>

        <div className="bg-slate-800/80 border border-purple-500/30 p-3 rounded-xl text-xs space-y-1 text-purple-200">
          <div className="font-bold">管理员: {user?.name || 'System Admin'}</div>
          <div>权限等级: 全局最高控制 (Platform Level)</div>
        </div>
      </div>

      {adminMsg && (
        <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-xl font-bold flex justify-between items-center mb-6">
          <span>{adminMsg}</span>
          <button onClick={() => setAdminMsg('')} className="text-purple-500 hover:text-purple-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 mb-8">
        <button
          onClick={() => setAdminTab('students')}
          className={`pb-3 text-base font-bold border-b-2 transition flex items-center space-x-1.5 ${
            adminTab === 'students' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>👨‍🎓</span>
          <span>学生</span>
        </button>
        <button
          onClick={() => setAdminTab('teachers')}
          className={`pb-3 text-base font-bold border-b-2 transition flex items-center space-x-1.5 ${
            adminTab === 'teachers' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>👩‍🏫</span>
          <span>教师</span>
        </button>
        <button
          onClick={() => setAdminTab('classes')}
          className={`pb-3 text-base font-bold border-b-2 transition flex items-center space-x-1.5 ${
            adminTab === 'classes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>🏫</span>
          <span>班级</span>
        </button>
      </div>

      {/* TAB 1: CLASS SETUP */}
      {adminTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-lg font-bold font-serif text-ink">班级管理</h3>
              <p className="text-xs text-slate-500 mt-0.5">开设全校新班级建制、指定任课教师与汇总入班学额</p>
            </div>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="px-6 py-2.5 min-w-[110px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-md transition text-center tracking-wider"
            >
              创建班级
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold font-serif text-ink">全校已建班级名册 ({classes.length}个班级)</h3>
              <p className="text-slate-500 text-[11px] mt-0.5">实时汇总班级架构、负责教师与学生总人数</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {classes.map((cls) => (
                <div key={cls.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-ink text-sm flex items-center space-x-2">
                      <span>{cls.name}</span>
                      <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">ID: {cls.id}</span>
                    </div>
                    <div className="text-slate-500 mt-1">任课教师: {cls.teacherName}</div>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold rounded-lg text-xs font-mono">
                    {cls.studentCount || allStudentsList.filter(s => s.className === cls.name).length} 人
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHERS ALLOCATION */}
      {adminTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-lg font-bold font-serif text-ink">教师管理</h3>
              <p className="text-xs text-slate-500 mt-0.5">查看及分配教师管辖班级，统一开通教师登录账号（点击列表卡片可编辑信息）</p>
            </div>
            <button
              onClick={handleOpenAddTeacher}
              className="px-6 py-2.5 min-w-[110px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-md transition text-center tracking-wider"
            >
              创建账号
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold font-serif text-ink">全校教师列表 ({teachersList.length}人)</h3>
              <p className="text-slate-500 text-[11px] mt-0.5">点击任意教师卡片即可直接编辑账号工号、管辖班级或密码</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {teachersList.map((tch) => (
                <div
                  key={tch.id}
                  onClick={() => handleEditTeacher(tch)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50/50 hover:border-purple-300 flex justify-between items-center text-xs transition cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-ink text-sm group-hover:text-purple-700 transition flex items-center space-x-1.5">
                      <span>{tch.name}</span>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 text-purple-600 font-normal">✏️ 编辑</span>
                    </div>
                    <div className="text-slate-500 font-mono mt-1">账号: {tch.username}</div>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold rounded-lg text-xs">
                    {tch.assignedClass}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENTS MEMBERSHIP */}
      {adminTab === 'students' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-lg font-bold font-serif text-ink">学生管理</h3>
              <p className="text-xs text-slate-500 mt-0.5">管理全校学生统一学号、所属班级与学习进度（点击名册卡片可编辑信息）</p>
            </div>
            <button
              onClick={handleOpenAddStudent}
              className="px-6 py-2.5 min-w-[110px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-md transition text-center tracking-wider"
            >
              创建账号
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold font-serif text-ink">全校学生名册 ({allStudentsList.length}人)</h3>
              <p className="text-slate-500 text-[11px] mt-0.5">点击任意学生卡片即可直接编辑学号、所属班级或密码</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {allStudentsList.map((stu) => (
                <div
                  key={stu.id}
                  onClick={() => handleEditStudent(stu)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50/50 hover:border-purple-300 flex justify-between items-center text-xs transition cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-ink text-sm group-hover:text-purple-700 transition flex items-center space-x-1.5">
                      <span>{stu.name}</span>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 text-purple-600 font-normal">✏️ 编辑</span>
                    </div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">账号: {stu.username}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold">
                      {stu.className}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEACHER MODAL */}
      {isTeacherModalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen m-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 relative border border-slate-100">
            <button
              onClick={() => setIsTeacherModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>

            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-bold font-serif text-ink">
                {editingTeacherId ? '编辑教师账号信息' : '开设新教师账号'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingTeacherId ? '修改教师工号、管辖班级或重置密码' : '为任课教师开通管理账号，分配教学工作台与管辖班级'}
              </p>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">教师姓名</label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => handleTeacherNameChange(e.target.value)}
                  placeholder="如: 陈老师"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">登录账号 (Login Username)</label>
                <input
                  type="text"
                  value={newTeacherUsername}
                  onChange={(e) => setNewTeacherUsername(e.target.value)}
                  placeholder="如: tch_8848 (默认自动生成)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono text-purple-900 focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">自动生成唯一工号，亦可按学校要求手动输入修改</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingTeacherId ? '重置密码 (Reset Password)' : '登录密码 (Initial Password)'}
                </label>
                <input
                  type="text"
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  placeholder={editingTeacherId ? '留空表示不重置原密码' : '默认: abcd'}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {editingTeacherId ? (
                    '若不修改密码请留空；输入新密码保存后将重置'
                  ) : (
                    <>默认统一初始密码: <span className="font-bold text-purple-700">abcd</span></>
                  )}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">分配负责班级</label>
                <select
                  value={newTeacherClass}
                  onChange={(e) => setNewTeacherClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-sm"
                >
                  <option value="">-- 暂未分配 (待定) --</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md text-sm transition"
                >
                  {editingTeacherId ? '保存' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT STUDENT MODAL */}
      {isStudentModalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen m-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 relative border border-slate-100">
            <button
              onClick={() => setIsStudentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>

            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-bold font-serif text-ink">
                {editingStudentId ? '编辑学生账号信息' : '创建学生账号'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingStudentId ? '修改学生学号、所属班级或密码' : '生成学生统一学号凭证，分配所属班级名册'}
              </p>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">学生姓名</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => handleStudentNameChange(e.target.value)}
                  placeholder="如: 王小强"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">登录账号 (Login Username)</label>
                <input
                  type="text"
                  value={newStudentUsername}
                  onChange={(e) => setNewStudentUsername(e.target.value)}
                  placeholder="如: stu_1001 (默认自动生成)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono text-purple-900 focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">自动生成唯一学号，亦可自定义修改</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingStudentId ? '重置密码 (Reset Password)' : '登录密码 (Initial Password)'}
                </label>
                <input
                  type="text"
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder={editingStudentId ? '留空表示不重置原密码' : '默认: 1234'}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {editingStudentId ? (
                    '若不修改密码请留空；输入新密码保存后将重置'
                  ) : (
                    <>默认统一初始密码: <span className="font-bold text-purple-700">1234</span></>
                  )}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">入班选择</label>
                <select
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-sm"
                >
                  <option value="">-- 暂未分配 (待定) --</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md text-sm transition"
                >
                  {editingStudentId ? '保存' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CLASS MODAL */}
      {isClassModalOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen m-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 relative border border-slate-100">
            <button
              onClick={() => setIsClassModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>

            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-bold font-serif text-ink">开设新班级建制</h3>
              <p className="text-xs text-slate-500">创建新班级，并为其指定首任责任教师与初始开课计划</p>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">班级名称 (Class Name)</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="如: 四年级B班 / 六年级创新班"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">指定任课教师 (Assigned Teacher)</label>
                <select
                  value={newClassTeacher}
                  onChange={(e) => setNewClassTeacher(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-sm"
                >
                  <option value="">-- 未指定 / 暂不分配 --</option>
                  {teachersList.map(t => <option key={t.id} value={t.name}>{t.name} ({t.assignedClass})</option>)}
                </select>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md text-sm transition"
                >
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlatformAdminPanel;
