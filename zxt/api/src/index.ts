import { Hono } from 'hono';
import { cors } from 'hono/cors';
import POEMS_SEED from '../data/poems-75.json';

export interface Env {
  zxt_poems_db: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for frontend zxt.vibequizzing.com and dev environments
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// In-Memory Storage & D1 Fallback Store for Rapid Prototyping
interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className?: string;
  createdBy: string;
  createdAt: string;
}

interface PoemLineItem {
  text: string;
  pinyin: string;
  cn?: string;
  en?: string;
  image?: string;
}

interface PoemQuestion {
  id: string;
  type: string;
  [key: string]: unknown;
}

interface PoemItem {
  id: number;
  title: string;
  dynasty: string;
  author: string;
  lines: PoemLineItem[];
  cn?: string;
  en?: string;
  keywords: string[];
  theme: string;
  questions?: PoemQuestion[];
}

// D1 helpers
async function initDB(db: D1Database): Promise<void> {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS poems (id INTEGER PRIMARY KEY, data TEXT NOT NULL)'
  ).run();
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS quiz_history (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, poem_id INTEGER, poem_title TEXT NOT NULL, score INTEGER NOT NULL, accuracy TEXT, quiz_type TEXT NOT NULL, details TEXT, completed_at TEXT NOT NULL)'
  ).run();

  const row = await db.prepare('SELECT COUNT(*) AS cnt FROM poems').first<{ cnt: number }>();
  if (!row || row.cnt === 0) {
    const seed = POEMS_SEED as unknown as PoemItem[];
    const stmt = db.prepare('INSERT INTO poems (id, data) VALUES (?1, ?2)');
    await db.batch(seed.map(p => stmt.bind(p.id, JSON.stringify(p))));
  }
}

// Initial Admin Credential & Default Seed Users
const usersStore: Map<string, UserAccount> = new Map();

// Seed Default Admin Account: username "mmd", password "zhiyuzhishan"
usersStore.set('mmd', {
  id: 'usr_admin_001',
  username: 'mmd',
  passwordHash: 'zhiyuzhishan', // Admin password
  role: 'admin',
  name: 'System Admin (mmd)',
  createdBy: 'system',
  createdAt: new Date().toISOString()
});

// Seed Default Quiz Manager / Question Editor Account: username "editor_li", password "editor123"
usersStore.set('editor_li', {
  id: 'usr_edt_001',
  username: 'editor_li',
  passwordHash: 'editor123',
  role: 'editor',
  name: '李编辑 (Quiz Editor Li)',
  className: '题目编辑组',
  createdBy: 'mmd',
  createdAt: new Date().toISOString()
});

// Seed Default Demo Accounts
usersStore.set('zhang_laoshi', {
  id: 'usr_tch_001',
  username: 'zhang_laoshi',
  passwordHash: 'teacher123',
  role: 'teacher',
  name: '张老师 (Ms. Zhang)',
  className: '三年级A班 (Grade 3 Class A)',
  createdBy: 'mmd',
  createdAt: new Date().toISOString()
});

usersStore.set('yaming', {
  id: 'usr_stu_001',
  username: 'yaming',
  passwordHash: 'student123',
  role: 'student',
  name: '亚明 (Yaming)',
  className: '三年级A班 (Grade 3 Class A)',
  createdBy: 'zhang_laoshi',
  createdAt: new Date().toISOString()
});

// Seed data reference (used only for D1 initial seeding — source of truth is D1 at runtime)
const _POEMS_SEED_REF = POEMS_SEED; // keep import alive
void _POEMS_SEED_REF;


// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    app: '知新堂 (Zhī Xīn Táng) - 白莲阁 API',
    version: '3.0.0',
    edge: 'Cloudflare Workers',
    domain: 'zxtapi.vibequizzing.com',
    timestamp: new Date().toISOString()
  });
});

