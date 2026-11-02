import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, asc, or } from 'drizzle-orm'
import { practiceRecords, user, practice, account, session as sessionTable } from './db/schema'
import { hashPassword, verifyPassword, createToken, verifyToken, JWT_SECRET_FALLBACK } from './auth'

type Bindings = {
  DB: D1Database
  V2_CACHE_KV?: KVNamespace
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
}

type Variables = {
  user: any
  token: string
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173', 
  'http://localhost:5174', 
  'http://127.0.0.1:5174', 
  'http://localhost:5175', 
  'http://127.0.0.1:5175', 
  'http://localhost:5176', 
  'http://127.0.0.1:5176', 
  'http://localhost:3000', 
  'http://127.0.0.1:3000', 
  'https://timathon.github.io', 
  'https://epv2.vibequizzing.com',
  'http://epv2.vibequizzing.com'
]

let cachedMappedPractices: any[] | null = null;

// ─── Anti-scraping Encryption Helpers ───────────────────────────────────────
const OBSCURE_KEY = 'english-practices-secret-key-2026';

function bytesToBase64(bytes: Uint8Array): string {
    let binString = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binString += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binString);
}

function encryptContent(contentObj: any, key: string): string {
    const jsonStr = JSON.stringify(contentObj);
    const bytes = new TextEncoder().encode(jsonStr);
    const keyBytes = new TextEncoder().encode(key);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] ^= keyBytes[i % keyBytes.length];
    }
    return bytesToBase64(bytes);
}

app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return 'https://epv2.vibequizzing.com';
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return origin;
    }
    return 'https://epv2.vibequizzing.com';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'x-requested-with'],
  credentials: true,
  exposeHeaders: ['Set-Cookie']
}))

app.onError((err, c) => {
  console.error("Worker Error:", err.message);
  console.error("Stack:", err.stack);
  
  const origin = c.req.header('Origin')
  if (origin && (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Credentials', 'true')
  }
  
  return c.text('Internal Server Error: ' + err.message, 500);
})

function getBearerToken(c: any): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const cookieHeader = c.req.header('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
    const parts = cookie.split('=');
    if (parts[0]) {
      acc[parts[0].trim()] = (parts[1] || '').trim();
    }
    return acc;
  }, {});
  return cookies['better-auth.session_token'] || cookies['better-auth.session_token.local'] || null;
}

