use std::fs;
use tree_sitter::{Parser, Query, QueryCursor};

use crate::errors::AppError;
use crate::models::{ParsedFile, ClassDoc, FunctionDoc};
use super::LanguageParser;

pub struct PythonParser;

impl LanguageParser for PythonParser {
    fn parse_file(
        &self,
        file_path: &std::path::Path,
        repo_base: &std::path::Path,
    ) -> Result<ParsedFile, AppError> {
        let source_code = fs::read_to_string(file_path)?;
        let source_bytes = source_code.as_bytes();

        let mut parser = Parser::new();
        let language = tree_sitter_python::language();
        parser.set_language(&language).unwrap();

        let tree = parser.parse(&source_code, None)
            .ok_or(AppError::ParseError("Failed to parse Python code".to_string()))?;

        let query_string = r"
            (function_definition
                name: (identifier) @func.name
                body: (block (expression_statement (string) @func.docstring))?
            )
            (class_definition
                name: (identifier) @class.name
                body: (block (expression_statement (string) @class.docstring))?
            )
        ";

        let query = Query::new(&language, query_string)
            .map_err(|e| AppError::ParseError(format!("Invalid query: {e}")))?;
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
}