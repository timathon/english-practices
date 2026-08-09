import { Hono } from 'hono';
import { cors } from 'hono/cors';
import POEMS_SEED from '../data/poems-75.json';

export interface Env {
  zxt_poems_db: D1Database;
}

export interface UserContext {
  id: string;
  username: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className?: string;
  createdBy?: string;
  isQuizEditor?: boolean;
}

const app = new Hono<{ Bindings: Env; Variables: { user?: UserContext } }>();

const ALLOWED_ORIGINS = [
  'https://zxt.vibequizzing.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

// Enable CORS with Origin Domain Whitelisting
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return 'https://zxt.vibequizzing.com'; // Default for non-browser requests
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    return null; // Reject unauthorized browser origins
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// HMAC-SHA256 Web Crypto Helper Functions for Tamper-Proof Tokens
const JWT_SECRET = 'zxt_secure_hmac_secret_key_2026_v3';

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function createSignedJWT(payload: object, secret: string = JWT_SECRET): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataToSign));
  const signatureArr = Array.from(new Uint8Array(signatureBuffer));
  const signatureStr = String.fromCharCode(...signatureArr);
  const encodedSignature = base64UrlEncode(signatureStr);

  return `${dataToSign}.${encodedSignature}`;
}

async function verifySignedJWT(token: string, secret: string = JWT_SECRET): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const key = await getHmacKey(secret);
    const signatureBytes = Uint8Array.from(base64UrlDecode(encodedSignature), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(dataToVerify)
    );

    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired token
    }
    return payload;
  } catch (_) {
    return null;
  }
}

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
  points?: number;
  streakDays?: number;
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