// Hierarchical Auth Login Endpoint
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    const user = usersStore.get(username);
    if (!user || user.passwordHash !== password) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    // Role-based view capabilities
    const viewCapabilities = {
      admin: ['admin_cms', 'teacher_provisioning', 'editor_provisioning', 'system_logs'],
      editor: ['quiz_editor', 'distractor_builder', 'question_bank_cms', 'poem_annotator'],
      teacher: ['assignment_builder', 'student_provisioning', 'classroom_live', 'pdf_export'],
      student: ['bailiange_map', 'quiz_runner', 'scroll_garden', 'recite_studio'],
      parent: ['weekly_ai_brief', 'screentime_caps', 'bedtime_story']
    };

    return c.json({
      success: true,
      token: `zxt_jwt_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        className: user.className || 'General',
        createdBy: user.createdBy,
        capabilities: viewCapabilities[user.role]
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

// Admin API: Provision New Teacher Account
app.post('/api/admin/teachers', async (c) => {
  try {
    const { username, password, name, className } = await c.req.json();
    if (!username || !password || !name) {
      return c.json({ error: 'Missing required fields (username, password, name)' }, 400);
    }

    if (usersStore.has(username)) {
      return c.json({ error: 'Teacher username already exists' }, 409);
    }

    const newTeacher: UserAccount = {
      id: `usr_tch_${Date.now()}`,
      username,
      passwordHash: password,
      role: 'teacher',
      name,
      className: className || '一般班级',
      createdBy: 'mmd',
      createdAt: new Date().toISOString()
    };

    usersStore.set(username, newTeacher);
    return c.json({ success: true, teacher: newTeacher });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to provision teacher' }, 500);
  }
});

// Admin API: List All Teachers
app.get('/api/admin/teachers', (c) => {
  const teachers = Array.from(usersStore.values()).filter(u => u.role === 'teacher');
  return c.json({ teachers });
});

// Teacher API: Provision Batch Student & Parent Accounts
app.post('/api/teacher/students', async (c) => {
  try {
    const { teacherUsername, studentName, username, password } = await c.req.json();
    if (!username || !password || !studentName) {
      return c.json({ error: 'Student username, password, and studentName required' }, 400);
    }

    if (usersStore.has(username)) {
      return c.json({ error: 'Student username already exists' }, 409);
    }

    const teacher = usersStore.get(teacherUsername || 'zhang_laoshi');

    const newStudent: UserAccount = {
      id: `usr_stu_${Date.now()}`,
      username,
      passwordHash: password,
      role: 'student',
      name: studentName,
      className: teacher?.className || '三年级A班',
      createdBy: teacherUsername || 'zhang_laoshi',
      createdAt: new Date().toISOString()
    };

    usersStore.set(username, newStudent);

    // Also seed matching Parent View account
    const parentUsername = `p_${username}`;
    const newParent: UserAccount = {
      id: `usr_prt_${Date.now()}`,
      username: parentUsername,
      passwordHash: password,
      role: 'parent',
      name: `${studentName}家长`,
      className: teacher?.className || '三年级A班',
      createdBy: teacherUsername || 'zhang_laoshi',
      createdAt: new Date().toISOString()
    };
    usersStore.set(parentUsername, newParent);

    return c.json({ success: true, student: newStudent, parent: newParent });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to provision student' }, 500);
  }
});

// Teacher API: List Students Roster
app.get('/api/teacher/students', (c) => {
  const students = Array.from(usersStore.values()).filter(u => u.role === 'student');
  return c.json({ students });
});

// 白莲阁 (Bái Lián Gé) Poems API — D1-backed
app.get('/api/blg/poems', async (c) => {
  const db = c.env.zxt_poems_db;
  await initDB(db);
  const { results } = await db.prepare('SELECT data FROM poems ORDER BY id ASC').all<{ data: string }>();
  const poems = results.map(r => JSON.parse(r.data) as PoemItem);
  return c.json({
    module: '白莲阁 (Bái Lián Gé)',
    subtitle: '小娃撑小艇，偷采白莲回 (白居易《池上》)',
    total: poems.length,
    poems
  });
});

// Editor: save updated questions for a single poem
app.put('/api/blg/poems/:id/questions', async (c) => {
  const id = Number(c.req.param('id'));
  const { questions } = await c.req.json<{ questions: PoemQuestion[] }>();
  const db = c.env.zxt_poems_db;
  const row = await db.prepare('SELECT data FROM poems WHERE id = ?').bind(id).first<{ data: string }>();
  if (!row) return c.json({ error: 'Poem not found' }, 404);
  const poem = JSON.parse(row.data) as PoemItem;
  poem.questions = questions;
  await db.prepare('UPDATE poems SET data = ? WHERE id = ?').bind(JSON.stringify(poem), id).run();
  return c.json({ success: true });
});

// Batch replace all poems (used by push-d1-poems script)
app.post('/api/blg/poems/batch', async (c) => {
  const { poems } = await c.req.json<{ poems: PoemItem[] }>();
  const db = c.env.zxt_poems_db;
  await db.prepare('CREATE TABLE IF NOT EXISTS poems (id INTEGER PRIMARY KEY, data TEXT NOT NULL)').run();
  const stmt = db.prepare('INSERT OR REPLACE INTO poems (id, data) VALUES (?1, ?2)');
  await db.batch(poems.map(p => stmt.bind(p.id, JSON.stringify(p))));
  return c.json({ success: true, count: poems.length });
});

// Student Quiz History APIs — D1 DB Backed
app.get('/api/student/history', async (c) => {
  const studentId = c.req.query('studentId') || 'usr_stu_001';
  const db = c.env.zxt_poems_db;
  await initDB(db);
  const { results } = await db.prepare(
    'SELECT * FROM quiz_history WHERE student_id = ? ORDER BY completed_at DESC'
  ).bind(studentId).all<{
    id: string;
    student_id: string;
    poem_id: number;
    poem_title: string;
    score: number;
    accuracy: string;
    quiz_type: string;
    details: string;
    completed_at: string;
  }>();

  const history = results.map(r => ({
    id: r.id,
    studentId: r.student_id,
    poemId: r.poem_id,
    poemTitle: r.poem_title,
    score: r.score,
    accuracy: r.accuracy,
    quizType: r.quiz_type,
    details: r.details ? JSON.parse(r.details) : [],
    completedAt: r.completed_at
  }));

  return c.json({ history });
});

app.post('/api/student/history', async (c) => {
  try {
    const { studentId = 'usr_stu_001', poemTitle, poemId, score, accuracy, quizType, details } = await c.req.json();
    const db = c.env.zxt_poems_db;
    await initDB(db);

    const recordId = `qh_${Date.now()}`;
    const completedAt = new Date().toLocaleString('zh-CN', { hour12: false });
    const detailsJson = details ? JSON.stringify(details) : null;

    await db.prepare(
      'INSERT INTO quiz_history (id, student_id, poem_id, poem_title, score, accuracy, quiz_type, details, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(recordId, studentId, poemId || 0, poemTitle, score, accuracy || `${score}%`, quizType, detailsJson, completedAt).run();

    return c.json({
      success: true,
      record: {
        id: recordId,
        studentId,
        poemTitle,
        poemId,
        score,
        accuracy,
        quizType,
        details,
        completedAt
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to save quiz history to DB' }, 500);
  }
});

// AI Briefing APIs
app.get('/api/ai/teacher-summary', (c) => {
  return c.json({
    class: '三年级A班',
    accuracyAvg: 84.5,
    summary: "班级近7天古诗理解准确率达 84.5%。重点错题集中在《池上》中的“浮萍一道开”诗意理解，建议在明日课堂前花 5 分钟演示江南水乡浮萍避开水路的视觉画卷。"
  });
});

app.get('/api/ai/parent-brief', (c) => {
  return c.json({
    student: '亚明 (Yaming)',
    mastered: ['池上', '江南', '画'],
    reviewNeeded: ['山行'],
    bedtimeActivity: "今晚睡前与孩子一起朗读白居易《池上》，问问孩子为什么小娃采白莲时会留下一道浮萍水路？"
  });
});

export default app;
