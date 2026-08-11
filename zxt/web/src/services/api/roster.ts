import { UserSession } from './types';
import { API_BASE_URL, USE_BACKEND, getAuthHeaders } from './config';
import { getCurrentSession, setCurrentSession } from './auth';

export const rosterService = {
  async getClasses() {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/classes`, {
          headers: getAuthHeaders()
        });
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

  async saveClasses(classes: any[]) {
    localStorage.setItem('zxt_classes', JSON.stringify(classes));
    if (USE_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/api/admin/classes`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ classes })
        });
      } catch (err) {
        console.warn('Failed to sync classes to backend:', err);
      }
    }
  },

  async addClass(className: string, defaultTeacherId?: string, defaultTeacherName?: string) {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/classes`, {
          method: 'POST',
          headers: getAuthHeaders(),
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

  async getTeachers() {
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
          headers: getAuthHeaders()
        });
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

  async saveTeachers(teachers: any[]) {
    localStorage.setItem('zxt_teachers', JSON.stringify(teachers));
    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
          method: 'PUT',
          headers: getAuthHeaders(),
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

  async getStudents(className?: string) {
    if (USE_BACKEND) {
      try {
        const url = className
          ? `${API_BASE_URL}/api/teacher/students?className=${encodeURIComponent(className)}`
          : `${API_BASE_URL}/api/teacher/students`;
        const res = await fetch(url, {
          headers: getAuthHeaders()
        });
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
            setCurrentSession(userObj);
          }
        }
      } catch (_) {}
    }

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ students })
        });
        if (!res.ok) {
          console.warn('Backend students sync endpoint returned status:', res.status);
        }
      } catch (err) {
        console.warn('Failed to sync students to backend:', err);
      }
    }
  }
};
