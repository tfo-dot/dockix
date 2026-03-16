use axum::{
    extract::State,
    routing::{get, post},
    Json, Router, http::StatusCode,
    response::IntoResponse,
};
use git2::Repository;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{PathBuf};
use std::sync::Arc;
use axum::extract::Path;
use walkdir::WalkDir;
use tree_sitter::{Parser, Query, QueryCursor};
#[derive(Serialize, Deserialize)]
struct RepoInfo {
    name: String,
    path: String,
}

#[derive(Deserialize)]
struct CloneRequest {
    url: String,
    name: String,
}

#[derive(Serialize)]
struct ParsedRepo {
    repo_name: String,
    files: Vec<ParsedFile>,
}

#[derive(Serialize)]
struct ParsedFile {
    file_path: String,
    classes: Vec<ClassDoc>,
    functions: Vec<FunctionDoc>,
}

#[derive(Serialize)]
struct ClassDoc {
    name: String,
    docstring: Option<String>,
}

#[derive(Serialize)]
struct FunctionDoc {
    name: String,
    docstring: Option<String>,
}

struct AppConfig {
    base_dir: PathBuf,
}

#[tokio::main]
async fn main() {
    let base_dir = PathBuf::from("./repositories");
    
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir).expect("Failed to create base directory");
    }

    let config = Arc::new(AppConfig { base_dir });

    let app = Router::new()
        .route("/clone", post(clone_handler))
        .route("/repos", get(list_repos_handler))
        .route("/analyze/:repo_name", get(analyze_repo_handler))
        .with_state(config);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Git API running on http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}

async fn list_repos_handler(State(config): State<Arc<AppConfig>>) -> impl IntoResponse {
    let mut repos = Vec::new();

    if let Ok(entries) = fs::read_dir(&config.base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            
            if path.is_dir() && path.join(".git").exists() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    repos.push(RepoInfo {
                        name: name.to_string(),
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    Json(repos)
}

async fn clone_handler(
    State(config): State<Arc<AppConfig>>,
    Json(payload): Json<CloneRequest>,
) -> impl IntoResponse {
    let url = payload.url;
    let target_path = config.base_dir.join(&payload.name);

    if target_path.exists() {
        return (StatusCode::CONFLICT, "Directory already exists").into_response();
    }

    let clone_result = tokio::task::spawn_blocking(move || {
        Repository::clone(&url, target_path)
    }).await;

    match clone_result {
        Ok(Ok(_)) => (StatusCode::CREATED, "Repository cloned successfully").into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Git error: {}", e)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Thread error").into_response(),
    }
}

async fn analyze_repo_handler(
    State(config): State<Arc<AppConfig>>,
    Path(repo_name): Path<String>,
) -> impl IntoResponse {
    let repo_path = config.base_dir.join(&repo_name);

    if !repo_path.exists() {
        return (StatusCode::NOT_FOUND, "Repository not found").into_response();
    }

    let parse_result = tokio::task::spawn_blocking(move || {
        analyze_directory(repo_name, repo_path)
    })
        .await;

    match parse_result {
        Ok(Ok(parsed_data)) => (StatusCode::OK, Json(parsed_data)).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Thread error").into_response(),
    }
}

fn analyze_directory(repo_name: String, path: PathBuf) -> Result<ParsedRepo, String> {
    let mut files = Vec::new();

    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        let file_path = entry.path();

        // Skip .git directories
        if file_path.components().any(|c| c.as_os_str() == ".git") {
            continue;
        }

        if file_path.is_file() {
            // For now, we only support Python files as an example
            if let Some(extension) = file_path.extension() {
                if extension == "py" {
                    if let Ok(parsed_file) = parse_python_file(file_path, &path) {
                        files.push(parsed_file);
                    }
                }
            }
        }
    }

    Ok(ParsedRepo { repo_name, files })
}

fn parse_python_file(file_path: &std::path::Path, repo_base: &std::path::Path) -> Result<ParsedFile, String> {
    let source_code = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let source_bytes = source_code.as_bytes();

    // 1. Setup Tree-sitter Parser
    let mut parser = Parser::new();
    let language = tree_sitter_python::language();
    parser.set_language(&language).unwrap();

    let tree = parser.parse(&source_code, None).ok_or("Failed to parse code")?;


    let query_string = r#"
        (function_definition
            name: (identifier) @func.name
            body: (block (expression_statement (string) @func.docstring))?
        )
        (class_definition
            name: (identifier) @class.name
            body: (block (expression_statement (string) @class.docstring))?
        )
    "#;

    let query = Query::new(&language, query_string).unwrap();
    let mut cursor = QueryCursor::new();
    let matches = cursor.matches(&query, tree.root_node(), source_bytes);

    let mut functions = Vec::new();
    let mut classes = Vec::new();


    for m in matches {
        let mut name = String::new();
        let mut docstring = None;
        let mut is_class = false;

        for capture in m.captures {
            let capture_name = query.capture_names()[capture.index as usize];
            let text = capture.node.utf8_text(source_bytes).unwrap_or("").to_string();

            match capture_name {
                "func.name" => name = text,
                "class.name" => {
                    name = text;
                    is_class = true;
                }
                "func.docstring" | "class.docstring" => {
                    // Clean up Python quotes (e.g., """docstring""" -> docstring)
                    let cleaned = text.trim_matches(|c| c == '"' || c == '\'').to_string();
                    docstring = Some(cleaned);
                }
                _ => {}
            }
        }

        if !name.is_empty() {
            if is_class {
                classes.push(ClassDoc { name, docstring });
            } else {
                functions.push(FunctionDoc { name, docstring });
            }
        }
    }

    let relative_path = file_path.strip_prefix(repo_base)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string();

    Ok(ParsedFile {
        file_path: relative_path,
        classes,
        functions,
    })
}

