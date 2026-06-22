import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from './auth'

type Bindings = {
  DB: D1Database
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

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

let authInstance: any = null;
let cachedMappedPractices: any[] | null = null;
const getCachedAuth = (env: Bindings) => {
  if (!authInstance) {
    authInstance = getAuth(env.DB, env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL);
  }
  return authInstance;
};

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
  
  // Set CORS headers for error responses
  const origin = c.req.header('Origin')
  if (origin && (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Credentials', 'true')
  }
  
  return c.text('Internal Server Error: ' + err.message, 500);
})

// Auth handler
app.all('/api/auth/*', (c) => {
  const auth = getCachedAuth(c.env)
  return auth.handler(c.req.raw)
})

import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, asc, or } from 'drizzle-orm'
import { practiceRecords, user, practice, account, session as sessionTable } from './db/schema'

function getSessionToken(c: any): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
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

app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  
  if (path.startsWith('/api/auth') || path === '/api/setup') {
    return await next();
  }

  const db = drizzle(c.env.DB);
  const token = getSessionToken(c);
  
  if (token) {
    const sessRows = await db.select().from(sessionTable).where(eq(sessionTable.token, token));
    if (sessRows.length > 0) {
      const dbSess = sessRows[0];
      const expiresTime = new Date(dbSess.expiresAt).getTime();
      if (expiresTime === 0) {
        // Delete revoked session
        await db.delete(sessionTable).where(eq(sessionTable.id, dbSess.id));
        return c.json({ error: "Session revoked", reason: "device_limit" }, 401);
      }

      // Check user role and testdrive window
      const userRows = await db.select().from(user).where(eq(user.id, dbSess.userId));
      if (userRows.length > 0) {
        const currentUser = userRows[0];
        
        if (currentUser.role === 'testdrive') {
          // 1. Concurrency limit for testdrive (30 devices)
          const activeSessions = await db.select()
            .from(sessionTable)
            .where(eq(sessionTable.userId, currentUser.id))
            .orderBy(desc(sessionTable.createdAt));
            
          if (activeSessions.length > 30) {
            const sessionsToRevoke = activeSessions.slice(30);
            for (const s of sessionsToRevoke) {
              await db.update(sessionTable)
                .set({ expiresAt: new Date(0) })
                .where(eq(sessionTable.id, s.id));
            }
            if (sessionsToRevoke.some(s => s.id === dbSess.id)) {
              await db.delete(sessionTable).where(eq(sessionTable.id, dbSess.id));
              return c.json({ error: "Testdrive limit reached. Please wait 15 minutes or try again later.", reason: "testdrive_limit" }, 403);
            }
          }

          // 2. Usage window limit (20m/1h) - Skip for 'test0'
          if (currentUser.username === 'test0') {
            // 'test0' has no limits
          } else {
            const now = Date.now();
            const oneHourMs = 1 * 60 * 60 * 1000;
            const twentyMinsMs = 20 * 60 * 1000;
            const todayStr = new Date(now).toISOString().split('T')[0];
            
            let windowStart = currentUser.testdriveWindowStart ? new Date(currentUser.testdriveWindowStart).getTime() : 0;
            
            if (windowStart === 0 || (now - windowStart) >= oneHourMs) {
              // Check if we need to start a new window
              let currentCount = typeof currentUser.testdriveCount === 'number' ? currentUser.testdriveCount : parseInt(currentUser.testdriveCount as any);
              if (isNaN(currentCount)) currentCount = 30;

              if (currentCount <= 0) {
                return c.json({ error: "No testdrives left. Please contact the administrator.", reason: "testdrive_quota_exhausted" }, 403);
              }

              // Check daily limit (5 per day)
              let dailyLimit = typeof currentUser.testdriveDailyLimit === 'number' ? currentUser.testdriveDailyLimit : 5;
              const lastDate = currentUser.testdriveLastDate;
              
              if (lastDate !== todayStr) {
                // New day, reset daily limit
                dailyLimit = 5;
              }

              if (dailyLimit <= 0) {
                return c.json({ 
                  error: "Daily testdrive limit reached (5/day). Please come back tomorrow.", 
                  reason: "testdrive_daily_limit_reached" 
                }, 403);
              }

              // Start a new window
              await db.update(user).set({ 
                testdriveWindowStart: new Date(now),
                testdriveCount: currentCount - 1,
                testdriveDailyLimit: dailyLimit - 1,
                testdriveLastDate: todayStr
              }).where(eq(user.id, currentUser.id));
            } else if ((now - windowStart) >= twentyMinsMs) {
              // Still in the 1-hour cooldown but passed the 20-minute usage window
              const nextAvailable = new Date(windowStart + oneHourMs);
              return c.json({ 
                error: "Your 20-minute testdrive session has expired. Please come back in 1 hour.", 
                reason: "testdrive_expired",
                nextAvailableAt: nextAvailable.toISOString()
              }, 403);
            }
          }
        } else if (currentUser.username !== 'adminx') {
          // Standard user concurrency limit (2 devices)
          const activeSessions = await db.select()
            .from(sessionTable)
            .where(eq(sessionTable.userId, currentUser.id))
            .orderBy(desc(sessionTable.createdAt));
            
          if (activeSessions.length > 2) {
            const sessionsToRevoke = activeSessions.slice(2);
            for (const s of sessionsToRevoke) {
              await db.update(sessionTable)
                .set({ expiresAt: new Date(0) })
                .where(eq(sessionTable.id, s.id));
            }
            if (sessionsToRevoke.some(s => s.id === dbSess.id)) {
              await db.delete(sessionTable).where(eq(sessionTable.id, dbSess.id));
              return c.json({ error: "Session revoked", reason: "device_limit" }, 401);
            }
          }
        }
      }
    }
  }

  await next();
});

