#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Configuracion de la pantalla LCD
const int SDA_LCD = 21;
const int SCL_LCD = 22;
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Sensor FC-28 / YL-69
const int pinHumedad = 34;

// Valores iniciales de calibracion.
// Debes ajustarlos con las lecturas de tu sensor.
const int VALOR_SECO = 3200;
const int VALOR_HUMEDO = 1400;

int lecturaADC = 0;
int humedad = 0;

unsigned long tiempoAnterior = 0;
const unsigned long intervalo = 1000;

void setup() {
  Serial.begin(115200);

  // Inicializar comunicacion I2C
  Wire.begin(SDA_LCD, SCL_LCD);

  // Inicializar LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Configurar ADC del ESP32
  analogReadResolution(12);

  lcd.setCursor(0, 0);
  lcd.print("Sensor humedad");
  lcd.setCursor(0, 1);
  lcd.print("FC-28 / YL-69");

  Serial.println("Prueba FC-28 / YL-69");
  Serial.println("--------------------");

  delay(2000);
  lcd.clear();
}

void loop() {
  unsigned long ahora = millis();

  if (ahora - tiempoAnterior >= intervalo) {
    tiempoAnterior = ahora;

    // Promediar varias lecturas para reducir ruido
    long suma = 0;

    for (int i = 0; i < 10; i++) {
      suma += analogRead(pinHumedad);
      delay(10);
    }

    lecturaADC = suma / 10;

    // Convertir la lectura ADC a porcentaje aproximado
    humedad = map(
      lecturaADC,
      VALOR_SECO,
      VALOR_HUMEDO,
      0,
      100
    );

    humedad = constrain(humedad, 0, 100);

    // Determinar estado aproximado
    const char* estado;

    if (humedad < 30) {
      estado = "SECO";
    } else if (humedad < 60) {
      estado = "HUMEDO";
    } else {
      estado = "MUY HUMEDO";
    }

    // Mostrar porcentaje en LCD
    lcd.setCursor(0, 0);
    lcd.print("Humedad: ");
    lcd.print(humedad);
    lcd.print("%     ");

    // Mostrar lectura original del ADC
    lcd.setCursor(0, 1);
    lcd.print("ADC:");
    lcd.print(lecturaADC);
    lcd.print(" ");
    lcd.print(estado);
    lcd.print("    ");

    // Mostrar informacion en el monitor serial
    Serial.print("Lectura ADC: ");
    Serial.print(lecturaADC);

    Serial.print(" | Humedad aprox.: ");
    Serial.print(humedad);
    Serial.print("%");

    Serial.print(" | Estado: ");
    Serial.println(estado);
  }
}
