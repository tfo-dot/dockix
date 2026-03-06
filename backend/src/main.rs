use tree_sitter::{Parser};

fn main() {
    let mut parser = Parser::new();

    let language = tree_sitter_json::LANGUAGE.into();
    parser.set_language(&language).expect("Error loading JSON grammar");

    let source_code = r#"
    {
        "key": "value",
        "array": [1, 2, 3]
    }
    "#;

    let tree = parser.parse(source_code, None).unwrap();
    let root_node = tree.root_node();

    println!("Root node type: {}", root_node.kind());
    
    if let Some(child) = root_node.child(0) {
        println!("First child type: {}", child.kind());
        
        println!("\nFull Tree S-expression:");
        println!("{}", root_node.to_sexp());
    }
}