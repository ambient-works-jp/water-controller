use std::{io, time::Duration};

use tokio::sync::broadcast;
use tracing::{error, info, warn};

use crate::{serial::SerialReader, websocket::server::run_websocket_server};

const READ_TIMEOUT_MS: u64 = 100;
const RETRY_INTERVAL_MS: u64 = 100;

/// シリアルポートからのデータの読み取りが秒間 100 回行われる場合に、ブロードキャストチャネルのサイズを設定する
const BROADCAST_CHANNEL_SIZE: usize = 100;

/// シリアル通信と WebSocket サーバを並行実行する
///
/// ## 引数
///
/// - `port_name`: シリアルポート名
/// - `baud_rate`: ボーレート
/// - `ws_host`: WebSocket サーバのホストアドレス
/// - `ws_port`: WebSocket サーバのポート番号
pub async fn run_loop(
    port_name: &str,
    baud_rate: u32,
    ws_host: &str,
    ws_port: u16,
) -> io::Result<()> {
    // ブロードキャストチャネルを作成
    let (broadcast_tx, _) = broadcast::channel(BROADCAST_CHANNEL_SIZE);

    // シリアル読み取りタスクを起動
    let serial_task = {
        let broadcast_tx = broadcast_tx.clone();
        let port_name = port_name.to_string();

        tokio::task::spawn_blocking(move || -> io::Result<()> {
            loop {
                // シリアルポートを開く
                info!(port = %port_name, baud = baud_rate, "Opening serial port");
                let timeout = Duration::from_millis(READ_TIMEOUT_MS);
                let mut reader = match SerialReader::open(&port_name, baud_rate, timeout) {
                    Ok(reader) => reader,
                    Err(e) => {
                        warn!(error = %e, "Failed to open serial port, retrying...");
                        std::thread::sleep(Duration::from_millis(RETRY_INTERVAL_MS));
                        continue;
                    }
                };
                info!(port = %port_name, "Serial port ready! Entering read loop...");

                // シリアルポートからの読み取りループを開始
                match reader.run_read_loop(broadcast_tx.clone()) {
                    Ok(()) => break,
                    Err(e) => {
                        error!(error = %e, "Serial read loop failed, retrying...");
                        std::thread::sleep(Duration::from_millis(RETRY_INTERVAL_MS));
                        continue;
                    }
                }
            }

            Ok(())
        })
    };

    // WebSocket サーバタスクを起動
    let ws_task: tokio::task::JoinHandle<Result<(), io::Error>> = {
        let broadcast_tx = broadcast_tx.clone();
        let ws_host = ws_host.to_string();
        tokio::spawn(async move {
            loop {
                match run_websocket_server(&ws_host, ws_port, broadcast_tx.clone()).await {
                    Ok(_) => break,
                    Err(e) => {
                        error!(error = %e, "WebSocket server failed, retrying...");
                        tokio::time::sleep(Duration::from_millis(RETRY_INTERVAL_MS)).await;
                    }
                }
            }

            Err(io::Error::other("WebSocket server failed"))
        })
    };

    // 両方のタスクを並行実行
    tokio::select! {
        result = serial_task => {
            match result {
                Ok(Ok(_)) => info!("Serial task completed normally"),
                Ok(Err(e)) => {
                    return Err(io::Error::other(
                        format!("Serial task failed: {}", e),
                    ));
                }
                Err(e) => {
                    return Err(io::Error::other(
                        format!("Serial task panicked: {}", e),
                    ));
                }
            }
        }
        result = ws_task => {
            match result {
                Ok(Ok(())) => info!("WebSocket server completed normally"),
                Ok(Err(e)) => {
                    return Err(io::Error::other(
                        format!("WebSocket server failed: {}", e),
                    ));
                }
                Err(e) => {
                    return Err(io::Error::other(
                        format!("WebSocket server panicked: {}", e),
                    ));
                }
            }
        }
    }

    Ok(())
}
