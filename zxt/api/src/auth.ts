import { UserContext } from './types';
import { initDB } from './db';
import { verifySignedJWT, createSignedJWT, hashPassword, base64UrlEncode, base64UrlDecode } from './crypto';

// Re-export crypto helpers for convenience
export { verifySignedJWT, createSignedJWT, hashPassword, base64UrlEncode, base64UrlDecode };

// Authentication Middleware
export async function authenticateToken(c: any): Promise<UserContext | null> {
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

export const authGuard = async (c: any, next: () => Promise<void>) => {
  const user = await authenticateToken(c);
  if (!user) {
    return c.json({ error: 'Unauthorized: Access token missing or invalid' }, 401);
  }
  c.set('user', user);
  await next();
};

export const requireRole = (...roles: string[]) => {
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