// ─── Lightweight Auth Middleware ───────────────────────────────────────────
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  
  if (path.startsWith('/api/auth') || path === '/api/setup') {
    return await next();
  }

  const token = getBearerToken(c);
  if (token) {
    const secret = c.env.BETTER_AUTH_SECRET || JWT_SECRET_FALLBACK;
    const db = drizzle(c.env.DB);
    const kvKey = `sess:${token}`;
    let currentUser: any = null;

    // 1. Check KV cache first (Fast Path)
    if (c.env.V2_CACHE_KV) {
      try {
        const cachedStr = await c.env.V2_CACHE_KV.get(kvKey);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          currentUser = cached.currentUser;
        }
      } catch (e) {
        console.warn("KV get error for session:", e);
      }
    }

    // 2. Decode JWT or fallback to DB session table (for backward-compatible migration)
    if (!currentUser) {
      const payload = await verifyToken(token, secret);
      if (payload && payload.sub) {
        const userRows = await db.select().from(user).where(eq(user.id, payload.sub));
        if (userRows.length > 0) {
          currentUser = userRows[0];
        }
      } else {
        // Fallback check legacy sessionTable
        const sessRows = await db.select().from(sessionTable).where(eq(sessionTable.token, token));
        if (sessRows.length > 0) {
          const userRows = await db.select().from(user).where(eq(user.id, sessRows[0].userId));
          if (userRows.length > 0) {
            currentUser = userRows[0];
          }
        }
      }

      if (currentUser && c.env.V2_CACHE_KV) {
        try {
          const { mistakeState, petState, ...safeUser } = currentUser;
          await c.env.V2_CACHE_KV.put(kvKey, JSON.stringify({ currentUser: safeUser }), { expirationTtl: 300 });
        } catch (e) {
          console.warn("KV put error for session:", e);
        }
      }
    }

    if (currentUser) {
      // Testdrive usage window limits
      if (currentUser.role === 'testdrive') {
        if (currentUser.username !== 'test0') {
          const now = Date.now();
          const oneHourMs = 1 * 60 * 60 * 1000;
          const twentyMinsMs = 20 * 60 * 1000;
          const todayStr = new Date(now).toISOString().split('T')[0];
          
          let windowStart = currentUser.testdriveWindowStart ? new Date(currentUser.testdriveWindowStart).getTime() : 0;
          
          if (windowStart === 0 || (now - windowStart) >= oneHourMs) {
            let currentCount = typeof currentUser.testdriveCount === 'number' ? currentUser.testdriveCount : parseInt(currentUser.testdriveCount as any);
            if (isNaN(currentCount)) currentCount = 30;

            if (currentCount <= 0) {
              return c.json({ error: "No testdrives left. Please contact the administrator.", reason: "testdrive_quota_exhausted" }, 403);
            }

            let dailyLimit = typeof currentUser.testdriveDailyLimit === 'number' ? currentUser.testdriveDailyLimit : 5;
            const lastDate = currentUser.testdriveLastDate;
            if (lastDate !== todayStr) {
              dailyLimit = 5;
            }

            if (dailyLimit <= 0) {
              return c.json({ 
                error: "Daily testdrive limit reached (5/day). Please come back tomorrow.", 
                reason: "testdrive_daily_limit_reached" 
              }, 403);
            }

            await db.update(user).set({ 
              testdriveWindowStart: new Date(now),
              testdriveCount: currentCount - 1,
              testdriveDailyLimit: dailyLimit - 1,
              testdriveLastDate: todayStr
            }).where(eq(user.id, currentUser.id));

            if (c.env.V2_CACHE_KV) await c.env.V2_CACHE_KV.delete(kvKey);
          } else if ((now - windowStart) >= twentyMinsMs) {
            const nextAvailable = new Date(windowStart + oneHourMs);
            return c.json({ 
              error: "Your 20-minute testdrive session has expired. Please come back in 1 hour.", 
              reason: "testdrive_expired",
              nextAvailableAt: nextAvailable.toISOString()
            }, 403);
          }
        }
      }

      c.set('user', currentUser);
      c.set('token', token);
    }
  }

  await next();
});

