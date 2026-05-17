use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use chrono::Utc;
use std::fs;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::models::{
    AddMemberRequest, AppConfig, CloneRequest, CreateRoleRequest, PrefetchRequest, RepoMember,
    UpdateMemberRequest, UpdateRoleRequest,
};
use crate::repo;
fn load_meta_as_member(
    base_dir: &std::path::Path,
    repo_name: &str,
    auth: &AuthUser,
) -> Result<crate::models::RepoMeta, AppError> {
    let meta = repo::load_meta(base_dir, repo_name).ok_or(AppError::NotFound)?;
    if let AuthUser::User { id } = auth
        && !meta.members.iter().any(|m| &m.user_id == id) {
        return Err(AppError::NotFound);
    }
    Ok(meta)
}
fn caller_level(meta: &crate::models::RepoMeta, auth: &AuthUser) -> Result<u8, AppError> {
    match auth {
        AuthUser::Superadmin => Ok(u8::MAX),
        AuthUser::User { id } => {
            let member = meta.members.iter().find(|m| &m.user_id == id)
                .ok_or(AppError::NotFound)?;
            Ok(repo::effective_level(member, &meta.roles))
        }
    }
}
fn caller_level_and_perm(
    meta: &crate::models::RepoMeta,
    auth: &AuthUser,
    perm: &str,
) -> Result<(u8, bool), AppError> {
    match auth {
        AuthUser::Superadmin => Ok((u8::MAX, true)),
        AuthUser::User { id } => {
            let member = meta.members.iter().find(|m| &m.user_id == id)
                .ok_or(AppError::NotFound)?;
            Ok((
                repo::effective_level(member, &meta.roles),
                repo::has_permission(member, &meta.roles, perm),
            ))
        }
    }
}
pub async fn prefetch_handler(
    State(_config): State<Arc<AppConfig>>,
    Json(payload): Json<PrefetchRequest>,
) -> Result<impl IntoResponse, AppError> {
    repo::validate_repo_url(&payload.url)?;

    let url = payload.url;
    let token = payload.token;

    let response = tokio::task::spawn_blocking(move || repo::prefetch_repo(&url, token)).await??;

    Ok(Json(response))
}

pub async fn list_repos_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
) -> Result<impl IntoResponse, AppError> {
    let base_dir = config.base_dir.clone();
    let user_id = match auth {
        AuthUser::Superadmin => None,
        AuthUser::User { id } => Some(id),
    };
    let repos = tokio::task::spawn_blocking(move || repo::list_repos(&base_dir, user_id.as_ref())).await??;
    Ok(Json(repos))
}

pub async fn clone_handler(
    Extension(auth): Extension<AuthUser>,
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
            match &auth {
                AuthUser::Superadmin => return Err(AppError::AlreadyExists),
                AuthUser::User { id } => {
                    if meta.members.iter().any(|m| &m.user_id == id) {
                        return Err(AppError::AlreadyExists);
                    }
                    return Err(AppError::Forbidden);
                }
            }
        }
    } else if target_path.exists() {
        return Err(match &auth {
            AuthUser::Superadmin => AppError::AlreadyExists,
            AuthUser::User { .. } => AppError::Forbidden,
        });
    }

    let permit = Arc::clone(&config.clone_semaphore)
        .try_acquire_owned()
        .map_err(|_| AppError::TooManyClones)?;

    let url = payload.url;
    let token = payload.token;
    let depth = payload.depth.unwrap_or(1);
    let branch = payload.branch;
    let base_dir = config.base_dir.clone();

    let initial_members: Vec<RepoMember> = match &auth {
        AuthUser::User { id } => vec![RepoMember {
            user_id: id.clone(),
            role_id: None,
            is_owner: true,
            joined_at: Utc::now(),
        }],
        AuthUser::Superadmin => vec![],
    };
    let initial_roles = repo::init_repo_roles();

    let base_dir_pre = config.base_dir.clone();
    let name_pre = name.clone();
    let token_pre = token.clone();
    let branch_pre = branch.clone();
    let roles_pre = initial_roles.clone();
    let members_pre = initial_members.clone();

    tokio::task::spawn_blocking(move || {
        repo::save_meta(&base_dir_pre, &name_pre, &crate::models::RepoMeta {
            token: token_pre,
            branch: branch_pre,
            status: crate::models::RepoStatus::Cloning,
            roles: roles_pre,
            members: members_pre,
        })
    })
        .await??;

    tokio::task::spawn_blocking(move || {
        let _permit = permit;

        match repo::clone_repo(&url, &target_path, token.clone(), depth, branch.as_deref()) {
            Ok(()) => {
                let (roles, members) = repo::load_meta(&base_dir, &name)
                    .map_or_else(|| (initial_roles, initial_members), |m| (m.roles, m.members));
                let _ = repo::save_meta(&base_dir, &name, &crate::models::RepoMeta {
                    token,
                    branch,
                    status: crate::models::RepoStatus::Ready {
                        last_synced_at: chrono::Utc::now(),
                    },
                    roles,
                    members,
                });
            }
            Err(e) => {
                let (roles, members) = repo::load_meta(&base_dir, &name)
                    .map_or_else(|| (initial_roles, initial_members), |m| (m.roles, m.members));
                let _ = repo::save_meta(&base_dir, &name, &crate::models::RepoMeta {
                    token,
                    branch,
                    status: crate::models::RepoStatus::CloneFailed {
                        error: e.to_string(),
                    },
                    roles,
                    members,
                });
            }
        }
    });

    Ok((StatusCode::ACCEPTED, Json("Clone started, check GET /repos for status")))
}

