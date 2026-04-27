use std::fs;
use tree_sitter::{Parser, Query, QueryCursor};

use crate::errors::AppError;
use crate::models::{ParsedFile, ClassDoc, FunctionDoc};
use super::LanguageParser;

pub struct JavaScriptParser;

impl LanguageParser for JavaScriptParser {
    fn parse_file(
        &self,
        file_path: &std::path::Path,
        repo_base: &std::path::Path,
    ) -> Result<ParsedFile, AppError> {
        let source_code = fs::read_to_string(file_path)?;
        let source_bytes = source_code.as_bytes();

        let mut parser = Parser::new();
        let language = tree_sitter_javascript::language();
        parser.set_language(&language).unwrap();

        let tree = parser.parse(&source_code, None)
            .ok_or(AppError::ParseError("Failed to parse JavaScript code".to_string()))?;

        // TODO: handle arrow functions (const foo = () => {})
        // TODO: handle exported functions (export function, export default)
        let query_string = r"
            (
                (comment) @func.docstring
                .
                (function_declaration
                    name: (identifier) @func.name
                )
            )

            (function_declaration
                name: (identifier) @func.name
            )

            (
                (comment) @class.docstring
                .
                (class_declaration
                    name: (identifier) @class.name
                )
            )

            (class_declaration
                name: (identifier) @class.name
            )
        ";

        let query = Query::new(&language, query_string)
            .map_err(|e| AppError::ParseError(format!("Invalid query: {e}")))?;
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(&query, tree.root_node(), source_bytes);

        let mut functions = Vec::new();
        let mut classes = Vec::new();
        let mut seen_functions = std::collections::HashSet::new();
        let mut seen_classes = std::collections::HashSet::new();

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
                        let cleaned = text
                            .trim_start_matches("/**")
                            .trim_start_matches("/*")
                            .trim_start_matches("//")
                            .trim_end_matches("*/")
                            .lines()
                            .map(|line| line.trim().trim_start_matches('*').trim())
                            .filter(|line| !line.is_empty())
                            .collect::<Vec<_>>()
                            .join(" ");
                        if !cleaned.is_empty() {
                            docstring = Some(cleaned);
                        }
                    }
                    _ => {}
                }
            }

            if !name.is_empty() {
                if is_class {
                    if seen_classes.insert(name.clone()) {
                        classes.push(ClassDoc { name, docstring, methods: Vec::new() });
                    }
                } else if seen_functions.insert(name.clone()) {
                    functions.push(FunctionDoc {
                        name,
                        docstring,
                        parameters: Vec::new(),
                        return_type: None,
                    });
                }
            }
        }

        let relative_path = file_path.strip_prefix(repo_base)
            .unwrap_or(file_path)
            .to_string_lossy()
            .to_string();

        Ok(ParsedFile {
            file_path: relative_path,
            language: "javascript".to_string(),
            classes,
            functions,
        })
    }
}