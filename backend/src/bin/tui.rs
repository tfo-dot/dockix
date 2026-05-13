#![allow(clippy::all)]
#![allow(warnings)]

use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Wrap},
    Frame, Terminal,
};
use serde::{Deserialize, Serialize};
use std::io;
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum RepoStatus {
    Ready { last_synced_at: chrono::DateTime<chrono::Utc> },
    Cloning,
    Syncing { last_synced_at: chrono::DateTime<chrono::Utc> },
    CloneFailed { error: String },
    SyncFailed {
        last_synced_at: chrono::DateTime<chrono::Utc>,
        error: String,
        failed_at: chrono::DateTime<chrono::Utc>,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RepoInfo {
    pub name: String,
    pub path: String,
    #[serde(flatten)]
    pub status: RepoStatus,
}

#[derive(Serialize)]
pub struct CloneRequest {
    pub url: String,
    pub name: String,
    pub token: Option<String>,
    pub depth: Option<i32>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ParsedRepo {
    pub repo_name: String,
    pub files: Vec<ParsedFile>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ParsedFile {
    pub file_path: String,
    pub language: String,
    pub classes: Vec<ClassDoc>,
    pub functions: Vec<FunctionDoc>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ClassDoc {
    pub name: String,
    pub docstring: Option<String>,
    pub methods: Vec<FunctionDoc>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct FunctionDoc {
    pub name: String,
    pub docstring: Option<String>,
    pub parameters: Vec<ParameterDoc>,
    pub return_type: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ParameterDoc {
    pub name: String,
    pub type_annotation: Option<String>,
    pub default_value: Option<String>,
}

enum InputMode {
    Normal,
    EditingUrl,
    EditingName,
    EditingToken,
}

struct App {
    repos: Vec<RepoInfo>,
    repo_list_state: ListState,
    analysis: Option<ParsedRepo>,
    analysis_scroll: u16,
    input_mode: InputMode,
    url_input: String,
    name_input: String,
    token_input: String,
    error_message: Option<String>,
    is_loading: bool,
}

impl App {
    fn new() -> App {
        let mut repo_list_state = ListState::default();
        repo_list_state.select(Some(0));
        App {
            repos: Vec::new(),
            repo_list_state,
            analysis: None,
            analysis_scroll: 0,
            input_mode: InputMode::Normal,
            url_input: String::new(),
            name_input: String::new(),
            token_input: String::new(),
            error_message: None,
            is_loading: false,
        }
    }

    fn next(&mut self) {
        if self.repos.is_empty() { return; }
        let i = match self.repo_list_state.selected() {
            Some(i) => {
                if i >= self.repos.len().saturating_sub(1) {
                    0
                } else {
                    i + 1
                }
            }
            None => 0,
        };
        self.repo_list_state.select(Some(i));
    }

    fn previous(&mut self) {
        if self.repos.is_empty() { return; }
        let i = match self.repo_list_state.selected() {
            Some(i) => {
                if i == 0 {
                    self.repos.len().saturating_sub(1)
                } else {
                    i - 1
                }
            }
            None => 0,
        };
        self.repo_list_state.select(Some(i));
    }

    fn scroll_down(&mut self) {
        self.analysis_scroll = self.analysis_scroll.saturating_add(1);
    }

    fn scroll_up(&mut self) {
        self.analysis_scroll = self.analysis_scroll.saturating_sub(1);
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new();
    let client = reqwest::Client::new();

    // Initial fetch
    fetch_repos(&client, &mut app).await;

    loop {
        terminal.draw(|f| ui(f, &mut app))?;

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }

                if app.error_message.is_some() && key.code == KeyCode::Esc {
                    app.error_message = None;
                    continue;
                }

                match app.input_mode {
                    InputMode::Normal => match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Char('c') => {
                            app.input_mode = InputMode::EditingUrl;
                        }
                        KeyCode::Char('d') => {
                            if let Some(index) = app.repo_list_state.selected() {
                                if let Some(repo) = app.repos.get(index) {
                                    let name = repo.name.clone();
                                    delete_repo(&client, &mut app, &name).await;
                                }
                            }
                        }
                        KeyCode::Down => app.next(),
                        KeyCode::Up => app.previous(),
                        KeyCode::PageDown | KeyCode::Char('j') => app.scroll_down(),
                        KeyCode::PageUp | KeyCode::Char('k') => app.scroll_up(),
                        KeyCode::Enter => {
                            if let Some(index) = app.repo_list_state.selected() {
                                if let Some(repo) = app.repos.get(index) {
                                    let name = repo.name.clone();
                                    analyze_repo(&client, &mut app, &name).await;
                                }
                            }
                        }
                        KeyCode::Char('r') => {
                            fetch_repos(&client, &mut app).await;
                        }
                        _ => {}
                    },
                    InputMode::EditingUrl => match key.code {
                        KeyCode::Enter => {
                            app.input_mode = InputMode::EditingName;
                        }
                        KeyCode::Char(c) => {
                            app.url_input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.url_input.pop();
                        }
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                        }
                        _ => {}
                    },
                    InputMode::EditingName => match key.code {
                        KeyCode::Enter => {
                            app.input_mode = InputMode::EditingToken;
                        }
                        KeyCode::Char(c) => {
                            app.name_input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.name_input.pop();
                        }
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                        }
                        _ => {}
                    },
                    InputMode::EditingToken => match key.code {
                        KeyCode::Enter => {
                            clone_repo(&client, &mut app).await;
                        }
                        KeyCode::Char(c) => {
                            app.token_input.push(c);
                        }
                        KeyCode::Backspace => {
                            app.token_input.pop();
                        }
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                        }
                        _ => {}
                    },
                }
            }
        }
    }

    // restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}

async fn fetch_repos(client: &reqwest::Client, app: &mut App) {
    app.is_loading = true;
    match client.get("http://127.0.0.1:3000/repos").send().await {
        Ok(resp) => {
            if let Ok(repos) = resp.json::<Vec<RepoInfo>>().await {
                app.repos = repos;
                if app.repo_list_state.selected().is_none() && !app.repos.is_empty() {
                    app.repo_list_state.select(Some(0));
                }
            }
        }
        Err(e) => app.error_message = Some(format!("Failed to fetch repos: {}", e)),
    }
    app.is_loading = false;
}

async fn analyze_repo(client: &reqwest::Client, app: &mut App, name: &str) {
    app.is_loading = true;
    app.analysis_scroll = 0;
    let url = format!("http://127.0.0.1:3000/repos/{}/analysis", name);
    match client.get(&url).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<ParsedRepo>().await {
                    Ok(data) => app.analysis = Some(data),
                    Err(e) => app.error_message = Some(format!("Failed to parse analysis: {}", e)),
                }
            } else {
                app.error_message = Some(format!("Error: {}", resp.status()));
            }
        }
        Err(e) => app.error_message = Some(format!("Request failed: {}", e)),
    }
    app.is_loading = false;
}

