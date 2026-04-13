use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Serialize)]
struct AuthError {
    error: String,
}

pub async fn require_api_key(request: Request, next: Next) -> Result<Response, impl IntoResponse> {
    let api_key = std::env::var("DOCKIX_API_KEY").unwrap_or_default();

    if api_key.is_empty() {
        return Ok(next.run(request).await);
    }

    let provided = request
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok());

    match provided {
        Some(key) if key == api_key => Ok(next.run(request).await),
        _ => Err((
            StatusCode::UNAUTHORIZED,
            Json(AuthError {
                error: "Invalid or missing API key".to_string(),
            }),
        )),
    }
}