app.get('/api/me', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json(session.user);
})

app.post('/api/setup', async (c) => {
  try {
    const auth = getCachedAuth(c.env)
    const db = drizzle(c.env.DB)

    let adminCreated = false;
    const existing = await db.select().from(user).where(eq(user.username, "adminx"))
    if (existing.length === 0) {
      const res = await auth.api.signUpEmail({
        body: {
            email: "adminx@system.local",
            password: "adminy",
            name: "Admin",
            username: "adminx"
        } as any
      })

      if (res?.user?.id) {
        await db.update(user).set({ role: "admin" }).where(eq(user.id, res.user.id))
        adminCreated = true;
      }
    }

    // Seed testdrive account: test0 / abcd5678
    const testdriveExisting = await db.select().from(user).where(eq(user.username, "test0"))
    if (testdriveExisting.length === 0) {
      await auth.api.signUpEmail({
        body: {
          email: "test0@system.local",
          password: "abcd5678",
          name: "Testdrive User",
          username: "test0"
        } as any
      }).then(async (testRes: any) => {
        if (testRes?.user?.id) {
          await db.update(user).set({ role: "testdrive" }).where(eq(user.id, testRes.user.id))
        }
      })
    }

    return c.json({ msg: "Setup complete", adminCreated })
  } catch (e: any) {
    return c.json({ error: e.stack || e.message }, 500)
  }
})

app.get('/api/admin/users', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
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
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  try {
    const body = await c.req.json()
    if (!body.username || !body.password) {
      return c.json({ error: 'Username and password are required' }, 400)
    }

    const res = await auth.api.signUpEmail({
        body: {
            email: `${body.username}@system.local`,
            password: body.password,
            name: body.username,
            username: body.username
        } as any
    })

    if (res?.user?.id) {
      const db = drizzle(c.env.DB)
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 30)
      await db.update(user).set({
        subscriptionExpiry: expiry
      }).where(eq(user.id, res.user.id))

      return c.json({
        ...res,
        user: {
          ...res.user,
          subscriptionExpiry: expiry
        }
      })
    }

    return c.json(res)
  } catch (err: any) {
    console.error("Create User Error:", err.message)
    return c.json({ error: err.message || 'Internal Server Error' }, 500)
  }
})

