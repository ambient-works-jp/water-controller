//! WebSocket 接続タスク

use std::io;
use std::time::Duration;

use futures_util::StreamExt;
use tokio::sync::mpsc;
use tokio::time::sleep;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

const MAX_RETRY_COUNT: u32 = 10;
const RETRY_INTERVAL_SECS: u64 = 3;

/// WebSocket 接続タスク
pub async fn websocket_task(url: String, tx: mpsc::UnboundedSender<String>) -> io::Result<()> {
    info!("Connecting to WebSocket server: {}", url);

    // 再接続ループ（最大 MAX_RETRY_COUNT 回）
    let (ws_stream, response) = {
        let mut retry_count = 0;

        loop {
            match connect_async(&url).await {
                Ok((stream, resp)) => break (stream, resp),
                Err(e) => {
                    retry_count += 1;

                    if retry_count >= MAX_RETRY_COUNT {
                        error!(
                            "Failed to connect after {} attempts: {}",
                            MAX_RETRY_COUNT, e
                        );
                        return Err(io::Error::new(
                            io::ErrorKind::ConnectionRefused,
                            format!(
                                "WebSocket connection failed after {} attempts: {}",
                                MAX_RETRY_COUNT, e
                            ),
                        ));
                    }

                    warn!(
                        "Connection attempt {} failed: {}. Retrying in {} seconds...",
                        retry_count, e, RETRY_INTERVAL_SECS
                    );

                    sleep(Duration::from_secs(RETRY_INTERVAL_SECS)).await;
                }
            }
        }
    };

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
