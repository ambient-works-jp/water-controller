//! TUI (Terminal User Interface) モジュール
//!
//! 水コントローラの入力を可視化する TUI クライアント

pub mod app;
pub mod handler;
pub mod logger;
pub mod ui;
pub mod websocket;

use std::io::{self, stdout};
use std::panic;
use std::time::Duration;

use crossterm::{
    ExecutableCommand,
    event::{self, Event, KeyEventKind},
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use ratatui::{Terminal, backend::CrosstermBackend};
use tokio::sync::mpsc;
use tracing::{error, info};

use app::AppState;
use handler::{handle_key_event, handle_ws_message};
use ui::ui;
use websocket::websocket_task;

/// TUI アプリケーションを起動
pub async fn run(ws_url: String, mut log_rx: mpsc::UnboundedReceiver<String>) -> io::Result<()> {
    // パニック時にターミナルを確実に復元するためのフック
    setup_panic_hook();

    // アプリケーション状態の初期化
    let mut app_state = AppState::new(ws_url.clone());

    // ターミナルの初期化
    enable_raw_mode().map_err(|e| {
        error!("Failed to enable raw mode: {}", e);
        e
    })?;

    stdout().execute(EnterAlternateScreen).map_err(|e| {
        error!("Failed to enter alternate screen: {}", e);
        let _ = disable_raw_mode();
        e
    })?;

    let mut terminal = Terminal::new(CrosstermBackend::new(stdout())).map_err(|e| {
        error!("Failed to create terminal: {}", e);
        let _ = stdout().execute(LeaveAlternateScreen);
        let _ = disable_raw_mode();
        e
    })?;

    info!("TUI initialized successfully");

    // ターミナルをクリアして初期化ログを消す
    terminal.clear().map_err(|e| {
        error!("Failed to clear terminal: {}", e);
        let _ = restore_terminal();
        e
    })?;

    // WebSocket 通信用のチャネル
    let (ws_tx, mut ws_rx) = mpsc::unbounded_channel::<String>();

    // WebSocket 接続タスクを起動
    tokio::spawn(async move {
        if let Err(e) = websocket_task(ws_url, ws_tx).await {
            error!("WebSocket task error: {}", e);
        }
    });

    // メインループ
    let result = run_app(&mut terminal, &mut app_state, &mut ws_rx, &mut log_rx).await;

    // ターミナルの復元
    restore_terminal()?;

    result
}

/// パニック時にターミナルを復元するフックを設定
fn setup_panic_hook() {
    let default_panic = panic::take_hook();
    panic::set_hook(Box::new(move |info| {
        let _ = restore_terminal();
        default_panic(info);
    }));
}

/// ターミナルを復元
fn restore_terminal() -> io::Result<()> {
    disable_raw_mode().map_err(|e| {
        error!("Failed to disable raw mode: {}", e);
        e
    })?;

    stdout().execute(LeaveAlternateScreen).map_err(|e| {
        error!("Failed to leave alternate screen: {}", e);
        e
    })?;

    Ok(())
}

/// アプリケーションのメインループ
async fn run_app(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    app_state: &mut AppState,
    ws_rx: &mut mpsc::UnboundedReceiver<String>,
    log_rx: &mut mpsc::UnboundedReceiver<String>,
) -> io::Result<()> {
    loop {
        // UI 描画
        terminal.draw(|f| ui(f, app_state))?;

        // イベント処理（タイムアウト付き）
        if event::poll(Duration::from_millis(100))?
            && let Event::Key(key) = event::read()?
            && key.kind == KeyEventKind::Press
            && handle_key_event(app_state, key.code)
        {
            // 終了フラグが立った場合
            break;
        }

        // WebSocket メッセージ処理
        while let Ok(msg) = ws_rx.try_recv() {
            handle_ws_message(app_state, msg);
        }

        // tracing ログ処理
        while let Ok(log_msg) = log_rx.try_recv() {
            app_state.add_log_message(log_msg);
        }
    }

    Ok(())
}
