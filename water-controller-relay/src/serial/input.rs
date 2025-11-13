use std::{error::Error, fmt, io, num::ParseIntError};

use serde::Serialize;

const FIELD_COUNT: usize = 9;

pub fn list_serial_devices() -> io::Result<()> {
    println!("Listing available serial ports:");
    let ports = serialport::available_ports().map_err(io::Error::other)?;

    if ports.is_empty() {
        println!("No serial ports detected");
        println!("(ポートが見つかりません)");
    } else {
        for p in ports {
            println!("name: {}, type={:?}", p.port_name, p.port_type);
        }
    }

    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialInput {
    pub button: ButtonInput,
    pub controller: ControllerInput,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ButtonInput {
    pub is_pushed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ControllerInput {
    pub left: ControllerValue,
    pub right: ControllerValue,
    pub up: ControllerValue,
    pub down: ControllerValue,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(untagged)]
pub enum ControllerValue {
    Noinput(i32),
    Low(i32),
    High(i32),
}

#[derive(Debug)]
pub enum ParseInputError {
    FieldCount {
        expected: usize,
        actual: usize,
    },
    ParseInt {
        index: usize,
        value: String,
        source: ParseIntError,
    },
    InvalidButtonValue(i32),
    InvalidControllerValue {
        index: usize,
        value: i32,
    },
    InvalidControllerCombination {
        low_index: usize,
        high_index: usize,
        low_value: i32,
        high_value: i32,
    },
}

impl fmt::Display for ParseInputError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FieldCount { expected, actual } => {
                write!(f, "expected {expected} fields but got {actual}")
            }
            Self::ParseInt {
                index,
                value,
                source,
            } => {
                write!(f, "failed to parse field #{index} ('{value}'): {source}")
            }
            Self::InvalidButtonValue(value) => {
                write!(f, "invalid button value: {value} (expected 0 or 1)")
            }
            Self::InvalidControllerValue { index, value } => {
                write!(
                    f,
                    "invalid controller field #{index} value: {value} (expected 0 or 1)"
                )
            }
            Self::InvalidControllerCombination {
                low_index,
                high_index,
                low_value,
                high_value,
            } => {
                write!(
                    f,
                    "invalid controller combination (field #{low_index}={low_value}, field #{high_index}={high_value}): high=1 requires low=1"
                )
            }
        }
    }
}

impl Error for ParseInputError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::ParseInt { source, .. } => Some(source),
            _ => None,
        }
    }
}

pub fn parse_input_line(line: &str) -> Result<SerialInput, ParseInputError> {
    // 余分な空白や改行を取り除き、空行であれば即エラー
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return Err(ParseInputError::FieldCount {
            expected: FIELD_COUNT,
            actual: 0,
        });
    }

    // CSV が 9 フィールド揃っているかを確認
    let tokens: Vec<&str> = trimmed.split(',').collect();
    if tokens.len() != FIELD_COUNT {
        return Err(ParseInputError::FieldCount {
            expected: FIELD_COUNT,
            actual: tokens.len(),
        });
    }

    // 各フィールドを i32 に変換し、センサー値は 0/1 以外を弾く
    let mut values = [0i32; FIELD_COUNT];
    for (idx, token) in tokens.iter().enumerate() {
        let value = token
            .trim()
            .parse::<i32>()
            .map_err(|source| ParseInputError::ParseInt {
                index: idx,
                value: token.trim().to_string(),
                source,
            })?;

        if idx > 0 {
            ensure_binary_controller_value(value, idx)?;
        }
        values[idx] = value;
    }

    // button フィールド (0/1) を bool に変換
    let button = parse_button(values[0])?;

    // front/right/back/left それぞれの Low/High ペアを評価
    let controller = ControllerInput {
        up: controller_value_from_pair(values[1], values[2], 1, 2)?,
        right: controller_value_from_pair(values[3], values[4], 3, 4)?,
        down: controller_value_from_pair(values[5], values[6], 5, 6)?,
        left: controller_value_from_pair(values[7], values[8], 7, 8)?,
    };

    Ok(SerialInput { button, controller })
}

fn parse_button(value: i32) -> Result<ButtonInput, ParseInputError> {
    match value {
        0 => Ok(ButtonInput { is_pushed: false }),
        1 => Ok(ButtonInput { is_pushed: true }),
        other => Err(ParseInputError::InvalidButtonValue(other)),
    }
}

fn ensure_binary_controller_value(value: i32, index: usize) -> Result<(), ParseInputError> {
    match value {
        0 | 1 => Ok(()),
        other => Err(ParseInputError::InvalidControllerValue {
            index,
            value: other,
        }),
    }
}

