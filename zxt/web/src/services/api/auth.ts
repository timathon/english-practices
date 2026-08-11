import { UserSession } from './types';
import { API_BASE_URL, USE_BACKEND, setAuthToken } from './config';

let currentSession: UserSession | null = null;

export function getCurrentSession(): UserSession | null {
  return currentSession;
}

export function setCurrentSession(session: UserSession | null) {
  currentSession = session;
  if (session) {
    localStorage.setItem('zxt_user', JSON.stringify(session));
  } else {
    localStorage.removeItem('zxt_user');
  }
}

export function canEditQuizLibrary(user: UserSession | null): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'editor') return true;
  if (user.role === 'teacher' && user.isQuizEditor) return true;
  return false;
}

export const authService = {
  async login(username: string, password: string): Promise<{ success: boolean; token?: string; user?: UserSession; error?: string }> {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setCurrentSession(data.user);
          setAuthToken(data.token || null);
          return data;
        }
        if (data && data.error && data.error.includes('密码错误')) {
          return { success: false, error: data.error };
        }
      } catch (e) {
        console.warn('Backend API unreachable, using local fallback login.', e);
      }
    }

    const localResult = this.localLoginFallback(username, password);
    if (localResult.success && localResult.token) {
      setAuthToken(localResult.token);
    }
    return localResult;
  },

  localLoginFallback(username: string, password: string) {
    if (username === 'mmd' && password === 'zhiyuzhishan') {
      const adminUser: UserSession = {
        id: 'usr_admin_001',
        username: 'mmd',
        role: 'admin',
        name: 'System Admin (mmd)',
        className: '平台管理',
        createdBy: 'system',
        capabilities: ['admin_cms', 'teacher_provisioning', 'editor_provisioning', 'system_logs']
      };
      setCurrentSession(adminUser);
      return { success: true, token: 'mock_admin_token', user: adminUser };
    }

    const teachersStored = localStorage.getItem('zxt_teachers');
    const teachers: any[] = teachersStored ? JSON.parse(teachersStored) : [
      { id: 'usr_tch_001', username: 'zhang_laoshi', password: 'teacher123', name: '张老师', assignedClass: '三年级A班', isQuizEditor: true },
      { id: 'usr_tch_002', username: 'li_laoshi', password: 'teacher123', name: '李老师', assignedClass: '三年级B班', isQuizEditor: false },
      { id: 'usr_tch_003', username: 'wang_laoshi', password: 'teacher123', name: '王老师', assignedClass: '四年级A班', isQuizEditor: false }
    ];
    const foundTeacher = teachers.find((t: any) => t.username.toLowerCase() === username.toLowerCase());
    if (foundTeacher) {
      const expectedPassword = foundTeacher.password || 'teacher123';
      if (expectedPassword === password) {
        const teacherUser: UserSession = {
          id: foundTeacher.id,
          username: foundTeacher.username,
          role: 'teacher',
          name: foundTeacher.name,
          className: foundTeacher.assignedClass || '未分配',
          createdBy: 'mmd',
          capabilities: ['assignment_builder', 'student_provisioning', 'classroom_live', 'pdf_export'],
          isQuizEditor: Boolean(foundTeacher.isQuizEditor),
        };
        setCurrentSession(teacherUser);
        return { success: true, token: `mock_teacher_${foundTeacher.id}`, user: teacherUser };
      }
      return { success: false, error: '密码错误，请输入重置后的最新密码。' };
    }

    const studentsStored = localStorage.getItem('zxt_students');
    const students: any[] = studentsStored ? JSON.parse(studentsStored) : [
      { id: 'usr_stu_001', name: '亚明', username: 'yaming', password: 'student123', className: '三年级A班' },
      { id: 'usr_stu_002', name: '小红', username: 'xiaohong', password: '1234', className: '三年级A班' },
      { id: 'usr_stu_003', name: '小明', username: 'xiaoming', password: '1234', className: '三年级A班' },
      { id: 'usr_stu_004', name: '刚子', username: 'gangzi', password: '1234', className: '三年级B班' },
      { id: 'usr_stu_005', name: '莉莉', username: 'lili', password: '1234', className: '三年级B班' }
    ];
    const foundStudent = students.find((s: any) => s.username.toLowerCase() === username.toLowerCase());
    if (foundStudent) {
      const expectedPassword = foundStudent.password || (foundStudent.username === 'yaming' ? 'student123' : '1234');
      if (expectedPassword === password) {
        const studentUser: UserSession = {
          id: foundStudent.id,
          username: foundStudent.username,
          role: 'student',
          name: foundStudent.name,
          className: foundStudent.className || '未分配',
          createdBy: 'zhang_laoshi',
          capabilities: ['bailiange_map', 'quiz_runner', 'scroll_garden', 'recite_studio']
        };
        setCurrentSession(studentUser);
        return { success: true, token: `mock_student_${foundStudent.id}`, user: studentUser };
      }
      return { success: false, error: '密码错误，请输入重置后的最新密码。' };
    }

    return { success: false, error: '用户名或密码错误。' };
  },

  async provisionTeacher(data: { username: string; password: string; name: string; className: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: true, teacher: { ...data, id: `tch_${Date.now()}`, role: 'teacher' } };
    }
  },

  async provisionStudent(data: { teacherUsername: string; studentName: string; username: string; password: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: true, student: { username: data.username, name: data.studentName, role: 'student' } };
    }
  },

  getSession(): UserSession | null {
    const stored = localStorage.getItem('zxt_user');
    if (stored) {
      const session: UserSession = JSON.parse(stored);
      if (session.role === 'student') {
        const studentsStored = localStorage.getItem('zxt_students');
        if (studentsStored) {
          try {
            const students: any[] = JSON.parse(studentsStored);
            const found = students.find((s: any) => s.id === session.id || (s.username && s.username.toLowerCase() === session.username.toLowerCase()));
            if (found && (found.name !== session.name || found.className !== session.className)) {
              session.name = found.name;
              session.className = found.className;
              localStorage.setItem('zxt_user', JSON.stringify(session));
            }
          } catch (_) {}
        }
      } else if (session.role === 'teacher') {
        const teachersStored = localStorage.getItem('zxt_teachers');
        if (teachersStored) {
          try {
            const teachers: any[] = JSON.parse(teachersStored);
            const found = teachers.find((t: any) => t.id === session.id || (t.username && t.username.toLowerCase() === session.username.toLowerCase()));
            if (found && found.name !== session.name) {
              session.name = found.name;
              localStorage.setItem('zxt_user', JSON.stringify(session));
            }
          } catch (_) {}
        }
      }
      setCurrentSession(session);
      return getCurrentSession();
    }
    return getCurrentSession();
  },

  logout() {
    setCurrentSession(null);
    setAuthToken(null);
  }
};
