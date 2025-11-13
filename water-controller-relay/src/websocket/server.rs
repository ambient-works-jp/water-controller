//! WebSocket サーバの実装

use std::io;

use axum::{Router, routing::get};
use tokio::sync::broadcast;
use tracing::info;

use crate::websocket::handler::websocket_handler;

/// WebSocket サーバの状態を保持する構造体
#[derive(Clone)]
pub struct AppState {
    /// ブロードキャストチャネルの送信側
    ///
    /// シリアル読み取りタスクがこのチャネルにデータを送信し、
    /// 接続中のすべての WebSocket クライアントがデータを受信する
    pub broadcast_tx: broadcast::Sender<String>,
}

/// WebSocket サーバを起動する
///
/// ## 引数
///
/// - `host`: バインドするホストアドレス（例: "127.0.0.1"）
/// - `port`: バインドするポート番号（例: 8080）
/// - `broadcast_tx`: ブロードキャストチャネルの送信側
///
/// ## エラー
///
/// サーバのバインドまたは起動に失敗した場合にエラーを返す
pub async fn run_websocket_server(
    host: &str,
    port: u16,
    broadcast_tx: broadcast::Sender<String>,
) -> io::Result<()> {
    let state = AppState { broadcast_tx };

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .with_state(state);

    let bind_addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::AddrInUse, e))?;

    info!("WebSocket server listening on {}", bind_addr);
    info!("Connect to: ws://{}/ws", bind_addr);

    axum::serve(listener, app).await.map_err(io::Error::other)?;

    Ok(())
}
