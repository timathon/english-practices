import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./db";
import { hashPassword, verifyPassword, createToken, verifyToken } from "./auth";

type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

app.use("/api/*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return origin;
    }
    return "*";
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));

// Auth Helper
async function getAuthUser(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return await verifyToken(token);
}

// Ensure tables and default admin account exist on boot
async function ensureTables(db: ReturnType<typeof getDb>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      allowed_textbooks TEXT DEFAULT '["M7A-BS"]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );
  `);

  // Migrate existing table if columns missing
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`);
  } catch {}
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN allowed_textbooks TEXT DEFAULT '["M7A-BS"]';`);
  } catch {}
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`);
  } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS diagnosis_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      textbook_id TEXT NOT NULL,
      chapter TEXT NOT NULL,
      section_number TEXT NOT NULL,
      target_topic_id TEXT NOT NULL,
      status TEXT NOT NULL,
      root_causes TEXT NOT NULL,
      history TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_topic_mastery (
      user_id TEXT NOT NULL,
      textbook_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      mastery_level TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, textbook_id, topic_id)
    );
  `);

  // Seed default admin account (username: admina, password: adminb)
  const existingAdmin = await db.queryOne("SELECT id FROM users WHERE username = ?", ["admina"]);
  if (!existingAdmin) {
    const { hash, salt } = await hashPassword("adminb");
    const adminId = crypto.randomUUID();
    await db.execute(`
      INSERT INTO users (id, username, password_hash, salt, display_name, role, allowed_textbooks, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [adminId, "admina", hash, salt, "系统管理员 (admina)", "admin", JSON.stringify(["M7A-BS", "M7B-BS", "M8A-BS"]), "active", Date.now()]);
  }
}

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

// Register (Public registration is disabled per requirement)
app.post("/api/auth/register", async (c) => {
  return c.json({ error: "系统现已暂停开放注册，请联系管理员分配或开通账号" }, 403);
});

// Login
app.post("/api/auth/login", async (c) => {
  const db = getDb(c.env);
  await ensureTables(db);
  const { username, password } = await c.req.json();
  if (!username || !password) {
    return c.json({ error: "请输入用户名和密码" }, 400);
  }

  const user = await db.queryOne("SELECT * FROM users WHERE username = ?", [username]);
  if (!user) {
    return c.json({ error: "用户不存在或密码错误" }, 401);
  }

  if (user.status === "disabled") {
    return c.json({ error: "该账号已被禁用，请联系管理员" }, 403);
  }

  const valid = await verifyPassword(password, user.password_hash, user.salt);
  if (!valid) {
    return c.json({ error: "用户不存在或密码错误" }, 401);
  }

  const role = user.role || "user";
  let allowedTextbooks: string[] = ["M7A-BS"];
  try {
    if (user.allowed_textbooks) {
      allowedTextbooks = JSON.parse(user.allowed_textbooks);
    }
  } catch {}

  const token = await createToken({ userId: user.id, username: user.username, role });
  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role,
      allowedTextbooks,
      status: user.status || "active"
    }
  });
});

// Current User
app.get("/api/auth/me", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) {
    return c.json({ error: "未登录或登录已过期" }, 401);
  }

  const db = getDb(c.env);
  const user = await db.queryOne("SELECT id, username, display_name, role, allowed_textbooks, status FROM users WHERE id = ?", [authUser.userId]);
  if (!user) {
    return c.json({ error: "用户不存在" }, 404);
  }

  let allowedTextbooks: string[] = ["M7A-BS"];
  try {
    if (user.allowed_textbooks) {
      allowedTextbooks = JSON.parse(user.allowed_textbooks);
    }
  } catch {}

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role || "user",
      allowedTextbooks,
      status: user.status || "active"
    }
  });
});

/* ============================================================
   ADMIN USER MANAGEMENT APIs (Only role === 'admin' can access)
   ============================================================ */

// 1. List all users
app.get("/api/admin/users", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser || authUser.role !== "admin") {
    return c.json({ error: "权限不足，仅管理员可访问" }, 403);
  }

  const db = getDb(c.env);
  await ensureTables(db);

  const users = await db.query(`
    SELECT id, username, display_name, role, allowed_textbooks, status, created_at
    FROM users
    ORDER BY created_at DESC
  `);

  const formatted = users.map((u: any) => {
    let tbs: string[] = ["M7A-BS"];
    try {
      if (u.allowed_textbooks) tbs = JSON.parse(u.allowed_textbooks);
    } catch {}
    return {
      ...u,
      allowed_textbooks: tbs
    };
  });

  return c.json({ users: formatted });
});

