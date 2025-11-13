//! TUI アプリケーションの状態管理

use std::collections::VecDeque;
use std::time::Instant;

use chrono::Local;
use ratatui::widgets::ListState;
use serde::Deserialize;

/// タブの種類
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tab {
    Monitor,
    History,
    Connection,
    Log,
    Help,
}

impl Tab {
    pub fn all() -> Vec<Tab> {
        vec![
            Tab::Monitor,
            Tab::History,
            Tab::Connection,
            Tab::Log,
            Tab::Help,
        ]
    }

    pub fn title(&self) -> &str {
        match self {
            Tab::Monitor => "Monitor",
            Tab::History => "History",
            Tab::Connection => "Connection",
            Tab::Log => "Log",
            Tab::Help => "Help",
        }
    }

    pub fn next(&self) -> Tab {
        match self {
            Tab::Monitor => Tab::History,
            Tab::History => Tab::Connection,
            Tab::Connection => Tab::Log,
            Tab::Log => Tab::Help,
            Tab::Help => Tab::Monitor,
        }
    }

    pub fn prev(&self) -> Tab {
        match self {
            Tab::Monitor => Tab::Help,
            Tab::History => Tab::Monitor,
            Tab::Connection => Tab::History,
            Tab::Log => Tab::Connection,
            Tab::Help => Tab::Log,
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
    /// メッセージログ（タイムスタンプ付き）- WebSocket メッセージ
    pub message_log: VecDeque<String>,
    /// tracing ログ（タイムスタンプ付き）
    pub log_messages: VecDeque<String>,
    /// History タブのスクロール状態
    pub history_scroll_state: ListState,
    /// Log タブのスクロール状態
    pub log_scroll_state: ListState,
    /// WebSocket URL
    pub ws_url: String,
    /// 接続状態
    pub is_connected: bool,
    /// 受信メッセージ数（内部カウント用）
    pub message_count: usize,
    /// 最後のフレームの時刻（FPS 計算用）
    pub last_frame_time: Option<Instant>,
    /// FPS（指数移動平均）
    pub fps: f64,
}

impl AppState {
    pub fn new(ws_url: String) -> Self {
        Self {
            current_tab: Tab::Monitor,
            button_pushed: false,
            controller: ControllerState::default(),
            message_log: VecDeque::new(),
            log_messages: VecDeque::new(),
            history_scroll_state: ListState::default(),
            log_scroll_state: ListState::default(),
            ws_url,
            is_connected: false,
            message_count: 0,
            last_frame_time: None,
            fps: 0.0,
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

    /// tracing ログに追加
    pub fn add_log_message(&mut self, message: String) {
        self.log_messages.push_back(message);

        // ログの上限を 100 件に設定（メモリリーク防止）
        if self.log_messages.len() > 100 {
            self.log_messages.pop_front();
        }
    }

    /// FPS を更新（指数移動平均を使用）
    pub fn update_fps(&mut self) {
        let now = Instant::now();

        if let Some(last_time) = self.last_frame_time {
            let frame_time = now.duration_since(last_time).as_secs_f64();
            if frame_time > 0.0 {
                let instant_fps = 1.0 / frame_time;
                // EMA: alpha = 0.1 で滑らかに平均化
                const ALPHA: f64 = 0.1;
                self.fps = ALPHA * instant_fps + (1.0 - ALPHA) * self.fps;
            }
        }

        self.last_frame_time = Some(now);
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
