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
constexpr size_t kSensorCount = 12;

// Joystick しきい値パラメータ（調整可能）
// X軸（左右）のしきい値
constexpr int kLeftHighThreshold = 10;      // 0 <= x <= 10: leftHigh
constexpr int kLeftMiddleThreshold = 341;   // 11 <= x <= 341: leftMiddle
constexpr int kLeftLowThreshold = 480;      // 342 <= x <= 480: leftLow
constexpr int kCenterMin = 481;             // 481 <= x <= 580: center (no input)
constexpr int kCenterMax = 580;
constexpr int kRightLowThreshold = 681;     // 581 <= x <= 681: rightLow
constexpr int kRightMiddleThreshold = 1000; // 682 <= x <= 1000: rightMiddle
// 1001 <= x <= 1023: rightHigh

// Y軸（前後）のしきい値
constexpr int kFrontHighThreshold = 10;      // 0 <= y <= 10: frontHigh
constexpr int kFrontMiddleThreshold = 341;   // 11 <= y <= 341: frontMiddle
constexpr int kFrontLowThreshold = 480;      // 342 <= y <= 480: frontLow
// 481 <= y <= 580: center (no input) - X軸と共通
constexpr int kBackLowThreshold = 681;       // 581 <= y <= 681: backLow
constexpr int kBackMiddleThreshold = 1000;   // 682 <= y <= 1000: backMiddle
// 1001 <= y <= 1023: backHigh

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

  // アナログ値を変換（3段階：Low/Middle/High）
  /* 変換ルール

  ## アナログ値

  joystickAnalogX: 0 ~ 1023 (0 のとき left 方向、1023 のとき right 方向)
  joystickAnalogY: 0 ~ 1023 (0 のとき front 方向、1023 のとき back 方向)

  ## 変換後（3段階）

  - X 軸（左右）
    - leftHigh：0 <= x <= kLeftHighThreshold (10)
    - leftMiddle：kLeftHighThreshold < x <= kLeftMiddleThreshold (341)
    - leftLow：kLeftMiddleThreshold < x <= kLeftLowThreshold (480)
    - center (no input)：kCenterMin <= x <= kCenterMax (481-580)
    - rightLow：kCenterMax < x <= kRightLowThreshold (681)
    - rightMiddle：kRightLowThreshold < x <= kRightMiddleThreshold (1000)
    - rightHigh：kRightMiddleThreshold < x <= 1023

  - Y 軸（前後）
    - frontHigh：0 <= y <= kFrontHighThreshold (10)
    - frontMiddle：kFrontHighThreshold < y <= kFrontMiddleThreshold (341)
    - frontLow：kFrontMiddleThreshold < y <= kFrontLowThreshold (480)
    - center (no input)：kCenterMin <= y <= kCenterMax (481-580)
    - backLow：kCenterMax < y <= kBackLowThreshold (681)
    - backMiddle：kBackLowThreshold < y <= kBackMiddleThreshold (1000)
    - backHigh：kBackMiddleThreshold < y <= 1023
  */

  // 順序：frontLow,frontMiddle,frontHigh,rightLow,rightMiddle,rightHigh,backLow,backMiddle,backHigh,leftLow,leftMiddle,leftHigh
  //
  // NOTE: 思ったより joystick モジュールのアナログ値が 0, 1023
  // になるのが早いのでほぼギリギリでやっと high になるようにした

  // インデックス定義（可読性向上）
  const int kFrontLowIdx = 0;
  const int kFrontMiddleIdx = 1;
  const int kFrontHighIdx = 2;
  const int kRightLowIdx = 3;
  const int kRightMiddleIdx = 4;
  const int kRightHighIdx = 5;
  const int kBackLowIdx = 6;
  const int kBackMiddleIdx = 7;
  const int kBackHighIdx = 8;
  const int kLeftLowIdx = 9;
  const int kLeftMiddleIdx = 10;
  const int kLeftHighIdx = 11;

  // ------------------------------------------------------------
  // Y 軸（前後）
  // ------------------------------------------------------------
  // frontHigh
  sensorValues[kFrontHighIdx] = (joystickAnalogY <= kFrontHighThreshold) ? 1 : 0;
  // frontMiddle
  sensorValues[kFrontMiddleIdx] = (joystickAnalogY <= kFrontMiddleThreshold) ? 1 : 0;
  // frontLow
  sensorValues[kFrontLowIdx] = (joystickAnalogY <= kFrontLowThreshold) ? 1 : 0;

  // backLow
  sensorValues[kBackLowIdx] = (joystickAnalogY > kCenterMax && joystickAnalogY <= kBackLowThreshold) ? 1 : 0;
  // backMiddle
  sensorValues[kBackMiddleIdx] = (joystickAnalogY > kCenterMax && joystickAnalogY <= kBackMiddleThreshold) ? 1 : 0;
  // backHigh
  sensorValues[kBackHighIdx] = (joystickAnalogY > kBackMiddleThreshold) ? 1 : 0;

  // ------------------------------------------------------------
  // X 軸（左右）
  // ------------------------------------------------------------
  // leftHigh
  sensorValues[kLeftHighIdx] = (joystickAnalogX <= kLeftHighThreshold) ? 1 : 0;
  // leftMiddle
  sensorValues[kLeftMiddleIdx] = (joystickAnalogX <= kLeftMiddleThreshold) ? 1 : 0;
  // leftLow
  sensorValues[kLeftLowIdx] = (joystickAnalogX <= kLeftLowThreshold) ? 1 : 0;

  // rightLow
  sensorValues[kRightLowIdx] = (joystickAnalogX > kCenterMax && joystickAnalogX <= kRightLowThreshold) ? 1 : 0;
  // rightMiddle
  sensorValues[kRightMiddleIdx] = (joystickAnalogX > kCenterMax && joystickAnalogX <= kRightMiddleThreshold) ? 1 : 0;
  // rightHigh
  sensorValues[kRightHighIdx] = (joystickAnalogX > kRightMiddleThreshold) ? 1 : 0;
}

/**
 * 水コントローラーのシリアル出力を行う関数
 *
 * ## 概要
 *
 * ボタン押下状態と水コントローラーに付けられた前後左右、
 * それぞれ high / middle / low の 3 つずつの静電容量センサーの値 (0 / 1)
 * をカンマ区切りでシリアル・ポートに出力する。
 *
 * ## 送信されてくる文字列の形式
 *
 * ```
 * button,frontLow,frontMiddle,frontHigh,rightLow,rightMiddle,rightHigh,backLow,backMiddle,backHigh,leftLow,leftMiddle,leftHigh\n
 * ```
 *
 * （末尾に改行文字 \n を入れる必要があるので注意）
 */
void serialOut(const int button, const int readings[kSensorCount]) {
  // Serial.println("button,frontLow,frontMiddle,frontHigh,rightLow,rightMiddle,rightHigh,"
  //                "backLow,backMiddle,backHigh,leftLow,leftMiddle,leftHigh");

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