app.delete('/api/admin/users/:id', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const idString = c.req.param('id')
  const db = drizzle(c.env.DB)

  // Delete related records first to avoid foreign key constraint errors
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
    const auth = getCachedAuth(c.env)
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
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
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const userId = c.req.param('id')
  const { password: newPassword } = await c.req.json()
  if (!newPassword || newPassword.length < 6) return c.json({ error: 'Password too short' }, 400)

  const db = drizzle(c.env.DB)
  // We use better-auth internal hasher if possible, or just use the same logic it uses.
  // For better-auth v1, it uses Scrypt/Argon2. 
  // A cleaner way is using auth.api.setPassword if it existed, but usually it's internal.
  // Since we're in a worker, we'll try to use the auth.password.hash if exposed.
  
  try {
      const db = drizzle(c.env.DB)
      
      const users = await db.select().from(user).where(eq(user.id, userId))
      if (users.length === 0) return c.json({ error: "User not found" }, 404)
      const targetUser = users[0]

      // Shadow Hashing: Create a temp user to get a validly hashed password
      const tempId = "temp_" + Math.random().toString(36).substring(2, 10);
      const tempEmail = `${tempId}@system.local`;
      
      const tempRes = await auth.api.signUpEmail({
          body: {
              email: tempEmail,
              password: newPassword,
              name: "Temp",
              username: tempId
          } as any
      });

      if (!tempRes || !tempRes.user) {
          throw new Error("Failed to generate hash via temp user");
      }

      const tempUserId = tempRes.user.id;
      const tempAccounts = await db.select().from(account).where(eq(account.userId, tempUserId));
      
      if (tempAccounts.length === 0 || !tempAccounts[0].password) {
          throw new Error("Temp account or password hash not found");
      }

      const hashedPassword = tempAccounts[0].password;

      // Clean up temp user
      try {
          // @ts-ignore
          await db.delete(sessionTable).where(eq(sessionTable.userId, tempUserId));
          await db.delete(account).where(eq(account.userId, tempUserId));
          await db.delete(practiceRecords).where(eq(practiceRecords.userId, tempUserId));
          await db.delete(user).where(eq(user.id, tempUserId));
      } catch (cleanupErr: any) {
          console.warn("Minor: Shadow Hashing cleanup failed:", cleanupErr.message);
      }

      // Update or Create the real account
      const existingAccounts = await db.select().from(account).where(eq(account.userId, userId))
      if (existingAccounts.length > 0) {
          await db.update(account).set({ 
              password: hashedPassword,
              updatedAt: new Date()
          }).where(eq(account.userId, userId))
      } else {
          await db.insert(account).values({
              id: Math.random().toString(36).substring(2, 15),
              userId: userId,
              accountId: targetUser.email,
              providerId: "credential",
              password: hashedPassword,
              createdAt: new Date(),
              updatedAt: new Date()
          })
      }
      
      return c.json({ success: true })
  } catch (e: any) {
      console.error("Password Reset Error:", e.message);
      return c.json({ error: "Failed to reset password: " + e.message }, 500)
  }
})

app.get('/api/admin/users/:id/records', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const userId = c.req.param('id')
  const db = drizzle(c.env.DB)
  const records = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, userId))
    .orderBy(desc(practiceRecords.createdAt))
  return c.json(records)
})

app.get('/api/records', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const records = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, session.user.id))
    .orderBy(desc(practiceRecords.createdAt));
  return c.json(records);
})

app.post('/api/records', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive records are not saved to the server." }, 403);

  const body = await c.req.json();
  if (!body.unit || body.score === undefined) return c.json({ error: "Bad request" }, 400);

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(practiceRecords).values({
    id,
    userId: session.user.id,
    unit: body.unit,
    score: body.score,
    unfinished: body.unfinished !== undefined ? body.unfinished : false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return c.json({ success: true, id });
})

app.put('/api/records/:id', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive records are not saved to the server." }, 403);

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.id, id));

  if (existing && existing.length > 0) {
    const record = existing[0];
    const isFinished = !record.unfinished;
    const nextUnfinished = isFinished ? false : (body.unfinished !== undefined ? body.unfinished : false);
    const nextScore = (isFinished && record.score > body.score) ? record.score : body.score;

    await db.update(practiceRecords).set({
        score: nextScore,
        unfinished: nextUnfinished,
        updatedAt: new Date()
    })
    .where(eq(practiceRecords.id, id));
  } else {
    await db.update(practiceRecords).set({
        score: body.score,
        unfinished: body.unfinished !== undefined ? body.unfinished : false,
        updatedAt: new Date()
    })
    .where(eq(practiceRecords.id, id));
  }

  return c.json({ success: true });
})

app.get('/api/practices', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB)
  if (!cachedMappedPractices) {
      const practices = await db.select({
          id: practice.id,
          textbook: practice.textbook,
          unit: practice.unit,
          type: practice.type,
          title: practice.title,
          content: practice.content
      }).from(practice)
      
      cachedMappedPractices = practices.map(p => {
          let lightContent: any = {};
          const type = (p.type || '').toLowerCase();
          const content = p.content as any;
          
          if (content) {
              if (type.includes('vocab-master') || type.includes('sentence-architect') || type.includes('grammar-wizard')) {
                  const challenges = content.challenges || [];
                  lightContent = {
                      challenges: challenges.map((c: any) => ({ title: c.title || '' }))
                  };
              } else if (type.includes('passage-decoder')) {
                  const sections = content.sections || [];
                  lightContent = {
                      sections: sections.map((s: any) => ({ title: s.title || '' }))
                  };
              } else if (type.includes('spelling-hero')) {
                  const wordCount = content.spelling_words?.length || 0;
                  lightContent = {
                      spelling_words: new Array(wordCount).fill({})
                  };
              }
          }
          
          return {
              id: p.id,
              textbook: p.textbook,
              unit: p.unit,
              type: p.type,
              title: p.title,
              content: lightContent
          };
      });
  }
  
  const userRole = (session.user as any).role?.toLowerCase();
  if (userRole === 'admin' || userRole === 'testdrive') {
      return c.json(cachedMappedPractices)
  }
  
  const expiry = (session.user as any).subscriptionExpiry;
  if (expiry && new Date(expiry) < new Date()) {
      return c.json([]);
  }
  
  let allowed = (session.user as any).textbooks || [];
  if (typeof allowed === 'string') {
      try {
          allowed = JSON.parse(allowed);
      } catch {
          allowed = [];
      }
  }
  
  return c.json(cachedMappedPractices.filter(p => Array.isArray(allowed) && allowed.includes(p.textbook)))
})