pub async fn delete_repo_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let repo_path = config.base_dir.join(&repo_name);
    let meta = repo::load_meta(&config.base_dir, &repo_name);

    match (&auth, &meta) {
        (AuthUser::User { id }, Some(meta)) => {
            let member = meta.members.iter().find(|m| &m.user_id == id)
                .ok_or(AppError::NotFound)?;
            if repo::effective_level(member, &meta.roles) < repo::LEVEL_ADMIN {
                return Err(AppError::Forbidden);
            }
        }
        (AuthUser::User { .. }, None) => return Err(AppError::NotFound),
        (AuthUser::Superadmin, _) => {}
    }

    if let Some(ref meta) = meta
        && matches!(meta.status, crate::models::RepoStatus::Cloning) {
        return Err(AppError::CloneInProgress);
    }

    let dir_exists = repo_path.exists();
    let meta_exists = meta.is_some();

    if !dir_exists && !meta_exists {
        return Err(AppError::NotFound);
    }

    let base_dir = config.base_dir.clone();
    tokio::task::spawn_blocking(move || -> Result<(), AppError> {
        if dir_exists {
            fs::remove_dir_all(&repo_path)?;
        }
        if meta_exists {
            repo::delete_meta(&base_dir, &repo_name)?;
        }
        Ok(())
    })
        .await??;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn analyze_repo_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let repo_path = config.base_dir.join(&repo_name);

    let meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;

    let (_, has_analyze) = caller_level_and_perm(&meta, &auth, repo::PERM_ANALYZE)?;
    if !has_analyze {
        return Err(AppError::Forbidden);
    }

    if !repo_path.exists() {
        return Err(AppError::NotFound);
    }

    let parsed_data = tokio::task::spawn_blocking(move || {
        repo::analyze_directory(repo_name, repo_path)
    })
        .await?;

    Ok(Json(parsed_data))
}
pub async fn list_roles_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;
    Ok(Json(meta.roles))
}

pub async fn create_role_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
    Json(payload): Json<CreateRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::InvalidInput("Role name cannot be empty".to_string()));
    }

    let mut meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;

    let (caller_lvl, has_perm) = caller_level_and_perm(&meta, &auth, repo::PERM_MANAGE_ROLES)?;
    if !has_perm {
        return Err(AppError::Forbidden);
    }

    let role_level = payload.level.unwrap_or(1);
    if role_level == 0 || role_level >= repo::LEVEL_ADMIN {
        return Err(AppError::InvalidInput(format!(
            "Role level must be between 1 and {}",
            repo::LEVEL_CUSTOM_MAX
        )));
    }
    if caller_lvl <= role_level {
        return Err(AppError::Forbidden);
    }

    for perm in &payload.permissions {
        if !repo::is_valid_permission(perm) {
            return Err(AppError::InvalidInput(format!("Unknown permission: {perm}")));
        }
        let caller_has = match &auth {
            AuthUser::Superadmin => true,
            AuthUser::User { id } => {
                let member = meta.members.iter().find(|m| &m.user_id == id)
                    .ok_or(AppError::NotFound)?;
                repo::has_permission(member, &meta.roles, perm)
            }
        };
        if !caller_has {
            return Err(AppError::Forbidden);
        }
    }

    let role = crate::models::RepoRole {
        id: Uuid::new_v4().to_string(),
        name: payload.name,
        permissions: payload.permissions,
        is_builtin: false,
        level: role_level,
    };

    meta.roles.push(role.clone());
    repo::save_meta(&config.base_dir, &repo_name, &meta)?;

    Ok((StatusCode::CREATED, Json(role)))
}