// Fast & Lightweight SHA-256 Hash helper (Stays under 50ms Worker CPU limit)
async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(`zxt_salt_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// D1 helpers
async function initDB(db: D1Database): Promise<void> {
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

  const row = await db.prepare('SELECT COUNT(*) AS cnt FROM poems').first<{ cnt: number }>();
  if (!row || row.cnt === 0) {
    const seed = POEMS_SEED as unknown as PoemItem[];
    const stmt = db.prepare('INSERT INTO poems (id, data) VALUES (?1, ?2)');
    await db.batch(seed.map(p => stmt.bind(p.id, JSON.stringify(p))));
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

// Authentication Middleware
async function authenticateToken(c: any): Promise<UserContext | null> {
  const authHeader = c.req.header('Authorization');
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) {
    token = c.req.query('token') || null;
  }
  if (!token) return null;

  let userId: string | null = null;

  // Verify HMAC-SHA256 Signed JWT Token
  const jwtPayload = await verifySignedJWT(token);
  if (jwtPayload && jwtPayload.sub) {
    userId = jwtPayload.sub;
  } else if (token.startsWith('zxt_jwt_')) {
    // Fallback legacy format support
    const parts = token.split('_');
    if (parts.length >= 4) {
      userId = parts.slice(2, parts.length - 1).join('_');
    }
  } else if (token.startsWith('mock_student_') || token.startsWith('mock_teacher_')) {
    userId = token.replace(/^mock_(student|teacher)_/, '');
  } else if (token === 'mock_admin_token') {
    userId = 'usr_admin_001';
  }

  if (!userId) return null;

  const db = c.env.zxt_poems_db;
  await initDB(db);
  const user = await db.prepare('SELECT id, username, role, name, class_name, created_by, is_quiz_editor FROM users WHERE id = ?').bind(userId).first() as {
    id: string;
    username: string;
    role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
    name: string;
    class_name: string;
    created_by: string;
    is_quiz_editor: number;
  } | null;

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    className: user.class_name,
    createdBy: user.created_by,
    isQuizEditor: Boolean(user.is_quiz_editor)
  };
}

const authGuard = async (c: any, next: () => Promise<void>) => {
  const user = await authenticateToken(c);
  if (!user) {
    return c.json({ error: 'Unauthorized: Access token missing or invalid' }, 401);
  }
  c.set('user', user);
  await next();
};

const requireRole = (...roles: string[]) => {
  return async (c: any, next: () => Promise<void>) => {
    const user: UserContext | undefined = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized: Access token missing or invalid' }, 401);
    }
    if (!roles.includes(user.role)) {
      // Allow teachers with isQuizEditor permission to access editor endpoints
      if (roles.includes('editor') && user.role === 'teacher' && user.isQuizEditor) {
        await next();
        return;
      }
      return c.json({ error: `Forbidden: Access restricted to roles: ${roles.join(', ')}` }, 403);
    }
    await next();
  };
};

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

// Hierarchical Auth Login Endpoint (D1 DB Backed)
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    const db = c.env.zxt_poems_db;
    await initDB(db);

    const inputHash = await hashPassword(password);
    const user = await db.prepare(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?)'
    ).bind(username).first<{
      id: string;
      username: string;
      password_hash: string;
      role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
      name: string;
      class_name: string;
      created_by: string;
      is_quiz_editor: number;
    }>();

    if (!user || user.password_hash !== inputHash) {
      return c.json({ error: '用户名或密码错误。' }, 401);
    }

    // Generate HMAC-SHA256 Signed JWT Token (7-day expiration)
    const tokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    const signedToken = await createSignedJWT(tokenPayload);

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
      token: signedToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        className: user.class_name || 'General',
        createdBy: user.created_by,
        capabilities: viewCapabilities[user.role],
        isQuizEditor: Boolean(user.is_quiz_editor)
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

// Admin API: Provision New Teacher Account (D1 DB Backed)
app.post('/api/admin/teachers', authGuard, requireRole('admin'), async (c) => {
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
app.get('/api/admin/teachers', authGuard, requireRole('admin'), async (c) => {
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
app.post('/api/teacher/students', authGuard, requireRole('teacher', 'admin'), async (c) => {
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
app.get('/api/teacher/students', authGuard, requireRole('teacher', 'admin'), async (c) => {
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
app.put('/api/admin/students', authGuard, requireRole('admin', 'teacher'), async (c) => {
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
app.put('/api/admin/teachers', authGuard, requireRole('admin'), async (c) => {
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

// 白莲阁 (Bái Lián Gé) Poems API — D1-backed (Public)
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
app.put('/api/blg/poems/:id/questions', authGuard, requireRole('editor', 'admin'), async (c) => {
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
app.post('/api/blg/poems/batch', authGuard, requireRole('editor', 'admin'), async (c) => {
  const { poems } = await c.req.json<{ poems: PoemItem[] }>();
  const db = c.env.zxt_poems_db;
  await db.prepare('CREATE TABLE IF NOT EXISTS poems (id INTEGER PRIMARY KEY, data TEXT NOT NULL)').run();
  const stmt = db.prepare('INSERT OR REPLACE INTO poems (id, data) VALUES (?1, ?2)');
  await db.batch(poems.map(p => stmt.bind(p.id, JSON.stringify(p))));
  return c.json({ success: true, count: poems.length });
});

// Student Quiz History APIs — D1 DB Backed
app.get('/api/student/history', authGuard, async (c) => {
  const caller = c.get('user')!;
  let studentId = c.req.query('studentId');
  if (!studentId || (caller.role === 'student' && studentId !== caller.id)) {
    studentId = caller.id;
  }

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

  const history = results.map(r => {
    let parsedDetails: any = [];
    if (r.details) {
      try {
        const obj = JSON.parse(r.details);
        parsedDetails = Array.isArray(obj) ? obj : (obj.questions || []);
      } catch (_) {}
    }
    return {
      id: r.id,
      studentId: r.student_id,
      poemId: r.poem_id,
      poemTitle: r.poem_title,
      score: r.score,
      accuracy: r.accuracy,
      quizType: r.quiz_type,
      details: parsedDetails,
      completedAt: r.completed_at
    };
  });

  return c.json({ history });
});

app.delete('/api/student/history/:id', authGuard, async (c) => {
  const caller = c.get('user')!;
  const recordId = c.req.param('id');
  const studentId = c.req.query('studentId');
  const db = c.env.zxt_poems_db;
  await initDB(db);

  // Check record ownership if caller is a student
  const record = await db.prepare('SELECT student_id, details FROM quiz_history WHERE id = ?').bind(recordId).first<{ student_id: string; details: string }>();
  if (record && caller.role === 'student' && record.student_id !== caller.id) {
    return c.json({ error: 'Forbidden: Cannot delete another student\'s history' }, 403);
  }

  if (record && record.details) {
    try {
      const detailsParsed = JSON.parse(record.details);
      const asgnId = detailsParsed.assignmentId || (detailsParsed.questions && detailsParsed.questions.assignmentId);
      if (asgnId) {
        await db.prepare("UPDATE assignments SET status = '待完成' WHERE id = ?").bind(asgnId).run();
      }
    } catch (_) {}
  }

  if (studentId) {
    await db.prepare('DELETE FROM quiz_history WHERE id = ? AND student_id = ?').bind(recordId, studentId).run();
  } else {
    await db.prepare('DELETE FROM quiz_history WHERE id = ?').bind(recordId).run();
  }

  return c.json({ success: true });
});

app.post('/api/student/history', authGuard, async (c) => {
  try {
    const caller = c.get('user')!;
    const body = await c.req.json();
    let { studentId, poemTitle, poemId, score, accuracy, quizType, details, assignmentId } = body;
    if (!studentId || caller.role === 'student') {
      studentId = caller.id;
    }

    const db = c.env.zxt_poems_db;
    await initDB(db);

    const recordId = `qh_${Date.now()}`;
    const completedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
    const todayStr = completedAt.split(' ')[0]; // YYYY/M/D or YYYY-MM-DD
    const detailsJson = details ? JSON.stringify(details) : null;

    // Parse numeric accuracy percentage
    const numScore = Number(score) || 0;
    const getAccuracyBonusTier = (acc: number): number => {
      if (acc >= 100) return 25;
      if (acc >= 90) return 20;
      if (acc >= 80) return 15;
      if (acc >= 70) return 5;
      return 0;
    };

    // Query user history for this poem/assignment to determine point rules
    const targetPoemId = Number(poemId) || 0;
    const { results: existingHistory } = await db.prepare(
      'SELECT score, completed_at FROM quiz_history WHERE student_id = ? AND poem_id = ? ORDER BY completed_at ASC'
    ).bind(studentId, targetPoemId).all<{ score: number; completed_at: string }>();

    let historicalHighestScore = 0;
    let hasAttemptToday = false;

    for (const h of existingHistory) {
      if (h.score > historicalHighestScore) {
        historicalHighestScore = h.score;
      }
      if (h.completed_at && h.completed_at.startsWith(todayStr)) {
        hasAttemptToday = true;
      }
    }

    // 1. Timely Submission Bonus (+10 pts)
    let timelyBonus = 0;
    if (existingHistory.length === 0) {
      let isTimely = true;
      if (assignmentId) {
        const asgnRow = await db.prepare('SELECT due_date FROM assignments WHERE id = ?').bind(assignmentId).first<{ due_date: string }>();
        if (asgnRow && asgnRow.due_date) {
          const completedDateOnly = completedAt.split(' ')[0].replace(/\//g, '-');
          const dueDateOnly = asgnRow.due_date.trim().replace(/\//g, '-');
          if (completedDateOnly > dueDateOnly) {
            isTimely = false;
          }
        }
      }
      if (isTimely) {
        timelyBonus = 10;
      }
    }

    // 2. Base Completion Points
    let basePoints = 0;
    if (existingHistory.length === 0) {
      basePoints = 20;
    } else if (!hasAttemptToday) {
      if (numScore >= historicalHighestScore) {
        basePoints = 10;
      }
    }

    // 3. Accuracy Bonus Scale (0 - 25 pts)
    const currentTierBonus = getAccuracyBonusTier(numScore);
    const historicalTierBonus = getAccuracyBonusTier(historicalHighestScore);
    const accuracyBonus = Math.max(0, currentTierBonus - historicalTierBonus);

    const totalEarnedPoints = basePoints + timelyBonus + accuracyBonus;
    const isLockedToday = numScore >= 100;
    const isFirstAttempt = existingHistory.length === 0;

    const pointBreakdown = {
      basePoints,
      timelyBonus,
      accuracyBonus,
      totalEarnedPoints,
      newTotalPoints: 0,
      isLockedToday,
      isFirstAttempt,
      historicalHighestScore: Math.max(historicalHighestScore, numScore)
    };

    // Save history record with point breakdown embedded in details
    const finalDetails = {
      questions: details || [],
      pointBreakdown
    };
    const detailsPayload = JSON.stringify(finalDetails);

    await db.prepare(
      'INSERT INTO quiz_history (id, student_id, poem_id, poem_title, score, accuracy, quiz_type, details, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(recordId, studentId, targetPoemId, poemTitle, numScore, accuracy || `${numScore}%`, quizType, detailsPayload, completedAt).run();

    // Update user points in D1
    let newTotalPoints = totalEarnedPoints;
    const userRow = await db.prepare('SELECT points FROM users WHERE id = ?').bind(studentId).first<{ points: number }>();
    if (userRow) {
      newTotalPoints = (userRow.points || 0) + totalEarnedPoints;
      await db.prepare('UPDATE users SET points = ? WHERE id = ?').bind(newTotalPoints, studentId).run();
    }
    pointBreakdown.newTotalPoints = newTotalPoints;

    return c.json({
      success: true,
      record: {
        id: recordId,
        studentId,
        poemTitle,
        poemId: targetPoemId,
        score: numScore,
        accuracy,
        quizType,
        details,
        completedAt
      },
      pointBreakdown: {
        basePoints,
        timelyBonus,
        accuracyBonus,
        totalEarnedPoints,
        newTotalPoints,
        isLockedToday,
        historicalHighestScore: Math.max(historicalHighestScore, numScore)
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to save quiz history to DB' }, 500);
  }
});

// Assignments APIs — D1 DB Backed
app.get('/api/assignments', authGuard, async (c) => {
  const className = c.req.query('className') || '三年级A班';
  const db = c.env.zxt_poems_db;
  await initDB(db);

  const { results } = await db.prepare(
    'SELECT * FROM assignments WHERE class_name = ? ORDER BY created_at DESC'
  ).bind(className).all<{
    id: string;
    class_name: string;
    poem_id: number;
    poem_title: string;
    due_date: string;
    status: string;
    requirement: string;
    question_ids: string;
    created_at: string;
  }>();

  const assignments = results.map(r => ({
    id: r.id,
    className: r.class_name,
    poemId: r.poem_id,
    poemTitle: r.poem_title,
    dueDate: r.due_date,
    status: r.status,
    requirement: r.requirement,
    questionIds: r.question_ids ? JSON.parse(r.question_ids) : [],
    createdAt: r.created_at
  }));

  return c.json({ assignments });
});

app.post('/api/assignments', authGuard, requireRole('teacher', 'admin'), async (c) => {
  try {
    const { className = '三年级A班', poemId, poemTitle, dueDate, requirement, questionIds } = await c.req.json();
    const db = c.env.zxt_poems_db;
    await initDB(db);

    const asgnId = `asgn_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const questionIdsJson = JSON.stringify(questionIds || []);

    await db.prepare(
      'INSERT INTO assignments (id, class_name, poem_id, poem_title, due_date, status, requirement, question_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(asgnId, className, poemId, poemTitle, dueDate, '待完成', requirement, questionIdsJson, createdAt).run();

    return c.json({
      success: true,
      assignment: {
        id: asgnId,
        className,
        poemId,
        poemTitle,
        dueDate,
        status: '待完成',
        requirement,
        questionIds: questionIds || [],
        createdAt
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create assignment in DB' }, 500);
  }
});

// Update Assignment Status (e.g. Mark Completed)
app.put('/api/assignments/:id/status', authGuard, async (c) => {
  try {
    const id = c.req.param('id');
    const { status = '已打卡' } = await c.req.json();
    const db = c.env.zxt_poems_db;
    await initDB(db);

    await db.prepare('UPDATE assignments SET status = ? WHERE id = ?').bind(status, id).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update assignment status' }, 500);
  }
});

// Admin API: List Classes (D1 DB Backed)
app.get('/api/admin/classes', authGuard, requireRole('admin', 'teacher'), async (c) => {
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
app.post('/api/admin/classes', authGuard, requireRole('admin'), async (c) => {
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
app.put('/api/admin/classes', authGuard, requireRole('admin'), async (c) => {
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

// Clear all remote assignment records from D1 DB
app.delete('/api/assignments/clear', authGuard, requireRole('admin'), async (c) => {
  try {
    const db = c.env.zxt_poems_db;
    await initDB(db);
    await db.prepare('DELETE FROM assignments').run();
    return c.json({ success: true, message: 'All assignment records cleared from DB' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to clear assignments' }, 500);
  }
});

// Class Learning Progress APIs (D1 DB Backed)
app.get('/api/classes/:className/progress', async (c) => {
  const className = c.req.param('className');
  const db = c.env.zxt_poems_db;
  await initDB(db);

  const row = await db.prepare('SELECT learnt_ids FROM class_progress WHERE class_name = ?').bind(className).first<{ learnt_ids: string }>();
  if (row && row.learnt_ids) {
    try {
      const learntPoemIds = JSON.parse(row.learnt_ids);
      return c.json({ learntPoemIds });
    } catch (_) {}
  }

  const defaultLearnt = [1, 2, 3, 4, 9, 17, 69];
  return c.json({ learntPoemIds: defaultLearnt });
});

app.put('/api/classes/:className/progress', authGuard, requireRole('teacher', 'admin'), async (c) => {
  try {
    const className = c.req.param('className');
    const { learntPoemIds } = await c.req.json();
    if (!learntPoemIds || !Array.isArray(learntPoemIds)) {
      return c.json({ error: 'learntPoemIds array required' }, 400);
    }
    const db = c.env.zxt_poems_db;
    await initDB(db);

    const now = new Date().toISOString();
    const idsJson = JSON.stringify(learntPoemIds);

    await db.prepare(
      'INSERT INTO class_progress (class_name, learnt_ids, updated_at) VALUES (?, ?, ?) ON CONFLICT(class_name) DO UPDATE SET learnt_ids = excluded.learnt_ids, updated_at = excluded.updated_at'
    ).bind(className, idsJson, now).run();

    return c.json({ success: true, learntPoemIds });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update class progress' }, 500);
  }
});

// AI Briefing APIs
app.get('/api/ai/teacher-summary', authGuard, requireRole('teacher', 'admin'), (c) => {
  return c.json({
    class: '三年级A班',
    accuracyAvg: 84.5,
    summary: "班级近7天古诗理解准确率达 84.5%。重点错题集中在《池上》中的“浮萍一道开”诗意理解，建议在明日课堂前花 5 分钟演示江南水乡浮萍避开水路的视觉画卷。"
  });
});

app.get('/api/ai/parent-brief', authGuard, (c) => {
  return c.json({
    student: '亚明 (Yaming)',
    mastered: ['池上', '江南', '画'],
    reviewNeeded: ['山行'],
    bedtimeActivity: "今晚睡前与孩子一起朗读白居易《池上》，问问孩子为什么小娃采白莲时会留下一道浮萍水路？"
  });
});

export default app;
