use std::{
    io::{self, Read},
    time::Duration,
};

use serialport::SerialPort;
use tokio::sync::broadcast;
use tracing::{debug, warn};

use super::input::parse_input_line;
use crate::websocket::message::{ButtonInputMessage, ControllerInputMessage};

pub struct SerialReader {
    port: Box<dyn SerialPort>,
}

impl SerialReader {
    pub fn open(port_name: &str, baud_rate: u32, timeout: Duration) -> io::Result<Self> {
        let port = serialport::new(port_name, baud_rate)
            .timeout(timeout)
            .open()
            .map_err(|err| {
                io::Error::other(format!(
                    "failed to open serial port {port_name} at {baud_rate} baud: {err}"
                ))
            })?;

        Ok(Self { port })
    }

    pub fn read_line(&mut self) -> io::Result<String> {
        let mut buf = Vec::new();
        let mut byte = [0u8; 1];

        loop {
            match self.port.read(&mut byte) {
                Ok(0) => continue,
                Ok(_) => match byte[0] {
                    b'\n' => break,
                    b'\r' => continue,
                    other => buf.push(other),
                },
                Err(ref err) if err.kind() == io::ErrorKind::TimedOut => {
                    // タイムアウトは想定済みなので読み取り継続
                    continue;
                }
                Err(err) => return Err(err),
            }
        }

        String::from_utf8(buf)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err.utf8_error()))
    }

    /// シリアル読み取りループ（ブロッキング処理）
    ///
    /// シリアルポートからデータを読み取り、パースして WebSocket ブロードキャストチャネルに送信する。
    pub fn run_read_loop(&mut self, broadcast_tx: broadcast::Sender<String>) -> io::Result<()> {
        loop {
            // WebSocket 接続の有無に関わらず、常にシリアルを読み取る必要がある。
            // 理由：シリアルバッファの溢れを防ぎ、再接続時に古いデータを送信しないため。
            // 詳細：docs/notes/20251113_serial-broadcast-strategy.md
            let line = match self.read_line() {
                Ok(line) => line,
                Err(err) => {
                    // 'Broken pipe' エラーは、シリアルポートが閉じられたことを意味する。
                    // この場合は、エラーを返して再接続を試みる。
                    warn!(error = %err, "Failed to read serial line");
                    return Err(err);
                }
            };
            debug!(%line, "Received raw serial line");

            match parse_input_line(&line) {
                Ok(input) => {
                    debug!(input = %input, "Parsed input successfully");
                    debug!("{input}");

                    // button-input メッセージを送信
                    let button_msg = ButtonInputMessage::new(&input.button);
                    match serde_json::to_string(&button_msg) {
                        Ok(json) => {
                            // 接続中のクライアントがいる場合のみブロードキャスト
                            if broadcast_tx.receiver_count() > 0 {
                                debug!(message = %json, "Broadcasting button-input");
                                if let Err(e) = broadcast_tx.send(json) {
                                    warn!(error = %e, "Failed to broadcast button-input");
                                }
                            }
                        }
                        Err(e) => {
                            warn!(error = %e, "Failed to serialize button-input");
                        }
                    }

                    // controller-input メッセージを送信
                    let controller_msg = ControllerInputMessage::new(&input.controller);
                    match serde_json::to_string(&controller_msg) {
                        Ok(json) => {
                            // 接続中のクライアントがいる場合のみブロードキャスト
                            if broadcast_tx.receiver_count() > 0 {
                                debug!(message = %json, "Broadcasting controller-input");
                                if let Err(e) = broadcast_tx.send(json) {
                                    warn!(error = %e, "Failed to broadcast controller-input");
                                }
                            }
                        }
                        Err(e) => {
                            warn!(error = %e, "Failed to serialize controller-input");
                        }
                    }
                }
                Err(err) => {
                    warn!(error = %err, raw_line = %line, "Failed to parse serial line");
                    eprintln!("failed to parse line '{line}': {err}");
                }
            }
        }
    }
}
