use std::{io, time::Duration};

use tracing::{debug, info, warn};

use crate::serial::{SerialReader, input::parse_input_line};

const READ_TIMEOUT_MS: u64 = 100;

pub fn run_loop(port_name: &str, baud_rate: u32) -> io::Result<()> {
    info!(port = port_name, baud = baud_rate, "Opening serial port");
    let timeout = Duration::from_millis(READ_TIMEOUT_MS);
    let mut reader = SerialReader::open(port_name, baud_rate, timeout)?;
    info!(port = port_name, "Serial port ready; entering read loop");

    loop {
        let line = reader.read_line()?;
        debug!(%line, "Received raw serial line");
        match parse_input_line(&line) {
            Ok(input) => {
                debug!(input = %input, "Parsed input successfully");
                info!("{input}");
            }
            Err(err) => {
                warn!(error = %err, raw_line = %line, "Failed to parse serial line");
                eprintln!("failed to parse line '{line}': {err}");
            }
        }
    }
}
