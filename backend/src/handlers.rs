use axum::{
    extract::State,
    Json,
    response::IntoResponse,
};
use std::sync::Arc;
use axum::extract::Path;

use crate::models::{AppConfig, CloneRequest};
use crate::errors::AppError;
use crate::repo;

pub async fn list_repos_handler(
    State(config): State<Arc<AppConfig>>,
) -> Result<impl IntoResponse, AppError> {
    let repos = repo::list_repos(&config.base_dir)?;
    Ok(Json(repos))
}

pub async fn clone_handler(
    State(config): State<Arc<AppConfig>>,
    Json(payload): Json<CloneRequest>,
) -> Result<impl IntoResponse, AppError> {
    let url = payload.url;
    let target_path = config.base_dir.join(&payload.name);

    if target_path.exists() {
        return Err(AppError::AlreadyExists("Directory already exists".to_string()));
    }

    tokio::task::spawn_blocking(move || {
        repo::clone_repo(&url, target_path)
    }).await??;

    Ok(Json("Repository cloned successfully"))
}

pub async fn analyze_repo_handler(
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let repo_path = config.base_dir.join(&repo_name);

    if !repo_path.exists() {
        return Err(AppError::NotFound("Repository not found".to_string()));
    }

    let parsed_data = tokio::task::spawn_blocking(move || {
        repo::analyze_directory(repo_name, repo_path)
    }).await?;

    Ok(Json(parsed_data))
}