// PRUEBA DESCARTABLE (no es parte del producto).
// LCD en el bus I2C 0 (SDA 21, SCL 22) y OLED en un bus I2C aparte
// (Wire1: SDA 16, SCL 17). Deben mostrar contenido DISTINTO a la vez.
//
// Uso: pio run -e prueba_i2c -t upload && pio device monitor
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const int SDA_PIN = 21;      // LCD
const int SCL_PIN = 22;      // LCD
const int OLED_SDA_PIN = 16; // OLED (bus aparte)
const int OLED_SCL_PIN = 17; // OLED (bus aparte)

Adafruit_SSD1306 oled(128, 64, &Wire1, -1);
LiquidCrystal_I2C* lcd = nullptr;

uint8_t dirLcd = 0;
uint8_t dirOled = 0;

bool hayDispositivo(TwoWire& bus, uint8_t dir) {
  bus.beginTransmission(dir);
  return bus.endTransmission() == 0;
}

void escanearBus(TwoWire& bus, const char* nombre) {
  Serial.printf("Escaneando %s...\n", nombre);
  int total = 0;
  for (uint8_t dir = 1; dir < 127; dir++) {
    if (hayDispositivo(bus, dir)) {
      Serial.printf("  Dispositivo en 0x%02X\n", dir);
      total++;
    }
  }
  Serial.printf("  Total: %d\n", total);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire1.begin(OLED_SDA_PIN, OLED_SCL_PIN);

  escanearBus(Wire, "bus LCD (21/22)");
  escanearBus(Wire1, "bus OLED (16/17)");

  // LCD: normalmente 0x27, a veces 0x3F
  if (hayDispositivo(Wire, 0x27)) dirLcd = 0x27;
  else if (hayDispositivo(Wire, 0x3F)) dirLcd = 0x3F;

  // OLED: normalmente 0x3C, a veces 0x3D
  if (hayDispositivo(Wire1, 0x3C)) dirOled = 0x3C;
  else if (hayDispositivo(Wire1, 0x3D)) dirOled = 0x3D;

  Serial.printf("LCD:  %s", dirLcd ? "" : "NO ENCONTRADA");
  if (dirLcd) Serial.printf("0x%02X", dirLcd);
  Serial.println();
  Serial.printf("OLED: %s", dirOled ? "" : "NO ENCONTRADA");
  if (dirOled) Serial.printf("0x%02X", dirOled);
  Serial.println();

  if (dirLcd) {
    lcd = new LiquidCrystal_I2C(dirLcd, 16, 2);
    lcd->init();
    lcd->backlight();
  }
  if (dirOled) {
    if (!oled.begin(SSD1306_SWITCHCAPVCC, dirOled)) {
      Serial.println("Error al iniciar la OLED");
      dirOled = 0;
    }
  }
}

void loop() {
  static unsigned long contador = 0;
  contador++;

  if (lcd) {
    lcd->clear();
    lcd->setCursor(0, 0);
    lcd->print("SOY LA LCD");
    lcd->setCursor(0, 1);
    lcd->print("Cuenta: ");
    lcd->print(contador);
  }

  if (dirOled) {
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(2);
    oled.setCursor(0, 0);
    oled.println("OLED");
    oled.setTextSize(1);
    oled.setCursor(0, 24);
    oled.println("Otro texto distinto");
    oled.setCursor(0, 40);
    oled.print("Segundos: ");
    oled.print(millis() / 1000);
    oled.display();
  }

  Serial.printf("Ciclo %lu\n", contador);
  delay(1000);
}
