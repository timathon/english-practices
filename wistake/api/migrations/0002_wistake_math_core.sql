-- Migration 0002_wistake_math_core.sql
-- Comprehensive schema for Wistake Math (Grade 1-9)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student', -- 'admin' | 'student'
    is_active INTEGER NOT NULL DEFAULT 1,
    display_name TEXT,
    stage TEXT NOT NULL DEFAULT 'primary', -- 'primary' | 'junior'
    grade INTEGER NOT NULL DEFAULT 3,     -- 1 to 9
    ai_daily_limit INTEGER NOT NULL DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mistakes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'math',
    stage TEXT NOT NULL DEFAULT 'primary',
    grade INTEGER NOT NULL DEFAULT 3,
    chapter TEXT,                         -- e.g. '100以内加减法' / '和差倍问题' / '一元一次方程'
    source TEXT,                          -- e.g. '单元测验' / '口算天天练'
    self_diagnosis TEXT,                  -- '粗心' / '概念不清' / '审题不清' 等
    error_type TEXT,                      -- 'concept' | 'calculation' | 'misread' | 'formula' | 'sign' | etc.
    state TEXT NOT NULL DEFAULT 'new',    -- 'new' | 'analyzed' | 'practicing' | 'flipped'
    review_count INTEGER DEFAULT 0,
    last_reviewed_at DATETIME,
    flipped_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    mistake_id TEXT NOT NULL,
    role TEXT NOT NULL,                   -- 'original' | 'mirror' | 'variant' | 'stretch' | 'fresh'
    type TEXT NOT NULL DEFAULT 'numeric', -- 'numeric' | 'mcq' | 'tf' | 'cloze' | 'steps' | 'short'
    stem TEXT NOT NULL,
    options_json TEXT,                    -- JSON array if mcq, e.g. ["① 增加 4", "② 减少 4", "③ 不变"]
    answer_json TEXT NOT NULL,            -- JSON: {"values": ["31"], "accept": []}
    grading_json TEXT,                    -- JSON: {"mode": "numeric", "tolerance": 0}
    difficulty INTEGER DEFAULT 2,
    hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mistake_id) REFERENCES mistakes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    mistake_id TEXT UNIQUE NOT NULL,
    user_answer TEXT NOT NULL,            -- The student's wrong answer
    correct_answer TEXT NOT NULL,         -- The ground-truth answer
    answer_source TEXT DEFAULT 'ai',      -- 'ai' | 'user'
    root_cause TEXT,                      -- Root cause breakdown
    avoid_rule TEXT,                      -- Actionable guidance: how to avoid
    key_concept TEXT,                     -- Key formula or concept explanation
    steps_json TEXT,                      -- JSON array of step-by-step resolution
    raw_response_json TEXT,               -- Full structured AI output
    ai_model TEXT DEFAULT 'gemini-3.5-flash-lite',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mistake_id) REFERENCES mistakes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    mistake_id TEXT NOT NULL,
    session_id TEXT,
    response_json TEXT NOT NULL,          -- student's submitted answer
    is_correct INTEGER NOT NULL,          -- 1 or 0
    time_ms INTEGER DEFAULT 0,
    confidence TEXT,                      -- 'sure' | 'guessed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY(mistake_id) REFERENCES mistakes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    usage_date TEXT NOT NULL,             -- YYYY-MM-DD
    kind TEXT NOT NULL,                   -- 'analyze' | 'regenerate' | 'grade'
    mistake_id TEXT,
    tokens INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user_state ON mistakes(user_id, state);
CREATE INDEX IF NOT EXISTS idx_mistakes_last_reviewed ON mistakes(user_id, last_reviewed_at);
CREATE INDEX IF NOT EXISTS idx_questions_mistake ON questions(mistake_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_mistake ON attempts(user_id, mistake_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(user_id, usage_date);