// 2. Admin create new user
app.post("/api/admin/users", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser || authUser.role !== "admin") {
    return c.json({ error: "权限不足，仅管理员可访问" }, 403);
  }

  const db = getDb(c.env);
  await ensureTables(db);

  const { username, password, displayName, role = "user", allowedTextbooks = ["M7A-BS"] } = await c.req.json();
  if (!username || !password || password.length < 6) {
    return c.json({ error: "用户名不能为空，且密码至少6位" }, 400);
  }

  const existing = await db.queryOne("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) {
    return c.json({ error: "该用户名已存在" }, 400);
  }

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.execute(`
    INSERT INTO users (id, username, password_hash, salt, display_name, role, allowed_textbooks, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, username, hash, salt, displayName || username, role, JSON.stringify(allowedTextbooks), "active", now]);

  return c.json({
    success: true,
    user: { id, username, displayName: displayName || username, role, allowed_textbooks: allowedTextbooks, status: "active", created_at: now }
  });
});

// 3. Admin update user access / role / status
app.put("/api/admin/users/:id/access", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser || authUser.role !== "admin") {
    return c.json({ error: "权限不足，仅管理员可访问" }, 403);
  }

  const userId = c.req.param("id");
  const { displayName, role, allowedTextbooks, status } = await c.req.json();

  const db = getDb(c.env);
  await ensureTables(db);

  const target = await db.queryOne("SELECT id, role, username FROM users WHERE id = ?", [userId]);
  if (!target) {
    return c.json({ error: "未找到目标用户" }, 404);
  }

  // Prevent admina from demoting or disabling itself accidentally
  if (target.username === "admina" && (status === "disabled" || role !== "admin")) {
    return c.json({ error: "不可禁用或降级内置主管理员 admina" }, 400);
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (displayName !== undefined) {
    updates.push("display_name = ?");
    params.push(displayName);
  }
  if (role !== undefined) {
    updates.push("role = ?");
    params.push(role);
  }
  if (allowedTextbooks !== undefined) {
    updates.push("allowed_textbooks = ?");
    params.push(JSON.stringify(allowedTextbooks));
  }
  if (status !== undefined) {
    updates.push("status = ?");
    params.push(status);
  }

  if (updates.length > 0) {
    params.push(userId);
    await db.execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  return c.json({ success: true });
});

// 4. Admin reset password
app.put("/api/admin/users/:id/password", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser || authUser.role !== "admin") {
    return c.json({ error: "权限不足，仅管理员可访问" }, 403);
  }

  const userId = c.req.param("id");
  const { password } = await c.req.json();
  if (!password || password.length < 6) {
    return c.json({ error: "新密码至少为6位字符" }, 400);
  }

  const db = getDb(c.env);
  const target = await db.queryOne("SELECT id FROM users WHERE id = ?", [userId]);
  if (!target) {
    return c.json({ error: "用户不存在" }, 404);
  }

  const { hash, salt } = await hashPassword(password);
  await db.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", [hash, salt, userId]);

  return c.json({ success: true, message: "密码重置成功" });
});

// 5. Admin delete user
app.delete("/api/admin/users/:id", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser || authUser.role !== "admin") {
    return c.json({ error: "权限不足，仅管理员可访问" }, 403);
  }

  const userId = c.req.param("id");
  const db = getDb(c.env);
  const target = await db.queryOne("SELECT id, username FROM users WHERE id = ?", [userId]);
  if (!target) {
    return c.json({ error: "用户不存在" }, 404);
  }

  if (target.username === "admina") {
    return c.json({ error: "不可删除内置管理员 admina" }, 400);
  }

  await db.execute("DELETE FROM user_topic_mastery WHERE user_id = ?", [userId]);
  await db.execute("DELETE FROM diagnosis_records WHERE user_id = ?", [userId]);
  await db.execute("DELETE FROM users WHERE id = ?", [userId]);

  return c.json({ success: true, message: "用户已删除" });
});

// Submit diagnosis record
app.post("/api/diagnose/submit", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) {
    return c.json({ error: "请先登录以保存诊断进度" }, 401);
  }

  const db = getDb(c.env);
  await ensureTables(db);

  const body = await c.req.json();
  const { textbookId, chapter, sectionNumber, targetTopicId, status, rootCauses, history, masteryUpdates } = body;

  const recordId = crypto.randomUUID();
  const now = Date.now();

  const ops: { sql: string; params: any[] }[] = [
    {
      sql: `INSERT INTO diagnosis_records (
        id, user_id, textbook_id, chapter, section_number, target_topic_id, status, root_causes, history, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        recordId,
        authUser.userId,
        textbookId,
        chapter,
        sectionNumber,
        targetTopicId,
        status,
        JSON.stringify(rootCauses || []),
        JSON.stringify(history || []),
        now
      ]
    }
  ];

  if (Array.isArray(masteryUpdates)) {
    for (const item of masteryUpdates) {
      ops.push({
        sql: `INSERT INTO user_topic_mastery (user_id, textbook_id, topic_id, mastery_level, updated_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id, textbook_id, topic_id) DO UPDATE SET
                mastery_level = excluded.mastery_level,
                updated_at = excluded.updated_at`,
        params: [authUser.userId, textbookId, item.topicId, item.level, now]
      });
    }
  }

  await db.batch(ops);
  return c.json({ success: true, recordId });
});

// Get user textbook progress
app.get("/api/progress", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) {
    return c.json({ error: "请先登录" }, 401);
  }

  const db = getDb(c.env);
  await ensureTables(db);

  const textbookId = c.req.query("textbook") || "M7A-BS";
  const rows = await db.query(
    "SELECT topic_id, mastery_level, updated_at FROM user_topic_mastery WHERE user_id = ? AND textbook_id = ?",
    [authUser.userId, textbookId]
  );

  return c.json({
    textbookId,
    mastery: rows
  });
});

// Get diagnosis history
app.get("/api/diagnose/history", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) {
    return c.json({ error: "请先登录" }, 401);
  }

  const db = getDb(c.env);
  await ensureTables(db);

  const textbookId = c.req.query("textbook") || "M7A-BS";
  const sectionNumber = c.req.query("section");

  let query = "SELECT * FROM diagnosis_records WHERE user_id = ? AND textbook_id = ?";
  const params: any[] = [authUser.userId, textbookId];

  if (sectionNumber) {
    query += " AND section_number = ?";
    params.push(sectionNumber);
  }

  query += " ORDER BY created_at DESC LIMIT 50";
  const records = await db.query(query, params);

  return c.json({ records });
});

export default app;
