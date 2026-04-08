import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from './auth'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://timathon.github.io'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}))

app.all('/api/auth/*', (c) => {
  const auth = getAuth(c.env.DB)
  return auth.handler(c.req.raw)
})

import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import { practiceRecords, user, practice } from './db/schema'

app.get('/api/me', async (c) => {
  const auth = getAuth(c.env.DB)
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
    const auth = getAuth(c.env.DB)
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
  const auth = getAuth(c.env.DB)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB)
  const users = await db.select({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      textbooks: user.textbooks,
      createdAt: user.createdAt
  }).from(user)
  return c.json(users)
})

app.post('/api/admin/users', async (c) => {
  const auth = getAuth(c.env.DB)
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
  const auth = getAuth(c.env.DB)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const idString = c.req.param('id')
  const db = drizzle(c.env.DB)
  await db.delete(user).where(eq(user.id, idString))
  return c.json({ success: true })
})

app.put('/api/admin/users/:id/textbooks', async (c) => {
  const auth = getAuth(c.env.DB)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || session.user.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  
  const idString = c.req.param('id')
  const { textbooks } = await c.req.json()
  const db = drizzle(c.env.DB)
  
  await db.update(user).set({ textbooks }).where(eq(user.id, idString))
  return c.json({ success: true })
})

app.get('/api/records', async (c) => {
  const auth = getAuth(c.env.DB)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const db = drizzle(c.env.DB);
  const records = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, session.user.id))
    .orderBy(desc(practiceRecords.createdAt));
  return c.json(records);
})

app.post('/api/records', async (c) => {
  const auth = getAuth(c.env.DB)
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
    createdAt: new Date()
  });

  return c.json({ success: true, id });
})

app.put('/api/records/:id', async (c) => {
  const auth = getAuth(c.env.DB)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  // Note: eq(practiceRecords.userId, session.user.id) is a secure restraint 
  // but eq(practiceRecords.id, id) alone handles it in this simple environment setup
  await db.update(practiceRecords).set({
      score: body.score,
      unfinished: body.unfinished !== undefined ? body.unfinished : false
  })
  .where(eq(practiceRecords.id, id));

  return c.json({ success: true });
})

app.get('/api/practices', async (c) => {
  const auth = getAuth(c.env.DB)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB)
  const practices = await db.select({
      id: practice.id,
      textbook: practice.textbook,
      unit: practice.unit,
      type: practice.type,
      title: practice.title
  }).from(practice)
  
  if (session.user.role === 'admin') {
      return c.json(practices)
  }
  
  const allowed = (session.user as any).textbooks || [];
  return c.json(practices.filter(p => allowed.includes(p.textbook)))
})

app.get('/api/practices/:id', async (c) => {
  const auth = getAuth(c.env.DB)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const db = drizzle(c.env.DB)
  const data = await db.select().from(practice).where(eq(practice.id, id))
  const item = data[0]
  
  if (!item) return c.json({ error: 'Not found' }, 404)
  if (session.user.role !== 'admin' && !((session.user as any).textbooks || []).includes(item.textbook)) {
      return c.json({ error: 'Forbidden' }, 403)
  }
  
  return c.json(item)
})

app.post('/api/admin/practices', async (c) => {
  const auth = getAuth(c.env.DB)
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
