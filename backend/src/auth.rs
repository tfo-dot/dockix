use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Extension, Json,
};
use rand::Rng;
use std::sync::Arc;

use crate::errors::AppError;
use crate::models::{AppConfig, LoginRequest, LoginResponse, User};
#[derive(Clone, Debug)]
pub enum AuthUser {
    Superadmin,
    User { id: String },
}
#[derive(Clone)]
pub struct SessionToken(pub String);

pub fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill(&mut bytes);
    bytes.iter().fold(String::with_capacity(64), |mut s, b| {
        use std::fmt::Write;
        let _ = write!(s, "{b:02x}");
        s
    })
}

pub async fn require_auth(
    State(config): State<Arc<AppConfig>>,
    mut request: Request,
    next: Next,
) -> Result<Response, impl IntoResponse> {
    let provided = request
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok());
    if provided == Some(config.api_key.as_str()) {
        request.extensions_mut().insert(AuthUser::Superadmin);
        return Ok(next.run(request).await);
    }

    let token = request
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(str::to_owned);

    let Some(token) = token else {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Missing or invalid authorization" })),
        ));
    };

    let db = Arc::clone(&config.db);
    let token_clone = token.clone();
    let now = chrono::Utc::now().to_rfc3339();

    let lookup = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT user_id FROM sessions WHERE token = ?1 AND expires_at > ?2",
            rusqlite::params![token_clone, now],
            |row| row.get::<_, String>(0),
        )
    })
        .await;

    let Ok(Ok(user_id)) = lookup else {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid or expired token" })),
        ));
    };

    request.extensions_mut().insert(AuthUser::User { id: user_id });
    request.extensions_mut().insert(SessionToken(token));
    Ok(next.run(request).await)
}

pub async fn login_handler(
    State(config): State<Arc<AppConfig>>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let email = payload.email.clone();
    let db = Arc::clone(&config.db);

    let (user, hash) = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT id, name, email, created_at, password_hash FROM users WHERE email = ?1",
            rusqlite::params![email],
            |row| Ok((
                User {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    email: row.get(2)?,
                    created_at: row.get(3)?,
                },
                row.get::<_, String>(4)?,
            )),
        )
    })
        .await?
        .map_err(|_| AppError::Unauthorized)?;

    let password = payload.password;
    tokio::task::spawn_blocking(move || {
        let parsed_hash = PasswordHash::new(&hash).map_err(|_| AppError::Unauthorized)?;
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized)
    })
        .await??;

    let token = generate_token();
    let expires_at = (chrono::Utc::now() + chrono::Duration::days(7)).to_rfc3339();
    let created_at = chrono::Utc::now().to_rfc3339();

    let db = Arc::clone(&config.db);
    let token_clone = token.clone();
    let user_id = user.id.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![token_clone, user_id, created_at, expires_at],
        )
    })
        .await??;

    Ok(Json(LoginResponse { token }))
}

pub async fn logout_handler(
    Extension(session): Extension<SessionToken>,
    State(config): State<Arc<AppConfig>>,
) -> Result<impl IntoResponse, AppError> {
    let db = Arc::clone(&config.db);
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "DELETE FROM sessions WHERE token = ?1",
            rusqlite::params![session.0],
        )
    })
        .await??;

    Ok(StatusCode::NO_CONTENT)
}