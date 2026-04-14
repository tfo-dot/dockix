use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::errors::AppError;
use crate::models::{RepoInfo, ParsedRepo};
use crate::parsers::get_parser_for_extension;

const TOKEN_FILE: &str = ".dockix-token";
const CLONING_PREFIX: &str = ".dockix-cloning-";
const ERROR_PREFIX: &str = ".dockix-clone-error-";

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

pub fn save_token(repo_path: &Path, token: &str) -> Result<(), AppError> {
    fs::write(repo_path.join(TOKEN_FILE), token)?;
    Ok(())
}

pub fn load_token(repo_path: &Path) -> Option<String> {
    fs::read_to_string(repo_path.join(TOKEN_FILE)).ok()
}

pub fn mark_cloning(base_dir: &Path, name: &str) {
    let _ = fs::write(base_dir.join(format!("{CLONING_PREFIX}{name}")), "");
}

pub fn unmark_cloning(base_dir: &Path, name: &str) {
    let _ = fs::remove_file(base_dir.join(format!("{CLONING_PREFIX}{name}")));
}

pub fn is_cloning(base_dir: &Path, name: &str) -> bool {
    base_dir.join(format!("{CLONING_PREFIX}{name}")).exists()
}

pub fn write_clone_error(base_dir: &Path, name: &str, error: &str) {
    let _ = fs::write(base_dir.join(format!("{ERROR_PREFIX}{name}")), error);
}

pub fn clone_error(base_dir: &Path, name: &str) -> Option<String> {
    fs::read_to_string(base_dir.join(format!("{ERROR_PREFIX}{name}"))).ok()
}

pub fn clear_clone_error(base_dir: &Path, name: &str) {
    let _ = fs::remove_file(base_dir.join(format!("{ERROR_PREFIX}{name}")));
}
pub fn cleanup_stale_cloning(base_dir: &Path) {
    let Ok(entries) = fs::read_dir(base_dir) else { return };

    for entry in entries.flatten() {
        let file_name = entry.file_name();
        let Some(name) = file_name.to_str() else { continue };
        let Some(repo_name) = name.strip_prefix(CLONING_PREFIX) else { continue };

        if repo_name.is_empty() {
            continue;
        }

        let _ = fs::remove_file(entry.path());

        let repo_dir = base_dir.join(repo_name);
        if repo_dir.exists() {
            let _ = fs::remove_dir_all(&repo_dir);
        }

        write_clone_error(base_dir, repo_name, "Clone interrupted by server shutdown");
        eprintln!("  Cleaned up interrupted clone: {repo_name}");
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

            if is_cloning(base_dir, name) {
                seen.insert(name.to_string());
                repos.push(RepoInfo {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                    status: "cloning".to_string(),
                    error: None,
                });
            } else if let Some(err) = clone_error(base_dir, name) {
                seen.insert(name.to_string());
                repos.push(RepoInfo {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                    status: "failed".to_string(),
                    error: Some(err),
                });
            } else if path.join(".git").exists() {
                seen.insert(name.to_string());
                repos.push(RepoInfo {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                    status: "ready".to_string(),
                    error: None,
                });
            }
        } else if let Some(name) = file_name.strip_prefix(CLONING_PREFIX)
            && !name.is_empty() && !seen.contains(name)
        {
            seen.insert(name.to_string());
            repos.push(RepoInfo {
                name: name.to_string(),
                path: base_dir.join(name).to_string_lossy().to_string(),
                status: "cloning".to_string(),
                error: None,
            });
        } else if let Some(name) = file_name.strip_prefix(ERROR_PREFIX)
            && !name.is_empty() && !seen.contains(name)
        {
            seen.insert(name.to_string());
            let err = fs::read_to_string(&path).ok();
            repos.push(RepoInfo {
                name: name.to_string(),
                path: base_dir.join(name).to_string_lossy().to_string(),
                status: "failed".to_string(),
                error: err,
            });
        }
    }

    Ok(repos)
}

pub fn clone_repo(url: &str, target_path: &Path, token: Option<&str>, depth: i32) -> Result<(), AppError> {
    let mut callbacks = git2::RemoteCallbacks::new();

    let token_owned = token.map(String::from);
    if let Some(ref token) = token_owned {
        let token = token.clone();
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