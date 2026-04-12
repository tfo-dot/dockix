use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;
use git2::Repository;

use crate::errors::AppError;
use crate::models::{RepoInfo, ParsedRepo};
use crate::parsers::get_parser_for_extension;

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

pub fn clone_repo(url: &str, target_path: PathBuf) -> Result<(), AppError> {
    Repository::clone(url, target_path)?;
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