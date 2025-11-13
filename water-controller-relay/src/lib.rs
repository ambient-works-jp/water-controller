//! Water Controller Relay Library
//!
//! Arduino から受信したシリアルデータを WebSocket 経由で配信するライブラリ

pub mod args;
pub mod logger;
pub mod relay;
pub mod serial;
pub mod tui;
pub mod websocket;
