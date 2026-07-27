// API Client connecting to Cloudflare Worker zxtapi.vibequizzing.com
import POEMS_SEED from '../../../data/blg/poems-75.json';

export const API_BASE_URL = 'https://zxtapi.vibequizzing.com';

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
    const teachers = this.getTeachers();
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
    const students = this.getStudents();
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

  // Get Poems List for 白莲阁 (from quiz library)
  async getPoems(): Promise<Poem[]> {
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

  // Helper to ensure questions schema & contents sync with seed JSON edits
  _ensureQuestionSchema(poems: Poem[]): { poems: Poem[]; updated: boolean } {
    let updated = false;
    const seedMap = new Map((POEMS_SEED as unknown as Poem[]).map(p => [p.id, p]));
    
    for (const poem of poems) {
      const seedPoem = seedMap.get(poem.id);
      if (!seedPoem) continue;
      const seedQMap = new Map((seedPoem.questions || []).map(sq => [sq.id, sq]));

      const questions = poem.questions || [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const seedQ = seedQMap.get(q.id);

        if (seedQ) {
          // Sync explanation if JSON seed updated
          if (seedQ.explanation && seedQ.explanation !== (q as any).explanation) {
            (q as any).explanation = seedQ.explanation;
            updated = true;
          }
          // Sync prompt if JSON seed updated
          if (seedQ.prompt && seedQ.prompt !== q.prompt) {
            q.prompt = seedQ.prompt;
            updated = true;
          }
        }

        if (q.type === 'ImageOrdering') {
          if (!q.images || q.images.length === 0) {
            if (seedQ && seedQ.type === 'ImageOrdering' && seedQ.images && seedQ.images.length > 0) {
              q.images = [...seedQ.images];
            } else {
              const lineCount = poem.lines?.length || 4;
              q.images = Array.from({ length: lineCount }, (_, idx) => `/assets/blg/poems/p${poem.id}_l${idx + 1}.webp`);
            }
            updated = true;
          }
        }
      }
    }
    return { poems, updated };
  },

  // Seed the full 75-poem dataset into localStorage on first load
  seedQuizLibrary(): Poem[] {
    const existing = localStorage.getItem('zxt_quiz_library');
    let poems: Poem[];
    if (existing) {
      try {
        poems = JSON.parse(existing);
      } catch (e) {
        poems = POEMS_SEED as unknown as Poem[];
      }
    } else {
      poems = POEMS_SEED as unknown as Poem[];
    }
    const { poems: repaired, updated } = this._ensureQuestionSchema(poems);
    if (!existing || updated) {
      localStorage.setItem('zxt_quiz_library', JSON.stringify(repaired));
    }
    return repaired;
  },

  // Get full quiz library (all poems with questions)
  getQuizLibrary(): Poem[] {
    const stored = localStorage.getItem('zxt_quiz_library');
    if (!stored) return this.seedQuizLibrary();
    try {
      const poems = JSON.parse(stored);
      const { poems: repaired, updated } = this._ensureQuestionSchema(poems);
      if (updated) {
        localStorage.setItem('zxt_quiz_library', JSON.stringify(repaired));
      }
      return repaired;
    } catch (e) {
      return this.seedQuizLibrary();
    }
  },

  // Save the entire quiz library back to localStorage
  saveQuizLibrary(poems: Poem[]) {
    localStorage.setItem('zxt_quiz_library', JSON.stringify(poems));
  },

  // Save questions for a single poem (patch into the library)
  savePoemQuestions(poemId: number, questions: PoemQuestion[]) {
    const library = this.getQuizLibrary();
    const updated = library.map(p => p.id === poemId ? { ...p, questions } : p);
    this.saveQuizLibrary(updated);
    // Legacy key kept for quiz-engine compatibility
    localStorage.setItem(`zxt_questions_poem_${poemId}`, JSON.stringify(questions));
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
    const students = this.getStudents();
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

  // Get Teachers List (Admin)
  getTeachers() {
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

  // Get Students List (Admin / Teacher)
  getStudents(className?: string) {
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
  getAssignments(className: string = '三年级A班') {
    const defaultAssignments = [
      { id: 'asgn_01', classId: 'c1', className: '三年级A班', poemId: 1, poemTitle: '池上', dueDate: '2026-07-30', status: '待完成', requirement: '背诵并完成连句与填空闯关' },
      { id: 'asgn_02', classId: 'c1', className: '三年级A班', poemId: 4, poemTitle: '悯农 (其二)', dueDate: '2026-08-02', status: '待完成', requirement: '掌握诗句含义与读音辨析' },
      { id: 'asgn_03', classId: 'c1', className: '三年级A班', poemId: 9, poemTitle: '画', dueDate: '2026-07-25', status: '已打卡', score: 100 }
    ];
    const stored = localStorage.getItem('zxt_assignments');
    const all = stored ? JSON.parse(stored) : defaultAssignments;
    return all.filter((a: any) => a.className === className);
  },

  // Create Assignment (Teacher)
  createAssignment(assignment: { className: string; poemId: number; poemTitle: string; dueDate: string; requirement: string; questionIds?: string[] }) {
    const current = this.getAssignments(assignment.className);
    const newAsgn = {
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
    const stored = localStorage.getItem('zxt_assignments');
    const all = stored ? JSON.parse(stored) : [];
    all.push(newAsgn);
    localStorage.setItem('zxt_assignments', JSON.stringify(all));
    return newAsgn;
  },

  // Get Student Quiz History (Student / Teacher)
  getQuizHistory(studentId: string = 'usr_stu_001') {
    const defaultHistory = [
      { id: 'qh_01', poemTitle: '池上', poemId: 1, score: 100, accuracy: '100%', completedAt: '2026-07-26 14:30', quizType: '采莲连句闯关' },
      { id: 'qh_02', poemTitle: '江南', poemId: 2, score: 90, accuracy: '90%', completedAt: '2026-07-24 16:15', quizType: '诗句填空' },
      { id: 'qh_03', poemTitle: '画', poemId: 9, score: 100, accuracy: '100%', completedAt: '2026-07-22 10:00', quizType: '字音辨析' }
    ];
    const stored = localStorage.getItem(`zxt_qh_${studentId}`);
    return stored ? JSON.parse(stored) : defaultHistory;
  },

  // Record Quiz Result (Student)
  recordQuizResult(studentId: string, result: { poemTitle: string; poemId: number; score: number; accuracy: string; quizType: string }) {
    const history = this.getQuizHistory(studentId);
    const newRecord = {
      id: `qh_${Date.now()}`,
      ...result,
      completedAt: new Date().toLocaleString('zh-CN', { hour12: false })
    };
    history.unshift(newRecord);
    localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(history));
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
