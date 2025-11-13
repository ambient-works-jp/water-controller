//! UI 描画

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::Line,
    widgets::{Block, BorderType, Borders, List, ListItem, Paragraph, Tabs},
    Frame,
};

use super::app::{AppState, Tab};

const PACKAGE_NAME: &str = env!("CARGO_PKG_NAME");
const VERSION: &str = env!("CARGO_PKG_VERSION");

/// UI 描画
pub fn ui(f: &mut Frame, app_state: &mut AppState) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // タブバー
            Constraint::Min(0),    // コンテンツ
            Constraint::Length(1), // フッター
        ])
        .split(f.area());

    // タブバー
    render_tab_bar(f, chunks[0], app_state);

    // コンテンツ
    match app_state.current_tab {
        Tab::Monitor => render_monitor_tab(f, chunks[1], app_state),
        Tab::History => render_history_tab(f, chunks[1], app_state),
        Tab::Connection => render_connection_tab(f, chunks[1], app_state),
        Tab::Log => render_log_tab(f, chunks[1], app_state),
        Tab::Help => render_help_tab(f, chunks[1]),
    }

    // フッター
    render_footer(f, chunks[2]);
}

/// タブバー描画
fn render_tab_bar(f: &mut Frame, area: Rect, app_state: &AppState) {
    let tabs = Tab::all();
    let titles: Vec<Line> = tabs.iter().map(|t| Line::from(t.title())).collect();

    let selected_index = tabs
        .iter()
        .position(|t| *t == app_state.current_tab)
        .unwrap_or(0);

    let title = format!("{}-{}", PACKAGE_NAME, VERSION);
    let tabs_widget = Tabs::new(titles)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(Line::from(title).centered()),
        )
        .select(selected_index)
        .style(Style::default().fg(Color::White))
        .highlight_style(
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        );

    f.render_widget(tabs_widget, area);
}

/// Monitor タブ描画
fn render_monitor_tab(f: &mut Frame, area: Rect, app_state: &AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title("Monitor - Controller State");

    let inner = block.inner(area);
    f.render_widget(block, area);

    // 十字キーとボタンの可視化
    render_controller_visual(f, inner, app_state);
}

/// コントローラの視覚化（十字キー + ボタン）
fn render_controller_visual(f: &mut Frame, area: Rect, app_state: &AppState) {
    // エリアが小さすぎる場合はエラーメッセージを表示
    if area.width < 50 || area.height < 15 {
        let error_msg =
            Paragraph::new("Area too small for controller visualization\nPlease resize terminal")
                .style(Style::default().fg(Color::Red));
        f.render_widget(error_msg, area);
        return;
    }

    // セルサイズ（正方形に見えるように調整）
    // ターミナルの文字セルは縦長なので、width:height = 2:1 で正方形に見える
    let cell_width = 6;
    let cell_height = 3;
    let gap = 1; // 要素間の隙間

    // 中央座標を計算
    let center_x = area.x + area.width / 2;
    let center_y = area.y + area.height / 2;

    // 各要素の位置を計算
    // 上方向（2段階）
    let up_high_x = center_x - cell_width / 2;
    let up_high_y = center_y - (cell_height * 2 + gap * 2);
    let up_low_x = center_x - cell_width / 2;
    let up_low_y = center_y - (cell_height + gap);

    // 下方向（2段階）
    let down_low_x = center_x - cell_width / 2;
    let down_low_y = center_y + gap;
    let down_high_x = center_x - cell_width / 2;
    let down_high_y = center_y + cell_height + gap * 2;

    // 左方向（2段階）
    let left_high_x = center_x - (cell_width * 2 + gap * 2) - cell_width / 2;
    let left_high_y = center_y - cell_height / 2;
    let left_low_x = center_x - (cell_width + gap) - cell_width / 2;
    let left_low_y = center_y - cell_height / 2;

    // 右方向（2段階）
    let right_low_x = center_x + gap + cell_width / 2;
    let right_low_y = center_y - cell_height / 2;
    let right_high_x = center_x + (cell_width + gap * 2) + cell_width / 2;
    let right_high_y = center_y - cell_height / 2;

    // ボタン（中央）
    let button_x = center_x - cell_width / 2;
    let button_y = center_y - cell_height / 2;

    // 各要素を描画
    // 上 HIGH
    render_square(
        f,
        up_high_x,
        up_high_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.up, 2),
    );

    // 上 LOW
    render_square(
        f,
        up_low_x,
        up_low_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.up, 1),
    );

    // 下 LOW
    render_square(
        f,
        down_low_x,
        down_low_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.down, 1),
    );

    // 下 HIGH
    render_square(
        f,
        down_high_x,
        down_high_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.down, 2),
    );

    // 左 HIGH
    render_square(
        f,
        left_high_x,
        left_high_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.left, 2),
    );

    // 左 LOW
    render_square(
        f,
        left_low_x,
        left_low_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.left, 1),
    );

    // 右 LOW
    render_square(
        f,
        right_low_x,
        right_low_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.right, 1),
    );

    // 右 HIGH
    render_square(
        f,
        right_high_x,
        right_high_y,
        cell_width,
        cell_height,
        controller_value_color(app_state.controller.right, 2),
    );

    // ボタン（中央、丸）
    let button_color = if app_state.button_pushed {
        Color::LightYellow
    } else {
        Color::White
    };
    render_circle(f, button_x, button_y, cell_width, cell_height, button_color);
}

