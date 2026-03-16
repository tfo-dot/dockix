use axum::{
    extract::State,
    routing::{get, post},
    Json, Router, http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use std::fs;
use git2::Repository;

#[derive(Serialize, Deserialize)]
struct RepoInfo {
    name: String,
    path: String,
}

#[derive(Deserialize)]
struct CloneRequest {
    url: String,
    name: String,
}

struct AppConfig {
    base_dir: PathBuf,
}

#[tokio::main]
async fn main() {
    let base_dir = PathBuf::from("./repositories");
    
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir).expect("Failed to create base directory");
    }

    let config = Arc::new(AppConfig { base_dir });

    let app = Router::new()
        .route("/clone", post(clone_handler))
        .route("/repos", get(list_repos_handler))
        .with_state(config);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Git API running on http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}

async fn list_repos_handler(State(config): State<Arc<AppConfig>>) -> impl IntoResponse {
    let mut repos = Vec::new();

    if let Ok(entries) = fs::read_dir(&config.base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            
            if path.is_dir() && path.join(".git").exists() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    repos.push(RepoInfo {
                        name: name.to_string(),
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    Json(repos)
}

async fn clone_handler(
    State(config): State<Arc<AppConfig>>,
    Json(payload): Json<CloneRequest>,
) -> impl IntoResponse {
    let url = payload.url;
    let target_path = config.base_dir.join(&payload.name);

    if target_path.exists() {
        return (StatusCode::CONFLICT, "Directory already exists").into_response();
    }

    let clone_result = tokio::task::spawn_blocking(move || {
        Repository::clone(&url, target_path)
    }).await;

    match clone_result {
        Ok(Ok(_)) => (StatusCode::CREATED, "Repository cloned successfully").into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Git error: {}", e)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Thread error").into_response(),
    }
}