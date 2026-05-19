use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::errors::AppError;
use crate::models::{RepoInfo, RepoMeta, RepoRole, RepoMember, RepoStatus, ParsedRepo};
use crate::parsers::get_parser_for_extension;

const INFO_PREFIX: &str = ".dockix-";
const INFO_SUFFIX: &str = ".json";

fn info_path(base_dir: &Path, name: &str) -> PathBuf {
    base_dir.join(format!("{INFO_PREFIX}{name}{INFO_SUFFIX}"))
}

#[must_use]
pub fn load_meta(base_dir: &Path, name: &str) -> Option<RepoMeta> {
    let data = fs::read_to_string(info_path(base_dir, name)).ok()?;
    serde_json::from_str(&data).ok()
}

pub fn save_meta(base_dir: &Path, name: &str, meta: &RepoMeta) -> Result<(), AppError> {
    let json = serde_json::to_string(meta).map_err(|e| AppError::InternalError(e.to_string()))?;
    fs::write(info_path(base_dir, name), json)?;
    Ok(())
}

pub fn delete_meta(base_dir: &Path, name: &str) -> Result<(), AppError> {
    let path = info_path(base_dir, name);
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn validate_repo_url(url: &str) -> Result<(), AppError> {
    let parsed = url::Url::parse(url).map_err(|_| {
        AppError::InvalidInput("Invalid URL format".to_string())
    })?;

    if parsed.scheme() != "https" && parsed.scheme() != "http" {
        return Err(AppError::InvalidInput(
            "URL must use https:// or http://".to_string(),
        ));
    }

    if parsed.host_str().is_none() || parsed.path().len() <= 1 {
        return Err(AppError::InvalidInput(
            "URL must include a host and path (e.g. https://github.com/user/repo)".to_string(),
        ));
    }

    Ok(())
}

pub fn cleanup_stale_cloning(base_dir: &Path) {
    let Ok(entries) = fs::read_dir(base_dir) else { return };

    for entry in entries.flatten() {
        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else { continue };

        let Some(repo_name) = name
            .strip_prefix(INFO_PREFIX)
            .and_then(|n| n.strip_suffix(INFO_SUFFIX))
        else {
            continue;
        };

        if repo_name.is_empty() {
            continue;
        }

        let Some(meta) = load_meta(base_dir, repo_name) else { continue };
        let dir_exists = base_dir.join(repo_name).exists();

        match meta.status {
            RepoStatus::Cloning => {
                if dir_exists {
                    let _ = fs::remove_dir_all(base_dir.join(repo_name));
                }

                let _ = save_meta(base_dir, repo_name, &RepoMeta {
                    token: meta.token,
                    branch: meta.branch,
                    status: RepoStatus::CloneFailed {
                        error: "Clone interrupted by server shutdown".to_string(),
                    },
                    roles: meta.roles,
                    members: meta.members,
                });
                eprintln!("  Cleaned up interrupted clone: {repo_name}");
            }
            RepoStatus::Syncing { last_synced_at } => {
                let _ = save_meta(base_dir, repo_name, &RepoMeta {
                    token: meta.token,
                    branch: meta.branch,
                    status: RepoStatus::Ready { last_synced_at },
                    roles: meta.roles,
                    members: meta.members,
                });
                eprintln!("  Restored interrupted sync: {repo_name}");
            }
            RepoStatus::Ready { .. } | RepoStatus::SyncFailed { .. } if !dir_exists => {
                let _ = save_meta(base_dir, repo_name, &RepoMeta {
                    token: meta.token,
                    branch: meta.branch,
                    status: RepoStatus::CloneFailed {
                        error: "Repository directory is missing".to_string(),
                    },
                    roles: meta.roles,
                    members: meta.members,
                });
                eprintln!("  Marked orphaned meta as failed: {repo_name}");
            }
            _ => {}
        }
    }
}

pub fn list_repos(base_dir: &PathBuf, user_id: Option<&String>) -> Result<Vec<RepoInfo>, AppError> {
    let mut repos = Vec::new();

    for entry in fs::read_dir(base_dir)?.flatten() {
        let path = entry.path();
        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_owned(),
            None => continue,
        };

        let repo_name = match file_name
            .strip_prefix(INFO_PREFIX)
            .and_then(|n| n.strip_suffix(INFO_SUFFIX))
        {
            Some(n) if !n.is_empty() => n.to_owned(),
            _ => continue,
        };

        let Some(meta) = load_meta(base_dir, &repo_name) else { continue };

        if let Some(uid) = user_id
            && !meta.members.iter().any(|m| m.user_id == *uid) {
            continue;
        }

        let repo_dir = base_dir.join(&repo_name);
        let status = match meta.status {
            RepoStatus::Ready { .. } | RepoStatus::SyncFailed { .. } if !repo_dir.exists() => {
                RepoStatus::CloneFailed {
                    error: "Repository directory is missing".to_string(),
                }
            }
            other => other,
        };

        repos.push(RepoInfo {
            name: repo_name,
            path: repo_dir.to_string_lossy().to_string(),
            status,
        });
    }

    Ok(repos)
}