pub async fn update_role_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path((repo_name, role_id)): Path<(String, String)>,
    Json(payload): Json<UpdateRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    if payload.name.is_none() && payload.permissions.is_none() && payload.level.is_none() {
        return Err(AppError::InvalidInput("No fields to update".to_string()));
    }

    let mut meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;

    let (caller_lvl, has_perm) = caller_level_and_perm(&meta, &auth, repo::PERM_MANAGE_ROLES)?;
    if !has_perm {
        return Err(AppError::Forbidden);
    }

    let role_idx = meta.roles.iter().position(|r| r.id == role_id)
        .ok_or(AppError::NotFound)?;

    if meta.roles[role_idx].is_builtin {
        return Err(AppError::Builtin);
    }

    if caller_lvl <= meta.roles[role_idx].level {
        return Err(AppError::Forbidden);
    }

    if let Some(new_level) = payload.level {
        if new_level == 0 || new_level >= repo::LEVEL_ADMIN {
            return Err(AppError::InvalidInput(format!(
                "Role level must be between 1 and {}",
                repo::LEVEL_CUSTOM_MAX
            )));
        }
        if caller_lvl <= new_level {
            return Err(AppError::Forbidden);
        }
        meta.roles[role_idx].level = new_level;
    }

    if let Some(ref new_perms) = payload.permissions {
        for perm in new_perms {
            if !repo::is_valid_permission(perm) {
                return Err(AppError::InvalidInput(format!("Unknown permission: {perm}")));
            }
            let caller_has = match &auth {
                AuthUser::Superadmin => true,
                AuthUser::User { id } => {
                    let member = meta.members.iter().find(|m| &m.user_id == id)
                        .ok_or(AppError::NotFound)?;
                    repo::has_permission(member, &meta.roles, perm)
                }
            };
            if !caller_has {
                return Err(AppError::Forbidden);
            }
        }
        meta.roles[role_idx].permissions.clone_from(new_perms);
    }

    if let Some(name) = payload.name {
        if name.trim().is_empty() {
            return Err(AppError::InvalidInput("Role name cannot be empty".to_string()));
        }
        meta.roles[role_idx].name = name;
    }

    let updated = meta.roles[role_idx].clone();
    repo::save_meta(&config.base_dir, &repo_name, &meta)?;

    Ok(Json(updated))
}

