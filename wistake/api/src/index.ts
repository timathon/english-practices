import { Hono } from "hono";
import { cors } from "hono/cors";
import { hashPassword, verifyPassword, createToken, verifyToken, TokenPayload } from "./auth";
import { parseQuickPaste } from "./parser";
import { analyzeMathMistake, splitQuestionsWithGemini31 } from "./gemini";

type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
  GOOGLE_API_KEY_FREE?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
};

type Variables = {
  user?: TokenPayload;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors());

// Helper: Ensure default admin exists
async function ensureDefaultAdmin(env: Bindings) {
  const adminUser = env.ADMIN_USERNAME || "admin";
  const adminPass = env.ADMIN_PASSWORD || "wistake2026";
  const secret = env.JWT_SECRET || "wistake_dev_secret_2026";

  const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(adminUser).first();
  if (!existing) {
    const { hash, salt } = await hashPassword(adminPass);
    const id = "user_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await env.DB.prepare(
      `INSERT INTO users (id, username, password_hash, salt, role, is_active, display_name, stage, grade, ai_daily_limit)
       VALUES (?, ?, ?, ?, 'admin', 1, '系统管理员', 'junior', 7, 999)`
    ).bind(id, adminUser, hash, salt).run();
  }
}

// Authentication Middleware
async function authMiddleware(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing Bearer token" }, 401);
  }
  const token = authHeader.slice(7);
  const secret = c.env.JWT_SECRET || "wistake_dev_secret_2026";
  const payload = await verifyToken(token, secret);
  if (!payload) {
    return c.json({ error: "Unauthorized: Invalid or expired token" }, 401);
  }

  // Check if user is still active in DB
  const user = await c.env.DB.prepare("SELECT id, is_active, ai_daily_limit FROM users WHERE id = ?").bind(payload.sub).first();
  if (!user || user.is_active !== 1) {
    return c.json({ error: "Forbidden: Account deactivated" }, 403);
  }

  c.set("user", payload);
  await next();
}

// Admin only middleware
async function adminMiddleware(c: any, next: () => Promise<void>) {
  const user = c.get("user") as TokenPayload | undefined;
  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }
  await next();
}

// Health Check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    app: "wistake-api",
    mode: "math-grade-1-9",
    message: "Turn Math Mistakes upside down into Wistakes!"
  });
});

// Auth Endpoints
app.post("/api/auth/register", (c) => {
  return c.json({ error: "开放注册已关闭，请联系管理员开通账号。" }, 403);
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json();
  const { username, password } = body;
  if (!username || !password) {
    return c.json({ error: "请输入用户名与密码" }, 400);
  }

  await ensureDefaultAdmin(c.env);

  const user = await c.env.DB.prepare(
    "SELECT id, username, password_hash, salt, role, is_active, grade, stage FROM users WHERE username = ?"
  ).bind(username).first<any>();

  if (!user) {
    return c.json({ error: "用户名或密码错误" }, 401);
  }

  if (user.is_active !== 1) {
    return c.json({ error: "该账号已被禁用，请联系管理员" }, 403);
  }

  const isValid = await verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return c.json({ error: "用户名或密码错误" }, 401);
  }

  const secret = c.env.JWT_SECRET || "wistake_dev_secret_2026";
  const token = await createToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    grade: user.grade || 3
  }, secret);

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      grade: user.grade || 3,
      stage: user.stage || (user.grade > 6 ? "junior" : "primary")
    }
  });
});

app.get("/api/auth/me", authMiddleware, async (c) => {
  const tokenUser = c.get("user") as TokenPayload;
  const dbUser = await c.env.DB.prepare(
    "SELECT id, username, display_name, role, stage, grade, ai_daily_limit FROM users WHERE id = ?"
  ).bind(tokenUser.sub).first<any>();

  if (!dbUser) {
    return c.json({ error: "User not found" }, 404);
  }

  // Calculate today's quota usage
  const today = new Date().toISOString().slice(0, 10);
  const usageCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM ai_usage WHERE user_id = ? AND usage_date = ?"
  ).bind(tokenUser.sub, today).first<any>();

  const used = usageCount?.count || 0;
  const limit = dbUser.ai_daily_limit || 20;

  return c.json({
    user: dbUser,
    quota: {
      today,
      used,
      limit,
      remaining: Math.max(0, limit - used)
    }
  });
});

