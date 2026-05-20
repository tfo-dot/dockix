use std::sync::{Arc, Mutex};

use rusqlite::Connection;

use crate::errors::AppError;

pub type Db = Arc<Mutex<Connection>>;

pub fn init_db(path: &str) -> Result<Db, AppError> {
    let conn = Connection::open(path)?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            kind       TEXT NOT NULL,
            repo_name  TEXT,
            actor_id   TEXT,
            detail     TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );",
    )?;

    Ok(Arc::new(Mutex::new(conn)))
}

pub fn write_event(
    conn: &Connection,
    kind: &str,
    repo_name: Option<&str>,
    actor_id: Option<&str>,
    detail: &serde_json::Value,
) -> Result<(), AppError> {
    let detail_str = detail.to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO events (kind, repo_name, actor_id, detail, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![kind, repo_name, actor_id, detail_str, created_at],
    )?;
    Ok(())
}