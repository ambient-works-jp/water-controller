//! WebSocket クライアントアプリケーション
//!
//! ## 機能
//!
//! - WebSocket サーバに接続
//! - 受信したメッセージを info レベルでログ出力

use std::io;

use clap::Parser;
use futures_util::StreamExt;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{Level, error, info};
use water_controller_relay::logger::logger_init;

const DEFAULT_WS_URL: &str = "ws://127.0.0.1:8080/ws";

#[derive(Parser, Debug)]
#[command(author, version, about = "WebSocket client for water-controller-relay", long_about = None)]
struct CliArgs {
    /// WebSocket サーバの URL
    #[arg(short = 'u', long = "url", value_name = "WS_URL", default_value = DEFAULT_WS_URL)]
    url: String,
}

#[tokio::main]
async fn main() -> io::Result<()> {
    // ロガーの初期化
    logger_init(Level::INFO)?;

    // コマンドライン引数のパース
    info!("Starting water-controller-relay client");
    let args = CliArgs::parse();
    info!("args: {:#?}", args);

    // WebSocket サーバに接続
    let (ws_stream, _) = connect_async(&args.url)
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::ConnectionRefused, e))?;
    info!("Connected to WebSocket server");

    let (_, mut read) = ws_stream.split();

    // メッセージを受信してログ出力
    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                info!("Received: {}", text);
            }
            Ok(Message::Close(_)) => {
                info!("Server closed connection");
                break;
            }
            Ok(Message::Ping(_)) => {
                // Ping は自動的に処理される
            }
            Ok(Message::Pong(_)) => {
                // Pong は自動的に処理される
            }
            Err(e) => {
                error!("Error receiving message: {}", e);
                break;
            }
            _ => {}
        }
    }

    info!("Client disconnected");
    Ok(())
}