// Quick Paste Parsing with Gemini 3.1 Flash Lite (Free, doesn't consume user daily quota)
app.post("/api/mistakes/parse-paste", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { text } = body;
  if (!text || typeof text !== "string") {
    return c.json({ error: "缺少待解析的文本" }, 400);
  }

  const apiKey =
    c.env.GOOGLE_API_KEY_FREE ||
    ((typeof (globalThis as any).process !== "undefined" && (globalThis as any).process.env?.GOOGLE_API_KEY_FREE) as string | undefined) ||
    ((typeof (globalThis as any).process !== "undefined" && (globalThis as any).process.env?.GOOGLE_API_KEY) as string | undefined);

  let items: any[] = [];

  // 1. Attempt intelligent separation using Gemini 3.1 Flash Lite
  if (apiKey) {
    try {
      items = await splitQuestionsWithGemini31({ rawText: text, apiKey });
    } catch (err) {
      console.warn("Gemini 3.1 split error, falling back to local parser:", err);
    }
  }

  // 2. Fallback to local regex rule-based parser if AI failed or returned empty
  if (items.length === 0) {
    items = parseQuickPaste(text);
  }

  return c.json({
    total: items.length,
    items
  });
});

// Submit Mistake and Run AI Analysis
app.post("/api/mistakes/analyze", authMiddleware, async (c) => {
  const user = c.get("user") as TokenPayload;
  const body = await c.req.json();
  const { stem, user_answer, options, grade } = body;

  if (!stem || !user_answer) {
    return c.json({ error: "题干与错答均不能为空" }, 400);
  }

  // Check Quota
  const today = new Date().toISOString().slice(0, 10);
  const dbUser = await c.env.DB.prepare("SELECT ai_daily_limit FROM users WHERE id = ?").bind(user.sub).first<any>();
  const limit = dbUser?.ai_daily_limit || 20;

  const usageCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM ai_usage WHERE user_id = ? AND usage_date = ?"
  ).bind(user.sub, today).first<any>();

  const used = usageCount?.count || 0;
  if (used >= limit) {
    return c.json({ error: `今日 AI 解析额度已耗尽 (${used}/${limit})，请明天再试或联系管理员提升额度。` }, 429);
  }

  const apiKey =
    c.env.GOOGLE_API_KEY_FREE ||
    ((typeof (globalThis as any).process !== "undefined" && (globalThis as any).process.env?.GOOGLE_API_KEY_FREE) as string | undefined) ||
    ((typeof (globalThis as any).process !== "undefined" && (globalThis as any).process.env?.GOOGLE_API_KEY) as string | undefined);

  if (!apiKey) {
    return c.json({ error: "服务器未配置 GOOGLE_API_KEY_FREE，请联系管理员" }, 500);
  }

  const targetGrade = Number(grade) || user.grade || 3;
  const analysis = await analyzeMathMistake({
    stem,
    user_answer,
    options,
    grade: targetGrade,
    apiKey
  });

  const mistakeId = "mis_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const analysisId = "ans_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const originalQId = "q_orig_" + crypto.randomUUID().replace(/-/g, "").slice(0, 10);

  const stage = targetGrade <= 6 ? "primary" : "junior";

  // DB Transaction / batch insertion
  await c.env.DB.batch([
    // 1. Insert mistake
    c.env.DB.prepare(
      `INSERT INTO mistakes (id, user_id, subject, stage, grade, chapter, error_type, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'analyzed')`
    ).bind(
      mistakeId,
      user.sub,
      analysis.subject || "math",
      stage,
      targetGrade,
      analysis.chapter || "学科综合",
      analysis.error_type || "concept"
    ),

    // 2. Insert original question
    c.env.DB.prepare(
      `INSERT INTO questions (id, mistake_id, role, type, stem, options_json, answer_json)
       VALUES (?, ?, 'original', ?, ?, ?, ?)`
    ).bind(
      originalQId,
      mistakeId,
      options && options.length > 0 ? "mcq" : "numeric",
      stem,
      options ? JSON.stringify(options) : null,
      JSON.stringify({ values: [analysis.correct_answer || ""] })
    ),

    // 3. Insert analysis
    c.env.DB.prepare(
      `INSERT INTO analyses (id, mistake_id, user_answer, correct_answer, root_cause, avoid_rule, key_concept, steps_json, raw_response_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      analysisId,
      mistakeId,
      user_answer,
      analysis.correct_answer || "",
      analysis.root_cause || "",
      analysis.avoid_rule || "",
      analysis.key_concept || "",
      JSON.stringify(analysis.steps || []),
      JSON.stringify(analysis)
    ),

    // 4. Insert 3 sibling questions
    ...(analysis.siblings || []).map((sib, idx) => {
      const sibId = `q_sib_${idx + 1}_` + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      return c.env.DB.prepare(
        `INSERT INTO questions (id, mistake_id, role, type, stem, options_json, answer_json, grading_json, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        sibId,
        mistakeId,
        sib.role || (idx === 0 ? "mirror" : idx === 1 ? "variant" : "stretch"),
        sib.type || "numeric",
        sib.stem || "",
        sib.options ? JSON.stringify(sib.options) : null,
        JSON.stringify(sib.answer || { values: [] }),
        sib.generator ? JSON.stringify(sib.generator) : null,
        sib.difficulty ?? 2
      );
    }),

    // 5. Record AI quota usage
    c.env.DB.prepare(
      `INSERT INTO ai_usage (id, user_id, usage_date, kind, mistake_id)
       VALUES (?, ?, ?, 'analyze', ?)`
    ).bind("usage_" + crypto.randomUUID().replace(/-/g, "").slice(0, 10), user.sub, today, mistakeId)
  ]);

  return c.json({
    mistake_id: mistakeId,
    analysis,
    quota: {
      used: used + 1,
      limit,
      remaining: Math.max(0, limit - (used + 1))
    }
  });
});