// Helper to get session object mimicking better-auth session shape: { user, session }
async function getSession(c: any): Promise<{ user: any; session: any } | null> {
  const existingUser = c.get('user');
  const token = c.get('token') || getBearerToken(c);
  if (existingUser && token) {
    return {
      user: existingUser,
      session: {
        id: token,
        userId: existingUser.id,
        token: token,
        sessionToken: token,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  if (!token) return null;

  const secret = c.env.BETTER_AUTH_SECRET || JWT_SECRET_FALLBACK;
  const db = drizzle(c.env.DB);
  let resolvedUser: any = null;

  const payload = await verifyToken(token, secret);
  if (payload && payload.sub) {
    const userRows = await db.select().from(user).where(eq(user.id, payload.sub));
    if (userRows.length > 0) resolvedUser = userRows[0];
  } else {
    const sessRows = await db.select().from(sessionTable).where(eq(sessionTable.token, token));
    if (sessRows.length > 0) {
      const userRows = await db.select().from(user).where(eq(user.id, sessRows[0].userId));
      if (userRows.length > 0) resolvedUser = userRows[0];
    }
  }

  if (!resolvedUser) return null;

  c.set('user', resolvedUser);
  c.set('token', token);

  return {
    user: resolvedUser,
    session: {
      id: token,
      userId: resolvedUser.id,
      token: token,
      sessionToken: token,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  };
}

// ─── Native Auth Endpoints ──────────────────────────────────────────────────

// 1. Sign-in with username: POST /api/auth/sign-in/username
app.post('/api/auth/sign-in/username', async (c) => {
  try {
    const body = await c.req.json();
    const { username: reqUsername, password } = body;
    if (!reqUsername || !password) {
      return c.json({ error: { message: "Username and password are required" } }, 400);
    }

    const db = drizzle(c.env.DB);
    const users = await db.select().from(user).where(eq(user.username, reqUsername));
    if (users.length === 0) {
      return c.json({ error: { message: "Invalid username or password" } }, 401);
    }

    const targetUser = users[0];
    const accounts = await db.select().from(account).where(eq(account.userId, targetUser.id));
    if (accounts.length === 0 || !accounts[0].password) {
      return c.json({ error: { message: "Account has no password configured" } }, 401);
    }

    const isValid = await verifyPassword(password, accounts[0].password);
    if (!isValid) {
      return c.json({ error: { message: "Invalid username or password" } }, 401);
    }

    const secret = c.env.BETTER_AUTH_SECRET || JWT_SECRET_FALLBACK;
    const token = await createToken({
      sub: targetUser.id,
      username: targetUser.username || targetUser.email,
      role: targetUser.role || 'user'
    }, secret);

    return c.json({
      user: targetUser,
      token,
      session: {
        id: token,
        userId: targetUser.id,
        token,
        sessionToken: token,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (err: any) {
    return c.json({ error: { message: err.message || "Sign in failed" } }, 500);
  }
});

// 2. Sign-in with email: POST /api/auth/sign-in/email
app.post('/api/auth/sign-in/email', async (c) => {
  try {
    const body = await c.req.json();
    const { email: reqEmail, password } = body;
    if (!reqEmail || !password) {
      return c.json({ error: { message: "Email and password are required" } }, 400);
    }

    const db = drizzle(c.env.DB);
    const users = await db.select().from(user).where(eq(user.email, reqEmail));
    if (users.length === 0) {
      return c.json({ error: { message: "Invalid email or password" } }, 401);
    }

    const targetUser = users[0];
    const accounts = await db.select().from(account).where(eq(account.userId, targetUser.id));
    if (accounts.length === 0 || !accounts[0].password) {
      return c.json({ error: { message: "Account has no password configured" } }, 401);
    }

    const isValid = await verifyPassword(password, accounts[0].password);
    if (!isValid) {
      return c.json({ error: { message: "Invalid email or password" } }, 401);
    }

    const secret = c.env.BETTER_AUTH_SECRET || JWT_SECRET_FALLBACK;
    const token = await createToken({
      sub: targetUser.id,
      username: targetUser.username || targetUser.email,
      role: targetUser.role || 'user'
    }, secret);

    return c.json({
      user: targetUser,
      token,
      session: {
        id: token,
        userId: targetUser.id,
        token,
        sessionToken: token,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (err: any) {
    return c.json({ error: { message: err.message || "Sign in failed" } }, 500);
  }
});

// 3. Get session: GET /api/auth/get-session
app.get('/api/auth/get-session', async (c) => {
  const session = await getSession(c);
  if (!session) {
    return c.json(null);
  }
  return c.json(session);
});

// 4. Sign out: POST /api/auth/sign-out
app.post('/api/auth/sign-out', async (c) => {
  const token = getBearerToken(c);
  if (token && c.env.V2_CACHE_KV) {
    c.executionCtx.waitUntil(c.env.V2_CACHE_KV.delete(`sess:${token}`).catch(() => {}));
  }
  return c.json({ success: true });
});

// 5. Multi-session set-active: POST /api/auth/multi-session/set-active
app.post('/api/auth/multi-session/set-active', async (c) => {
  return c.json({ success: true });
});

// 6. Sign up email: POST /api/auth/sign-up/email
app.post('/api/auth/sign-up/email', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, username: optUsername } = body;
    if (!email || !password || !name) {
      return c.json({ error: { message: "Name, email and password are required" } }, 400);
    }

    const db = drizzle(c.env.DB);
    const existing = await db.select().from(user).where(eq(user.email, email));
    if (existing.length > 0) {
      return c.json({ error: { message: "Email already registered" } }, 400);
    }

    const userId = crypto.randomUUID();
    const now = new Date();
    const hashedPassword = await hashPassword(password);

    await db.insert(user).values({
      id: userId,
      name,
      email,
      username: optUsername || email,
      displayUsername: optUsername || name,
      role: 'user',
      emailVerified: true,
      createdAt: now,
      updatedAt: now
    });

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    });

    const secret = c.env.BETTER_AUTH_SECRET || JWT_SECRET_FALLBACK;
    const token = await createToken({
      sub: userId,
      username: optUsername || email,
      role: 'user'
    }, secret);

    const createdUsers = await db.select().from(user).where(eq(user.id, userId));
    const createdUser = createdUsers[0];

    return c.json({
      user: createdUser,
      token,
      session: {
        id: token,
        userId: createdUser.id,
        token,
        sessionToken: token,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (err: any) {
    return c.json({ error: { message: err.message || "Sign up failed" } }, 500);
  }
});

// ─── Application Endpoints ──────────────────────────────────────────────────

app.get('/api/me', async (c) => {
  const session = await getSession(c);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json(session.user);
})

app.post('/api/setup', async (c) => {
  try {
    const db = drizzle(c.env.DB)
    const now = new Date();

    let adminCreated = false;
    const existing = await db.select().from(user).where(eq(user.username, "adminx"))
    if (existing.length === 0) {
      const adminId = crypto.randomUUID();
      const hashedAdminPassword = await hashPassword("adminy");

      await db.insert(user).values({
        id: adminId,
        email: "adminx@system.local",
        name: "Admin",
        username: "adminx",
        displayUsername: "adminx",
        role: "admin",
        emailVerified: true,
        createdAt: now,
        updatedAt: now
      });

      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: adminId,
        providerId: 'credential',
        userId: adminId,
        password: hashedAdminPassword,
        createdAt: now,
        updatedAt: now
      });

      adminCreated = true;
    }

    // Seed testdrive account: test0 / abcd5678
    const testdriveExisting = await db.select().from(user).where(eq(user.username, "test0"))
    if (testdriveExisting.length === 0) {
      const test0Id = crypto.randomUUID();
      const hashedTest0Password = await hashPassword("abcd5678");

      await db.insert(user).values({
        id: test0Id,
        email: "test0@system.local",
        name: "Testdrive User",
        username: "test0",
        displayUsername: "test0",
        role: "testdrive",
        emailVerified: true,
        createdAt: now,
        updatedAt: now
      });

      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: test0Id,
        providerId: 'credential',
        userId: test0Id,
        password: hashedTest0Password,
        createdAt: now,
        updatedAt: now
      });
    }

    return c.json({ msg: "Setup complete", adminCreated })
  } catch (e: any) {
    return c.json({ error: e.stack || e.message }, 500)
  }
})

app.get('/api/admin/users', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB)
  const users = await db.select({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      textbooks: user.textbooks,
      subscriptionExpiry: user.subscriptionExpiry,
      createdAt: user.createdAt
  }).from(user)
  
  const parsedUsers = users.map(u => {
      let tbs = u.textbooks;
      if (typeof tbs === 'string') {
          try { tbs = JSON.parse(tbs) } catch { tbs = [] }
      }
      return { ...u, textbooks: tbs };
  });

  return c.json(parsedUsers)
})

app.post('/api/admin/users', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  try {
    const body = await c.req.json()
    if (!body.username || !body.password) {
      return c.json({ error: 'Username and password are required' }, 400)
    }

    const db = drizzle(c.env.DB)
    const existing = await db.select().from(user).where(eq(user.username, body.username))
    if (existing.length > 0) {
      return c.json({ error: 'Username already taken' }, 400)
    }

    const userId = crypto.randomUUID()
    const now = new Date()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    const hashedPassword = await hashPassword(body.password)

    await db.insert(user).values({
      id: userId,
      email: `${body.username}@system.local`,
      name: body.username,
      username: body.username,
      displayUsername: body.username,
      role: 'user',
      subscriptionExpiry: expiry,
      emailVerified: true,
      createdAt: now,
      updatedAt: now
    })

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    })

    const newUserRows = await db.select().from(user).where(eq(user.id, userId))
    return c.json({
      user: {
        ...newUserRows[0],
        subscriptionExpiry: expiry
      }
    })
  } catch (err: any) {
    console.error("Create User Error:", err.message)
    return c.json({ error: err.message || 'Internal Server Error' }, 500)
  }
})

app.delete('/api/admin/users/:id', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const idString = c.req.param('id')
  const db = drizzle(c.env.DB)

  try {
    await db.delete(sessionTable).where(eq(sessionTable.userId, idString))
    await db.delete(account).where(eq(account.userId, idString))
    await db.delete(practiceRecords).where(eq(practiceRecords.userId, idString))
  } catch (err) {
    console.warn("Minor: Cleanup of related records failed:", err);
  }

  await db.delete(user).where(eq(user.id, idString))
  return c.json({ success: true })
})

app.put('/api/admin/users/:id/textbooks', async (c) => {
  try {
    const session = await getSession(c)
    if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
    
    const idString = c.req.param('id')
    const { textbooks, subscriptionExpiry } = await c.req.json()
    const db = drizzle(c.env.DB)
    
    await db.update(user).set({ 
      textbooks,
      subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : null
    }).where(eq(user.id, idString))
    return c.json({ success: true })
  } catch (err: any) {
    console.error("Update User Access Error:", err.message);
    return c.json({ error: err.message }, 500);
  }
})

app.put('/api/admin/users/:id/password', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const userId = c.req.param('id')
  const { password: newPassword } = await c.req.json()
  if (!newPassword || newPassword.length < 6) return c.json({ error: 'Password too short' }, 400)

  try {
    const db = drizzle(c.env.DB)
    const users = await db.select().from(user).where(eq(user.id, userId))
    if (users.length === 0) return c.json({ error: "User not found" }, 404)

    const hashedPassword = await hashPassword(newPassword);

    const userAccounts = await db.select().from(account).where(eq(account.userId, userId))
    if (userAccounts.length > 0) {
      await db.update(account).set({
        password: hashedPassword,
        updatedAt: new Date()
      }).where(eq(account.id, userAccounts[0].id))
    } else {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    return c.json({ success: true, message: "Password updated successfully" })
  } catch (e: any) {
    console.error("Change Password Error:", e.message)
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/admin/users/:id/records', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const userId = c.req.param('id')
  const db = drizzle(c.env.DB)
  const records = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, userId))
    .orderBy(desc(practiceRecords.createdAt))
  return c.json(records)
})

