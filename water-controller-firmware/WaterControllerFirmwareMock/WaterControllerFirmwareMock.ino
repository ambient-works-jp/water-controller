#include <Arduino.h>

// vscode 補助用
#define LED_BUILTIN 2

// デジタル I/O ピン設定
// - ボタンモジュール
#define PIN_BUTTON 2
// - joystick モジュール
#define PIN_VRX A0
#define PIN_VRY A1
#define PIN_JSW 3

// データ読み込み用の変数
int buttonRaw = 0;
int joystickButtonRaw = 0;

// 定数
constexpr size_t kSensorCount = 8;

// 送信するデータ
int isButtonPushed = 0; // 押していないとき 0、押してるとき 1
int isJoystickButtonPushed = 0; // 押していないとき 0、押してるとき 1
int isPushed = 0;
int sensorValues[kSensorCount] = {0};

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
  // ボタン入力
  Serial.print(button);

  for (size_t i = 0; i < kSensorCount; i++) {
    Serial.print(',');
    Serial.print(readings[i]);
  }

  Serial.println();
}

void setup() {
  // init
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  // ボタンモジュール
  pinMode(PIN_BUTTON, INPUT_PULLUP);

  // joystick モジュール
  pinMode(PIN_JSW, INPUT_PULLUP);  // 未押下=HIGH, 押下=LOW
}

int checkIsButtonPushed(int buttonRaw) {
  // 押してないとき buttonRaw == 1, buttonRaw == HIGH
  return int(buttonRaw == LOW);
}

int getButtonStatus() {
  // ボタンモジュールの入力の取得
  buttonRaw = digitalRead(PIN_BUTTON);
  isButtonPushed = checkIsButtonPushed(buttonRaw);
  // Serial.println(isButtonPushed);

  // joystick モジュールのボタン入力の取得
  joystickButtonRaw = digitalRead(PIN_JSW);
  isJoystickButtonPushed = checkIsButtonPushed(joystickButtonRaw);
  // Serial.println(isJoystickButtonPushed);

  // ボタン出力はどちらかが押されていれば良い
  return isButtonPushed || isJoystickButtonPushed;
}

void loopTask() {
  // ボタンの状態を取得
  isPushed = getButtonStatus();

  // シリアル出力
  serialOut(isPushed, sensorValues);
  delay(100);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  loopTask();
  digitalWrite(LED_BUILTIN, LOW);
}
