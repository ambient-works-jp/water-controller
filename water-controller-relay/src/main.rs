mod args;
mod logger;
mod relay;
mod serial;

use std::io;

use tracing::info;

use args::{Operation, parse_args};
use logger::logger_init;
use relay::run_loop;
use serial::input::list_serial_devices;

fn main() -> io::Result<()> {
    let parsed = parse_args();
    logger_init(parsed.log_level)?;
    info!(level = %parsed.log_level, "water-controller-relay starting");

    match parsed.operation {
        Operation::DeviceList => {
            list_serial_devices()?;
            Ok(())
        }
        Operation::Run { port, baud } => run_loop(&port, baud),
    }
}
