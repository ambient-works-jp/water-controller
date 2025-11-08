use std::{
    io::{self, Read},
    time::Duration,
};

use serialport::SerialPort;

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
}
