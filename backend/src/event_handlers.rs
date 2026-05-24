use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Extension, Json,
};
use rusqlite::types::ToSql;
use std::sync::Arc;

use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::models::{AppConfig, RepoEvent, RepoMeta};
use crate::repo;

fn repo_event_kinds(auth: &AuthUser, meta: &RepoMeta) -> Vec<&'static str> {
    let mut kinds = vec!["member_added", "member_removed", "ownership_transferred"];

    let (has_manage_members, has_manage_roles) = match auth {
        AuthUser::Superadmin => (true, true),
        AuthUser::User { id } => match meta.members.iter().find(|m| &m.user_id == id) {
            Some(m) if m.is_owner => (true, true),
            Some(m) => (
                repo::has_permission(m, &meta.roles, repo::PERM_MANAGE_MEMBERS),
                repo::has_permission(m, &meta.roles, repo::PERM_MANAGE_ROLES),
            ),
            None => (false, false),
        },
    };

    if has_manage_members {
        kinds.push("member_role_changed");
    }
    if has_manage_roles {
        kinds.extend_from_slice(&["role_created", "role_updated", "role_deleted"]);
    }

    kinds
}

fn map_event_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<RepoEvent> {
    let detail_str: String = row.get(4)?;
    Ok(RepoEvent {
        id: row.get(0)?,
        kind: row.get(1)?,
        repo_name: row.get(2)?,
        actor_id: row.get(3)?,
        detail: serde_json::from_str(&detail_str)
            .unwrap_or(serde_json::Value::Object(serde_json::Map::default())),
        created_at: row.get(5)?,
    })
}

pub async fn get_repo_events_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let meta = repo::load_meta(&config.base_dir, &repo_name).ok_or(AppError::NotFound)?;
    if let AuthUser::User { id } = &auth
        && !meta.members.iter().any(|m| &m.user_id == id)
    {
        return Err(AppError::NotFound);
    }

    let kinds = repo_event_kinds(&auth, &meta);
    let db = Arc::clone(&config.db);

    let events = tokio::task::spawn_blocking(move || -> Result<Vec<RepoEvent>, AppError> {
        let conn = db.lock().unwrap();

        let placeholders = (0..kinds.len())
            .map(|i| format!("?{}", i + 2))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT id, kind, repo_name, actor_id, detail, created_at FROM events \
             WHERE repo_name = ?1 AND kind IN ({placeholders}) ORDER BY id DESC"
        );

        let mut params: Vec<Box<dyn ToSql>> = vec![Box::new(repo_name)];
        for k in &kinds {
            params.push(Box::new(k.to_string()));
        }
        let param_refs: Vec<&dyn ToSql> = params.iter().map(std::convert::AsRef::as_ref).collect();

        let mut stmt = conn.prepare(&sql)?;
        let events = stmt
            .query_map(param_refs.as_slice(), map_event_row)?
            .collect::<rusqlite::Result<Vec<_>>>()?;

        Ok(events)
    })
        .await??;

    Ok(Json(events))
}

pub async fn get_admin_events_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
) -> Result<impl IntoResponse, AppError> {
    let AuthUser::Superadmin = auth else {
        return Err(AppError::Forbidden);
    };

    let db = Arc::clone(&config.db);
    let events = tokio::task::spawn_blocking(move || -> Result<Vec<RepoEvent>, AppError> {
        let conn = db.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, kind, repo_name, actor_id, detail, created_at FROM events \
             WHERE kind IN ('repo_cloned', 'repo_clone_failed', 'repo_deleted', 'user_created', 'user_deleted') \
             ORDER BY id DESC",
        )?;
        let events = stmt
            .query_map([], map_event_row)?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(events)
    })
        .await??;

    Ok(Json(events))
}