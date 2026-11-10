#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define ANCHO 128
#define ALTO 64

#define SDA_PIN 21
#define SCL_PIN 22

Adafruit_SSD1306 pantalla(ANCHO, ALTO, &Wire, -1);

/*
 * Letras "FI" cuadradas dibujadas con lineas (drawLine).
 * Pantalla: x de 0 a 127 (izquierda -> derecha), y de 0 a 63 (arriba -> abajo).
 * Cada letra es un contorno: se une cada punto con el siguiente.
 *
 *   F: x 33..61   I: x 71..95   alto: y 12..52   grosor del trazo: 8 px
 */

void dibujarF() {
  pantalla.drawLine(33, 12, 61, 12, SSD1306_WHITE); // P1 -> P2   borde de arriba
  pantalla.drawLine(61, 12, 61, 20, SSD1306_WHITE); // P2 -> P3   punta barra de arriba
  pantalla.drawLine(61, 20, 41, 20, SSD1306_WHITE); // P3 -> P4   debajo barra de arriba
  pantalla.drawLine(41, 20, 41, 28, SSD1306_WHITE); // P4 -> P5   hueco entre barras
  pantalla.drawLine(41, 28, 55, 28, SSD1306_WHITE); // P5 -> P6   encima barra del medio
  pantalla.drawLine(55, 28, 55, 36, SSD1306_WHITE); // P6 -> P7   punta barra del medio
  pantalla.drawLine(55, 36, 41, 36, SSD1306_WHITE); // P7 -> P8   debajo barra del medio
  pantalla.drawLine(41, 36, 41, 52, SSD1306_WHITE); // P8 -> P9   palo, lado derecho
  pantalla.drawLine(41, 52, 33, 52, SSD1306_WHITE); // P9 -> P10  pie del palo
  pantalla.drawLine(33, 52, 33, 12, SSD1306_WHITE); // P10 -> P1  palo, lado izquierdo
}

void dibujarI() {
  pantalla.drawLine(71, 12, 95, 12, SSD1306_WHITE); // Q1 -> Q2    borde de arriba
  pantalla.drawLine(95, 12, 95, 20, SSD1306_WHITE); // Q2 -> Q3    punta derecha arriba
  pantalla.drawLine(95, 20, 87, 20, SSD1306_WHITE); // Q3 -> Q4    debajo barra de arriba
  pantalla.drawLine(87, 20, 87, 44, SSD1306_WHITE); // Q4 -> Q5    palo, lado derecho
  pantalla.drawLine(87, 44, 95, 44, SSD1306_WHITE); // Q5 -> Q6    encima barra de abajo
  pantalla.drawLine(95, 44, 95, 52, SSD1306_WHITE); // Q6 -> Q7    punta derecha abajo
  pantalla.drawLine(95, 52, 71, 52, SSD1306_WHITE); // Q7 -> Q8    borde de abajo
  pantalla.drawLine(71, 52, 71, 44, SSD1306_WHITE); // Q8 -> Q9    punta izquierda abajo
  pantalla.drawLine(71, 44, 79, 44, SSD1306_WHITE); // Q9 -> Q10   encima barra de abajo
  pantalla.drawLine(79, 44, 79, 20, SSD1306_WHITE); // Q10 -> Q11  palo, lado izquierdo
  pantalla.drawLine(79, 20, 71, 20, SSD1306_WHITE); // Q11 -> Q12  debajo barra de arriba
  pantalla.drawLine(71, 20, 71, 12, SSD1306_WHITE); // Q12 -> Q1   punta izquierda arriba
}

void setup() {
  Serial.begin(115200);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!pantalla.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Error al iniciar OLED");
    while (true);
  }

  pantalla.clearDisplay();

  dibujarF();
  dibujarI();

  pantalla.display();
}

void loop() {
}
