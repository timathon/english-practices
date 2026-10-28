-- Initial schema for Wistake (错题本)
CREATE TABLE IF NOT EXISTS wistakes (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    subject TEXT NOT NULL DEFAULT 'english',
    source TEXT,
    stem TEXT NOT NULL,
    options TEXT, -- JSON array of choices
    user_answer TEXT,
    correct_answer TEXT NOT NULL,
    insight TEXT, -- 悟道点/解析
    tag TEXT, -- 知识点标签
    error_count INTEGER DEFAULT 1,
    review_level INTEGER DEFAULT 0, -- 艾宾浩斯复习级别
    is_flipped INTEGER DEFAULT 0, -- 0: pending review (Mistake), 1: mastered (Wistake)
    last_reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wistakes_user ON wistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_wistakes_subject ON wistakes(subject);
CREATE INDEX IF NOT EXISTS idx_wistakes_flipped ON wistakes(is_flipped);
