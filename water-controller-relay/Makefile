# constants

SERIAL_PORT := "/dev/cu.usbmodem2101"
BAUD_RATE := 115200
WS_HOST := "127.0.0.1"
WS_PORT := 8080
LOG_LEVEL := debug

run-server:
	cargo run --bin server -- --port $(SERIAL_PORT) --baud-rate $(BAUD_RATE) --ws-host $(WS_HOST) --ws-port $(WS_PORT) --log-level $(LOG_LEVEL)

run-client:
	cargo run --bin client -- --url "ws://$(WS_HOST):$(WS_PORT)/ws"