async fn clone_repo(client: &reqwest::Client, app: &mut App) {
    app.is_loading = true;
    let token = if app.token_input.is_empty() { None } else { Some(app.token_input.clone()) };
    let req = CloneRequest {
        url: app.url_input.clone(),
        name: app.name_input.clone(),
        token,
        depth: Some(1),
    };

    match client.post("http://127.0.0.1:3000/repos").json(&req).send().await {
        Ok(resp) => {
            if resp.status() == reqwest::StatusCode::ACCEPTED || resp.status().is_success() {
                app.url_input.clear();
                app.name_input.clear();
                app.token_input.clear();
                app.input_mode = InputMode::Normal;
                fetch_repos(client, app).await;
            } else {
                app.error_message = Some(format!("Clone failed: {}", resp.status()));
            }
        }
        Err(e) => app.error_message = Some(format!("Request failed: {}", e)),
    }
    app.is_loading = false;
}

async fn delete_repo(client: &reqwest::Client, app: &mut App, name: &str) {
    app.is_loading = true;
    let url = format!("http://127.0.0.1:3000/repos/{}", name);
    match client.delete(&url).send().await {
        Ok(resp) => {
            if resp.status().is_success() || resp.status() == reqwest::StatusCode::NO_CONTENT {
                if let Some(analysis) = &app.analysis {
                    if analysis.repo_name == name {
                        app.analysis = None;
                    }
                }
                fetch_repos(client, app).await;
            } else {
                app.error_message = Some(format!("Delete failed: {}", resp.status()));
            }
        }
        Err(e) => app.error_message = Some(format!("Request failed: {}", e)),
    }
    app.is_loading = false;
}

