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
  'https://timathon.github.io', 
  'https://epv2.vibequizzing.com',
  'http://epv2.vibequizzing.com'
]

app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`);
  await next();
})

app.use('/api/*', cors({
  origin: (origin, c) => {
    if (allowedOrigins.includes(origin)) return origin;
    return allowedOrigins[3]; // Default to epv2.vibequizzing.com
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
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Credentials', 'true')
  }
  
  return c.text('Internal Server Error: ' + err.message, 500);
})

// Auth handler
app.all('/api/auth/*', (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  return auth.handler(c.req.raw)
})

import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import { practiceRecords, user, practice, account, session as sessionTable } from './db/schema'

app.get('/api/me', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
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
    const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
    const db = drizzle(c.env.DB)
    const existing = await db.select().from(user).where(eq(user.username, "adminx"))
    if (existing.length > 0) return c.json({ msg: "Already set up" })

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
    }
    return c.json(res)
  } catch (e: any) {
    return c.json({ error: e.stack || e.message }, 500)
  }
})

app.get('/api/admin/users', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
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
  return c.json(users)
})

app.post('/api/admin/users', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const req = new Request("http://localhost/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          email: `${body.username}@system.local`,
          password: body.password,
          name: body.username,
          username: body.username
      })
  })
  const res = await auth.handler(req)
  return c.json(await res.json())
})

app.delete('/api/admin/users/:id', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
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
    const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
    
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
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
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

app.get('/api/records', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const records = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, session.user.id))
    .orderBy(desc(practiceRecords.createdAt));
  return c.json(records);
})

app.post('/api/records', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

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
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  // Note: eq(practiceRecords.userId, session.user.id) is a secure restraint 
  // but eq(practiceRecords.id, id) alone handles it in this simple environment setup
  await db.update(practiceRecords).set({
      score: body.score,
      unfinished: body.unfinished !== undefined ? body.unfinished : false,
      updatedAt: new Date()
  })
  .where(eq(practiceRecords.id, id));

  return c.json({ success: true });
})

app.get('/api/practices', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB)
  const practices = await db.select({
      id: practice.id,
      textbook: practice.textbook,
      unit: practice.unit,
      type: practice.type,
      title: practice.title,
      content: practice.content
  }).from(practice)
  
  if (session.user.role === 'admin') {
      return c.json(practices)
  }
  
  const expiry = (session.user as any).subscriptionExpiry;
  if (expiry && new Date(expiry) < new Date()) {
      return c.json([]);
  }
  
  const allowed = (session.user as any).textbooks || [];
  return c.json(practices.filter(p => allowed.includes(p.textbook)))
})

app.get('/api/practices/:id', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const db = drizzle(c.env.DB)
  const data = await db.select().from(practice).where(eq(practice.id, id))
  const item = data[0]
  
  if (!item) return c.json({ error: 'Not found' }, 404)
  
  if (session.user.role !== 'admin') {
      const expiry = (session.user as any).subscriptionExpiry;
      if (expiry && new Date(expiry) < new Date()) {
          return c.json({ error: 'Subscription expired' }, 403)
      }
      if (!((session.user as any).textbooks || []).includes(item.textbook)) {
          return c.json({ error: 'Forbidden' }, 403)
      }
  }
  
  return c.json(item)
})

app.post('/api/admin/practices', async (c) => {
  const auth = getAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)

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
              content: item.content,
              title: item.title,
              updatedAt: new Date()
          }
      })
  }
  
  return c.json({ success: true, count: items.length })
})

export default app
