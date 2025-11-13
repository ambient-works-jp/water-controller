use clap::{Parser, Subcommand, ValueEnum};
use tracing::Level;

pub const DEFAULT_SERIAL_PORT: &str = "/dev/cu.usbmodem1101";
pub const DEFAULT_BAUD_RATE: u32 = 115_200;
pub const DEFAULT_WS_HOST: &str = "127.0.0.1";
pub const DEFAULT_WS_PORT: u16 = 8080;

#[derive(Parser)]
#[command(author, version, about = "Relay Arduino sensor data to stdout", long_about = None)]
struct CliArgs {
    #[command(subcommand)]
    command: Option<Command>,

    /// シリアルポートのパス（例: /dev/tty.usbserial-XXXXX）
    #[arg(short = 'p', long = "port", value_name = "SERIAL_PORT", default_value = DEFAULT_SERIAL_PORT)]
    port: Option<String>,

    /// ボーレート。省略時は 115200。
    #[arg(short = 'b', long = "baud-rate", value_name = "BAUD_RATE", default_value_t = DEFAULT_BAUD_RATE)]
    baud: u32,

    /// WebSocket サーバのホストアドレス
    #[arg(long = "ws-host", value_name = "WS_HOST", default_value = DEFAULT_WS_HOST)]
    ws_host: String,

    /// WebSocket サーバのポート番号
    #[arg(long = "ws-port", value_name = "WS_PORT", default_value_t = DEFAULT_WS_PORT)]
    ws_port: u16,

    /// ログレベル（trace/debug/info/warn/error）。
    #[arg(short = 'l', long = "log-level", value_enum, default_value_t = LogLevel::Info)]
    log_level: LogLevel,
}

#[derive(Subcommand)]
enum Command {
    /// 接続可能なシリアルポートを列挙する
    #[command(name = "device-list")]
    DeviceList,
}

#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

pub enum Operation {
    Run {
        port: String,
        baud: u32,
        ws_host: String,
        ws_port: u16,
    },
    DeviceList,
}

pub struct ParsedArgs {
    pub operation: Operation,
    pub log_level: Level,
}

pub fn parse_args() -> ParsedArgs {
    let args = CliArgs::parse();
    let operation = match args.command {
        Some(Command::DeviceList) => Operation::DeviceList,
        None => Operation::Run {
            port: args
                .port
                .expect("clap ensures SERIAL_PORT is provided when no subcommand is used"),
            baud: args.baud,
            ws_host: args.ws_host,
            ws_port: args.ws_port,
        },
    };

    ParsedArgs {
        operation,
        log_level: args.log_level.into(),
    }
}

impl From<LogLevel> for Level {
    fn from(level: LogLevel) -> Self {
        match level {
            LogLevel::Trace => Level::TRACE,
            LogLevel::Debug => Level::DEBUG,
            LogLevel::Info => Level::INFO,
            LogLevel::Warn => Level::WARN,
            LogLevel::Error => Level::ERROR,
        }
    }
}
