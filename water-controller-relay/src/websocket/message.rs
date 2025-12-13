//! WebSocket メッセージの DTO 定義

use serde::Serialize;

use crate::serial::input::{ButtonInput, ControllerInput, ControllerValue};

/// button-input メッセージ
///
/// ## JSON 出力例
///
/// ```json
/// {
///   "type": "button-input",
///   "isPushed": true
/// }
/// ```
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ButtonInputMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    pub is_pushed: bool,
}

impl ButtonInputMessage {
    pub fn new(button: &ButtonInput) -> Self {
        Self {
            message_type: "button-input".to_string(),
            is_pushed: button.is_pushed,
        }
    }
}

/// controller-input メッセージ
///
/// ## JSON 出力例
///
/// ```json
/// {
///   "type": "controller-input",
///   "left": 0,
///   "right": 1,
///   "up": 3,
///   "down": 2
/// }
/// ```
///
/// 値の意味:
/// - 0: Noinput (入力なし)
/// - 1: Low (低レベル入力)
/// - 2: Middle (中レベル入力)
/// - 3: High (高レベル入力)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ControllerInputMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    pub left: i32,
    pub right: i32,
    pub up: i32,
    pub down: i32,
}

impl ControllerInputMessage {
    pub fn new(controller: &ControllerInput) -> Self {
        Self {
            message_type: "controller-input".to_string(),
            left: Self::value_to_int(&controller.left),
            right: Self::value_to_int(&controller.right),
            up: Self::value_to_int(&controller.up),
            down: Self::value_to_int(&controller.down),
        }
    }

    fn value_to_int(value: &ControllerValue) -> i32 {
        match value {
            ControllerValue::Noinput(_) => 0,
            ControllerValue::Low(_) => 1,
            ControllerValue::Middle(_) => 2,
            ControllerValue::High(_) => 3,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::serial::input::ControllerValue;

    #[test]
    fn test_button_input_message_serialization() {
        // テスト項目: ButtonInputMessage が正しく JSON にシリアライズされる
        // given (前提条件):
        let button = ButtonInput { is_pushed: true };

        // when (操作):
        let message = ButtonInputMessage::new(&button);
        let json = serde_json::to_string(&message).unwrap();

        // then (期待する結果):
        assert_eq!(json, r#"{"type":"button-input","isPushed":true}"#);
    }

    #[test]
    fn test_controller_input_message_serialization() {
        // テスト項目: ControllerInputMessage が正しく JSON にシリアライズされる
        // given (前提条件):
        let controller = ControllerInput {
            left: ControllerValue::Noinput(0),
            right: ControllerValue::Low(1),
            up: ControllerValue::High(1),
            down: ControllerValue::Middle(1),
        };

        // when (操作):
        let message = ControllerInputMessage::new(&controller);
        let json = serde_json::to_string(&message).unwrap();

        // then (期待する結果):
        assert_eq!(
            json,
            r#"{"type":"controller-input","left":0,"right":1,"up":3,"down":2}"#
        );
    }

    #[test]
    fn test_controller_value_to_int_conversion() {
        // テスト項目: ControllerValue が正しく整数に変換される
        // given (前提条件):
        let noinput = ControllerValue::Noinput(0);
        let low = ControllerValue::Low(1);
        let middle = ControllerValue::Middle(1);
        let high = ControllerValue::High(1);

        // when (操作):
        let noinput_int = ControllerInputMessage::value_to_int(&noinput);
        let low_int = ControllerInputMessage::value_to_int(&low);
        let middle_int = ControllerInputMessage::value_to_int(&middle);
        let high_int = ControllerInputMessage::value_to_int(&high);

        // then (期待する結果):
        assert_eq!(noinput_int, 0);
        assert_eq!(low_int, 1);
        assert_eq!(middle_int, 2);
        assert_eq!(high_int, 3);
    }
}