app.get('/api/practices/:id', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
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
      if (item.textbook !== 'GENERAL' && !((session.user as any).textbooks || []).includes(item.textbook)) {
          return c.json({ error: 'Forbidden' }, 403)
      }
  }
  
  const encryptedContent = encryptContent(item.content, OBSCURE_KEY);
  return c.json({
      ...item,
      content: encryptedContent,
      isEncrypted: true
  })
})

app.post('/api/admin/practices', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const db = drizzle(c.env.DB)
  const items = Array.isArray(body) ? body : [body];
  
  for (const item of items) {
      await db.insert(practice).values({
          id: item.id,
          textbook: item.textbook,
          unit: item.unit,
          type: item.type,
          title: item.title,
          content: item.content,
          createdAt: new Date(),
          updatedAt: new Date()
      }).onConflictDoUpdate({
          target: practice.id,
          set: {
              unit: item.unit,
              type: item.type,
              content: item.content,
              title: item.title,
              updatedAt: new Date()
          }
      })
  }
  
  cachedMappedPractices = null;
  return c.json({ success: true, count: items.length })
})

app.delete('/api/admin/practices', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB)
  await db.delete(practice)
  cachedMappedPractices = null;
  return c.json({ success: true })
})

app.delete('/api/admin/practices/:id', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as any).role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const db = drizzle(c.env.DB)
  await db.delete(practice).where(eq(practice.id, id))
  cachedMappedPractices = null;
  return c.json({ success: true })
})

app.get('/api/pet', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const rows = await db.select({ petState: user.petState }).from(user).where(eq(user.id, session.user.id));
  if (rows.length === 0) return c.json({ error: "User not found" }, 404);

  return c.json(rows[0].petState || null);
})

app.put('/api/pet', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive pet state is not saved to the server." }, 403);

  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  // Fetch current state in DB to check for conflicts (LWW check)
  const rows = await db.select({ petState: user.petState }).from(user).where(eq(user.id, session.user.id));
  if (rows.length > 0 && rows[0].petState) {
    const dbState = rows[0].petState as any;
    const dbTime = dbState.lastUpdated || 0;
    const clientTime = body.lastUpdated || 0;
    if (dbTime > clientTime) {
      // Conflict: server has a newer state!
      return c.json({ error: "Conflict", serverState: dbState }, 409);
    }
  }

  await db.update(user).set({
    petState: body,
    updatedAt: new Date()
  }).where(eq(user.id, session.user.id));

  return c.json({ success: true });
})

app.get('/api/mistakes', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const rows = await db.select({ mistakeState: user.mistakeState }).from(user).where(eq(user.id, session.user.id));
  if (rows.length === 0) return c.json({ error: "User not found" }, 404);

  return c.json(rows[0].mistakeState || null);
})

app.put('/api/mistakes', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role === 'testdrive') return c.json({ error: "Testdrive mistakes are not saved to the server." }, 403);

  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const rows = await db.select({ mistakeState: user.mistakeState }).from(user).where(eq(user.id, session.user.id));
  let merged = body;
  if (rows.length > 0 && rows[0].mistakeState) {
    const dbState = rows[0].mistakeState as any[];
    if (Array.isArray(dbState) && Array.isArray(body)) {
      // Merge incoming mistakes with existing DB mistakes by ID
      const mergedMap = new Map<string, any>();
      for (const m of dbState) {
        if (m && m.id) mergedMap.set(m.id, m);
      }
      for (const m of body) {
        if (!m || !m.id) continue;
        const existing = mergedMap.get(m.id);
        if (!existing) {
          mergedMap.set(m.id, m);
        } else {
          const existingTime = (existing.updatedAt || existing.createdAt) ? new Date(existing.updatedAt || existing.createdAt).getTime() : 0;
          const incomingTime = (m.updatedAt || m.createdAt) ? new Date(m.updatedAt || m.createdAt).getTime() : 0;
          if (incomingTime > existingTime || (incomingTime === existingTime && m.attemptsCount > existing.attemptsCount)) {
            mergedMap.set(m.id, m);
          }
        }
      }
      merged = Array.from(mergedMap.values());
    }
  }

  await db.update(user).set({
    mistakeState: merged,
    updatedAt: new Date()
  }).where(eq(user.id, session.user.id));

  return c.json({ success: true, mistakeState: merged });
})

app.get('/api/games/schulte/leaderboard', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
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
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
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
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
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
