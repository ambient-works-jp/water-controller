use std::io;

use tracing::Level;

pub fn logger_init(level: Level) -> io::Result<()> {
    let subscriber = tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(true)
        .with_thread_ids(true)
        .with_thread_names(true)
        .with_file(true)
        .with_line_number(true)
        .finish();

    tracing::subscriber::set_global_default(subscriber).map_err(io::Error::other)
}
