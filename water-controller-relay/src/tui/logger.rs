//! TUI 用ロガー
//!
//! tracing のログをメモリに保持し、チャネル経由で TUI に送信する

use std::io::{self, Write};

use tokio::sync::mpsc;
use tracing::Level;

/// チャネル経由でログを送信する Writer
#[derive(Clone)]
struct ChannelWriter {
    tx: mpsc::UnboundedSender<String>,
}

impl Write for ChannelWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let msg = String::from_utf8_lossy(buf).to_string();
        // チャネルに送信（失敗しても無視）
        let _ = self.tx.send(msg);
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

/// TUI モード用のロガー初期化（メモリ保持）
///
/// # Returns
///
/// ログメッセージを受信するための mpsc::UnboundedReceiver
pub fn logger_init_tui(level: Level) -> io::Result<mpsc::UnboundedReceiver<String>> {
    let (log_tx, log_rx) = mpsc::unbounded_channel::<String>();
    let writer = ChannelWriter { tx: log_tx };

    let subscriber = tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(true)
        .with_thread_ids(false)
        .with_thread_names(false)
        .with_file(false)
        .with_line_number(false)
        .with_ansi(true) // ANSI カラーコードを有効化
        .with_writer(move || writer.clone())
        .finish();

    tracing::subscriber::set_global_default(subscriber).map_err(io::Error::other)?;

    Ok(log_rx)
}
