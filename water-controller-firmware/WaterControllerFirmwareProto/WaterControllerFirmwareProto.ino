// topper さんからもらったプロトタイプのファームウェア
#include "Adafruit_MPR121.h"
#include <Wire.h>

#ifndef _BV
#define _BV(bit) (1 << (bit))
#endif

Adafruit_MPR121 cap = Adafruit_MPR121();

uint16_t lasttouched = 0;
uint16_t currtouched = 0;
bool sentTriger = false;
int sentList[8];

void setup() {
  Serial.begin(115200);
  Wire.begin(19, 21);

  for (int i = 0; i < 8; i++) {
    sentList[i] = 0;
  }

  while (!Serial) {
    delay(10);
  }

  Serial.println("Adafruit MPR121 Capacitive Touch sensor test");

  if (!cap.begin(0x5A)) {
    Serial.println("MPR121 not found, check wiring?");
    while (1)
      ;
  }
  Serial.println("MPR121 found!");
}

void loop() {
  currtouched = cap.touched();

  for (uint8_t i = 2; i < 10; i++) {

    if ((currtouched & _BV(i)) && !(lasttouched & _BV(i))) {
      Serial.print(i);
      Serial.println(" touched");
      sentTriger = true;
      sentList[i - 2] = 1;
    }

    if (!(currtouched & _BV(i)) && (lasttouched & _BV(i))) {
      Serial.print(i);
      Serial.println(" released");
      sentTriger = true;
      sentList[i - 2] = 0;
    }
  }

  if (sentTriger) {
    for (int i = 0; i < 8; i++) {
      Serial.print(sentList[i]);
      if (i < 7)
        Serial.print(",");
    }
  }
  Serial.println("");
  sentTriger = false;
  lasttouched = currtouched;

  return;

  delay(100);
}
