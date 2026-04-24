use std::fs;
use tree_sitter::Parser;

use crate::errors::AppError;
use crate::models::{ClassDoc, FunctionDoc, ParameterDoc, ParsedFile};
use super::LanguageParser;

pub struct PythonParser;

impl LanguageParser for PythonParser {
    fn parse_file(
        &self,
        file_path: &std::path::Path,
        repo_base: &std::path::Path,
    ) -> Result<ParsedFile, AppError> {
        let source_code = fs::read_to_string(file_path)?;
        let source = source_code.as_bytes();

        let mut parser = Parser::new();
        let language = tree_sitter_python::language();
        parser.set_language(&language).unwrap();

        let tree = parser.parse(&source_code, None)
            .ok_or(AppError::ParseError("Failed to parse Python code".to_string()))?;

        let root = tree.root_node();
        let mut functions = Vec::new();
        let mut classes = Vec::new();

        let mut cursor = root.walk();
        for child in root.children(&mut cursor) {
            match child.kind() {
                "function_definition" => {
                    if let Some(func) = extract_function(&child, source) {
                        functions.push(func);
                    }
                }
                "class_definition" => {
                    if let Some(class) = extract_class(&child, source) {
                        classes.push(class);
                    }
                }
                "decorated_definition" => {
                    if let Some(inner) = child.child_by_field_name("definition") {
                        match inner.kind() {
                            "function_definition" => {
                                if let Some(func) = extract_function(&inner, source) {
                                    functions.push(func);
                                }
                            }
                            "class_definition" => {
                                if let Some(class) = extract_class(&inner, source) {
                                    classes.push(class);
                                }
                            }
                            _ => {}
                        }
                    }
                }
                _ => {}
            }
        }

        let relative_path = file_path.strip_prefix(repo_base)
            .unwrap_or(file_path)
            .to_string_lossy()
            .to_string();

        Ok(ParsedFile {
            file_path: relative_path,
            language: "python".to_string(),
            classes,
            functions,
        })
    }
}

fn extract_class(node: &tree_sitter::Node, source: &[u8]) -> Option<ClassDoc> {
    let name = node_text(&node.child_by_field_name("name")?, source);
    let docstring = extract_docstring(node, source);

    let mut methods = Vec::new();
    if let Some(body) = node.child_by_field_name("body") {
        let mut cursor = body.walk();
        for child in body.children(&mut cursor) {
            match child.kind() {
                "function_definition" => {
                    if let Some(func) = extract_function(&child, source) {
                        methods.push(func);
                    }
                }
                "decorated_definition" => {
                    if let Some(inner) = child.child_by_field_name("definition")
                        && inner.kind() == "function_definition"
                        && let Some(func) = extract_function(&inner, source)
                    {
                        methods.push(func);
                    }
                }
                _ => {}
            }
        }
    }

    Some(ClassDoc { name, docstring, methods })
}

fn extract_function(node: &tree_sitter::Node, source: &[u8]) -> Option<FunctionDoc> {
    let name = node_text(&node.child_by_field_name("name")?, source);
    let docstring = extract_docstring(node, source);
    let parameters = extract_parameters(node, source);
    let return_type = node.child_by_field_name("return_type")
        .map(|n| node_text(&n, source));

    Some(FunctionDoc { name, docstring, parameters, return_type })
}

fn extract_docstring(node: &tree_sitter::Node, source: &[u8]) -> Option<String> {
    let body = node.child_by_field_name("body")?;
    let first_stmt = body.named_child(0)?;

    if first_stmt.kind() != "expression_statement" {
        return None;
    }

    let expr = first_stmt.named_child(0)?;
    if expr.kind() != "string" {
        return None;
    }

    let text = expr.utf8_text(source).ok()?;
    let cleaned = strip_python_quotes(text);
    if cleaned.is_empty() { None } else { Some(cleaned) }
}

fn extract_parameters(func_node: &tree_sitter::Node, source: &[u8]) -> Vec<ParameterDoc> {
    let Some(params_node) = func_node.child_by_field_name("parameters") else {
        return Vec::new();
    };

    let mut params = Vec::new();
    let mut cursor = params_node.walk();

    for child in params_node.named_children(&mut cursor) {
        let param = match child.kind() {
            "identifier" => ParameterDoc {
                name: node_text(&child, source),
                type_annotation: None,
                default_value: None,
            },
            "typed_parameter" => {
                let name = child.child_by_field_name("name")
                    .map(|n| resolve_param_name(&n, source))
                    .unwrap_or_default();
                let type_ann = child.child_by_field_name("type")
                    .map(|n| node_text(&n, source));
                ParameterDoc { name, type_annotation: type_ann, default_value: None }
            }
            "default_parameter" => {
                let name = child.child_by_field_name("name")
                    .map(|n| node_text(&n, source))
                    .unwrap_or_default();
                let default = child.child_by_field_name("value")
                    .map(|n| node_text(&n, source));
                ParameterDoc { name, type_annotation: None, default_value: default }
            }
            "typed_default_parameter" => {
                let name = child.child_by_field_name("name")
                    .map(|n| node_text(&n, source))
                    .unwrap_or_default();
                let type_ann = child.child_by_field_name("type")
                    .map(|n| node_text(&n, source));
                let default = child.child_by_field_name("value")
                    .map(|n| node_text(&n, source));
                ParameterDoc { name, type_annotation: type_ann, default_value: default }
            }
            "list_splat_pattern" | "dictionary_splat_pattern" => ParameterDoc {
                name: resolve_param_name(&child, source),
                type_annotation: None,
                default_value: None,
            },
            _ => continue,
        };
        params.push(param);
    }

    params
}

fn resolve_param_name(node: &tree_sitter::Node, source: &[u8]) -> String {
    match node.kind() {
        "list_splat_pattern" => {
            let inner = node.named_child(0)
                .map(|n| node_text(&n, source))
                .unwrap_or_default();
            format!("*{inner}")
        }
        "dictionary_splat_pattern" => {
            let inner = node.named_child(0)
                .map(|n| node_text(&n, source))
                .unwrap_or_default();
            format!("**{inner}")
        }
        _ => node_text(node, source),
    }
}

fn strip_python_quotes(s: &str) -> String {
    let stripped = s.trim().trim_matches(|c: char| c == '"' || c == '\'');

    let normalized = stripped.replace("\r\n", "\n");
    let lines: Vec<&str> = normalized.lines().collect();

    if lines.len() <= 1 {
        return lines.first().map_or(String::new(), |l| l.trim().to_string());
    }

    let indent = lines.iter()
        .skip(1)
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.len() - l.trim_start().len())
        .min()
        .unwrap_or(0);

    let mut result = lines[0].trim().to_string();
    for line in &lines[1..] {
        result.push('\n');
        if !line.trim().is_empty() {
            result.push_str(&line[indent..]);
        }
    }

    result.trim().to_string()
}

fn node_text(node: &tree_sitter::Node, source: &[u8]) -> String {
    node.utf8_text(source).unwrap_or("").to_string()
}