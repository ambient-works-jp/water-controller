use std::io;

use tracing::info;
use water_controller_relay::{
    args::{Operation, parse_args},
    logger::logger_init,
    relay::run_loop,
    serial::input::list_serial_devices,
};

#[tokio::main]
async fn main() -> io::Result<()> {
    let parsed = parse_args();
    logger_init(parsed.log_level)?;
    info!(level = %parsed.log_level, "water-controller-relay starting");

    match parsed.operation {
        Operation::DeviceList => {
            list_serial_devices()?;
            Ok(())
        }
        Operation::Run {
            port,
            baud,
            ws_host,
            ws_port,
        } => run_loop(&port, baud, &ws_host, ws_port).await,
    }
}
