//! WebSocket 接続ハンドラ

use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use tracing::{debug, info, warn};

use crate::websocket::server::AppState;

/// WebSocket 接続を処理するハンドラ
///
/// ## 動作
///
/// - クライアント接続時にブロードキャストチャネルを subscribe
/// - シリアルデータを JSON 形式でクライアントに送信
/// - 一方向配信のみ（クライアントからの受信は無視）
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    info!("WebSocket client connected");

    let (mut sender, mut receiver) = socket.split();

    // ブロードキャストチャネルを subscribe
    let mut rx = state.broadcast_tx.subscribe();

    // 送信タスク: ブロードキャストチャネルからメッセージを受信してクライアントに送信
    let mut send_task = tokio::spawn(async move {
        while let Ok(json) = rx.recv().await {
            debug!(message = %json, "Broadcasting to client");
            if let Err(e) = sender.send(Message::Text(json.into())).await {
                warn!(error = %e, "Failed to send message to client");
                break;
            }
        }
    });

    // 受信タスク: クライアントからのメッセージを無視（一方向配信のみ）
    let mut recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Close(_)) => {
                    info!("Client requested close");
                    break;
                }
                Ok(Message::Ping(_)) => {
                    debug!("Received ping from client");
                }
                Ok(Message::Text(text)) => {
                    debug!(text = %text, "Received text from client (ignored)");
                }
                Err(e) => {
                    warn!(error = %e, "WebSocket error");
                    break;
                }
                _ => {}
            }
        }
    });

    // どちらかのタスクが完了したら、もう一方を中止
    tokio::select! {
        result = &mut send_task => {
            recv_task.abort();
            if let Err(e) = result {
                warn!(error = %e, "Send task panicked");
            }
        }
        result = &mut recv_task => {
            send_task.abort();
            if let Err(e) = result {
                warn!(error = %e, "Receive task panicked");
            }
        }
    };

    info!("WebSocket client disconnected");
}
