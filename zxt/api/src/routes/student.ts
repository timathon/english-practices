import { Hono } from 'hono';
import { AppContext } from '../types';
import { initDB } from '../db';
import { authGuard } from '../auth';

export const student = new Hono<AppContext>();

// Student Quiz History APIs — D1 DB Backed
// Concise list endpoint: omit heavy details column from list response, but include totalQuestions and mistakeCount
student.get('/api/student/history', authGuard, async (c) => {
  const caller = c.get('user')!;
  let studentId = c.req.query('studentId');
  if (!studentId || (caller.role === 'student' && studentId !== caller.id)) {
    studentId = caller.id;
  }

  const db = c.env.zxt_poems_db;
  await initDB(db);
  const { results } = await db.prepare(
    'SELECT id, student_id, poem_id, poem_title, score, accuracy, quiz_type, details, completed_at FROM quiz_history WHERE student_id = ? ORDER BY completed_at DESC'
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
    let totalQuestions = 0;
    let mistakeCount = 0;
    if (r.details) {
      try {
        const parsed = JSON.parse(r.details);
        const qList = Array.isArray(parsed)
          ? parsed
          : (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)
              ? parsed.questions
              : (parsed && typeof parsed === 'object' ? Object.values(parsed).filter((v: any) => v && typeof v === 'object' && ('isCorrect' in v || 'questionId' in v)) : []));
        totalQuestions = qList.length;
        mistakeCount = qList.filter((q: any) => q && q.isCorrect === false).length;
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
      completedAt: r.completed_at,
      totalQuestions,
      mistakeCount
    };
  });

  c.header('Cache-Control', 'private, max-age=60');
  return c.json({ history });
});

// Single Quiz Record Detail API — fetched on demand when user clicks an item
student.get('/api/student/history/:id', authGuard, async (c) => {
  const caller = c.get('user')!;
  const recordId = c.req.param('id');
  const db = c.env.zxt_poems_db;
  await initDB(db);

  const record = await db.prepare(
    'SELECT * FROM quiz_history WHERE id = ?'
  ).bind(recordId).first<{
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

  if (!record) {
    return c.json({ error: 'Record not found' }, 404);
  }

  if (caller.role === 'student' && record.student_id !== caller.id) {
    return c.json({ error: 'Forbidden: Cannot access another student\'s history' }, 403);
  }

  let parsedDetails: any = [];
  if (record.details) {
    try {
      const obj = JSON.parse(record.details);
      parsedDetails = Array.isArray(obj) ? obj : (obj.questions || []);
    } catch (_) {}
  }

  return c.json({
    id: record.id,
    studentId: record.student_id,
    poemId: record.poem_id,
    poemTitle: record.poem_title,
    score: record.score,
    accuracy: record.accuracy,
    quizType: record.quiz_type,
    details: parsedDetails,
    completedAt: record.completed_at
  });
});

student.delete('/api/student/history/:id', authGuard, async (c) => {
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

student.post('/api/student/history', authGuard, async (c) => {
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
    const historyRes = targetPoemId > 0
      ? await db.prepare('SELECT score, completed_at FROM quiz_history WHERE student_id = ? AND poem_id = ? ORDER BY completed_at ASC').bind(studentId, targetPoemId).all<{ score: number; completed_at: string }>()
      : await db.prepare('SELECT score, completed_at FROM quiz_history WHERE student_id = ? AND poem_title = ? ORDER BY completed_at ASC').bind(studentId, poemTitle || '').all<{ score: number; completed_at: string }>();

    const existingHistory = historyRes?.results || [];

    let historicalHighestScore = 0;
    let hasAttemptToday = false;

    for (const h of existingHistory) {
      if ((h.score || 0) > historicalHighestScore) {
        historicalHighestScore = h.score || 0;
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
    try {
      const userRow = await db.prepare('SELECT points FROM users WHERE id = ?').bind(studentId).first<{ points: number }>();
      if (userRow) {
        newTotalPoints = (userRow.points || 0) + totalEarnedPoints;
        await db.prepare('UPDATE users SET points = ? WHERE id = ?').bind(newTotalPoints, studentId).run();
      }
    } catch (e) {
      console.warn('Failed to update D1 user points column:', e);
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

export default student;
