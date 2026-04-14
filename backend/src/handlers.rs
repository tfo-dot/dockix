use axum::{
    extract::State,
    http::StatusCode,
    Json,
    response::IntoResponse,
};
use std::fs;
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
    repo::validate_repo_url(&payload.url)?;

    let name = payload.name.clone();
    let target_path = config.base_dir.join(&name);

    // allow retrying a failed clone by cleaning up the old attempt
    if repo::clone_error(&config.base_dir, &name).is_some() {
        repo::clear_clone_error(&config.base_dir, &name);
        let _ = fs::remove_dir_all(&target_path);
    } else if target_path.exists() {
        return Err(AppError::AlreadyExists("Directory already exists".to_string()));
    }

    repo::mark_cloning(&config.base_dir, &name);

    let url = payload.url;
    let token = payload.token;
    let depth = payload.depth.unwrap_or(1);
    let base_dir = config.base_dir.clone();

    tokio::task::spawn_blocking(move || {
        match repo::clone_repo(&url, &target_path, token.as_deref(), depth) {
            Ok(()) => {
                repo::unmark_cloning(&base_dir, &name);
                if let Some(ref token) = token {
                    let _ = repo::save_token(&target_path, token);
                }
            }
            Err(e) => {
                repo::unmark_cloning(&base_dir, &name);
                repo::write_clone_error(&base_dir, &name, &e.to_string());
            }
        }
    });

    Ok((StatusCode::ACCEPTED, Json("Clone started, check GET /repos for status")))
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