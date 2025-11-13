//! イベントハンドラー

use crossterm::event::KeyCode;
use tracing::warn;

use super::app::{AppState, Tab, WsMessage};

/// キーイベント処理
///
/// 戻り値: 終了フラグ（true の場合はアプリケーションを終了）
pub fn handle_key_event(app_state: &mut AppState, key: KeyCode) -> bool {
    match key {
        // Escape または q キーで即座終了
        KeyCode::Esc | KeyCode::Char('q') | KeyCode::Char('Q') => return true,
        // タブ切り替え（数字キー）
        KeyCode::Char('1') => app_state.current_tab = Tab::Monitor,
        KeyCode::Char('2') => app_state.current_tab = Tab::History,
        KeyCode::Char('3') => app_state.current_tab = Tab::Connection,
        KeyCode::Char('4') => app_state.current_tab = Tab::Close,
        // タブ切り替え（Tab/Shift+Tab キー）
        KeyCode::Tab => app_state.next_tab(),
        KeyCode::BackTab => app_state.prev_tab(),
        // タブ切り替え（矢印キー）
        KeyCode::Left => app_state.prev_tab(),
        KeyCode::Right => app_state.next_tab(),
        // Close タブでの Y/N 処理
        KeyCode::Char('y') | KeyCode::Char('Y') => {
            if app_state.current_tab == Tab::Close {
                app_state.should_quit = true;
                return true;
            }
        }
        KeyCode::Char('n') | KeyCode::Char('N') => {
            if app_state.current_tab == Tab::Close {
                app_state.current_tab = Tab::Monitor;
            }
        }
        _ => {}
    }
    false
}

/// WebSocket メッセージ処理
pub fn handle_ws_message(app_state: &mut AppState, msg: String) {
    // 特殊メッセージの処理
    if msg == "__CONNECTED__" {
        app_state.is_connected = true;
        app_state.add_log("Connected to WebSocket server".to_string());
        return;
    }
    if msg == "__DISCONNECTED__" {
        app_state.is_connected = false;
        app_state.add_log("Disconnected from WebSocket server".to_string());
        return;
    }

    // メッセージカウント
    app_state.message_count += 1;

    // JSON パース
    match serde_json::from_str::<WsMessage>(&msg) {
        Ok(WsMessage::ButtonInput { isPushed }) => {
            app_state.button_pushed = isPushed;
            let button_state = if isPushed { "PUSHED" } else { "RELEASED" };
            app_state.add_log(format!(
                "Button: {:<8} | Controller: L={} R={} U={} D={}",
                button_state,
                app_state.controller.left,
                app_state.controller.right,
                app_state.controller.up,
                app_state.controller.down
            ));
        }
        Ok(WsMessage::ControllerInput {
            left,
            right,
            up,
            down,
        }) => {
            app_state.controller.left = left;
            app_state.controller.right = right;
            app_state.controller.up = up;
            app_state.controller.down = down;
            let button_state = if app_state.button_pushed {
                "PUSHED"
            } else {
                "RELEASED"
            };
            app_state.add_log(format!(
                "Button: {:<8} | Controller: L={} R={} U={} D={}",
                button_state, left, right, up, down
            ));
        }
        Err(e) => {
            warn!("Failed to parse message: {} (error: {})", msg, e);
            app_state.add_log(format!("Parse error: {}", msg));
        }
    }
}
