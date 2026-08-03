// API Client connecting to Cloudflare Worker zxtapi.vibequizzing.com

export const API_BASE_URL = 'https://zxtapi.vibequizzing.com';
export const USE_BACKEND = true; // Set to true when remote worker API is running

export function parseDate(timeStr?: string): Date | null {
  if (!timeStr) return null;
  let dateStr = timeStr.trim();
  if (dateStr.includes('/')) {
    dateStr = dateStr.replace(/\//g, '-');
  }
  if (!dateStr.includes('Z') && !dateStr.includes('+')) {
    const parts = dateStr.split(' ');
    if (parts.length === 2) {
      const [dPart, tPart] = parts;
      const dSub = dPart.split('-').map(p => p.padStart(2, '0')).join('-');
      dateStr = `${dSub}T${tPart}`;
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatLocalTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const d = parseDate(timeStr);
    if (d) {
      return d.toLocaleString('zh-CN', { hour12: false });
    }
  } catch (_) {}
  return timeStr;
}

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className: string;
  createdBy: string;
  capabilities: string[];
  isQuizEditor?: boolean;
  points?: number;
  streakDays?: number;
}

export interface PoemLine {
  text: string;
  pinyin: string;
  cn?: string;
  en?: string;
  image?: string;
}

// ImageOrdering item (kept for legacy compatibility only)
export interface OrderingItem {
  image: string;
  line_index: number;
}

export type PoemQuestion =
  | {
      id: string;
      type: 'LineAssembly';
      line_index: number;
      prompt: string;
      distractor_chars: string[];
      answer: string;
      explanation?: string;
    }
  | {
      id: string;
      type: 'VerseCloze' | 'PinyinMatch' | 'TextToCn' | 'CulturalContext';
      prompt: string;
      options: string[];
      answer: number;
      explanation?: string;
      line_index?: number;
    }
  | {
      id: string;
      type: 'ImageOrdering';
      prompt: string;
      images: string[];
      explanation?: string;
    }
  | {
      id: string;
      type: 'ImageToLine';
      prompt: string;
      image: string;
      options: string[];
      answer: number;
      explanation?: string;
    };

export interface Poem {
  id: number;
  title: string;
  dynasty: string;
  author: string;
  lines: PoemLine[];
  keywords: string[];
  theme: string;
  questions?: PoemQuestion[];
}

// Default Fallback Session when offline
let currentSession: UserSession | null = null;

export const canEditQuizLibrary = (user: UserSession | null): boolean => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'editor') return true;
  if (user.role === 'teacher' && user.isQuizEditor) return true;
  return false;
};

