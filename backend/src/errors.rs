use axum::{
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use std::fmt;

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub enum AppError {
    NotFound,
    AlreadyExists,
    TooManyClones,
    CloneInProgress,
    InvalidInput(String),
    GitError(String),
    ParseError(String),
    InternalError(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound => write!(f, "Not found"),
            AppError::AlreadyExists => write!(f, "Already exists"),
            AppError::TooManyClones => write!(f, "Too many clones in progress"),
            AppError::CloneInProgress => write!(f, "Clone is in progress"),
            AppError::InvalidInput(msg)
            | AppError::GitError(msg)
            | AppError::ParseError(msg)
            | AppError::InternalError(msg) => write!(f, "{msg}"),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "Not found".to_string()),
            AppError::AlreadyExists => (StatusCode::CONFLICT, "Already exists".to_string()),
            AppError::TooManyClones => (StatusCode::TOO_MANY_REQUESTS, "Too many clones in progress, try again later".to_string()),
            AppError::CloneInProgress => (StatusCode::CONFLICT, "Cannot delete while clone is in progress".to_string()),
            AppError::InvalidInput(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::GitError(msg) | AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            AppError::ParseError(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
        };

        let body = ErrorResponse { error: message };
        (status, Json(body)).into_response()
    }
}

impl From<git2::Error> for AppError {
    fn from(err: git2::Error) -> Self {
        let msg = err.message();

        let is_auth_error = err.code() == git2::ErrorCode::Auth
            || (err.class() == git2::ErrorClass::Http && msg.contains("401"))
            || msg.contains("authentication replays");

        if is_auth_error {
            return AppError::InvalidInput(
                "Authentication failed, the repository may be private. Try providing a token."
                    .to_string(),
            );
        }

        if err.class() == git2::ErrorClass::Http && msg.contains("404") {
            return AppError::InvalidInput(
                "Repository not found, check the URL.".to_string(),
            );
        }

        AppError::GitError(format!("Git error: {err}"))
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::InternalError(format!("IO error: {err}"))
    }
}

impl From<tokio::task::JoinError> for AppError {
    fn from(_: tokio::task::JoinError) -> Self {
        AppError::InternalError("Thread error".to_string())
    }
}