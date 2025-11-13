//! WebSocket クライアント TUI アプリケーション
//!
//! ## 機能
//!
//! - WebSocket サーバに接続
//! - 受信したメッセージを TUI で可視化
//! - タブ切り替えによる複数のビュー（Visual, TextLog, Connection, Close）

use std::io;

use clap::Parser;
use tracing::{Level, info};
use water_controller_relay::tui;

const DEFAULT_WS_URL: &str = "ws://127.0.0.1:8080/ws";

/// コマンドライン引数
#[derive(Parser, Debug)]
#[command(author, version, about = "WebSocket TUI client for water-controller-relay", long_about = None)]
struct CliArgs {
    /// WebSocket サーバの URL
    #[arg(short = 'u', long = "url", value_name = "WS_URL", default_value = DEFAULT_WS_URL)]
    url: String,
}

#[tokio::main]
async fn main() -> io::Result<()> {
    // TUI 用ロガーの初期化（メモリ保持）
    let log_rx = tui::logger::logger_init_tui(Level::INFO)?;

    // コマンドライン引数のパース
    info!("Starting water-controller-relay TUI client");
    let args = CliArgs::parse();
    info!("args: {:#?}", args);

    // TUI アプリケーションを起動
    tui::run(args.url, log_rx).await
}