// List Mistakes (with days since last review)
app.get("/api/mistakes", authMiddleware, async (c) => {
  const user = c.get("user") as TokenPayload;
  const { state, chapter, grade } = c.req.query();

  let query = `
    SELECT m.id, m.subject, m.grade, m.chapter, m.error_type, m.state, m.review_count, m.last_reviewed_at, m.created_at,
           a.user_answer, a.correct_answer, a.avoid_rule,
           q.stem, q.options_json, q.type
    FROM mistakes m
    LEFT JOIN analyses a ON m.id = a.mistake_id
    LEFT JOIN questions q ON m.id = q.mistake_id AND q.role = 'original'
    WHERE m.user_id = ?
  `;
  const bindings: any[] = [user.sub];

  if (state) {
    query += " AND m.state = ?";
    bindings.push(state);
  }
  if (chapter) {
    query += " AND m.chapter = ?";
    bindings.push(chapter);
  }
  if (grade) {
    query += " AND m.grade = ?";
    bindings.push(Number(grade));
  }

  query += " ORDER BY m.last_reviewed_at ASC, m.created_at DESC";

  const rows = await c.env.DB.prepare(query).bind(...bindings).all<any>();
  const now = Date.now();

  const items = (rows.results || []).map(r => {
    let daysSinceReview = -1; // -1 indicates never reviewed
    if (r.last_reviewed_at) {
      const reviewTime = new Date(r.last_reviewed_at).getTime();
      daysSinceReview = Math.max(0, Math.floor((now - reviewTime) / (1000 * 60 * 60 * 24)));
    }

    return {
      id: r.id,
      subject: r.subject || "math",
      grade: r.grade,
      chapter: r.chapter,
      error_type: r.error_type,
      state: r.state,
      review_count: r.review_count || 0,
      days_since_review: daysSinceReview,
      user_answer: r.user_answer,
      correct_answer: r.correct_answer,
      avoid_rule: r.avoid_rule,
      stem: r.stem,
      options: r.options_json ? JSON.parse(r.options_json) : null,
      type: r.type,
      last_reviewed_at: r.last_reviewed_at,
      created_at: r.created_at
    };
  });

  return c.json({ items });
});

