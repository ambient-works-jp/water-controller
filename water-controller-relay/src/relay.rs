use std::{io, time::Duration};

use tokio::sync::broadcast;
use tracing::info;

use crate::{serial::SerialReader, websocket::server::run_websocket_server};

const READ_TIMEOUT_MS: u64 = 100;

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
        tokio::task::spawn_blocking(move || {
            info!(port = %port_name, baud = baud_rate, "Opening serial port");
            let timeout = Duration::from_millis(READ_TIMEOUT_MS);
            let mut reader = SerialReader::open(&port_name, baud_rate, timeout)?;
            info!(port = %port_name, "Serial port ready; entering read loop");

            reader.run_read_loop(broadcast_tx)
        })
    };

    // WebSocket サーバタスクを起動
    let ws_task = {
        let broadcast_tx = broadcast_tx.clone();
        let ws_host = ws_host.to_string();
        tokio::spawn(async move { run_websocket_server(&ws_host, ws_port, broadcast_tx).await })
    };

    // 両方のタスクを並行実行
    tokio::select! {
        result = serial_task => {
            match result {
                Ok(Ok(())) => info!("Serial task completed normally"),
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