app.get('/api/records', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const records = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, session.user.id))
    .orderBy(desc(practiceRecords.createdAt));
  return c.json(records);
})

app.post('/api/records', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive records are not saved to the server." }, 403);

  const body = await c.req.json();
  if (!body.unit || body.score === undefined) return c.json({ error: "Bad request" }, 400);

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  const parsedScore = typeof body.score === 'string' ? parseInt(body.score, 10) : Number(body.score);

  c.executionCtx.waitUntil(
    db.insert(practiceRecords).values({
      id,
      userId: session.user.id,
      unit: body.unit,
      score: isNaN(parsedScore) ? 0 : parsedScore,
      unfinished: body.unfinished !== undefined ? body.unfinished : false,
      answers: body.answers !== undefined ? body.answers : null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  );

  return c.json({ success: true, id });
})

app.put('/api/records/:id', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive records are not saved to the server." }, 403);

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const parsedScore = typeof body.score === 'string' ? parseInt(body.score, 10) : Number(body.score);
  const finalScore = isNaN(parsedScore) ? 0 : parsedScore;

  const existing = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.id, id));

  if (existing.length === 0) {
    if (!body.unit) return c.json({ error: "Unit is required" }, 400);
    await db.insert(practiceRecords).values({
      id,
      userId: session.user.id,
      unit: body.unit,
      score: finalScore,
      unfinished: body.unfinished !== undefined ? body.unfinished : false,
      answers: body.answers !== undefined ? body.answers : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } else {
    await db.update(practiceRecords).set({
      score: finalScore,
      unfinished: body.unfinished !== undefined ? body.unfinished : false,
      answers: body.answers !== undefined ? body.answers : null,
      updatedAt: new Date()
    })
    .where(eq(practiceRecords.id, id));
  }

  return c.json({ success: true });
})

