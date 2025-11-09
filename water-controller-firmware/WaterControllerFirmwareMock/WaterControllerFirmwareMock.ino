#include <Arduino.h>

// vscode 補助用
#define LED_BUILTIN 2
#define A0 14
#define A1 15

// デジタル I/O ピン設定
// - ボタンモジュール
#define PIN_BUTTON 2
// - joystick モジュール
#define PIN_VRX A0
#define PIN_VRY A1
#define PIN_JSW 3

// データ読み込み用の変数
// - ボタンモジュール
int buttonRaw = 0;
// - joystick モジュール
int joystickButtonRaw = 0;
// - joystick モジュールの x 軸、y 軸の値
int joystickAnalogX = 0;
int joystickAnalogY = 0;

// 定数
constexpr size_t kSensorCount = 8;

// 送信するデータ
int isButtonPushed = 0; // 押していないとき 0、押してるとき 1
int isJoystickButtonPushed = 0; // 押していないとき 0、押してるとき 1
int isPushed = 0;
int sensorValues[kSensorCount] = {0};

void setup() {
  // init
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  // ボタンモジュール
  pinMode(PIN_BUTTON, INPUT_PULLUP);

  // joystick モジュール
  pinMode(PIN_JSW, INPUT_PULLUP); // 未押下=HIGH, 押下=LOW
}

int checkIsButtonPushed(int buttonRaw) {
  // 押してないとき buttonRaw == 1, buttonRaw == HIGH
  return int(buttonRaw == LOW);
}

/**
 * ボタンモジュール、joystick モジュールのボタンの状態を更新
 * どちらかが押されていれば 1、押されていないとき 0 を返す
 */
int updateButtonStatus() {
  // ボタンモジュールの入力の取得
  buttonRaw = digitalRead(PIN_BUTTON);
  isButtonPushed = checkIsButtonPushed(buttonRaw);
  // Serial.println(isButtonPushed);

  // joystick モジュールのボタン入力の取得
  joystickButtonRaw = digitalRead(PIN_JSW);
  isJoystickButtonPushed = checkIsButtonPushed(joystickButtonRaw);
  // Serial.println(isJoystickButtonPushed);

  // ボタン出力はどちらかが押されていれば良い
  isPushed = isButtonPushed || isJoystickButtonPushed;
}

/**
 * joystick モジュールの x 軸、y 軸の値を更新
 */
int updateJoystickStatus() {
  // アナログ値を取得
  joystickAnalogX = analogRead(PIN_VRX);
  joystickAnalogY = analogRead(PIN_VRY);
  // Serial.print("joystickAnalogX: ");
  // Serial.println(joystickAnalogX);
  // Serial.print("joystickAnalogY: ");
  // Serial.println(joystickAnalogY);

  // アナログ値を変換
  /* 変換ルール

  ## アナログ値

  joystickAnalogX: 0 ~ 1023 (0 のとき left 方向、1023 のとき right 方向)
  joystickAnalogY: 0 ~ 1023 (0 のとき front 方向、1023 のとき back 方向)

  ## 変換後

  - X 軸
    - leftHigh：0 <= joystickAnalog <= 255
    - leftLow：256 <= joystickAnalog <= 511
    - rightLow：512 <= joystickAnalog <= 767
    - rightHigh：768 <= joystickAnalog <= 1023

  - Y 軸
    - frontHigh：0 <= joystickAnalog <= 255
    - frontLow：256 <= joystickAnalog <= 511
    - backLow：512 <= joystickAnalog <= 767
    - backHigh：768 <= joystickAnalog <= 1023
  */

  // 順序：frontLow,frontHigh,rightLow,rightHigh,backLow,backHigh,leftLow,leftHigh
  //
  // NOTE: 思ったより joystick モジュールのアナログ値が 0, 1023
  // になるのが早いのでほぼギリギリでやっと high になるようにした
  // ------------------------------------------------------------
  // x 軸
  // ------------------------------------------------------------
  // leftHigh
  sensorValues[7] = joystickAnalogX <= 10 ? 1 : 0;
  // leftLow
  sensorValues[6] = joystickAnalogX <= 480 ? 1 : 0;
  // 中心は 511。幅を持って 440 ~ 580 は center とする。
  // rightLow
  sensorValues[2] = 580 <= joystickAnalogX ? 1 : 0;
  // rightHigh
  sensorValues[3] = 1000 <= joystickAnalogX ? 1 : 0;

  // ------------------------------------------------------------
  // y 軸
  // ------------------------------------------------------------
  // frontHigh
  sensorValues[1] = joystickAnalogY <= 10 ? 1 : 0;
  // frontLow
  sensorValues[0] = joystickAnalogY <= 480 ? 1 : 0;
  // 中心は 511。幅を持って 440 ~ 580 は center とする。
  // backLow
  sensorValues[4] = 580 <= joystickAnalogY ? 1 : 0;
  // backHigh
  sensorValues[5] = 1000 <= joystickAnalogY ? 1 : 0;
}

/**
 * 水コントローラーのシリアル出力を行う関数
 *
 * ## 概要
 *
 * ボタン押下状態と水コントローラーに付けられた前後左右、
 * それぞれ high / low の 2 つずつの静電容量センサーの値 (0 / 1)
 * をカンマ区切りでシリアル・ポートに出力する。
 *
 * ## 送信されてくる文字列の形式
 *
 * ```
 * button,frontLow,frontHigh,rightLow,rightHigh,backLow,backHigh,leftLow,leftHigh\n
 * ```
 *
 * （末尾に改行文字 \n を入れる必要があるので注意）
 */
void serialOut(const int button, const int readings[kSensorCount]) {
  // Serial.println("button,frontLow,frontHigh,rightLow,rightHigh,backLow,"
  //                "backHigh,leftLow,leftHigh");

  // ボタンの入力値をシリアル出力
  Serial.print(button);

  // 水コントローラーの入力方向をシリアル出力
  for (size_t i = 0; i < kSensorCount; i++) {
    Serial.print(',');
    Serial.print(readings[i]);
  }

  Serial.println();
}

void loopTask() {
  // ボタンの状態を取得
  updateButtonStatus();
  updateJoystickStatus();

  // シリアル出力
  serialOut(isPushed, sensorValues);
  delay(100);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  loopTask();
  digitalWrite(LED_BUILTIN, LOW);
}
