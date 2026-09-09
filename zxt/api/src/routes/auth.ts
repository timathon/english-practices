import { Hono } from 'hono';
import { AppContext } from '../types';
import { initDB } from '../db';
import { hashPassword, createSignedJWT } from '../auth';

export const auth = new Hono<AppContext>();

// Hierarchical Auth Login Endpoint (D1 DB Backed)
auth.post('/api/auth/login', async (c) => {
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

export default auth;