// Get Single Mistake with Full Questions and Analysis
app.get("/api/mistakes/:id", authMiddleware, async (c) => {
  const user = c.get("user") as TokenPayload;
  const mistakeId = c.req.param("id");

  const mistake = await c.env.DB.prepare(
    "SELECT * FROM mistakes WHERE id = ? AND user_id = ?"
  ).bind(mistakeId, user.sub).first<any>();

  if (!mistake) {
    return c.json({ error: "Mistake not found" }, 404);
  }

  const analysis = await c.env.DB.prepare(
    "SELECT * FROM analyses WHERE mistake_id = ?"
  ).bind(mistakeId).first<any>();

  const questions = await c.env.DB.prepare(
    "SELECT * FROM questions WHERE mistake_id = ? ORDER BY role = 'original' DESC, id ASC"
  ).bind(mistakeId).all<any>();

  return c.json({
    mistake,
    analysis: analysis ? {
      ...analysis,
      steps: analysis.steps_json ? JSON.parse(analysis.steps_json) : []
    } : null,
    questions: (questions.results || []).map(q => ({
      ...q,
      options: q.options_json ? JSON.parse(q.options_json) : null,
      answer: q.answer_json ? JSON.parse(q.answer_json) : null,
      generator: q.grading_json ? JSON.parse(q.grading_json) : null
    }))
  });
});

// Record Practice Attempts & Update Review Date
app.post("/api/attempts", authMiddleware, async (c) => {
  const user = c.get("user") as TokenPayload;
  const body = await c.req.json();
  const { mistake_id, question_id, response, is_correct, time_ms, confidence } = body;

  const attemptId = "att_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const nowIso = new Date().toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO attempts (id, user_id, question_id, mistake_id, response_json, is_correct, time_ms, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(attemptId, user.sub, question_id, mistake_id, JSON.stringify(response), is_correct ? 1 : 0, time_ms || 0, confidence || "sure"),

    c.env.DB.prepare(
      `UPDATE mistakes
       SET last_reviewed_at = ?, review_count = review_count + 1
       WHERE id = ? AND user_id = ?`
    ).bind(nowIso, mistake_id, user.sub)
  ]);

  return c.json({ success: true, attempt_id: attemptId });
});

// Flip Mistake Status (M -> W)
app.post("/api/mistakes/:id/flip", authMiddleware, async (c) => {
  const user = c.get("user") as TokenPayload;
  const mistakeId = c.req.param("id");
  const { flip } = await c.req.json(); // boolean

  const newState = flip ? "flipped" : "practicing";
  const flippedAt = flip ? new Date().toISOString() : null;

  await c.env.DB.prepare(
    "UPDATE mistakes SET state = ?, flipped_at = ? WHERE id = ? AND user_id = ?"
  ).bind(newState, flippedAt, mistakeId, user.sub).run();

  return c.json({ success: true, state: newState });
});
// Batch Delete Mistakes
app.post("/api/mistakes/batch-delete", authMiddleware, async (c) => {
  const user = c.get("user") as TokenPayload;
  const body = await c.req.json();
  const { ids } = body; // string[]

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: "请提供待删除的错题 ID 列表" }, 400);
  }

  // Delete questions, analyses, attempts, and mistakes for these IDs belonging to the user
  const stmts: any[] = [];
  for (const id of ids) {
    stmts.push(c.env.DB.prepare("DELETE FROM questions WHERE mistake_id = ?").bind(id));
    stmts.push(c.env.DB.prepare("DELETE FROM analyses WHERE mistake_id = ?").bind(id));
    stmts.push(c.env.DB.prepare("DELETE FROM attempts WHERE mistake_id = ? AND user_id = ?").bind(id, user.sub));
    stmts.push(c.env.DB.prepare("DELETE FROM mistakes WHERE id = ? AND user_id = ?").bind(id, user.sub));
  }

  await c.env.DB.batch(stmts);
  return c.json({ success: true, count: ids.length });
});

