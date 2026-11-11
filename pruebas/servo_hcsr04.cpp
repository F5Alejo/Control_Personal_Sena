// PRUEBA DESCARTABLE (no es parte del producto).
// Servo SG90 (GPIO 13) + HC-SR04 (TRIG 5, ECHO 18 con divisor) + LCD (21/22).
//
// 1) Al arrancar, el servo hace un barrido 0 -> 90 -> 0 para comprobar el movimiento.
// 2) Luego: si el HC-SR04 mide menos de 15 cm, el servo sube a 90 (barrera abierta);
//    si mide mas de 20 cm, vuelve a 0 (barrera cerrada).
// 3) La LCD muestra la distancia y el angulo; el monitor serial tambien.
//
// Uso: pio run -e prueba_servo -t upload && pio device monitor
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>

const int PIN_SERVO = 13;
const int PIN_TRIG = 5;
const int PIN_ECHO = 18;
const int SDA_LCD = 21;
const int SCL_LCD = 22;

const int ANGULO_CERRADA = 0;
const int ANGULO_ABIERTA = 90;
const float UMBRAL_ABRIR_CM = 15.0;
const float UMBRAL_CERRAR_CM = 20.0; // histeresis para que no tiemble

const unsigned long TIMEOUT_ECO_US = 30000;

LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo servo;
int anguloActual = ANGULO_CERRADA;

// Devuelve la distancia en cm, o -1 si no hay eco.
float medirDistanciaCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long duracion = pulseIn(PIN_ECHO, HIGH, TIMEOUT_ECO_US);
  if (duracion == 0) return -1;
  return duracion * 0.0343 / 2.0;
}

void moverServo(int angulo) {
  anguloActual = angulo;
  servo.write(angulo);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  Wire.begin(SDA_LCD, SCL_LCD);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("Prueba servo");
  lcd.setCursor(0, 1);
  lcd.print("y HC-SR04");

  servo.setPeriodHertz(50);
  servo.attach(PIN_SERVO, 500, 2400);

  Serial.println("Barrido de prueba del servo...");
  moverServo(ANGULO_CERRADA);
  delay(800);
  moverServo(ANGULO_ABIERTA);
  delay(1000);
  moverServo(ANGULO_CERRADA);
  delay(800);
  Serial.println("Listo. Acerca la mano al HC-SR04.");
}

void loop() {
  float d = medirDistanciaCm();

  if (d > 0 && d < UMBRAL_ABRIR_CM && anguloActual != ANGULO_ABIERTA) {
    moverServo(ANGULO_ABIERTA);
  } else if ((d < 0 || d > UMBRAL_CERRAR_CM) && anguloActual != ANGULO_CERRADA) {
    moverServo(ANGULO_CERRADA);
  }

  lcd.setCursor(0, 0);
  if (d < 0) {
    lcd.print("Dist: sin eco   ");
  } else {
    char linea[17];
    snprintf(linea, sizeof(linea), "Dist: %5.1f cm  ", d);
    lcd.print(linea);
  }
  char linea2[17];
  snprintf(linea2, sizeof(linea2), "Servo: %3d grad ", anguloActual);
  lcd.setCursor(0, 1);
  lcd.print(linea2);

  if (d < 0) Serial.printf("Distancia: sin eco | Servo: %d\n", anguloActual);
  else Serial.printf("Distancia: %.1f cm | Servo: %d\n", d, anguloActual);

  delay(200);
}