export const apiService = {
  // Login Endpoint
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
          currentSession = data.user;
          localStorage.setItem('zxt_user', JSON.stringify(data.user));
          return data;
        }
        if (data && data.error && data.error.includes('密码错误')) {
          return { success: false, error: data.error };
        }
      } catch (e) {
        console.warn('Backend API unreachable, using local fallback login.', e);
      }
    }

    // Check local roster fallback
    const localResult = this.localLoginFallback(username, password);
    return localResult;
  },

  // Fallback Login Logic
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
      currentSession = adminUser;
      localStorage.setItem('zxt_user', JSON.stringify(adminUser));
      return { success: true, token: 'mock_admin_token', user: adminUser };
    }

    // Dynamic Teacher authentication check against stored roster
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
        currentSession = teacherUser;
        localStorage.setItem('zxt_user', JSON.stringify(teacherUser));
        return { success: true, token: `mock_teacher_${foundTeacher.id}`, user: teacherUser };
      }
      return { success: false, error: '密码错误，请输入重置后的最新密码。' };
    }

    // Dynamic Student authentication check against stored roster
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
        currentSession = studentUser;
        localStorage.setItem('zxt_user', JSON.stringify(studentUser));
        return { success: true, token: `mock_student_${foundStudent.id}`, user: studentUser };
      }
      return { success: false, error: '密码错误，请输入重置后的最新密码。' };
    }

    return { success: false, error: '用户名或密码错误。' };
  },

  // Provision Teacher
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

  // Provision Student
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

  // Get Poems List for 白莲阁 — fetches from remote D1 API, falls back to localStorage
  async getPoems(): Promise<Poem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blg/poems`);
      if (res.ok) {
        const data = await res.json() as { poems?: Poem[] };
        if (data.poems && Array.isArray(data.poems)) {
          const poems = [...data.poems].sort((a, b) => a.id - b.id);
          // Cache remotely-fetched data for offline use
          localStorage.setItem('zxt_quiz_library', JSON.stringify(poems));
          return poems;
        }
      }
    } catch (e) {
      console.warn('Remote API unavailable, using local quiz library.', e);
    }
    return this.getQuizLibrary();
  },

  // Get Current Session
  getSession(): UserSession | null {
    const stored = localStorage.getItem('zxt_user');
    if (stored) {
      const session: UserSession = JSON.parse(stored);
      // Sync latest student/teacher profile name & className if updated in roster
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
      currentSession = session;
      return currentSession;
    }
    return currentSession;
  },

  // --- QUIZ LIBRARY (localStorage DB) ---

  // Seed an empty library into localStorage (called only when offline with no cache)
  seedQuizLibrary(): Poem[] {
    const existing = localStorage.getItem('zxt_quiz_library');
    if (existing) {
      try { return JSON.parse(existing); } catch { /* fall through */ }
    }
    return [];
  },

  // Get full quiz library (offline localStorage fallback)
  getQuizLibrary(): Poem[] {
    const stored = localStorage.getItem('zxt_quiz_library');
    if (!stored) return this.seedQuizLibrary();
    try {
      const poems = JSON.parse(stored);
      return [...poems].sort((a, b) => a.id - b.id);
    } catch (e) {
      return this.seedQuizLibrary();
    }
  },

  // Save the entire quiz library back to localStorage
  saveQuizLibrary(poems: Poem[]) {
    localStorage.setItem('zxt_quiz_library', JSON.stringify(poems));
  },

  // Save questions for a single poem (patch into localStorage + persist to remote D1)
  savePoemQuestions(poemId: number, questions: PoemQuestion[]) {
    const library = this.getQuizLibrary();
    const updated = library.map(p => p.id === poemId ? { ...p, questions } : p);
    this.saveQuizLibrary(updated);
    // Legacy key kept for quiz-engine compatibility
    localStorage.setItem(`zxt_questions_poem_${poemId}`, JSON.stringify(questions));
    // Persist to remote D1 so all users see the change
    fetch(`${API_BASE_URL}/api/blg/poems/${poemId}/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    }).catch(e => console.warn('Failed to save questions to remote D1:', e));
  },

  // Get questions for a single poem (from library)
  getPoemQuestions(poemId: number): PoemQuestion[] | null {
    const library = this.getQuizLibrary();
    const poem = library.find(p => p.id === poemId);
    return poem?.questions ?? null;
  },

  // --- ROLE-BASED SERVICES & DB-BACKED STATE ---

  // Get Classes Roster (Admin / Teacher) — D1 DB Backed
  async getClasses() {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/classes`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.classes && Array.isArray(data.classes)) {
            localStorage.setItem('zxt_classes', JSON.stringify(data.classes));
            return data.classes;
          }
        }
      } catch (err) {
        console.warn('Backend classes fetch failed, falling back to cache:', err);
      }
    }
    return this.getClassesSync();
  },

  getClassesSync() {
    const defaultClasses = [
      { id: 'c1', name: '三年级A班', teacherName: '张老师', teacherId: 'usr_tch_001', studentCount: 3 },
      { id: 'c2', name: '三年级B班', teacherName: '李老师', teacherId: 'usr_tch_002', studentCount: 2 },
      { id: 'c3', name: '四年级A班', teacherName: '王老师', teacherId: 'usr_tch_003', studentCount: 0 }
    ];
    const stored = localStorage.getItem('zxt_classes');
    const classes = stored ? JSON.parse(stored) : defaultClasses;
    const studentsStored = localStorage.getItem('zxt_students');
    const students: any[] = studentsStored ? JSON.parse(studentsStored) : [];
    return classes.map((c: any) => ({
      ...c,
      studentCount: students.filter((s: any) => s.className === c.name).length
    }));
  },

  // Save Classes Roster (Admin)
  async saveClasses(classes: any[]) {
    localStorage.setItem('zxt_classes', JSON.stringify(classes));
    if (USE_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/api/admin/classes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classes })
        });
      } catch (err) {
        console.warn('Failed to sync classes to backend:', err);
      }
    }
  },

  // Create New Class (Admin)
  async addClass(className: string, defaultTeacherId?: string, defaultTeacherName?: string) {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/classes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: className, teacherName: defaultTeacherName, teacherId: defaultTeacherId })
        });
        if (res.ok) {
          return await this.getClasses();
        }
      } catch (err) {
        console.warn('Failed to add class on backend:', err);
      }
    }
    const current = this.getClassesSync();
    const newClass = {
      id: `c_${Date.now()}`,
      name: className,
      teacherName: defaultTeacherName || '未指定教师',
      teacherId: defaultTeacherId || '',
      studentCount: 0
    };
    const updated = [...current, newClass];
    await this.saveClasses(updated);
    return updated;
  },

  // Get Teachers List (Admin) — D1 DB Backed
  async getTeachers() {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/teachers`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.teachers && Array.isArray(data.teachers)) {
            localStorage.setItem('zxt_teachers', JSON.stringify(data.teachers));
            return data.teachers;
          }
        }
      } catch (err) {
        console.warn('Backend teachers fetch failed, falling back to cache:', err);
      }
    }

    const defaultTeachers = [
      { id: 'usr_tch_001', username: 'zhang_laoshi', password: 'teacher123', name: '张老师', assignedClass: '三年级A班', isQuizEditor: true },
      { id: 'usr_tch_002', username: 'li_laoshi', password: 'teacher123', name: '李老师', assignedClass: '三年级B班', isQuizEditor: false },
      { id: 'usr_tch_003', username: 'wang_laoshi', password: 'teacher123', name: '王老师', assignedClass: '四年级A班', isQuizEditor: false }
    ];
    const stored = localStorage.getItem('zxt_teachers');
    return stored ? JSON.parse(stored) : defaultTeachers;
  },

  // Save Teachers List (Admin)
  async saveTeachers(teachers: any[]) {
    localStorage.setItem('zxt_teachers', JSON.stringify(teachers));
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teachers })
        });
        if (!res.ok) {
          console.warn('Backend teachers sync endpoint returned status:', res.status);
        }
      } catch (err) {
        console.warn('Failed to sync teachers to backend:', err);
      }
    }
  },

  // Get Students List (Admin / Teacher) — D1 DB Backed
  async getStudents(className?: string) {
    if (USE_BACKEND) {
      try {
        const url = className
          ? `${API_BASE_URL}/api/teacher/students?className=${encodeURIComponent(className)}`
          : `${API_BASE_URL}/api/teacher/students`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.students && Array.isArray(data.students)) {
            localStorage.setItem('zxt_students', JSON.stringify(data.students));
            return className ? data.students.filter((s: any) => s.className === className) : data.students;
          }
        }
      } catch (err) {
        console.warn('Backend students fetch failed, falling back to cache:', err);
      }
    }

    const defaultStudents = [
      { id: 'usr_stu_001', name: '亚明', username: 'yaming', password: 'student123', className: '三年级A班', completedQuizzes: 8, avgScore: 92 },
      { id: 'usr_stu_002', name: '小红', username: 'xiaohong', password: '1234', className: '三年级A班', completedQuizzes: 6, avgScore: 85 },
      { id: 'usr_stu_003', name: '小明', username: 'xiaoming', password: '1234', className: '三年级A班', completedQuizzes: 10, avgScore: 98 },
      { id: 'usr_stu_004', name: '刚子', username: 'gangzi', password: '1234', className: '三年级B班', completedQuizzes: 4, avgScore: 78 },
      { id: 'usr_stu_005', name: '莉莉', username: 'lili', password: '1234', className: '三年级B班', completedQuizzes: 7, avgScore: 90 }
    ];
    const stored = localStorage.getItem('zxt_students');
    const all = stored ? JSON.parse(stored) : defaultStudents;
    return className ? all.filter((s: any) => s.className === className) : all;
  },

  // Save Students List (Admin)
  async saveStudents(students: any[]) {
    localStorage.setItem('zxt_students', JSON.stringify(students));
    const userStored = localStorage.getItem('zxt_user');
    if (userStored) {
      try {
        const userObj: UserSession = JSON.parse(userStored);
        if (userObj.role === 'student') {
          const match = students.find((s: any) => s.id === userObj.id || (s.username && s.username.toLowerCase() === userObj.username.toLowerCase()));
          if (match) {
            userObj.name = match.name;
            userObj.className = match.className;
            currentSession = userObj;
            localStorage.setItem('zxt_user', JSON.stringify(userObj));
          }
        }
      } catch (_) {}
    }

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students })
        });
        if (!res.ok) {
          console.warn('Backend students sync endpoint returned status:', res.status);
        }
      } catch (err) {
        console.warn('Failed to sync students to backend:', err);
      }
    }
  },

  // Get Assignments for Class — D1 DB Backed with per-student completion overlay
  async getAssignments(className: string = '三年级A班'): Promise<any[]> {
    const studentUser = this.getSession();
    const studentId = studentUser?.id || 'usr_stu_001';
    const completedKey = `zxt_completed_asgns_${studentId}`;
    const completedStored = localStorage.getItem(completedKey);
    const completedIds: string[] = completedStored ? JSON.parse(completedStored) : [];

    let rawAssignments: any[] = [];

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assignments?className=${encodeURIComponent(className)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.assignments && Array.isArray(data.assignments)) {
            rawAssignments = data.assignments;
            localStorage.setItem('zxt_assignments', JSON.stringify(data.assignments));
          }
        }
      } catch (err) {
        console.warn('Backend assignments fetch failed, falling back to cache:', err);
      }
    }

    if (rawAssignments.length === 0) {
      const stored = localStorage.getItem('zxt_assignments');
      if (!stored || stored.includes('asgn_01') || stored.includes('asgn_02')) {
        localStorage.setItem('zxt_assignments', JSON.stringify([]));
        return [];
      }
      const all = JSON.parse(stored);
      rawAssignments = all.filter((a: any) => a.className === className);
    }

    return rawAssignments.map((a: any) => {
      const isDone = a.status === '已打卡' || completedIds.includes(a.id);
      return isDone ? { ...a, status: '已打卡' } : a;
    });
  },

  // Create Assignment (Teacher)
  async createAssignment(assignment: { className: string; poemId: number; poemTitle: string; dueDate: string; requirement: string; questionIds?: string[] }) {
    let createdAsgn = {
      id: `asgn_${Date.now()}`,
      classId: 'c1',
      className: assignment.className,
      poemId: assignment.poemId,
      poemTitle: assignment.poemTitle,
      dueDate: assignment.dueDate,
      status: '待完成',
      requirement: assignment.requirement,
      questionIds: assignment.questionIds || []
    };

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createdAsgn)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.assignment) {
            createdAsgn = data.assignment;
          }
        }
      } catch (err) {
        console.warn('Failed to create assignment on backend:', err);
      }
    }

    const stored = localStorage.getItem('zxt_assignments');
    const all: any[] = (stored && !stored.includes('asgn_01') && !stored.includes('asgn_02')) ? JSON.parse(stored) : [];
    // Replace if exists, otherwise push
    const idx = all.findIndex((a: any) => a.id === createdAsgn.id);
    if (idx !== -1) {
      all[idx] = createdAsgn;
    } else {
      all.push(createdAsgn);
    }
    localStorage.setItem('zxt_assignments', JSON.stringify(all));

    return createdAsgn;
  },

  // Mark Assignment Completed (Student)
  async markAssignmentCompleted(asgnId: string, score: number = 100) {
    const studentUser = this.getSession();
    const studentId = studentUser?.id || 'usr_stu_001';
    const completedKey = `zxt_completed_asgns_${studentId}`;
    const completedStored = localStorage.getItem(completedKey);
    const completedIds: string[] = completedStored ? JSON.parse(completedStored) : [];
    if (!completedIds.includes(asgnId)) {
      completedIds.push(asgnId);
      localStorage.setItem(completedKey, JSON.stringify(completedIds));
    }

    const stored = localStorage.getItem('zxt_assignments');
    if (stored) {
      try {
        const all = JSON.parse(stored);
        const updated = all.map((a: any) => a.id === asgnId ? { ...a, status: '已打卡', score } : a);
        localStorage.setItem('zxt_assignments', JSON.stringify(updated));
      } catch (_) {}
    }

    if (USE_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/api/assignments/${asgnId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: '已打卡', score })
        });
      } catch (err) {
        console.warn('Failed to update assignment status on backend:', err);
      }
    }
  },

  // Get Student Quiz History (Student / Teacher) — D1 DB Backed
  async getQuizHistory(studentId: string = 'usr_stu_001') {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/history?studentId=${encodeURIComponent(studentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.history && Array.isArray(data.history)) {
            localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(data.history));
            return data.history;
          }
        }
      } catch (err) {
        console.warn('Backend quiz history fetch failed, using cache:', err);
      }
    }

    const defaultHistory = [
      { id: 'qh_001', poemTitle: '池上', poemId: 1, score: 50, accuracy: '50%', quizType: '班级作业闯关', completedAt: '2026/7/27 21:14:16' }
    ];
    const stored = localStorage.getItem(`zxt_qh_${studentId}`);
    if (!stored) {
      localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(defaultHistory));
      return defaultHistory;
    }
    return JSON.parse(stored);
  },

  // Record Quiz Result (Student)
  async recordQuizResult(studentId: string, result: { poemTitle: string; poemId: number; score: number; accuracy: string; quizType: string; details?: any[]; assignmentId?: string }) {
    const history = await this.getQuizHistory(studentId);
    const newRecord = {
      id: `qh_${Date.now()}`,
      ...result,
      completedAt: new Date().toLocaleString('zh-CN', { hour12: false })
    };
    history.unshift(newRecord);
    localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(history));

    let pointBreakdown: any = null;

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            ...result,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.pointBreakdown) {
            pointBreakdown = data.pointBreakdown;

            // Update local user session points
            if (currentSession && data.pointBreakdown.newTotalPoints !== undefined) {
              currentSession.points = data.pointBreakdown.newTotalPoints;
              localStorage.setItem('zxt_user', JSON.stringify(currentSession));
            }
          }
        }
      } catch (err) {
        console.error('Failed to save quiz history to remote DB:', err);
      }
    }

    // Fallback local point calculation if backend was unreachable or disabled
    if (!pointBreakdown) {
      const numScore = Number(result.score) || 0;
      const targetPoemId = result.poemId;
      // Check previous attempts for this specific poem
      const poemHistory = history.filter((h: any) => h.poemId === targetPoemId || h.poemTitle === result.poemTitle);
      const isFirstAttempt = poemHistory.length <= 1; // including newRecord pushed at head

      let accBonus = 0;
      if (numScore >= 100) accBonus = 25;
      else if (numScore >= 90) accBonus = 20;
      else if (numScore >= 80) accBonus = 15;
      else if (numScore >= 70) accBonus = 5;

      const basePts = isFirstAttempt ? 20 : 0;
      const timelyPts = isFirstAttempt ? 10 : 0;
      const total = basePts + timelyPts + accBonus;

      const currPts = currentSession?.points || 120;
      const newTotal = currPts + total;
      if (currentSession) {
        currentSession.points = newTotal;
        localStorage.setItem('zxt_user', JSON.stringify(currentSession));
      }

      pointBreakdown = {
        basePoints: basePts,
        timelyBonus: timelyPts,
        accuracyBonus: accBonus,
        totalEarnedPoints: total,
        newTotalPoints: newTotal,
        isLockedToday: numScore >= 100,
        isFirstAttempt,
        historicalHighestScore: numScore
      };
    }

    return pointBreakdown;
  },

  // Get Class Learning Progress - Learnt Poem IDs (Sync local storage reader)
  getLearntPoemIdsSync(className: string = '三年级A班'): number[] {
    const defaultLearnt = [1, 2, 3, 4, 9, 17, 69];
    const stored = localStorage.getItem(`zxt_learnt_${className}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(Number);
        }
      } catch (_) {}
    }
    return defaultLearnt;
  },

  // Get Class Learning Progress — D1 DB Backed
  async getLearntPoemIds(className: string = '三年级A班'): Promise<number[]> {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}/progress`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.learntPoemIds && Array.isArray(data.learntPoemIds) && data.learntPoemIds.length > 0) {
            const numIds = data.learntPoemIds.map(Number);
            localStorage.setItem(`zxt_learnt_${className}`, JSON.stringify(numIds));
            return numIds;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch class progress from DB:', err);
      }
    }
    return this.getLearntPoemIdsSync(className);
  },

  // Save Class Learning Progress to DB with timeout (30s default)
  async saveLearntPoemIdsToDB(className: string, learntPoemIds: number[], timeoutMs = 30000): Promise<boolean> {
    if (!USE_BACKEND) return true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(className)}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learntPoemIds }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return true;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('网络连接超时 (30秒)，已放弃云端同步');
      }
      throw err;
    }
  },

  // Toggle Poem Learnt Status (Teacher) — D1 DB Backed
  async togglePoemLearntStatus(className: string, poemId: number): Promise<number[]> {
    const current = this.getLearntPoemIdsSync(className);
    let updated: number[];
    if (current.includes(poemId)) {
      updated = current.filter(id => id !== poemId);
    } else {
      updated = [...current, poemId];
    }
    localStorage.setItem(`zxt_learnt_${className}`, JSON.stringify(updated));
    await this.saveLearntPoemIdsToDB(className, updated, 30000);
    return updated;
  },

  // Logout
  logout() {
    currentSession = null;
    localStorage.removeItem('zxt_user');
  }
};
