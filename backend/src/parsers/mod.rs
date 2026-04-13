pub mod python;
pub mod javascript;

use crate::errors::AppError;
use crate::models::ParsedFile;

// TODO: ADD RUST IN ORDER TO GENERATE DOCUMENTATION ON DOCKIX USING DOCKIX (In rust we trust(elite ball knowledge required))
pub trait LanguageParser {
    fn parse_file(
        &self,
        file_path: &std::path::Path,
        repo_base: &std::path::Path,
    ) -> Result<ParsedFile, AppError>;
}

pub fn get_parser_for_extension(extension: &str) -> Option<Box<dyn LanguageParser>> {
    match extension {
        "py" => Some(Box::new(python::PythonParser)),
        "js" | "jsx" => Some(Box::new(javascript::JavaScriptParser)),
        // "rs" => rust
        _ => None,
    }
}