-- Schema for CZG D1 Database
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
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_topic_mastery (
  user_id TEXT NOT NULL,
  textbook_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_level TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, textbook_id, topic_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