/// 正方形（十字キーの一部）を描画
fn render_square(
    f: &mut Frame,
    x: u16,
    y: u16,
    width: u16,
    height: u16,
    bg_color: Color,
) {
    let area = Rect {
        x,
        y,
        width,
        height,
    };

    let block = Block::default()
        .borders(Borders::ALL)
        .style(Style::default().bg(bg_color));

    f.render_widget(block, area);
}

/// ボタン（丸）を描画
fn render_circle(
    f: &mut Frame,
    x: u16,
    y: u16,
    width: u16,
    height: u16,
    bg_color: Color,
) {
    let area = Rect {
        x,
        y,
        width,
        height,
    };

    // ボタンは丸みを帯びた見た目にする（ROUNDED borders を使用）
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .style(Style::default().bg(bg_color));

    f.render_widget(block, area);
}

/// コントローラの値に基づく色を返す
fn controller_value_color(value: u8, expected_level: u8) -> Color {
    // value が expected_level 以上の場合は LightRed、そうでない場合は White
    // 例: value=2(HIGH) の場合、expected_level=1(LOW) と expected_level=2(HIGH) 両方が赤になる
    if value >= expected_level {
        Color::LightRed
    } else {
        Color::White
    }
}

/// History タブ描画（スクロール可能）
fn render_history_tab(f: &mut Frame, area: Rect, app_state: &mut AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title("History - Message Log (↑↓: scroll)");

    // 最新のログを下に表示（降順）
    let items: Vec<ListItem> = app_state
        .message_log
        .iter()
        .map(|msg| ListItem::new(msg.as_str()))
        .collect();

    let list = List::new(items)
        .block(block)
        .highlight_style(Style::default().fg(Color::Yellow));

    f.render_stateful_widget(list, area, &mut app_state.history_scroll_state);
}

/// Connection タブ描画
fn render_connection_tab(f: &mut Frame, area: Rect, app_state: &AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title("Connection - WebSocket Info");

    let inner = block.inner(area);
    f.render_widget(block, area);

    // URL をパース
    let (protocol, host, port) = parse_url(&app_state.ws_url);

    let (status_text, status_color) = if app_state.is_connected {
        ("Connected", Color::LightGreen)
    } else {
        ("Disconnected", Color::Red)
    };

    // 各行を Line として作成し、Status だけ色を変える
    let lines = vec![
        Line::from(format!("URL:      {}", app_state.ws_url)),
        Line::from(format!("Protocol: {}", protocol)),
        Line::from(format!("Host:     {}", host)),
        Line::from(format!("Port:     {}", port)),
        Line::from(vec![
            "Status:   ".into(),
            ratatui::text::Span::styled(status_text, Style::default().fg(status_color)),
        ]),
    ];

    let paragraph = Paragraph::new(lines).style(Style::default().fg(Color::White));
    f.render_widget(paragraph, inner);
}

/// Log タブ描画（スクロール可能）
fn render_log_tab(f: &mut Frame, area: Rect, app_state: &mut AppState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title("Log - tracing Log (↑↓: scroll)");

    // 最新のログを下に表示（降順）
    // ANSI カラーコードを解析して表示
    let items: Vec<ListItem> = app_state
        .log_messages
        .iter()
        .map(|msg| {
            // ANSI エスケープコードを ratatui の Text に変換
            match ansi_to_tui::IntoText::into_text(msg) {
                Ok(text) => ListItem::new(text),
                Err(_) => {
                    // パースに失敗した場合はプレーンテキストとして表示
                    ListItem::new(msg.as_str())
                }
            }
        })
        .collect();

    let list = List::new(items)
        .block(block)
        .highlight_style(Style::default().fg(Color::Yellow));

    f.render_stateful_widget(list, area, &mut app_state.log_scroll_state);
}

/// Help タブ描画
fn render_help_tab(f: &mut Frame, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title("Help - Key Bindings");

    let inner = block.inner(area);
    f.render_widget(block, area);

    let help_text = [
        "",
        "== Tab Navigation ==",
        "  1-5           Switch to tab by number",
        "  Tab           Next tab",
        "  Shift+Tab     Previous tab",
        "  ← →          Previous/Next tab",
        "",
        "== Scrolling (History/Log tabs) ==",
        "  ↑ ↓          Scroll up/down",
        "",
        "== Application ==",
        "  Escape, q     Quit application",
        "",
    ];

    let paragraph = Paragraph::new(help_text.join("\n"))
        .style(Style::default().fg(Color::White))
        .block(Block::default());
    f.render_widget(paragraph, inner);
}

/// URL をパース（簡易版）
fn parse_url(url: &str) -> (String, String, String) {
    // ws://127.0.0.1:8080/ws の形式を想定
    let protocol = if url.starts_with("wss://") {
        "wss".to_string()
    } else if url.starts_with("ws://") {
        "ws".to_string()
    } else {
        "unknown".to_string()
    };

    let without_protocol = url
        .strip_prefix("wss://")
        .or_else(|| url.strip_prefix("ws://"))
        .unwrap_or(url);

    let parts: Vec<&str> = without_protocol.split(':').collect();
    let host = parts.first().unwrap_or(&"unknown").to_string();

    let port = if parts.len() > 1 {
        parts[1].split('/').next().unwrap_or("unknown").to_string()
    } else {
        "unknown".to_string()
    };

    (protocol, host, port)
}

/// フッター描画
fn render_footer(f: &mut Frame, area: Rect) {
    let footer_text = "Press <Escape> to close.";
    let paragraph = Paragraph::new(footer_text).style(Style::default().fg(Color::DarkGray));
    f.render_widget(paragraph, area);
}
