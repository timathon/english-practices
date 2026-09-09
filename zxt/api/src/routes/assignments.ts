import { Hono } from 'hono';
import { AppContext } from '../types';
import { authGuard, requireRole } from '../auth';
import { initDB } from '../db';

export const assignments = new Hono<AppContext>();

// Assignments APIs — D1 DB Backed (Public read by class)
assignments.get('/api/assignments', async (c) => {
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

  const assignmentList = results.map(r => ({
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

  return c.json({ assignments: assignmentList });
});

// Create Assignment (Teacher / Admin)
assignments.post('/api/assignments', authGuard, requireRole('teacher', 'admin'), async (c) => {
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
assignments.put('/api/assignments/:id/status', authGuard, async (c) => {
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

// Clear all remote assignment records from D1 DB
assignments.delete('/api/assignments/clear', authGuard, requireRole('admin'), async (c) => {
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
assignments.get('/api/classes/:className/progress', async (c) => {
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

assignments.put('/api/classes/:className/progress', authGuard, requireRole('teacher', 'admin'), async (c) => {
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
assignments.get('/api/ai/teacher-summary', authGuard, requireRole('teacher', 'admin'), (c) => {
  return c.json({
    class: '三年级A班',
    accuracyAvg: 84.5,
    summary: '班级近7天古诗理解准确率达 84.5%。重点错题集中在《池上》中的“浮萍一道开”诗意理解，建议在明日课堂前花 5 分钟演示江南水乡浮萍避开水路的视觉画卷。'
  });
});

assignments.get('/api/ai/parent-brief', authGuard, (c) => {
  return c.json({
    student: '亚明 (Yaming)',
    mastered: ['池上', '江南', '画'],
    reviewNeeded: ['山行'],
    bedtimeActivity: '今晚睡前与孩子一起朗读白居易《池上》，问问孩子为什么小娃采白莲时会留下一道浮萍水路？'
  });
});