pub async fn delete_role_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path((repo_name, role_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let mut meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;

    let (caller_lvl, has_perm) = caller_level_and_perm(&meta, &auth, repo::PERM_MANAGE_ROLES)?;
    if !has_perm {
        return Err(AppError::Forbidden);
    }

    let role_idx = meta.roles.iter().position(|r| r.id == role_id)
        .ok_or(AppError::NotFound)?;

    if meta.roles[role_idx].is_builtin {
        return Err(AppError::Builtin);
    }

    if caller_lvl <= meta.roles[role_idx].level {
        return Err(AppError::Forbidden);
    }

    if meta.members.iter().any(|m| m.role_id.as_deref() == Some(role_id.as_str())) {
        return Err(AppError::InvalidInput(
            "Cannot delete a role that has members assigned to it".to_string(),
        ));
    }

    meta.roles.remove(role_idx);
    repo::save_meta(&config.base_dir, &repo_name, &meta)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_members_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;
    Ok(Json(meta.members))
}

pub async fn add_member_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
    Json(payload): Json<AddMemberRequest>,
) -> Result<impl IntoResponse, AppError> {
    let mut meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;

    let (caller_lvl, has_perm) = caller_level_and_perm(&meta, &auth, repo::PERM_MANAGE_MEMBERS)?;
    if !has_perm {
        return Err(AppError::Forbidden);
    }

    if meta.members.iter().any(|m| m.user_id == payload.user_id) {
        return Err(AppError::AlreadyExists);
    }

    let role_id = payload.role_id.unwrap_or_else(|| repo::BUILTIN_VIEWER_ID.to_string());

    let target_role_level = meta.roles.iter().find(|r| r.id == role_id)
        .ok_or_else(|| AppError::InvalidInput("Role not found".to_string()))?
        .level;

    if caller_lvl <= target_role_level {
        return Err(AppError::Forbidden);
    }

    let target_user_id = payload.user_id.clone();
    let db = Arc::clone(&config.db);
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM users WHERE id = ?1",
            rusqlite::params![target_user_id],
            |row| row.get::<_, String>(0),
        )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
                _ => AppError::from(e),
            })
    })
        .await??;

    meta.members.push(RepoMember {
        user_id: payload.user_id,
        role_id: Some(role_id),
        is_owner: false,
        joined_at: Utc::now(),
    });

    repo::save_meta(&config.base_dir, &repo_name, &meta)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_member_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path((repo_name, target_user_id)): Path<(String, String)>,
    Json(payload): Json<UpdateMemberRequest>,
) -> Result<impl IntoResponse, AppError> {
    if payload.role_id.is_none() && payload.transfer_ownership.is_none() {
        return Err(AppError::InvalidInput("No fields to update".to_string()));
    }

    let mut meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;

    let target_idx = meta.members.iter().position(|m| m.user_id == target_user_id)
        .ok_or(AppError::NotFound)?;

    if let Some(true) = payload.transfer_ownership {
        let repo_has_owner = meta.members.iter().any(|m| m.is_owner);
        let caller_is_owner = match &auth {
            AuthUser::Superadmin => !repo_has_owner,
            AuthUser::User { id } => meta.members.iter()
                .find(|m| &m.user_id == id)
                .is_some_and(|m| m.is_owner),
        };
        if !caller_is_owner {
            return Err(AppError::Forbidden);
        }
        if let Some(owner_idx) = meta.members.iter().position(|m| m.is_owner) {
            meta.members[owner_idx].is_owner = false;
        }
        meta.members[target_idx].is_owner = true;
    }

    if let Some(ref new_role_id) = payload.role_id {
        let caller_lvl = caller_level(&meta, &auth)?;

        let has_perm = match &auth {
            AuthUser::Superadmin => true,
            AuthUser::User { id } => {
                let member = meta.members.iter().find(|m| &m.user_id == id)
                    .ok_or(AppError::NotFound)?;
                repo::has_permission(member, &meta.roles, repo::PERM_MANAGE_MEMBERS)
            }
        };
        if !has_perm {
            return Err(AppError::Forbidden);
        }

        let new_role_level = meta.roles.iter().find(|r| r.id == *new_role_id)
            .ok_or_else(|| AppError::InvalidInput("Role not found".to_string()))?
            .level;

        let target_current_level = repo::effective_level(&meta.members[target_idx], &meta.roles);

        if caller_lvl <= target_current_level || caller_lvl <= new_role_level {
            return Err(AppError::Forbidden);
        }

        meta.members[target_idx].role_id = Some(new_role_id.clone());
    }

    repo::save_meta(&config.base_dir, &repo_name, &meta)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_member_handler(
    Extension(auth): Extension<AuthUser>,
    State(config): State<Arc<AppConfig>>,
    Path((repo_name, target_user_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let mut meta = load_meta_as_member(&config.base_dir, &repo_name, &auth)?;

    let target_idx = meta.members.iter().position(|m| m.user_id == target_user_id)
        .ok_or(AppError::NotFound)?;

    let is_self = match &auth {
        AuthUser::User { id } => *id == target_user_id,
        AuthUser::Superadmin => false,
    };
    let target_is_owner = meta.members[target_idx].is_owner;

    if target_is_owner {
        if !is_self && !matches!(auth, AuthUser::Superadmin) {
            return Err(AppError::Forbidden);
        }
        let new_owner_id = repo::resolve_owner_inheritance(&meta.members, &meta.roles);
        if let Some(ref new_owner_id) = new_owner_id
            && let Some(m) = meta.members.iter_mut().find(|m| &m.user_id == new_owner_id) {
            m.is_owner = true;
        }
    } else if !is_self {
        let (caller_lvl, has_perm) = caller_level_and_perm(&meta, &auth, repo::PERM_MANAGE_MEMBERS)?;
        if !has_perm {
            return Err(AppError::Forbidden);
        }
        let target_level = repo::effective_level(&meta.members[target_idx], &meta.roles);
        if caller_lvl <= target_level {
            return Err(AppError::Forbidden);
        }
    }

    meta.members.remove(target_idx);
    repo::save_meta(&config.base_dir, &repo_name, &meta)?;

    Ok(StatusCode::NO_CONTENT)
}