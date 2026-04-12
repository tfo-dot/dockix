mod models;
mod errors;
mod parsers;
mod repo;
mod handlers;

use axum::{
    routing::{get, post},
    Router,
};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use crate::models::AppConfig;
use crate::handlers::{clone_handler, list_repos_handler, analyze_repo_handler};

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
        .route("/analyze/:repo_name", get(analyze_repo_handler))
        .with_state(config);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Git API running on http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}