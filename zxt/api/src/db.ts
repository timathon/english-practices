import POEMS_SEED from '../data/poems-75.json';
import IDIOM_GROUPS_SEED from '../data/idiom-groups.json';
import { PoemItem } from './types';
import { hashPassword } from './crypto';

export async function initDB(db: D1Database): Promise<void> {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS poems (id INTEGER PRIMARY KEY, data TEXT NOT NULL)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS quiz_history (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, poem_id INTEGER, poem_title TEXT NOT NULL, score INTEGER NOT NULL, accuracy TEXT, quiz_type TEXT NOT NULL, details TEXT, completed_at TEXT NOT NULL)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, class_name TEXT NOT NULL, poem_id INTEGER NOT NULL, poem_title TEXT NOT NULL, due_date TEXT NOT NULL, status TEXT NOT NULL, requirement TEXT, question_ids TEXT, created_at TEXT NOT NULL)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, name TEXT NOT NULL, class_name TEXT, created_by TEXT, is_quiz_editor INTEGER DEFAULT 0, points INTEGER DEFAULT 0, streak_days INTEGER DEFAULT 0, created_at TEXT NOT NULL)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, teacher_name TEXT, teacher_id TEXT, created_at TEXT NOT NULL)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS class_progress (class_name TEXT PRIMARY KEY, learnt_ids TEXT NOT NULL, updated_at TEXT NOT NULL)'
  ).run();
  
  // Ensure points column exists in users table (Auto migration)
  try {
    await db.prepare('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0').run();
  } catch (_) {
    // Column already exists
  }

  const row = await db.prepare('SELECT COUNT(*) AS cnt FROM poems').first<{ cnt: number }>();
  if (!row || row.cnt === 0) {
    const seed = POEMS_SEED as unknown as PoemItem[];
    const stmt = db.prepare('INSERT INTO poems (id, data) VALUES (?1, ?2)');
    await db.batch(seed.map(p => stmt.bind(p.id, JSON.stringify(p))));
  }

  // Create & Seed idiom_groups table if empty
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS idiom_groups (id INTEGER PRIMARY KEY, data TEXT NOT NULL)'
  ).run();
  const idiomRow = await db.prepare('SELECT COUNT(*) AS cnt FROM idiom_groups').first<{ cnt: number }>();
  if (!idiomRow || idiomRow.cnt === 0) {
    const idiomSeed = IDIOM_GROUPS_SEED as unknown as any[];
    const stmt = db.prepare('INSERT INTO idiom_groups (id, data) VALUES (?1, ?2)');
    await db.batch(idiomSeed.map(g => stmt.bind(g.id, JSON.stringify(g))));
  }

  // Seed default classes if classes table is empty
  const classRow = await db.prepare('SELECT COUNT(*) AS cnt FROM classes').first<{ cnt: number }>();
  if (!classRow || classRow.cnt === 0) {
    const defaultClasses = [
      { id: 'c1', name: '三年级A班', teacherName: '张老师', teacherId: 'usr_tch_001' },
      { id: 'c2', name: '三年级B班', teacherName: '李老师', teacherId: 'usr_tch_002' },
      { id: 'c3', name: '四年级A班', teacherName: '王老师', teacherId: 'usr_tch_003' }
    ];
    const now = new Date().toISOString();
    for (const c of defaultClasses) {
      await db.prepare(
        'INSERT OR IGNORE INTO classes (id, name, teacher_name, teacher_id, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(c.id, c.name, c.teacherName, c.teacherId, now).run();
    }
  }

  // Seed default users if users table is empty
  const userRow = await db.prepare('SELECT COUNT(*) AS cnt FROM users').first<{ cnt: number }>();
  if (!userRow || userRow.cnt === 0) {
    const defaultUsers = [
      { id: 'usr_admin_001', username: 'mmd', pass: 'zhiyuzhishan', role: 'admin', name: 'System Admin (mmd)', className: '平台管理', createdBy: 'system', isQuizEditor: 1 },
      { id: 'usr_edt_001', username: 'editor_li', pass: 'editor123', role: 'editor', name: '李编辑 (Quiz Editor Li)', className: '题目编辑组', createdBy: 'mmd', isQuizEditor: 1 },
      { id: 'usr_tch_001', username: 'zhang_laoshi', pass: 'teacher123', role: 'teacher', name: '张老师', className: '三年级A班', createdBy: 'mmd', isQuizEditor: 1 },
      { id: 'usr_tch_002', username: 'li_laoshi', pass: 'teacher123', role: 'teacher', name: '李老师', className: '三年级B班', createdBy: 'mmd', isQuizEditor: 0 },
      { id: 'usr_tch_003', username: 'wang_laoshi', pass: 'teacher123', role: 'teacher', name: '王老师', className: '四年级A班', createdBy: 'mmd', isQuizEditor: 0 },
      { id: 'usr_stu_001', username: 'yaming', pass: 'student123', role: 'student', name: '亚明', className: '三年级A班', createdBy: 'zhang_laoshi', isQuizEditor: 0 },
      { id: 'usr_stu_002', username: 'xiaohong', pass: '1234', role: 'student', name: '小红', className: '三年级A班', createdBy: 'zhang_laoshi', isQuizEditor: 0 },
      { id: 'usr_stu_003', username: 'xiaoming', pass: '1234', role: 'student', name: '小明', className: '三年级A班', createdBy: 'zhang_laoshi', isQuizEditor: 0 },
      { id: 'usr_stu_004', username: 'gangzi', pass: '1234', role: 'student', name: '刚子', className: '三年级B班', createdBy: 'li_laoshi', isQuizEditor: 0 },
      { id: 'usr_stu_005', username: 'lili', pass: '1234', role: 'student', name: '莉莉', className: '三年级B班', createdBy: 'li_laoshi', isQuizEditor: 0 },
    ];

    const now = new Date().toISOString();
    for (const u of defaultUsers) {
      const pHash = await hashPassword(u.pass);
      await db.prepare(
        'INSERT OR IGNORE INTO users (id, username, password_hash, role, name, class_name, created_by, is_quiz_editor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(u.id, u.username, pHash, u.role, u.name, u.className, u.createdBy, u.isQuizEditor, now).run();
    }
  }
}