app.get('/api/practices', async (c) => {
  const session = await getSession(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB)
  if (!cachedMappedPractices) {
      if (c.env.V2_CACHE_KV) {
          try {
              const cached = await c.env.V2_CACHE_KV.get<any[]>('practices_catalog', 'json');
              if (cached) {
                  cachedMappedPractices = cached;
              }
          } catch (e) {
              console.error("KV read failed:", e);
          }
      }

      if (!cachedMappedPractices) {
          const list = await db.select().from(practice)
          cachedMappedPractices = list.map(item => {
              const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content
              return {
                  id: item.id,
                  textbook: item.textbook,
                  unit: item.unit,
                  type: item.type,
                  title: item.title,
                  contentSnippet: content ? {
                      title: content.title || item.title,
                      level: content.level || "",
                      challengesCount: content.challenges ? content.challenges.length : 0,
                      passcode: content.passcode || ""
                  } : null
              }
          });

          if (c.env.V2_CACHE_KV) {
              c.executionCtx.waitUntil(
                  c.env.V2_CACHE_KV.put('practices_catalog', JSON.stringify(cachedMappedPractices), {
                      expirationTtl: 3600
                  }).catch(e => {
                      console.error("KV write failed:", e);
                  })
              );
          }
      }
  }

  const role = (session.user as any).role?.toLowerCase();
  if (role === 'admin' || role === 'testdrive') {
      return c.json(cachedMappedPractices)
  }

  const allowed = (session.user as any).textbooks || []
  return c.json(cachedMappedPractices.filter(p => Array.isArray(allowed) && allowed.includes(p.textbook)))
})

