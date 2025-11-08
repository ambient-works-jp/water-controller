#include <Arduino.h>

constexpr size_t kSensorCount = 8;

// 送信するデータ
int pushed = 0;
int sensorValues[kSensorCount] = {0};

void serialOut(const int button, const int readings[kSensorCount]) {
  // docs/tasks/20251109-task.md に定義された CSV フォーマットで出力する
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
}

void loop() {
  serialOut(pushed, sensorValues);
  delay(1000);
}
