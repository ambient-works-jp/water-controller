use std::io;

use tracing::Level;

pub fn logger_init(level: Level) -> io::Result<()> {
    let subscriber = tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(false)
        .finish();

    tracing::subscriber::set_global_default(subscriber).map_err(io::Error::other)
}