// Admin User Management
app.get("/api/admin/users", authMiddleware, adminMiddleware, async (c) => {
  const users = await c.env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.stage, u.grade, u.ai_daily_limit, u.created_at,
           COUNT(m.id) as mistake_count
    FROM users u
    LEFT JOIN mistakes m ON u.id = m.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all<any>();

  const today = new Date().toISOString().slice(0, 10);
  const usageStats = await c.env.DB.prepare(`
    SELECT user_id, COUNT(*) as today_used
    FROM ai_usage
    WHERE usage_date = ?
    GROUP BY user_id
  `).bind(today).all<any>();

  const usageMap = new Map<string, number>();
  (usageStats.results || []).forEach(r => usageMap.set(r.user_id, r.today_used));

  const enriched = (users.results || []).map(u => ({
    ...u,
    today_ai_used: usageMap.get(u.id) || 0
  }));

  return c.json({ users: enriched });
});

app.post("/api/admin/users", authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json();
  const { username, password, display_name, role = "student", grade = 3, ai_daily_limit = 20 } = body;

  if (!username || !password) {
    return c.json({ error: "用户名与密码不能为空" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
  if (existing) {
    return c.json({ error: "该用户名已被注册" }, 400);
  }

  const { hash, salt } = await hashPassword(password);
  const id = "user_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const stage = Number(grade) <= 6 ? "primary" : "junior";

  await c.env.DB.prepare(`
    INSERT INTO users (id, username, password_hash, salt, role, is_active, display_name, stage, grade, ai_daily_limit)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `).bind(id, username, hash, salt, role, display_name || username, stage, Number(grade), Number(ai_daily_limit)).run();

  return c.json({ success: true, id, username });
});

app.put("/api/admin/users/:id/access", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("id");
  const body = await c.req.json();
  const { is_active, role, grade, ai_daily_limit } = body;

  // Protect default admin from deactivation or demotion
  const targetUser = await c.env.DB.prepare("SELECT username FROM users WHERE id = ?").bind(userId).first<any>();
  const defaultAdmin = c.env.ADMIN_USERNAME || "admin";
  if (targetUser?.username === defaultAdmin && (is_active === 0 || role === "student")) {
    return c.json({ error: "默认管理员账号不可被禁用或降权" }, 400);
  }

  const stage = grade ? (Number(grade) <= 6 ? "primary" : "junior") : undefined;

  await c.env.DB.prepare(`
    UPDATE users
    SET is_active = COALESCE(?, is_active),
        role = COALESCE(?, role),
        grade = COALESCE(?, grade),
        stage = COALESCE(?, stage),
        ai_daily_limit = COALESCE(?, ai_daily_limit),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    is_active !== undefined ? is_active : null,
    role || null,
    grade !== undefined ? Number(grade) : null,
    stage || null,
    ai_daily_limit !== undefined ? Number(ai_daily_limit) : null,
    userId
  ).run();

  return c.json({ success: true });
});

app.put("/api/admin/users/:id/password", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("id");
  const { password } = await c.req.json();
  if (!password || password.length < 4) {
    return c.json({ error: "密码不能少于4个字符" }, 400);
  }

  const { hash, salt } = await hashPassword(password);
  await c.env.DB.prepare(
    "UPDATE users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(hash, salt, userId).run();

  return c.json({ success: true });
});

app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.req.param("id");
  const targetUser = await c.env.DB.prepare("SELECT username FROM users WHERE id = ?").bind(userId).first<any>();
  const defaultAdmin = c.env.ADMIN_USERNAME || "admin";
  if (targetUser?.username === defaultAdmin) {
    return c.json({ error: "默认管理员账号不可被删除" }, 400);
  }

  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
  return c.json({ success: true });
});

export default app;
