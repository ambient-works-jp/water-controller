//! WebSocket 接続タスク

use std::io;

use futures_util::StreamExt;
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

/// WebSocket 接続タスク
pub async fn websocket_task(url: String, tx: mpsc::UnboundedSender<String>) -> io::Result<()> {
    info!("Connecting to WebSocket server: {}", url);

    // WebSocket サーバに接続
    let (ws_stream, response) = connect_async(&url).await.map_err(|e| {
        error!("Failed to connect to WebSocket server: {}", e);
        io::Error::new(
            io::ErrorKind::ConnectionRefused,
            format!("WebSocket connection failed: {}", e),
        )
    })?;

    info!(
        "Connected to WebSocket server (status: {})",
        response.status()
    );

    // 接続成功を通知
    if tx.send("__CONNECTED__".to_string()).is_err() {
        warn!("Main task has been closed, stopping WebSocket task");
        return Ok(());
    }

    let (_, mut read) = ws_stream.split();

    // メッセージを受信してチャネルに送信
    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                debug!("Received text message: {} bytes", text.len());
                if tx.send(text.to_string()).is_err() {
                    warn!("Failed to send message to main task, task may have been closed");
                    break;
                }
            }
            Ok(Message::Close(frame)) => {
                if let Some(cf) = frame {
                    info!(
                        "Server closed connection (code: {}, reason: {})",
                        cf.code, cf.reason
                    );
                } else {
                    info!("Server closed connection");
                }
                let _ = tx.send("__DISCONNECTED__".to_string());
                break;
            }
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => {
                // Ping/Pong は自動的に処理される
                debug!("Received Ping/Pong message");
            }
            Ok(Message::Binary(data)) => {
                warn!("Received unexpected binary message: {} bytes", data.len());
            }
            Ok(Message::Frame(_)) => {
                debug!("Received raw frame");
            }
            Err(e) => {
                error!("Error receiving WebSocket message: {}", e);
                let _ = tx.send("__DISCONNECTED__".to_string());
                return Err(io::Error::new(
                    io::ErrorKind::ConnectionAborted,
                    format!("WebSocket error: {}", e),
                ));
            }
        }
    }

    info!("WebSocket connection closed gracefully");
    Ok(())
}
