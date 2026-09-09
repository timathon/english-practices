import { Hono } from 'hono';
import { AppContext, PoemItem, PoemQuestion } from '../types';
import { initDB } from '../db';
import { authGuard, requireRole } from '../auth';

export const poems = new Hono<AppContext>();

// 白莲阁 (Bái Lián Gé) Poems API — D1-backed (Public)
poems.get('/api/blg/poems', async (c) => {
  const db = c.env.zxt_poems_db;
  await initDB(db);
  const { results } = await db.prepare('SELECT data FROM poems ORDER BY id ASC').all<{ data: string }>();
  const poemsList = results.map(r => JSON.parse(r.data) as PoemItem);
  return c.json({
    module: '白莲阁 (Bái Lián Gé)',
    subtitle: '小娃撑小艇，偷采白莲回 (白居易《池上》)',
    total: poemsList.length,
    poems: poemsList
  });
});

// Editor: save updated questions for a single poem
poems.put('/api/blg/poems/:id/questions', authGuard, requireRole('editor', 'admin'), async (c) => {
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
poems.post('/api/blg/poems/batch', authGuard, requireRole('editor', 'admin'), async (c) => {
  const { poems: batchPoems } = await c.req.json<{ poems: PoemItem[] }>();
  const db = c.env.zxt_poems_db;
  await db.prepare('CREATE TABLE IF NOT EXISTS poems (id INTEGER PRIMARY KEY, data TEXT NOT NULL)').run();
  const stmt = db.prepare('INSERT OR REPLACE INTO poems (id, data) VALUES (?1, ?2)');
  await db.batch(batchPoems.map(p => stmt.bind(p.id, JSON.stringify(p))));
  return c.json({ success: true, count: batchPoems.length });
});

// 成语接龙 900 (Idiom Groups) APIs — D1-backed (Public & Editor)
poems.get('/api/idioms/groups', async (c) => {
  const db = c.env.zxt_poems_db;
  await initDB(db);
  const { results } = await db.prepare('SELECT data FROM idiom_groups ORDER BY id ASC').all<{ data: string }>();
  const groups = results.map(r => JSON.parse(r.data));
  return c.json({
    module: '成语接龙 900 (Idioms)',
    total: groups.length,
    groups
  });
});

poems.get('/api/idioms/groups/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = c.env.zxt_poems_db;
  await initDB(db);
  const row = await db.prepare('SELECT data FROM idiom_groups WHERE id = ?').bind(id).first<{ data: string }>();
  if (!row) return c.json({ error: 'Idiom group not found' }, 404);
  return c.json({ group: JSON.parse(row.data) });
});

// Editor: save updated questions for a single idiom group
poems.put('/api/idioms/groups/:id/questions', authGuard, requireRole('editor', 'admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const { questions } = await c.req.json<{ questions: any[] }>();
  const db = c.env.zxt_poems_db;
  const row = await db.prepare('SELECT data FROM idiom_groups WHERE id = ?').bind(id).first<{ data: string }>();
  if (!row) return c.json({ error: 'Idiom group not found' }, 404);
  const group = JSON.parse(row.data);
  group.questions = questions;
  await db.prepare('UPDATE idiom_groups SET data = ? WHERE id = ?').bind(JSON.stringify(group), id).run();
  return c.json({ success: true });
});

// Batch replace all idiom groups (used by push-d1-idioms script)
poems.post('/api/idioms/groups/batch', authGuard, requireRole('editor', 'admin'), async (c) => {
  const { groups } = await c.req.json<{ groups: any[] }>();
  const db = c.env.zxt_poems_db;
  await db.prepare('CREATE TABLE IF NOT EXISTS idiom_groups (id INTEGER PRIMARY KEY, data TEXT NOT NULL)').run();
  const stmt = db.prepare('INSERT OR REPLACE INTO idiom_groups (id, data) VALUES (?1, ?2)');
  await db.batch(groups.map(g => stmt.bind(g.id, JSON.stringify(g))));
  return c.json({ success: true, count: groups.length });
});

export default poems;
