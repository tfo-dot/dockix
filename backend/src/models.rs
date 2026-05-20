use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Semaphore;

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

#[derive(Serialize, Deserialize, Clone)]
pub struct RepoRole {
    pub id: String,
    pub name: String,
    pub permissions: Vec<String>,
    pub is_builtin: bool,
    pub level: u8,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RepoMember {
    pub user_id: String,
    pub role_id: Option<String>,
    pub is_owner: bool,
    pub joined_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize)]
pub struct RepoMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    #[serde(flatten)]
    pub status: RepoStatus,
    #[serde(default)]
    pub roles: Vec<RepoRole>,
    #[serde(default)]
    pub members: Vec<RepoMember>,
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
    pub branch: Option<String>,
}

#[derive(Deserialize)]
pub struct PrefetchRequest {
    pub url: String,
    pub token: Option<String>,
}

#[derive(Serialize)]
pub struct PrefetchResponse {
    pub default_branch: Option<String>,
    pub branches: Vec<String>,
    pub tags: Vec<String>,
}

#[derive(Serialize)]
pub struct ParsedRepo {
    pub repo_name: String,
    pub files: Vec<ParsedFile>,
}
#[derive(Serialize)]
pub struct ParsedFile {
    pub file_path: String,
    pub language: String,
    pub classes: Vec<ClassDoc>,
    pub functions: Vec<FunctionDoc>,
}

#[derive(Serialize)]
pub struct ClassDoc {
    pub name: String,
    pub docstring: Option<String>,
    pub methods: Vec<FunctionDoc>,
}

#[derive(Serialize)]
pub struct FunctionDoc {
    pub name: String,
    pub docstring: Option<String>,
    pub parameters: Vec<ParameterDoc>,
    pub return_type: Option<String>,
}

#[derive(Serialize)]
pub struct ParameterDoc {
    pub name: String,
    pub type_annotation: Option<String>,
    pub default_value: Option<String>,
}

pub struct AppConfig {
    pub base_dir: PathBuf,
    pub clone_semaphore: Arc<Semaphore>,
    pub db: crate::db::Db,
    pub api_key: String,
}
#[derive(Serialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
    pub password: Option<String>,
}

#[derive(Serialize)]
pub struct CreateUserResponse {
    #[serde(flatten)]
    pub user: User,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generated_password: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateMeRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    pub permissions: Vec<String>,
    pub level: Option<u8>,
}

#[derive(Deserialize)]
pub struct UpdateRoleRequest {
    pub name: Option<String>,
    pub permissions: Option<Vec<String>>,
    pub level: Option<u8>,
}

#[derive(Deserialize)]
pub struct AddMemberRequest {
    pub user_id: String,
    pub role_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateMemberRequest {
    pub role_id: Option<String>,
    pub transfer_ownership: Option<bool>,
}

#[derive(Serialize)]
pub struct RepoEvent {
    pub id: i64,
    pub kind: String,
    pub repo_name: Option<String>,
    pub actor_id: Option<String>,
    pub detail: serde_json::Value,
    pub created_at: String,
}