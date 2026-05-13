mod models;
mod errors;
mod parsers;
mod repo;
mod repo_handlers;
mod auth;
mod sync;
mod db;

mod user_handlers;

use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Semaphore;
use crate::models::AppConfig;
use crate::repo_handlers::{clone_handler, list_repos_handler, analyze_repo_handler, delete_repo_handler};
use crate::user_handlers::{list_users_handler, get_user_handler, get_me_handler,patch_me_handler, patch_user_handler, create_user_handler, delete_user_handler};
use crate::auth::{login_handler, logout_handler};

#[tokio::main]
async fn main() {
    let base_dir = PathBuf::from("./repositories");

    if !base_dir.exists() {
        fs::create_dir_all(&base_dir).expect("Failed to create base directory");
    }

    repo::cleanup_stale_cloning(&base_dir);

    sync::start_sync_task(base_dir.clone());

    let max_clones: usize = std::env::var("DOCKIX_MAX_CONCURRENT_CLONES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3);

    let db = db::init_db("dockix.db").expect("Failed to initialize database");

    let api_key = std::env::var("DOCKIX_API_KEY").unwrap_or_else(|_| {
        let key = auth::generate_token();
        println!("WARNING: DOCKIX_API_KEY not set. Generated superadmin key for this session:");
        println!("  {key}");
        key
    });
    
    let config = Arc::new(AppConfig {
        base_dir,
        clone_semaphore: Arc::new(Semaphore::new(max_clones)),
        db,
        api_key,
    });

    let public_routes = Router::new()
        .route("/auth/login", post(login_handler));

    let protected_routes = Router::new()
        .route("/repos", post(clone_handler))
        .route("/repos", get(list_repos_handler))
        .route("/repos/:repo_name", delete(delete_repo_handler))
        .route("/repos/:repo_name/analysis", get(analyze_repo_handler))
        .route("/user/list", get(list_users_handler))
        .route("/user/@me", get(get_me_handler).patch(patch_me_handler))
        .route("/user/:id", get(get_user_handler).patch(patch_user_handler).delete(delete_user_handler))
        .route("/user", post(create_user_handler))
        .route("/auth/logout", post(logout_handler))
        .layer(middleware::from_fn_with_state(config.clone(), auth::require_auth));

    let app = public_routes
        .merge(protected_routes)
        .with_state(config);


    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Git API running on http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}