fn ui(f: &mut Frame, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(0),
            Constraint::Length(3),
        ])
        .split(f.size());

    // Title
    let title = Paragraph::new("Dockix Backend TUI")
        .style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))
        .alignment(ratatui::layout::Alignment::Center)
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(title, chunks[0]);

    // Main Content
    let body_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(30), Constraint::Percentage(70)])
        .split(chunks[1]);

    // Repos List
    let items: Vec<ListItem> = app
        .repos
        .iter()
        .map(|r| {
            let status_str = match &r.status {
                RepoStatus::Ready { .. } => "Ready",
                RepoStatus::Cloning => "Cloning...",
                RepoStatus::Syncing { .. } => "Syncing...",
                RepoStatus::CloneFailed { .. } => "Clone Failed",
                RepoStatus::SyncFailed { .. } => "Sync Failed",
            };
            ListItem::new(vec![
                Line::from(vec![
                    Span::raw(format!("{} ", r.name)),
                    Span::styled(format!("({})", status_str), Style::default().fg(Color::DarkGray)),
                ]),
            ])
        })
        .collect();

    let repos_list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Repositories"))
        .highlight_style(
            Style::default()
                .bg(Color::Blue)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol(">> ");
    f.render_stateful_widget(repos_list, body_chunks[0], &mut app.repo_list_state);

    // Analysis View
    let mut analysis_text = Vec::new();
    if let Some(analysis) = &app.analysis {
        analysis_text.push(Line::from(vec![
            Span::styled("Analysis for: ", Style::default().add_modifier(Modifier::BOLD)),
            Span::raw(&analysis.repo_name),
        ]));
        analysis_text.push(Line::from(""));
        for file in &analysis.files {
            analysis_text.push(Line::from(vec![
                Span::styled("File: ", Style::default().fg(Color::Yellow)),
                Span::raw(&file.file_path),
                Span::raw(format!(" ({})", file.language)),
            ]));
            for class in &file.classes {
                analysis_text.push(Line::from(vec![
                    Span::raw("  Class: "),
                    Span::styled(&class.name, Style::default().fg(Color::Green)),
                ]));
                if let Some(doc) = &class.docstring {
                    analysis_text.push(Line::from(vec![
                        Span::raw("    "),
                        Span::styled(doc.replace("\n", " ").trim().to_string(), Style::default().fg(Color::DarkGray).add_modifier(Modifier::ITALIC)),
                    ]));
                }
                for method in &class.methods {
                    render_function(&mut analysis_text, method, "    Method: ");
                }
            }
            for func in &file.functions {
                render_function(&mut analysis_text, func, "  Function: ");
            }
            analysis_text.push(Line::from(""));
        }
    } else {
        analysis_text.push(Line::from("Select a repository and press Enter to analyze"));
    };

    let analysis_view = Paragraph::new(analysis_text)
        .block(Block::default().borders(Borders::ALL).title("Analysis Results (PgUp/PgDn to scroll)"))
        .wrap(Wrap { trim: true })
        .scroll((app.analysis_scroll, 0));
    f.render_widget(analysis_view, body_chunks[1]);

    // Footer
    let help_text = match app.input_mode {
        InputMode::Normal => "q: quit | c: clone | d: delete | r: refresh | Enter: analyze | ↓↑: navigate | j/k: scroll",
        InputMode::EditingUrl => "Esc: cancel | Enter: set name | Typing URL...",
        InputMode::EditingName => "Esc: cancel | Enter: set token | Typing Name...",
        InputMode::EditingToken => "Esc: cancel | Enter: clone | Typing Token (optional)...",
    };
    let footer = Paragraph::new(help_text)
        .block(Block::default().borders(Borders::ALL))
        .style(Style::default().fg(Color::DarkGray));
    f.render_widget(footer, chunks[2]);

    // Popups
    match app.input_mode {
        InputMode::EditingUrl | InputMode::EditingName | InputMode::EditingToken => {
            let area = centered_rect(70, 30, f.size());
            f.render_widget(ratatui::widgets::Clear, area); // Clear the background
            let block = Block::default()
                .title(" Clone Repository ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Yellow));
            
            let popup_layout = Layout::default()
                .direction(Direction::Vertical)
                .margin(1)
                .constraints([Constraint::Length(3), Constraint::Length(3), Constraint::Length(3)])
                .split(area);

            let url_style = if matches!(app.input_mode, InputMode::EditingUrl) {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };
            let name_style = if matches!(app.input_mode, InputMode::EditingName) {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };
            let token_style = if matches!(app.input_mode, InputMode::EditingToken) {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };

            let url_input = Paragraph::new(app.url_input.as_str())
                .style(url_style)
                .block(Block::default().borders(Borders::ALL).title(" Repo URL "));
            f.render_widget(url_input, popup_layout[0]);

            let name_input = Paragraph::new(app.name_input.as_str())
                .style(name_style)
                .block(Block::default().borders(Borders::ALL).title(" Target Name "));
            f.render_widget(name_input, popup_layout[1]);

            let token_input = Paragraph::new(app.token_input.as_str())
                .style(token_style)
                .block(Block::default().borders(Borders::ALL).title(" Auth Token (Optional) "));
            f.render_widget(token_input, popup_layout[2]);
            
            f.render_widget(block, area);
        }
        _ => {}
    }

    if let Some(error) = &app.error_message {
        let area = centered_rect(50, 10, f.size());
        f.render_widget(ratatui::widgets::Clear, area);
        let error_msg = Paragraph::new(error.as_str())
            .block(Block::default().borders(Borders::ALL).title(" Error ").border_style(Style::default().fg(Color::Red)))
            .wrap(Wrap { trim: true });
        f.render_widget(error_msg, area);
    }
}

fn render_function(lines: &mut Vec<Line>, func: &FunctionDoc, label: &str) {
    let mut spans = vec![
        Span::raw(label.to_string()),
        Span::styled(func.name.clone(), Style::default().fg(Color::Magenta)),
        Span::raw("("),
    ];
    for (i, param) in func.parameters.iter().enumerate() {
        spans.push(Span::styled(param.name.clone(), Style::default().fg(Color::Cyan)));
        if let Some(ty) = &param.type_annotation {
            spans.push(Span::raw(": "));
            spans.push(Span::styled(ty.clone(), Style::default().fg(Color::Blue)));
        }
        if i < func.parameters.len() - 1 {
            spans.push(Span::raw(", "));
        }
    }
    spans.push(Span::raw(")"));
    if let Some(ret) = &func.return_type {
        spans.push(Span::raw(" -> "));
        spans.push(Span::styled(ret.clone(), Style::default().fg(Color::Blue)));
    }
    lines.push(Line::from(spans));
    if let Some(doc) = &func.docstring {
        lines.push(Line::from(vec![
            Span::raw("      "),
            Span::styled(doc.replace("\n", " ").trim().to_string(), Style::default().fg(Color::DarkGray).add_modifier(Modifier::ITALIC)),
        ]));
    }
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}
