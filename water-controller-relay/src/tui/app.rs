//! TUI アプリケーションの状態管理

use std::collections::VecDeque;

use chrono::Local;
use serde::Deserialize;

/// タブの種類
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tab {
    Monitor,
    History,
    Connection,
    Close,
}

impl Tab {
    pub fn all() -> Vec<Tab> {
        vec![Tab::Monitor, Tab::History, Tab::Connection, Tab::Close]
    }

    pub fn title(&self) -> &str {
        match self {
            Tab::Monitor => "Monitor",
            Tab::History => "History",
            Tab::Connection => "Connection",
            Tab::Close => "Close",
        }
    }

    pub fn next(&self) -> Tab {
        match self {
            Tab::Monitor => Tab::History,
            Tab::History => Tab::Connection,
            Tab::Connection => Tab::Close,
            Tab::Close => Tab::Monitor,
        }
    }

    pub fn prev(&self) -> Tab {
        match self {
            Tab::Monitor => Tab::Close,
            Tab::History => Tab::Monitor,
            Tab::Connection => Tab::History,
            Tab::Close => Tab::Connection,
        }
    }
}

/// コントローラの入力状態
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct ControllerState {
    pub left: u8,  // 0: NOINPUT, 1: LOW, 2: HIGH
    pub right: u8, // 0: NOINPUT, 1: LOW, 2: HIGH
    pub up: u8,    // 0: NOINPUT, 1: LOW, 2: HIGH
    pub down: u8,  // 0: NOINPUT, 1: LOW, 2: HIGH
}

/// アプリケーション状態
#[derive(Debug)]
pub struct AppState {
    /// 現在のタブ
    pub current_tab: Tab,
    /// ボタンの押下状態
    pub button_pushed: bool,
    /// コントローラの入力状態
    pub controller: ControllerState,
    /// メッセージログ（タイムスタンプ付き）
    pub message_log: VecDeque<String>,
    /// WebSocket URL
    pub ws_url: String,
    /// 接続状態
    pub is_connected: bool,
    /// 受信メッセージ数（内部カウント用）
    pub message_count: usize,
    /// Close タブでの終了確認フラグ
    pub should_quit: bool,
}

impl AppState {
    pub fn new(ws_url: String) -> Self {
        Self {
            current_tab: Tab::Monitor,
            button_pushed: false,
            controller: ControllerState::default(),
            message_log: VecDeque::new(),
            ws_url,
            is_connected: false,
            message_count: 0,
            should_quit: false,
        }
    }

    /// タブを次に進める
    pub fn next_tab(&mut self) {
        self.current_tab = self.current_tab.next();
    }

    /// タブを前に戻す
    pub fn prev_tab(&mut self) {
        self.current_tab = self.current_tab.prev();
    }

    /// メッセージログに追加（タイムスタンプ付き）
    pub fn add_log(&mut self, message: String) {
        let timestamp = Local::now().format("%H:%M:%S%.3f");
        let log_entry = format!("[{}] {}", timestamp, message);
        self.message_log.push_back(log_entry);

        // ログの上限を 100 件に設定（メモリリーク防止）
        // VecDeque::pop_front() は O(1)
        if self.message_log.len() > 100 {
            self.message_log.pop_front();
        }
    }
}

/// WebSocket メッセージの種類
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
#[allow(non_snake_case)]
pub enum WsMessage {
    #[serde(rename = "button-input")]
    ButtonInput { isPushed: bool },
    #[serde(rename = "controller-input")]
    ControllerInput {
        left: u8,
        right: u8,
        up: u8,
        down: u8,
    },
}
