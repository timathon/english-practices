import { Hono } from 'hono';
import { AppContext } from '../types';
import { initDB } from '../db';
import { hashPassword, authGuard, requireRole } from '../auth';

export const admin = new Hono<AppContext>();

// Admin API: Provision New Teacher Account (D1 DB Backed)
admin.post('/api/admin/teachers', authGuard, requireRole('admin'), async (c) => {
  try {
    const { username, password, name, className } = await c.req.json();
    if (!username || !password || !name) {
      return c.json({ error: 'Missing required fields (username, password, name)' }, 400);
    }

    const db = c.env.zxt_poems_db;
    await initDB(db);

    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').bind(username).first();
    if (existing) {
      return c.json({ error: 'Teacher username already exists' }, 409);
    }

    const pHash = await hashPassword(password);
    const newId = `usr_tch_${Date.now()}`;
    const now = new Date().toISOString();

    await db.prepare(
      'INSERT INTO users (id, username, password_hash, role, name, class_name, created_by, is_quiz_editor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(newId, username, pHash, 'teacher', name, className || '一般班级', 'mmd', 0, now).run();

    return c.json({
      success: true,
      teacher: {
        id: newId,
        username,
        password,
        role: 'teacher',
        name,
        assignedClass: className || '一般班级'
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to provision teacher' }, 500);
  }
});

// Admin API: List All Teachers (D1 DB Backed)
admin.get('/api/admin/teachers', authGuard, requireRole('admin'), async (c) => {
  const db = c.env.zxt_poems_db;
  await initDB(db);

  const { results } = await db.prepare(
    'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC'
  ).bind('teacher').all<{
    id: string;
    username: string;
    name: string;
    class_name: string;
    is_quiz_editor: number;
  }>();

  const teachers = results.map(r => ({
    id: r.id,
    username: r.username,
    name: r.name,
    assignedClass: r.class_name,
    isQuizEditor: Boolean(r.is_quiz_editor)
  }));

  return c.json({ teachers });
});

// Teacher API: Provision Batch Student Account (D1 DB Backed)
admin.post('/api/teacher/students', authGuard, requireRole('teacher', 'admin'), async (c) => {
  try {
    const { teacherUsername, studentName, username, password } = await c.req.json();
    if (!username || !password || !studentName) {
      return c.json({ error: 'Student username, password, and studentName required' }, 400);
    }

    const db = c.env.zxt_poems_db;
    await initDB(db);

    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').bind(username).first();
    if (existing) {
      return c.json({ error: 'Student username already exists' }, 409);
    }

    const teacher = await db.prepare('SELECT class_name FROM users WHERE LOWER(username) = LOWER(?)').bind(teacherUsername || 'zhang_laoshi').first<{ class_name: string }>();

    const pHash = await hashPassword(password);
    const newId = `usr_stu_${Date.now()}`;
    const now = new Date().toISOString();
    const studentClass = teacher?.class_name || '三年级A班';

    await db.prepare(
      'INSERT INTO users (id, username, password_hash, role, name, class_name, created_by, is_quiz_editor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(newId, username, pHash, 'student', studentName, studentClass, teacherUsername || 'zhang_laoshi', 0, now).run();

    return c.json({
      success: true,
      student: {
        id: newId,
        username,
        name: studentName,
        password,
        className: studentClass,
        completedQuizzes: 0,
        avgScore: 0
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to provision student' }, 500);
  }
});

// Teacher API: List Students Roster (D1 DB Backed)
admin.get('/api/teacher/students', async (c) => {
  const className = c.req.query('className');
  const db = c.env.zxt_poems_db;
  await initDB(db);

  let query = 'SELECT * FROM users WHERE role = ?';
  const params: any[] = ['student'];

  if (className) {
    query += ' AND class_name = ?';
    params.push(className);
  }
  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const { results } = await (params.length > 1 ? stmt.bind(...params) : stmt.bind(params[0])).all<{
    id: string;
    username: string;
    name: string;
    class_name: string;
  }>();

  const students = results.map(r => ({
    id: r.id,
    username: r.username,
    name: r.name,
    className: r.class_name,
    completedQuizzes: 0,
    avgScore: 0
  }));

  return c.json({ students });
});

// Admin/Teacher API: Batch Sync / Update Students (D1 DB Backed)
admin.put('/api/admin/students', authGuard, requireRole('admin', 'teacher'), async (c) => {
  try {
    const { students } = await c.req.json();
    if (!students || !Array.isArray(students)) {
      return c.json({ error: 'Array of students required' }, 400);
    }
    const db = c.env.zxt_poems_db;
    await initDB(db);

    for (const stu of students) {
      if (!stu.username && !stu.id) continue;
      const existing = await db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(username) = LOWER(?)')
        .bind(stu.id || '', (stu.username || '').toLowerCase())
        .first();

      if (existing) {
        if (stu.password) {
          const pHash = await hashPassword(stu.password);
          await db.prepare(
            'UPDATE users SET name = ?, username = ?, class_name = ?, password_hash = ? WHERE id = ?'
          ).bind(stu.name, stu.username, stu.className || '未分配', pHash, existing.id).run();
        } else {
          await db.prepare(
            'UPDATE users SET name = ?, username = ?, class_name = ? WHERE id = ?'
          ).bind(stu.name, stu.username, stu.className || '未分配', existing.id).run();
        }
      } else {
        const pHash = await hashPassword(stu.password || '1234');
        const newId = stu.id || `usr_stu_${Date.now()}`;
        const now = new Date().toISOString();
        await db.prepare(
          'INSERT INTO users (id, username, password_hash, role, name, class_name, created_by, is_quiz_editor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(newId, stu.username, pHash, 'student', stu.name, stu.className || '未分配', 'admin', 0, now).run();
      }
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to sync students' }, 500);
  }
});

// Admin API: Batch Sync / Update Teachers (D1 DB Backed)
admin.put('/api/admin/teachers', authGuard, requireRole('admin'), async (c) => {
  try {
    const { teachers } = await c.req.json();
    if (!teachers || !Array.isArray(teachers)) {
      return c.json({ error: 'Array of teachers required' }, 400);
    }
    const db = c.env.zxt_poems_db;
    await initDB(db);

    for (const tch of teachers) {
      if (!tch.username && !tch.id) continue;
      const existing = await db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(username) = LOWER(?)')
        .bind(tch.id || '', (tch.username || '').toLowerCase())
        .first();

      const isQuizEditor = tch.isQuizEditor ? 1 : 0;
      const assignedClass = Array.isArray(tch.assignedClasses) ? tch.assignedClasses.join(', ') : (tch.assignedClass || '一般班级');

      if (existing) {
        if (tch.password) {
          const pHash = await hashPassword(tch.password);
          await db.prepare(
            'UPDATE users SET name = ?, username = ?, class_name = ?, is_quiz_editor = ?, password_hash = ? WHERE id = ?'
          ).bind(tch.name, tch.username, assignedClass, isQuizEditor, pHash, existing.id).run();
        } else {
          await db.prepare(
            'UPDATE users SET name = ?, username = ?, class_name = ?, is_quiz_editor = ? WHERE id = ?'
          ).bind(tch.name, tch.username, assignedClass, isQuizEditor, existing.id).run();
        }
      } else {
        const pHash = await hashPassword(tch.password || 'teacher123');
        const newId = tch.id || `usr_tch_${Date.now()}`;
        const now = new Date().toISOString();
        await db.prepare(
          'INSERT INTO users (id, username, password_hash, role, name, class_name, created_by, is_quiz_editor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(newId, tch.username, pHash, 'teacher', tch.name, assignedClass, 'admin', isQuizEditor, now).run();
      }
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to sync teachers' }, 500);
  }
});

// Admin/Teacher API: List Classes (D1 DB Backed)
admin.get('/api/admin/classes', async (c) => {
  const db = c.env.zxt_poems_db;
  await initDB(db);

  const { results: rawClasses } = await db.prepare('SELECT * FROM classes ORDER BY name ASC').all<{
    id: string;
    name: string;
    teacher_name: string;
    teacher_id: string;
  }>();

  const { results: studentCounts } = await db.prepare(
    "SELECT class_name, COUNT(*) as cnt FROM users WHERE role = 'student' GROUP BY class_name"
  ).all<{ class_name: string; cnt: number }>();

  const countMap = new Map(studentCounts.map(r => [r.class_name, r.cnt]));

  const classes = rawClasses.map(c => ({
    id: c.id,
    name: c.name,
    teacherName: c.teacher_name || '未指定教师',
    teacherId: c.teacher_id || '',
    studentCount: countMap.get(c.name) || 0
  }));

  return c.json({ classes });
});

// Admin API: Add Class (D1 DB Backed)
admin.post('/api/admin/classes', authGuard, requireRole('admin'), async (c) => {
  try {
    const { name, teacherName, teacherId } = await c.req.json();
    if (!name) return c.json({ error: 'Class name is required' }, 400);

    const db = c.env.zxt_poems_db;
    await initDB(db);

    const newId = `c_${Date.now()}`;
    const now = new Date().toISOString();

    await db.prepare(
      'INSERT INTO classes (id, name, teacher_name, teacher_id, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(newId, name, teacherName || '未指定教师', teacherId || '', now).run();

    return c.json({
      success: true,
      classItem: {
        id: newId,
        name,
        teacherName: teacherName || '未指定教师',
        teacherId: teacherId || '',
        studentCount: 0
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to add class' }, 500);
  }
});

// Admin API: Batch Sync Classes (D1 DB Backed)
admin.put('/api/admin/classes', authGuard, requireRole('admin'), async (c) => {
  try {
    const { classes } = await c.req.json();
    if (!classes || !Array.isArray(classes)) return c.json({ error: 'Classes array required' }, 400);

    const db = c.env.zxt_poems_db;
    await initDB(db);

    const now = new Date().toISOString();
    for (const item of classes) {
      if (!item.name) continue;
      const cid = item.id || `c_${Date.now()}`;
      await db.prepare(
        'INSERT INTO classes (id, name, teacher_name, teacher_id, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET teacher_name = excluded.teacher_name, teacher_id = excluded.teacher_id'
      ).bind(cid, item.name, item.teacherName || '未指定教师', item.teacherId || '', now).run();
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to sync classes' }, 500);
  }
});

export default admin;
