use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::errors::AppError;
use crate::models::{RepoInfo, RepoMeta, RepoStatus, ParsedRepo};
use crate::parsers::get_parser_for_extension;

const INFO_PREFIX: &str = ".dockix-";
const INFO_SUFFIX: &str = ".json";

fn info_path(base_dir: &Path, name: &str) -> PathBuf {
    base_dir.join(format!("{INFO_PREFIX}{name}{INFO_SUFFIX}"))
}

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
                    status: RepoStatus::CloneFailed {
                        error: "Clone interrupted by server shutdown".to_string(),
                    },
                });
                eprintln!("  Cleaned up interrupted clone: {repo_name}");
            }
            RepoStatus::Syncing { last_synced_at } => {
                let _ = save_meta(base_dir, repo_name, &RepoMeta {
                    token: meta.token,
                    status: RepoStatus::Ready { last_synced_at },
                });
                eprintln!("  Restored interrupted sync: {repo_name}");
            }
            RepoStatus::Ready { .. } | RepoStatus::SyncFailed { .. } if !dir_exists => {
                let _ = save_meta(base_dir, repo_name, &RepoMeta {
                    token: meta.token,
                    status: RepoStatus::CloneFailed {
                        error: "Repository directory is missing".to_string(),
                    },
                });
                eprintln!("  Marked orphaned meta as failed: {repo_name}");
            }
            _ => {}
        }
    }
}

pub fn list_repos(base_dir: &PathBuf) -> Result<Vec<RepoInfo>, AppError> {
    let mut repos = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let entries = fs::read_dir(base_dir)?;

    for entry in entries.flatten() {
        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        if path.is_dir() {
            let name = file_name;

            if seen.contains(name) {
                continue;
            }

            if let Some(meta) = load_meta(base_dir, name) {
                seen.insert(name.to_string());
                repos.push(RepoInfo {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                    status: meta.status,
                });
            }
        } else if let Some(repo_name) = file_name
            .strip_prefix(INFO_PREFIX)
            .and_then(|n| n.strip_suffix(INFO_SUFFIX))
            && !repo_name.is_empty() && !seen.contains(repo_name)
            && let Some(meta) = load_meta(base_dir, repo_name)
        {
            seen.insert(repo_name.to_string());

            let repo_dir = base_dir.join(repo_name);
            let status = match meta.status {
                RepoStatus::Ready { .. } | RepoStatus::SyncFailed { .. } if !repo_dir.exists() => {
                    RepoStatus::CloneFailed {
                        error: "Repository directory is missing".to_string(),
                    }
                }
                other => other,
            };

            repos.push(RepoInfo {
                name: repo_name.to_string(),
                path: repo_dir.to_string_lossy().to_string(),
                status,
            });
        }
    }

    Ok(repos)
}

pub fn clone_repo(url: &str, target_path: &Path, token: Option<String>, depth: i32) -> Result<(), AppError> {
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
    builder.clone(url, target_path)?;

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

        // TODO: skip junk directories like node_modules, __pycache__, .venv, target/, dist/

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