use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum RepoStatus {
    Ready { last_synced_at: DateTime<Utc> },
    Cloning,
    Syncing { last_synced_at: DateTime<Utc> },
    CloneFailed { error: String },
    SyncFailed {
        last_synced_at: DateTime<Utc>,
        error: String,
        failed_at: DateTime<Utc>,
    },
}

#[derive(Serialize, Deserialize)]
pub struct RepoMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(flatten)]
    pub status: RepoStatus,
}

#[derive(Serialize)]
pub struct RepoInfo {
    pub name: String,
    pub path: String,
    #[serde(flatten)]
    pub status: RepoStatus,
}

#[derive(Deserialize)]
pub struct CloneRequest {
    pub url: String,
    pub name: String,
    pub token: Option<String>,
    pub depth: Option<i32>,
}

#[derive(Serialize)]
pub struct ParsedRepo {
    pub repo_name: String,
    pub files: Vec<ParsedFile>,
    // maybe add metadata like total_files, languages_detected, analyzed_at timestamp
}

#[derive(Serialize)]
pub struct ParsedFile {
    pub file_path: String,
    pub classes: Vec<ClassDoc>,
    pub functions: Vec<FunctionDoc>,
    // TODO: add language field for frontend
}

#[derive(Serialize)]
pub struct ClassDoc {
    pub name: String,
    pub docstring: Option<String>,
    // TODO: add methods: Vec<FunctionDoc>
}

#[derive(Serialize)]
pub struct FunctionDoc {
    pub name: String,
    pub docstring: Option<String>,
    // TODO: add parameters and return_type
}

pub struct AppConfig {
    pub base_dir: PathBuf,
}