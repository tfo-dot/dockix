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

    if let Some(meta) = repo::load_meta(&config.base_dir, &name) {
        if matches!(meta.status, crate::models::RepoStatus::CloneFailed { .. }) {
            let _ = fs::remove_dir_all(&target_path);
        } else {
            return Err(AppError::AlreadyExists);
        }
    } else if target_path.exists() {
        return Err(AppError::AlreadyExists);
    }

    let permit = Arc::clone(&config.clone_semaphore)
        .try_acquire_owned()
        .map_err(|_| AppError::TooManyClones)?;

    let url = payload.url;
    let token = payload.token;
    let depth = payload.depth.unwrap_or(1);
    let base_dir = config.base_dir.clone();

    repo::save_meta(&config.base_dir, &name, &crate::models::RepoMeta {
        token: token.clone(),
        status: crate::models::RepoStatus::Cloning,
    })?;

    tokio::task::spawn_blocking(move || {
        let _permit = permit;

        match repo::clone_repo(&url, &target_path, token.clone(), depth) {
            Ok(()) => {
                let _ = repo::save_meta(&base_dir, &name, &crate::models::RepoMeta {
                    token,
                    status: crate::models::RepoStatus::Ready {
                        last_synced_at: chrono::Utc::now(),
                    },
                });
            }
            Err(e) => {
                let _ = repo::save_meta(&base_dir, &name, &crate::models::RepoMeta {
                    token,
                    status: crate::models::RepoStatus::CloneFailed {
                        error: e.to_string(),
                    },
                });
            }
        }
    });

    Ok((StatusCode::ACCEPTED, Json("Clone started, check GET /repos for status")))
}

pub async fn delete_repo_handler(
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let repo_path = config.base_dir.join(&repo_name);
    let meta = repo::load_meta(&config.base_dir, &repo_name);

    if let Some(ref meta) = meta
        && matches!(meta.status, crate::models::RepoStatus::Cloning)
    {
        return Err(AppError::CloneInProgress);
    }

    let dir_exists = repo_path.exists();
    let meta_exists = meta.is_some();

    if !dir_exists && !meta_exists {
        return Err(AppError::NotFound);
    }

    if dir_exists {
        fs::remove_dir_all(&repo_path)?;
    }

    if meta_exists {
        repo::delete_meta(&config.base_dir, &repo_name)?;
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn analyze_repo_handler(
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let repo_path = config.base_dir.join(&repo_name);

    if !repo_path.exists() {
        return Err(AppError::NotFound);
    }

    let parsed_data = tokio::task::spawn_blocking(move || {
        repo::analyze_directory(repo_name, repo_path)
    }).await?;

    Ok(Json(parsed_data))
}