fn controller_value_from_pair(
    low: i32,
    high: i32,
    low_index: usize,
    high_index: usize,
) -> Result<ControllerValue, ParseInputError> {
    // High が 1 なら Low も 1 である必要がある
    if high == 1 && low == 0 {
        return Err(ParseInputError::InvalidControllerCombination {
            low_index,
            high_index,
            low_value: low,
            high_value: high,
        });
    }

    // High が優先、次いで Low、両方 0 で Noinput
    let value = if high > 0 {
        ControllerValue::High(high)
    } else if low > 0 {
        ControllerValue::Low(low)
    } else {
        ControllerValue::Noinput(0)
    };

    Ok(value)
}

impl fmt::Display for SerialInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Input {{ button: {}, controller: left={}, right={}, up={}, down={} }}",
            self.button,
            self.controller.left,
            self.controller.right,
            self.controller.up,
            self.controller.down
        )
    }
}

impl fmt::Display for ButtonInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "is_pushed={}", self.is_pushed)
    }
}

impl fmt::Display for ControllerInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "ControllerInput {{ left: {}, right: {}, up: {}, down: {} }}",
            self.left, self.right, self.up, self.down
        )
    }
}

impl fmt::Display for ControllerValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ControllerValue::Noinput(val) => write!(f, "Noinput({val})"),
            ControllerValue::Low(val) => write!(f, "Low({val})"),
            ControllerValue::High(val) => write!(f, "High({val})"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_zero_line() {
        /* case
        button: 0
        frontLow/frontHigh/rightLow/rightHigh/backLow/backHigh/leftLow/leftHigh: 全て 0
        */
        let line = "0,0,0,0,0,0,0,0,0";
        let input = parse_input_line(line).unwrap();

        assert!(!input.button.is_pushed);
        assert_eq!(input.controller.up, ControllerValue::Noinput(0));
        assert_eq!(input.controller.right, ControllerValue::Noinput(0));
        assert_eq!(input.controller.down, ControllerValue::Noinput(0));
        assert_eq!(input.controller.left, ControllerValue::Noinput(0));
    }

    #[test]
    fn parse_mixed_levels() {
        /* case
        button: 1
        front: low=1, high=0
        right: low=1, high=1
        back: low=1, high=0
        left: low=1, high=1
        */
        let line = "1,1,0,1,1,1,0,1,1";
        let input = parse_input_line(line).unwrap();

        assert!(input.button.is_pushed);
        assert_eq!(input.controller.up, ControllerValue::Low(1));
        assert_eq!(input.controller.right, ControllerValue::High(1));
        assert_eq!(input.controller.down, ControllerValue::Low(1));
        assert_eq!(input.controller.left, ControllerValue::High(1));
    }

    #[test]
    fn invalid_button_value_rejected() {
        /* case
        button: 2 (不正値)
        */
        let line = "2,0,0,0,0,0,0,0,0";
        let err = parse_input_line(line).unwrap_err();
        match err {
            ParseInputError::InvalidButtonValue(value) => assert_eq!(value, 2),
            other => panic!("unexpected error: {other}"),
        }
    }

    #[test]
    fn invalid_field_count() {
        /* case
        フィールド数が 3 つしかない
        */
        let line = "0,0,0";
        let err = parse_input_line(line).unwrap_err();
        match err {
            ParseInputError::FieldCount { expected, actual } => {
                assert_eq!(expected, FIELD_COUNT);
                assert_eq!(actual, 3);
            }
            other => panic!("unexpected error variant: {other}"),
        }
    }

    #[test]
    fn invalid_controller_value_is_rejected() {
        /* case
        rightHigh: 2 (0/1 以外)
        */
        let line = "0,0,0,0,2,0,0,0,0";
        let err = parse_input_line(line).unwrap_err();
        match err {
            ParseInputError::InvalidControllerValue { index, value } => {
                assert_eq!(index, 4);
                assert_eq!(value, 2);
            }
            other => panic!("unexpected error variant: {other}"),
        }
    }

    #[test]
    fn invalid_controller_combination_is_rejected() {
        /* case
        right: low=0, high=1 (High だけ 1)
        */
        let line = "0,0,0,0,1,0,0,0,0";
        let err = parse_input_line(line).unwrap_err();
        match err {
            ParseInputError::InvalidControllerCombination {
                low_index,
                high_index,
                low_value,
                high_value,
            } => {
                assert_eq!(low_index, 3);
                assert_eq!(high_index, 4);
                assert_eq!(low_value, 0);
                assert_eq!(high_value, 1);
            }
            other => panic!("unexpected error variant: {other}"),
        }
    }
}
