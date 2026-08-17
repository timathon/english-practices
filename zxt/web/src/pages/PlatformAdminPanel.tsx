import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { getTeacherClasses, getClassTeachers } from '../components/admin/adminUtils';
import { AdminStudentsTab } from '../components/admin/AdminStudentsTab';
import { AdminTeachersTab } from '../components/admin/AdminTeachersTab';
import { AdminClassesTab } from '../components/admin/AdminClassesTab';
import { AdminTeacherModal } from '../components/admin/AdminTeacherModal';
import { AdminStudentModal } from '../components/admin/AdminStudentModal';
import { AdminClassModal } from '../components/admin/AdminClassModal';

interface PlatformAdminPanelProps {
  user: any;
}

export const PlatformAdminPanel: React.FC<PlatformAdminPanelProps> = ({ user }) => {
  if (!user || user.role !== 'admin') {
    return null;
  }

  const [adminTab, setAdminTab] = useState<'students' | 'teachers' | 'classes'>('students');
  const [classes, setClasses] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [allStudentsList, setAllStudentsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminMsg, setAdminMsg] = useState<string>('');

  // Class form state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeachers, setNewClassTeachers] = useState<string[]>([]);
  const [selectedTeacherToAdd, setSelectedTeacherToAdd] = useState('');
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');

  // Teacher form state
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('abcd');
  const [newTeacherClasses, setNewTeacherClasses] = useState<string[]>([]);
  const [selectedClassToAdd, setSelectedClassToAdd] = useState('');
  const [newTeacherIsQuizEditor, setNewTeacherIsQuizEditor] = useState(false);

  // Student form state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('1234');
  const [newStudentClass, setNewStudentClass] = useState('');

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  useLockBodyScroll(isClassModalOpen || isTeacherModalOpen || isStudentModalOpen);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // 1. Read cached version from localStorage if available
    const cachedClasses = localStorage.getItem('zxt_classes');
    const cachedTeachers = localStorage.getItem('zxt_teachers');
    const cachedStudents = localStorage.getItem('zxt_students');

    const hasCache = Boolean(cachedTeachers || cachedStudents || cachedClasses);

    if (hasCache) {
      if (cachedClasses) {
        try { setClasses(JSON.parse(cachedClasses)); } catch (_) {}
      }
      if (cachedTeachers) {
        try { setTeachersList(JSON.parse(cachedTeachers)); } catch (_) {}
      }
      if (cachedStudents) {
        try { setAllStudentsList(JSON.parse(cachedStudents)); } catch (_) {}
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // 2. Background revalidation with DB
    try {
      const dbClasses = await apiService.getClasses();
      const dbTeachers = await apiService.getTeachers();
      const dbStudents = await apiService.getStudents();

      setClasses(dbClasses);
      setTeachersList(dbTeachers);
      setAllStudentsList(dbStudents);
    } catch (err) {
      console.error('Failed to revalidate admin data from DB:', err);
    } finally {
      setIsLoading(false);
    }
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
    setNewTeacherClasses([]);
    setSelectedClassToAdd('');
    setNewTeacherIsQuizEditor(false);
    setIsTeacherModalOpen(true);
  };

  const handleEditTeacher = (tch: any) => {
    setEditingTeacherId(tch.id);
    setNewTeacherName(tch.name);
    setNewTeacherUsername(tch.username);
    setNewTeacherPassword('');
    setNewTeacherClasses(getTeacherClasses(tch));
    setSelectedClassToAdd('');
    setNewTeacherIsQuizEditor(Boolean(tch.isQuizEditor));
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
    setNewStudentPassword('');
    setNewStudentClass(stu.className === '未分配' ? '' : stu.className);
    setIsStudentModalOpen(true);
  };

  const handleOpenAddClass = () => {
    setEditingClassId(null);
    setNewClassName('');
    setNewClassTeachers([]);
    setSelectedTeacherToAdd('');
    setSelectedStudentToAdd('');
    setIsClassModalOpen(true);
  };

  const handleEditClass = (cls: any) => {
    setEditingClassId(cls.id);
    setNewClassName(cls.name);
    setNewClassTeachers(getClassTeachers(cls));
    setSelectedTeacherToAdd('');
    setSelectedStudentToAdd('');
    setIsClassModalOpen(true);
  };

  const handleRemoveStudentFromClass = (studentId: string) => {
    const updated = allStudentsList.map(s => s.id === studentId ? { ...s, className: '未分配' } : s);
    setAllStudentsList(updated);
    apiService.saveStudents(updated);
  };

  const handleAddStudentToClass = (studentId: string) => {
    if (!studentId || !newClassName.trim()) return;
    const targetClassName = newClassName.trim();
    const updated = allStudentsList.map(s => s.id === studentId ? { ...s, className: targetClassName } : s);
    setAllStudentsList(updated);
    apiService.saveStudents(updated);
    setSelectedStudentToAdd('');
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const trimmedName = newClassName.trim();
    const oldClass = editingClassId ? classes.find(c => c.id === editingClassId) : null;
    const oldClassName = oldClass?.name;

    const updatedClassObj = {
      id: editingClassId || `c_${Date.now()}`,
      name: trimmedName,
      teacherNames: newClassTeachers,
      teacherName: newClassTeachers.length > 0 ? newClassTeachers.join(', ') : '未指定教师',
      studentCount: allStudentsList.filter(s => s.className === (oldClassName || trimmedName)).length
    };

    let updatedClasses: any[];
    if (editingClassId) {
      updatedClasses = classes.map(c => c.id === editingClassId ? updatedClassObj : c);
    } else {
      updatedClasses = [...classes, updatedClassObj];
    }

    if (oldClassName && oldClassName !== trimmedName) {
      const updatedStudents = allStudentsList.map(s => s.className === oldClassName ? { ...s, className: trimmedName } : s);
      setAllStudentsList(updatedStudents);
      apiService.saveStudents(updatedStudents);
    }

    const updatedTeachers = teachersList.map(t => {
      let currentClasses = getTeacherClasses(t);
      const isTeacherAssigned = newClassTeachers.includes(t.name);

      if (oldClassName && oldClassName !== trimmedName) {
        currentClasses = currentClasses.map(cName => cName === oldClassName ? trimmedName : cName);
      }

      if (isTeacherAssigned && !currentClasses.includes(trimmedName)) {
        currentClasses = [...currentClasses, trimmedName];
      } else if (!isTeacherAssigned && currentClasses.includes(trimmedName)) {
        currentClasses = currentClasses.filter(cName => cName !== trimmedName);
      }

      return {
        ...t,
        assignedClasses: currentClasses,
        assignedClass: currentClasses.length > 0 ? currentClasses.join(', ') : '未分配'
      };
    });
    setTeachersList(updatedTeachers);
    apiService.saveTeachers(updatedTeachers);

    apiService.saveClasses(updatedClasses);
    setClasses(updatedClasses);
    setEditingClassId(null);
    setNewClassName('');
    setNewClassTeachers([]);
    setSelectedTeacherToAdd('');
    setSelectedStudentToAdd('');
    setIsClassModalOpen(false);
    setAdminMsg(`班级【${trimmedName}】配置已成功保存更新！`);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    const finalUsername = newTeacherUsername.trim() || `tch_${Date.now().toString().slice(-4)}`;
    const finalPassword = newTeacherPassword.trim();
    const finalClasses = newTeacherClasses;
    const finalClassStr = finalClasses.length > 0 ? finalClasses.join(', ') : '未分配';

    let updated: any[];
    if (editingTeacherId) {
      const oldTeacher = teachersList.find(t => t.id === editingTeacherId);
      updated = teachersList.map(t => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            name: newTeacherName.trim(),
            username: finalUsername,
            ...(finalPassword ? { password: finalPassword } : {}),
            assignedClasses: finalClasses,
            assignedClass: finalClassStr,
            isQuizEditor: newTeacherIsQuizEditor
          };
        }
        return t;
      });

      const oldTeacherName = oldTeacher?.name;
      const newName = newTeacherName.trim();
      const updatedClasses = classes.map(c => {
        let currentTchs = getClassTeachers(c);
        const shouldBeInClass = finalClasses.includes(c.name);

        if (oldTeacherName && oldTeacherName !== newName) {
          currentTchs = currentTchs.map(tName => tName === oldTeacherName ? newName : tName);
        }

        if (shouldBeInClass && !currentTchs.includes(newName)) {
          currentTchs = [...currentTchs, newName];
        } else if (!shouldBeInClass && currentTchs.includes(newName)) {
          currentTchs = currentTchs.filter(tName => tName !== newName);
        }

        return {
          ...c,
          teacherNames: currentTchs,
          teacherName: currentTchs.length > 0 ? currentTchs.join(', ') : '未指定教师'
        };
      });
      setClasses(updatedClasses);
      apiService.saveClasses(updatedClasses);

      setAdminMsg(`教师【${newTeacherName.trim()}】信息已成功更新！`);
    } else {
      const newId = `t_${Date.now()}`;
      const newTeacherObj = {
        id: newId,
        name: newTeacherName.trim(),
        username: finalUsername,
        password: finalPassword || 'abcd',
        assignedClasses: finalClasses,
        assignedClass: finalClassStr,
        isQuizEditor: newTeacherIsQuizEditor
      };
      updated = [...teachersList, newTeacherObj];

      const newName = newTeacherName.trim();
      const updatedClasses = classes.map(c => {
        if (finalClasses.includes(c.name)) {
          const currentTchs = getClassTeachers(c);
          if (!currentTchs.includes(newName)) {
            const nextTchs = [...currentTchs, newName];
            return {
              ...c,
              teacherNames: nextTchs,
              teacherName: nextTchs.join(', ')
            };
          }
        }
        return c;
      });
      setClasses(updatedClasses);
      apiService.saveClasses(updatedClasses);

      setAdminMsg(`教师【${newTeacherName.trim()}】账号(${finalUsername})创建成功！密码: ${finalPassword || 'abcd'}`);
    }

    apiService.saveTeachers(updated);
    setTeachersList(updated);
    setEditingTeacherId(null);
    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPassword('abcd');
    setNewTeacherClasses([]);
    setSelectedClassToAdd('');
    setNewTeacherIsQuizEditor(false);
    setIsTeacherModalOpen(false);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const finalUsername = newStudentUsername.trim() || `stu_${Date.now().toString().slice(-4)}`;
    const finalPassword = newStudentPassword.trim() || '1234';
    const assignedClass = newStudentClass || '未分配';

    let updated: any[];
    if (editingStudentId) {
      updated = allStudentsList.map(s => {
        if (s.id === editingStudentId) {
          return {
            ...s,
            name: newStudentName.trim(),
            username: finalUsername,
            ...(finalPassword ? { password: finalPassword } : {}),
            className: assignedClass
          };
        }
        return s;
      });
      setAdminMsg(`学生【${newStudentName.trim()}】账号信息已成功更新！`);
    } else {
      updated = [...allStudentsList, {
        id: `s_${Date.now()}`,
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
          className={`pb-3 text-base font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
            adminTab === 'students' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>👨‍🎓</span>
          <span>学生</span>
        </button>
        <button
          onClick={() => setAdminTab('teachers')}
          className={`pb-3 text-base font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
            adminTab === 'teachers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>👩‍🏫</span>
          <span>教师</span>
        </button>
        <button
          onClick={() => setAdminTab('classes')}
          className={`pb-3 text-base font-bold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
            adminTab === 'classes' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>🏫</span>
          <span>班级</span>
        </button>
      </div>

      {/* TAB 1: CLASS SETUP */}
      {adminTab === 'classes' && (
        <AdminClassesTab
          classes={classes}
          allStudentsList={allStudentsList}
          isLoading={isLoading}
          onOpenAddClass={handleOpenAddClass}
          onEditClass={handleEditClass}
        />
      )}

      {/* TAB 2: TEACHERS ALLOCATION */}
      {adminTab === 'teachers' && (
        <AdminTeachersTab
          teachersList={teachersList}
          isLoading={isLoading}
          onOpenAddTeacher={handleOpenAddTeacher}
          onEditTeacher={handleEditTeacher}
        />
      )}

      {/* TAB 3: STUDENTS MEMBERSHIP */}
      {adminTab === 'students' && (
        <AdminStudentsTab
          allStudentsList={allStudentsList}
          isLoading={isLoading}
          onOpenAddStudent={handleOpenAddStudent}
          onEditStudent={handleEditStudent}
        />
      )}

      {/* MODALS */}
      <AdminTeacherModal
        isOpen={isTeacherModalOpen}
        editingTeacherId={editingTeacherId}
        newTeacherName={newTeacherName}
        newTeacherUsername={newTeacherUsername}
        newTeacherPassword={newTeacherPassword}
        newTeacherClasses={newTeacherClasses}
        selectedClassToAdd={selectedClassToAdd}
        newTeacherIsQuizEditor={newTeacherIsQuizEditor}
        classes={classes}
        onClose={() => setIsTeacherModalOpen(false)}
        onTeacherNameChange={handleTeacherNameChange}
        onTeacherUsernameChange={setNewTeacherUsername}
        onTeacherPasswordChange={setNewTeacherPassword}
        onTeacherClassesChange={setNewTeacherClasses}
        onSelectedClassToAddChange={setSelectedClassToAdd}
        onTeacherIsQuizEditorChange={setNewTeacherIsQuizEditor}
        onSubmit={handleSaveTeacher}
      />

      <AdminStudentModal
        isOpen={isStudentModalOpen}
        editingStudentId={editingStudentId}
        newStudentName={newStudentName}
        newStudentUsername={newStudentUsername}
        newStudentPassword={newStudentPassword}
        newStudentClass={newStudentClass}
        classes={classes}
        onClose={() => setIsStudentModalOpen(false)}
        onStudentNameChange={handleStudentNameChange}
        onStudentUsernameChange={setNewStudentUsername}
        onStudentPasswordChange={setNewStudentPassword}
        onStudentClassChange={setNewStudentClass}
        onSubmit={handleSaveStudent}
      />

      <AdminClassModal
        isOpen={isClassModalOpen}
        editingClassId={editingClassId}
        newClassName={newClassName}
        newClassTeachers={newClassTeachers}
        selectedTeacherToAdd={selectedTeacherToAdd}
        selectedStudentToAdd={selectedStudentToAdd}
        teachersList={teachersList}
        allStudentsList={allStudentsList}
        onClose={() => setIsClassModalOpen(false)}
        onClassNameChange={setNewClassName}
        onClassTeachersChange={setNewClassTeachers}
        onSelectedTeacherToAddChange={setSelectedTeacherToAdd}
        onSelectedStudentToAddChange={setSelectedStudentToAdd}
        onAddStudentToClass={handleAddStudentToClass}
        onRemoveStudentFromClass={handleRemoveStudentFromClass}
        onSubmit={handleSaveClass}
      />
    </div>
  );
};

export default PlatformAdminPanel;