app.get('/api/practices/:id', async (c) => {
  const session = await getSession(c)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const db = drizzle(c.env.DB)
  const data = await db.select().from(practice).where(eq(practice.id, id))
  const item = data[0]
  
  if (!item) return c.json({ error: 'Not found' }, 404)
  
  const userRole = (session.user as any).role?.toLowerCase();
  if (userRole !== 'admin' && userRole !== 'testdrive') {
      const expiry = (session.user as any).subscriptionExpiry;
      if (expiry && new Date(expiry) < new Date()) {
          return c.json({ error: 'Subscription expired' }, 403)
      }

      const allowed = (session.user as any).textbooks || []
      if (!Array.isArray(allowed) || !allowed.includes(item.textbook)) {
          return c.json({ error: 'Access denied to this textbook' }, 403)
      }
  }

  const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
  const encryptedPayload = encryptContent(content, OBSCURE_KEY);

  return c.json({
      id: item.id,
      textbook: item.textbook,
      unit: item.unit,
      type: item.type,
      title: item.title,
      encrypted: true,
      data: encryptedPayload
  })
})

app.post('/api/admin/practices', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  try {
    const list = await c.req.json()
    if (!Array.isArray(list)) return c.json({ error: 'Payload must be an array' }, 400)

    const db = drizzle(c.env.DB)
    const BATCH_SIZE = 100
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE)
      await db.insert(practice).values(batch.map((item: any) => ({
        id: item.id,
        textbook: item.textbook,
        unit: item.unit,
        type: item.type,
        title: item.title,
        content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
        createdAt: new Date(),
        updatedAt: new Date()
      })))
    }

    cachedMappedPractices = null;
    if (c.env.V2_CACHE_KV) {
        c.executionCtx.waitUntil(
            c.env.V2_CACHE_KV.delete('practices_catalog').catch(e => {
                console.error("KV delete failed:", e);
            })
        );
    }

    return c.json({ success: true, count: list.length })
  } catch (err: any) {
    console.error("Batch insert error:", err.message)
    return c.json({ error: err.message }, 500)
  }
})

app.delete('/api/admin/practices', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB)
  await db.delete(practice)
  cachedMappedPractices = null;
  if (c.env.V2_CACHE_KV) {
      c.executionCtx.waitUntil(
          c.env.V2_CACHE_KV.delete('practices_catalog').catch(e => {
              console.error("KV delete failed:", e);
          })
      );
  }
  return c.json({ success: true })
})

app.delete('/api/admin/practices/:id', async (c) => {
  const session = await getSession(c)
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const db = drizzle(c.env.DB)
  await db.delete(practice).where(eq(practice.id, id))
  cachedMappedPractices = null;
  if (c.env.V2_CACHE_KV) {
      c.executionCtx.waitUntil(
          c.env.V2_CACHE_KV.delete('practices_catalog').catch(e => {
              console.error("KV delete failed:", e);
          })
      );
  }
  return c.json({ success: true })
})

app.get('/api/pet', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const rows = await db.select({ petState: user.petState }).from(user).where(eq(user.id, session.user.id));
  if (rows.length === 0) return c.json({ error: "User not found" }, 404);

  return c.json(rows[0].petState || null);
})

