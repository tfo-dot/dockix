use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
pub struct RepoInfo {
    pub name: String,
    pub path: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct CloneRequest {
    pub url: String,
    pub name: String,
    pub token: Option<String>,
    pub depth: Option<i32>,
}

#[derive(Serialize)]
pub struct ParsedRepo {
    pub repo_name: String,
    pub files: Vec<ParsedFile>,
    // maybe add metadata like total_files, languages_detected, analyzed_at timestamp
}

#[derive(Serialize)]
pub struct ParsedFile {
    pub file_path: String,
    pub classes: Vec<ClassDoc>,
    pub functions: Vec<FunctionDoc>,
    // TODO: add language field for frontend
}

#[derive(Serialize)]
pub struct ClassDoc {
    pub name: String,
    pub docstring: Option<String>,
    // TODO: add methods: Vec<FunctionDoc>
}

#[derive(Serialize)]
pub struct FunctionDoc {
    pub name: String,
    pub docstring: Option<String>,
    // TODO: add parameters and return_type
}

pub struct AppConfig {
    pub base_dir: PathBuf,
}