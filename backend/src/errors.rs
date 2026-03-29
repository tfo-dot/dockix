use axum::{
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub enum AppError {
    NotFound(String),
    AlreadyExists(String),
    GitError(String),
    ParseError(String),
    InternalError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::AlreadyExists(msg) => (StatusCode::CONFLICT, msg),
            AppError::GitError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::ParseError(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg),
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = ErrorResponse { error: message };
        (status, Json(body)).into_response()
    }
}

impl From<git2::Error> for AppError {
    fn from(err: git2::Error) -> Self {
        AppError::GitError(format!("Git error: {}", err))
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::InternalError(format!("IO error: {}", err))
    }
}

impl From<tokio::task::JoinError> for AppError {
    fn from(_: tokio::task::JoinError) -> Self {
        AppError::InternalError("Thread error".to_string())
    }
}