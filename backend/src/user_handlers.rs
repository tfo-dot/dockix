use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use rand_core::OsRng;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::models::{
    AppConfig, CreateUserRequest, CreateUserResponse, UpdateMeRequest, UpdateUserRequest, User,
};

fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::InternalError(e.to_string()))
}

fn db_get_user(conn: &rusqlite::Connection, id: &str) -> Result<User, AppError> {
    conn.query_row(
        "SELECT id, name, email, created_at FROM users WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                created_at: row.get(3)?,
            })
        },
    )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
            _ => AppError::from(e),
        })
}

pub async fn list_users_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
) -> Result<impl IntoResponse, AppError> {
    let AuthUser::Superadmin = auth else {
        return Err(AppError::Forbidden);
    };

    let db = Arc::clone(&config.db);
    let users = tokio::task::spawn_blocking(move || -> Result<Vec<User>, AppError> {
        let conn = db.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, email, created_at FROM users",
        )?;
        let users = stmt
            .query_map([], |row| {
                Ok(User {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    email: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(users)
    })
        .await??;

    Ok(Json(users))
}

pub async fn get_user_handler(
    Extension(_auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let db = Arc::clone(&config.db);
    let user = tokio::task::spawn_blocking(move || db_get_user(&db.lock().unwrap(), &id))
        .await??;

    Ok(Json(user))
}

pub async fn get_me_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
) -> Result<impl IntoResponse, AppError> {
    let AuthUser::User { id } = auth else {
        return Err(AppError::Forbidden);
    };

    let db = Arc::clone(&config.db);
    let user = tokio::task::spawn_blocking(move || db_get_user(&db.lock().unwrap(), &id))
        .await??;

    Ok(Json(user))
}

pub async fn patch_me_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Json(payload): Json<UpdateMeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let AuthUser::User { id } = auth else {
        return Err(AppError::Forbidden);
    };

    if payload.name.is_none() && payload.email.is_none() && payload.password.is_none() {
        return Err(AppError::InvalidInput("No fields to update".to_string()));
    }

    let new_hash = payload.password.as_deref().map(hash_password).transpose()?;
    let db = Arc::clone(&config.db);
    let user = tokio::task::spawn_blocking(move || -> Result<User, AppError> {
        let conn = db.lock().unwrap();

        if let Some(name) = &payload.name {
            conn.execute(
                "UPDATE users SET name = ?1 WHERE id = ?2",
                rusqlite::params![name, id],
            )?;
        }
        if let Some(email) = &payload.email {
            conn.execute(
                "UPDATE users SET email = ?1 WHERE id = ?2",
                rusqlite::params![email, id],
            )?;
        }
        if let Some(hash) = &new_hash {
            conn.execute(
                "UPDATE users SET password_hash = ?1 WHERE id = ?2",
                rusqlite::params![hash, id],
            )?;
            conn.execute(
                "DELETE FROM sessions WHERE user_id = ?1",
                rusqlite::params![id],
            )?;
        }

        db_get_user(&conn, &id)
    })
        .await??;

    Ok(Json(user).into_response())
}

pub async fn create_user_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let AuthUser::Superadmin = auth else {
        return Err(AppError::Forbidden);
    };

    let generated_password = payload.password.is_none().then(|| Uuid::new_v4().to_string());
    let raw_password = payload
        .password
        .as_deref()
        .or(generated_password.as_deref())
        .unwrap();

    let hash = hash_password(raw_password)?;
    let id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    let name = payload.name.clone();
    let email = payload.email.clone();

    let db = Arc::clone(&config.db);
    let user = tokio::task::spawn_blocking(move || -> Result<User, AppError> {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, name, email, hash, created_at],
        )
            .map_err(|e| {
                if e.to_string().contains("UNIQUE constraint failed") {
                    AppError::AlreadyExists
                } else {
                    AppError::from(e)
                }
            })?;
        db_get_user(&conn, &id)
    })
        .await??;

    Ok((
        StatusCode::CREATED,
        Json(CreateUserResponse {
            user,
            generated_password,
        }),
    ))
}

pub async fn patch_user_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let AuthUser::Superadmin = auth else {
        return Err(AppError::Forbidden);
    };

    if payload.name.is_none() && payload.email.is_none() {
        return Err(AppError::InvalidInput("No fields to update".to_string()));
    }

    let db = Arc::clone(&config.db);
    let user = tokio::task::spawn_blocking(move || -> Result<User, AppError> {
        let conn = db.lock().unwrap();

        db_get_user(&conn, &id)?;

        if let Some(name) = &payload.name {
            conn.execute(
                "UPDATE users SET name = ?1 WHERE id = ?2",
                rusqlite::params![name, id],
            )?;
        }
        if let Some(email) = &payload.email {
            conn.execute(
                "UPDATE users SET email = ?1 WHERE id = ?2",
                rusqlite::params![email, id],
            )?;
        }

        db_get_user(&conn, &id)
    })
        .await??;

    Ok(Json(user))
}

pub async fn delete_user_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let AuthUser::Superadmin = auth else {
        return Err(AppError::Forbidden);
    };

    let db = Arc::clone(&config.db);
    tokio::task::spawn_blocking(move || -> Result<(), AppError> {
        let conn = db.lock().unwrap();
        let affected = conn.execute("DELETE FROM users WHERE id = ?1", rusqlite::params![id])?;
        if affected == 0 {
            return Err(AppError::NotFound);
        }
        conn.execute("DELETE FROM sessions WHERE user_id = ?1", rusqlite::params![id])?;
        Ok(())
    })
        .await??;

    Ok(StatusCode::NO_CONTENT)
}