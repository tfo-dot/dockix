use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use git2::Repository;

use crate::errors::AppError;
use crate::models::{RepoInfo, ParsedRepo};
use crate::parsers::get_parser_for_extension;

const TOKEN_FILE: &str = ".dockix-token";

pub fn validate_repo_url(url: &str) -> Result<(), AppError> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err(AppError::InvalidInput(
            "URL must use https:// or http://".to_string(),
        ));
    }

    let after_scheme = url.split("://").nth(1).unwrap_or("");
    let parts: Vec<&str> = after_scheme.splitn(2, '/').collect();

    if parts.len() < 2 || parts[0].is_empty() || parts[1].is_empty() {
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

pub fn list_repos(base_dir: &PathBuf) -> Result<Vec<RepoInfo>, AppError> {
    let mut repos = Vec::new();

    let entries = fs::read_dir(base_dir)?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir()
            && path.join(".git").exists()
            && let Some(name) = path.file_name().and_then(|n| n.to_str())
        {
            repos.push(RepoInfo {
                name: name.to_string(),
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    Ok(repos)
}

pub fn clone_repo(url: &str, target_path: PathBuf, token: Option<&str>) -> Result<(), AppError> {
    match token {
        Some(token) => {
            let token = token.to_string();
            let mut callbacks = git2::RemoteCallbacks::new();
            callbacks.credentials(move |_url, _username, _allowed| {
                git2::Cred::userpass_plaintext("x-access-token", &token)
            });

            let mut fetch_opts = git2::FetchOptions::new();
            fetch_opts.remote_callbacks(callbacks);

            let mut builder = git2::build::RepoBuilder::new();
            builder.fetch_options(fetch_opts);
            builder.clone(url, &target_path)?;
        }
        None => {
            Repository::clone(url, target_path)?;
        }
    }
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