app.put('/api/pet', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive pet state is not saved to the server." }, 403);

  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const rows = await db.select({ petState: user.petState }).from(user).where(eq(user.id, session.user.id));
  const serverState = rows[0]?.petState as any;

  if (serverState && serverState.lastInteraction && body.lastInteraction) {
    const serverTime = new Date(serverState.lastInteraction).getTime();
    const clientTime = new Date(body.lastInteraction).getTime();
    if (serverTime > clientTime) {
      return c.json(serverState, 409);
    }
  }

  await db.update(user).set({
    petState: body,
    updatedAt: new Date()
  }).where(eq(user.id, session.user.id));

  return c.json({ success: true, petState: body });
})

app.get('/api/mistakes', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const rows = await db.select({ mistakeState: user.mistakeState }).from(user).where(eq(user.id, session.user.id));
  if (rows.length === 0) return c.json({ error: "User not found" }, 404);

  return c.json(rows[0].mistakeState || []);
})

app.put('/api/mistakes', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive mistakes are not saved to the server." }, 403);

  const clientMistakes = await c.req.json();
  if (!Array.isArray(clientMistakes)) return c.json({ error: "Expected array of mistakes" }, 400);

  const db = drizzle(c.env.DB);
  const rows = await db.select({ mistakeState: user.mistakeState }).from(user).where(eq(user.id, session.user.id));
  const serverMistakes: any[] = (rows[0]?.mistakeState as any[]) || [];

  const map = new Map<string, any>();
  for (const m of serverMistakes) {
    if (m && m.id) map.set(m.id, m);
  }

  for (const cm of clientMistakes) {
    if (!cm || !cm.id) continue;
    const sm = map.get(cm.id);
    if (!sm) {
      map.set(cm.id, cm);
    } else {
      const smTime = new Date(sm.updatedAt || sm.createdAt || 0).getTime();
      const cmTime = new Date(cm.updatedAt || cm.createdAt || 0).getTime();
      if (cmTime >= smTime) {
        map.set(cm.id, cm);
      }
    }
  }

  const merged = Array.from(map.values());

  await db.update(user).set({
    mistakeState: merged,
    updatedAt: new Date()
  }).where(eq(user.id, session.user.id));

  return c.json({ success: true, mistakeState: merged });
})

app.get('/api/games/schulte/leaderboard', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  
  const records = await db
    .select({
      id: practiceRecords.id,
      userId: practiceRecords.userId,
      name: user.name,
      username: user.username,
      unit: practiceRecords.unit,
      score: practiceRecords.score,
      createdAt: practiceRecords.createdAt,
    })
    .from(practiceRecords)
    .innerJoin(user, eq(practiceRecords.userId, user.id))
    .where(
      or(
        eq(practiceRecords.unit, 'game-schulte-4x4'),
        eq(practiceRecords.unit, 'game-schulte-5x5')
      )
    )
    .orderBy(asc(practiceRecords.score))
    .limit(50);

  return c.json(records);
})

app.get('/api/games/cardmatch/leaderboard', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  
  const records = await db
    .select({
      id: practiceRecords.id,
      userId: practiceRecords.userId,
      name: user.name,
      username: user.username,
      unit: practiceRecords.unit,
      score: practiceRecords.score,
      createdAt: practiceRecords.createdAt,
    })
    .from(practiceRecords)
    .innerJoin(user, eq(practiceRecords.userId, user.id))
    .where(
      or(
        eq(practiceRecords.unit, 'game-cardmatch-4'),
        eq(practiceRecords.unit, 'game-cardmatch-6'),
        eq(practiceRecords.unit, 'game-cardmatch-8')
      )
    )
    .orderBy(asc(practiceRecords.score))
    .limit(50);

  return c.json(records);
})

app.get('/api/games/tetris/leaderboard', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  
  const records = await db
    .select({
      id: practiceRecords.id,
      userId: practiceRecords.userId,
      name: user.name,
      username: user.username,
      unit: practiceRecords.unit,
      score: practiceRecords.score,
      createdAt: practiceRecords.createdAt,
    })
    .from(practiceRecords)
    .innerJoin(user, eq(practiceRecords.userId, user.id))
    .where(eq(practiceRecords.unit, 'game-tetris'))
    .orderBy(desc(practiceRecords.score))
    .limit(50);

  return c.json(records);
})

export default app