pub fn prefetch_repo(url: &str, token: Option<String>) -> Result<crate::models::PrefetchResponse, AppError> {
    let mut remote = git2::Remote::create_detached(url)?;

    let mut callbacks = git2::RemoteCallbacks::new();
    if let Some(token) = token {
        callbacks.credentials(move |_url, _username, _allowed| {
            git2::Cred::userpass_plaintext("x-access-token", &token)
        });
    }

    remote.connect_auth(git2::Direction::Fetch, Some(callbacks), None)?;

    let refs = remote.list()?;

    let mut branches = Vec::new();
    let mut tags = Vec::new();
    let mut default_branch = None;

    for head in refs {
        let name = head.name();
        if name == "HEAD" {
            default_branch = head
                .symref_target()
                .and_then(|t| t.strip_prefix("refs/heads/"))
                .map(str::to_owned);
        } else if let Some(branch) = name.strip_prefix("refs/heads/") {
            branches.push(branch.to_owned());
        } else if let Some(tag) = name.strip_prefix("refs/tags/")
            && !tag.ends_with("^{}") {
            tags.push(tag.to_owned());
        }
    }

    Ok(crate::models::PrefetchResponse { default_branch, branches, tags })
}

pub fn clone_repo(url: &str, target_path: &Path, token: Option<String>, depth: i32, branch: Option<&str>) -> Result<(), AppError> {
    let t = std::time::Instant::now();
    println!("clone start: {url}");
    let mut callbacks = git2::RemoteCallbacks::new();

    if let Some(token) = token {
        callbacks.credentials(move |_url, _username, _allowed| {
            git2::Cred::userpass_plaintext("x-access-token", &token)
        });
    }

    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);
    fetch_opts.depth(depth);

    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fetch_opts);
    if let Some(branch) = branch {
        builder.branch(branch);
    }
    builder.clone(url, target_path).map_err(|e| {
        println!("clone failed: {url} ({:.2}s): {e}", t.elapsed().as_secs_f64());
        AppError::from(e)
    })?;


    println!("clone done: {url} ({:.2}s)", t.elapsed().as_secs_f64());
    Ok(())
}

#[allow(clippy::needless_pass_by_value)]
pub fn analyze_directory(repo_name: String, path: PathBuf) -> ParsedRepo {
    let mut files = Vec::new();

    for entry in WalkDir::new(&path).into_iter().filter_map(Result::ok) {
        let file_path = entry.path();

        if file_path.components().any(|c| c.as_os_str() == ".git") {
            continue;
        }

        if file_path.is_file()
            && let Some(extension) = file_path.extension().and_then(|e| e.to_str())
            && let Some(parser) = get_parser_for_extension(extension)
            && let Ok(parsed_file) = parser.parse_file(file_path, &path)
        {
            files.push(parsed_file);
        }
    }

    ParsedRepo { repo_name, files }
}
pub const PERM_ANALYZE: &str = "analyze";
pub const PERM_SYNC: &str = "sync";
pub const PERM_MANAGE_MEMBERS: &str = "manage_members";
pub const PERM_MANAGE_ROLES: &str = "manage_roles";

pub const ALL_PERMISSIONS: &[&str] = &[
    PERM_ANALYZE,
    PERM_SYNC,
    PERM_MANAGE_MEMBERS,
    PERM_MANAGE_ROLES,
];

pub const LEVEL_ADMIN: u8 = 10;
pub const LEVEL_CUSTOM_MAX: u8 = LEVEL_ADMIN - 1;

pub const BUILTIN_ADMIN_ID: &str = "admin";
pub const BUILTIN_VIEWER_ID: &str = "viewer";

pub fn init_repo_roles() -> Vec<RepoRole> {
    vec![
        RepoRole {
            id: BUILTIN_ADMIN_ID.to_string(),
            name: "Admin".to_string(),
            permissions: ALL_PERMISSIONS.iter().map(ToString::to_string).collect(),
            is_builtin: true,
            level: LEVEL_ADMIN,
        },
        RepoRole {
            id: BUILTIN_VIEWER_ID.to_string(),
            name: "Viewer".to_string(),
            permissions: vec![],
            is_builtin: true,
            level: 0,
        },
    ]
}

pub fn effective_level(member: &RepoMember, roles: &[RepoRole]) -> u8 {
    if member.is_owner {
        return u8::MAX;
    }
    member.role_id.as_deref()
        .and_then(|id| roles.iter().find(|r| r.id == id))
        .map_or(0, |r| r.level)
}

pub fn has_permission(member: &RepoMember, roles: &[RepoRole], perm: &str) -> bool {
    if member.is_owner {
        return true;
    }
    member.role_id.as_deref()
        .and_then(|id| roles.iter().find(|r| r.id == id))
        .is_some_and(|r| r.permissions.iter().any(|p| p == perm))
}

pub fn is_valid_permission(perm: &str) -> bool {
    ALL_PERMISSIONS.contains(&perm)
}

pub fn resolve_owner_inheritance(members: &[RepoMember], roles: &[RepoRole]) -> Option<String> {
    members.iter()
        .filter(|m| !m.is_owner)
        .max_by_key(|m| {
            let level = effective_level(m, roles);
            (level, std::cmp::Reverse(m.joined_at))
        })
        .map(|m| m.user_id.clone())
}