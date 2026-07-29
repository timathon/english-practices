// API Client connecting to Cloudflare Worker zxtapi.vibequizzing.com

export const API_BASE_URL = 'https://zxtapi.vibequizzing.com';
export const USE_BACKEND = true; // Set to true when remote worker API is running

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className: string;
  createdBy: string;
  capabilities: string[];
  isQuizEditor?: boolean;
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
    // Check local roster first (handles locally updated/reset passwords & roles)
    const localResult = this.localLoginFallback(username, password);
    if (localResult.success) {
      return localResult;
    }
    // If local roster explicitly matched username but rejected password, return error
    if (localResult.error && localResult.error.includes('密码错误')) {
      return localResult;
    }

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
      return { success: false, error: data.error || '用户名或密码错误。' };
    } catch (e) {
      console.warn('Backend API unreachable, using local fallback login.', e);
      return localResult;
    }
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
      { id: 'usr_tch_001', username: 'zhang_laoshi', password: 'teacher123', name: '张老师 (Ms. Zhang)', assignedClass: '三年级A班', isQuizEditor: true },
      { id: 'usr_tch_002', username: 'li_laoshi', password: 'teacher123', name: '李老师 (Mr. Li)', assignedClass: '三年级B班', isQuizEditor: false },
      { id: 'usr_tch_003', username: 'wang_laoshi', password: 'teacher123', name: '王老师 (Ms. Wang)', assignedClass: '四年级A班', isQuizEditor: false }
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
      { id: 'usr_stu_001', name: '亚明 (Yaming)', username: 'yaming', password: 'student123', className: '三年级A班' },
      { id: 'usr_stu_002', name: '小红 (Xiaohong)', username: 'xiaohong', password: '1234', className: '三年级A班' },
      { id: 'usr_stu_003', name: '小明 (Xiaoming)', username: 'xiaoming', password: '1234', className: '三年级A班' },
      { id: 'usr_stu_004', name: '刚子 (Gangzi)', username: 'gangzi', password: '1234', className: '三年级B班' },
      { id: 'usr_stu_005', name: '莉莉 (Lily)', username: 'lili', password: '1234', className: '三年级B班' }
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
    if (currentSession) return currentSession;
    const stored = localStorage.getItem('zxt_user');
    if (stored) {
      currentSession = JSON.parse(stored);
      return currentSession;
    }
    return null;
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

  // --- ROLE-BASED MOCK SERVICES & LOCALSTORAGE STATE ---

  // Get Classes Roster (Admin / Teacher)
  getClasses() {
    const defaultClasses = [
      { id: 'c1', name: '三年级A班', teacherName: '张老师 (Ms. Zhang)', teacherId: 'usr_tch_001', studentCount: 3 },
      { id: 'c2', name: '三年级B班', teacherName: '李老师 (Mr. Li)', teacherId: 'usr_tch_002', studentCount: 2 },
      { id: 'c3', name: '四年级A班', teacherName: '王老师 (Ms. Wang)', teacherId: 'usr_tch_003', studentCount: 0 }
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
  saveClasses(classes: any[]) {
    localStorage.setItem('zxt_classes', JSON.stringify(classes));
  },

  // Create New Class (Admin)
  addClass(className: string, defaultTeacherId?: string, defaultTeacherName?: string) {
    const current = this.getClasses();
    const newClass = {
      id: `c_${Date.now()}`,
      name: className,
      teacherName: defaultTeacherName || '未指定教师',
      teacherId: defaultTeacherId || '',
      studentCount: 0
    };
    const updated = [...current, newClass];
    this.saveClasses(updated);
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
      { id: 'usr_tch_001', username: 'zhang_laoshi', password: 'teacher123', name: '张老师 (Ms. Zhang)', assignedClass: '三年级A班', isQuizEditor: true },
      { id: 'usr_tch_002', username: 'li_laoshi', password: 'teacher123', name: '李老师 (Mr. Li)', assignedClass: '三年级B班', isQuizEditor: false },
      { id: 'usr_tch_003', username: 'wang_laoshi', password: 'teacher123', name: '王老师 (Ms. Wang)', assignedClass: '四年级A班', isQuizEditor: false }
    ];
    const stored = localStorage.getItem('zxt_teachers');
    return stored ? JSON.parse(stored) : defaultTeachers;
  },

  // Save Teachers List (Admin)
  saveTeachers(teachers: any[]) {
    localStorage.setItem('zxt_teachers', JSON.stringify(teachers));
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
            const stored = localStorage.getItem('zxt_students');
            const localAll: any[] = stored ? JSON.parse(stored) : [];
            const otherStudents = className
              ? localAll.filter((s: any) => s.className !== className)
              : [];
            const combined = [...otherStudents, ...data.students];
            localStorage.setItem('zxt_students', JSON.stringify(combined));
            return data.students;
          }
        }
      } catch (err) {
        console.warn('Backend students fetch failed, falling back to cache:', err);
      }
    }

    const defaultStudents = [
      { id: 'usr_stu_001', name: '亚明 (Yaming)', username: 'yaming', password: 'student123', className: '三年级A班', completedQuizzes: 8, avgScore: 92 },
      { id: 'usr_stu_002', name: '小红 (Xiaohong)', username: 'xiaohong', password: '1234', className: '三年级A班', completedQuizzes: 6, avgScore: 85 },
      { id: 'usr_stu_003', name: '小明 (Xiaoming)', username: 'xiaoming', password: '1234', className: '三年级A班', completedQuizzes: 10, avgScore: 98 },
      { id: 'usr_stu_004', name: '刚子 (Gangzi)', username: 'gangzi', password: '1234', className: '三年级B班', completedQuizzes: 4, avgScore: 78 },
      { id: 'usr_stu_005', name: '莉莉 (Lily)', username: 'lili', password: '1234', className: '三年级B班', completedQuizzes: 7, avgScore: 90 }
    ];
    const stored = localStorage.getItem('zxt_students');
    const all = stored ? JSON.parse(stored) : defaultStudents;
    return className ? all.filter((s: any) => s.className === className) : all;
  },

  // Save Students List (Admin)
  saveStudents(students: any[]) {
    localStorage.setItem('zxt_students', JSON.stringify(students));
  },

  // Get Class Assignments (Student / Teacher)
  async getAssignments(className: string = '三年级A班') {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assignments?className=${encodeURIComponent(className)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.assignments && Array.isArray(data.assignments)) {
            const stored = localStorage.getItem('zxt_assignments');
            const localAll: any[] = (stored && !stored.includes('asgn_01') && !stored.includes('asgn_02')) ? JSON.parse(stored) : [];
            const otherClasses = localAll.filter((a: any) => a.className !== className);
            const combined = [...otherClasses, ...data.assignments];
            localStorage.setItem('zxt_assignments', JSON.stringify(combined));
            return data.assignments;
          }
        }
      } catch (err) {
        console.warn('Backend assignments fetch failed, falling back to cache:', err);
      }
    }

    const stored = localStorage.getItem('zxt_assignments');
    if (!stored || stored.includes('asgn_01') || stored.includes('asgn_02')) {
      localStorage.setItem('zxt_assignments', JSON.stringify([]));
      return [];
    }
    const all = JSON.parse(stored);
    return all.filter((a: any) => a.className === className);
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
          body: JSON.stringify(assignment),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.assignment) {
            createdAsgn = data.assignment;
          }
        }
      } catch (err) {
        console.error('Failed to create assignment on remote DB:', err);
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
  markAssignmentCompleted(asgnId: string, score: number = 100) {
    const stored = localStorage.getItem('zxt_assignments');
    if (!stored) return;
    const all = JSON.parse(stored);
    const updated = all.map((a: any) => a.id === asgnId ? { ...a, status: '已打卡', score } : a);
    localStorage.setItem('zxt_assignments', JSON.stringify(updated));
  },

  // Get Student Quiz History (Student / Teacher)
  getQuizHistory(studentId: string = 'usr_stu_001') {
    const defaultHistory = [
      { id: 'qh_001', poemTitle: '池上', poemId: 1, score: 50, accuracy: '50%', quizType: '班级作业闯关', completedAt: '2026/7/27 21:14:16' }
    ];

    if (USE_BACKEND) {
      fetch(`${API_BASE_URL}/api/student/history?studentId=${studentId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.history && Array.isArray(data.history)) {
            localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(data.history));
          }
        })
        .catch(() => {});
    }

    const stored = localStorage.getItem(`zxt_qh_${studentId}`);
    if (!stored) {
      localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(defaultHistory));
      return defaultHistory;
    }
    return JSON.parse(stored);
  },

  // Record Quiz Result (Student)
  recordQuizResult(studentId: string, result: { poemTitle: string; poemId: number; score: number; accuracy: string; quizType: string; details?: any[] }) {
    const history = this.getQuizHistory(studentId);
    const newRecord = {
      id: `qh_${Date.now()}`,
      ...result,
      completedAt: new Date().toLocaleString('zh-CN', { hour12: false })
    };
    history.unshift(newRecord);
    localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(history));

    if (USE_BACKEND) {
      fetch(`${API_BASE_URL}/api/student/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          ...result,
        }),
      }).catch(err => console.error('Failed to save quiz history to remote DB:', err));
    }
  },

  // Get Class Learning Progress - Learnt Poem IDs (Teacher / Student Self-Study)
  getLearntPoemIds(className: string = '三年级A班'): number[] {
    const defaultLearnt = [1, 2, 3, 4, 9, 17, 69]; // Default learnt poem IDs
    const stored = localStorage.getItem(`zxt_learnt_${className}`);
    return stored ? JSON.parse(stored) : defaultLearnt;
  },

  // Toggle Poem Learnt Status (Teacher)
  togglePoemLearntStatus(className: string, poemId: number): number[] {
    const current = this.getLearntPoemIds(className);
    let updated: number[];
    if (current.includes(poemId)) {
      updated = current.filter(id => id !== poemId);
    } else {
      updated = [...current, poemId];
    }
    localStorage.setItem(`zxt_learnt_${className}`, JSON.stringify(updated));
    return updated;
  },

  // Logout
  logout() {
    currentSession = null;
    localStorage.removeItem('zxt_user');
  }
};
