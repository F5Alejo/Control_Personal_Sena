// SENA SMART PARK - firmware del ESP32 (barrera, sensor de entrada, LCD, OLED, LEDs y botón táctil).
// Habla con el backend por MQTT (broker local en la LAN, sin TLS). Contrato en docs/superpowers/specs.
//
//  HC-SR04  TRIG 5 / ECHO 18 (con divisor)  -> vehículo frente a la barrera y distancia
//  Servo    GPIO 13                          -> barrera (0° cerrada, 90° abierta)
//  LCD 16x2 0x27, Wire  SDA 21 / SCL 22      -> instrucciones del backend
//  OLED     0x3C, Wire1 SDA 16 / SCL 17      -> estado, páginas rotativas
//  LED rojo 25 / LED verde 26                -> barrera cerrada / abierta
//  TTP223B  GPIO 27                          -> toque corto = apertura manual, largo = mantenimiento
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESP32Servo.h>
#include "secrets.h"

// ---------- pines ----------
const int PIN_TRIG = 5, PIN_ECHO = 18, PIN_SERVO = 13, PIN_LED_ROJO = 25, PIN_LED_VERDE = 26, PIN_TOQUE = 27, PIN_IR_P01 = 14;
const int SDA_LCD = 21, SCL_LCD = 22, SDA_OLED = 16, SCL_OLED = 17;

// ---------- topics (iguales a backend/src/mqtt/topics.ts) ----------
const char* T_ESTADO = "senapark/estado";
const char* T_ENTRADA = "senapark/sensores/entrada";
const char* T_P01 = "senapark/sensores/p01";
const char* T_PASO = "senapark/sensores/paso";
const char* T_TELEMETRIA = "senapark/telemetria";
const char* T_BARRERA_ESTADO = "senapark/barrera/estado";
const char* T_MANUAL = "senapark/manual";
const char* T_CMD_BARRERA = "senapark/cmd/barrera";
const char* T_CMD_LCD = "senapark/cmd/lcd";

// ---------- parámetros ----------
const int ANGULO_CERRADA = 0, ANGULO_ABIERTA = 90;
const unsigned long MOVER_SERVO_MS = 700;            // tiempo que se espera antes de confirmar la posición
const float UMBRAL_PRESENTE_CM = 20.0, UMBRAL_AUSENTE_CM = 28.0; // histéresis
const int LECTURAS_PARA_CAMBIAR = 3;                 // lecturas seguidas para cambiar de presencia
const unsigned long CADA_MEDIDA_MS = 100;
const unsigned long CADA_DISTANCIA_MS = 500;         // máximo con que se publica la distancia mientras cambia
const unsigned long LATIDO_ENTRADA_MS = 5000;        // se repite la entrada aunque nada cambie
const float CAMBIO_MIN_CM = 3.0;
const unsigned long CADA_TELEMETRIA_MS = 5000;
const unsigned long CADA_PAGINA_MS = 4000;
const unsigned long SIN_MQTT_CERRAR_MS = 5000;       // sin broker este tiempo => se cierra la barrera
const unsigned long TOQUE_LARGO_MS = 2000;
const unsigned long TOQUE_MIN_MS = 300;              // un toque más corto es ruido del sensor capacitivo
const unsigned long TOQUE_ENFRIAMIENTO_MS = 4000;    // entre una solicitud y la siguiente
const bool IR_ACTIVO_BAJO = false;                   // el PIR HC-SR501 pone la salida en HIGH al ver movimiento
const unsigned long CALENTAMIENTO_PIR_MS = 30000;    // el PIR da disparos falsos al energizarse
const unsigned long CADA_IR_MS = 50;
const int LECTURAS_IR = 4;                           // lecturas seguidas iguales para aceptar un cambio
const unsigned long LATIDO_IR_MS = 5000;

// ---------- objetos ----------
WiFiClient red;
PubSubClient mqtt(red);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_SSD1306 oled(128, 64, &Wire1, -1);
Servo servo;
bool hayOled = false;

// ---------- estado ----------
int angulo = ANGULO_CERRADA;
bool barreraAbierta = false;
bool confirmarPendiente = false;
unsigned long tServoActivo = 0;
unsigned long tMovimiento = 0;
char cmdIdPendiente[48] = "";

bool presente = false;
unsigned long tMovHc = 0;        // última vez que el HC-SR04 vio cambiar la distancia
float distanciaPrev = -1;
float distancia = -1;            // -1: sin eco
int lecturasContrarias = 0;
bool vistoPresenteAbierta = false;
bool cruceEnviado = false;
unsigned long tPresenteDesde = 0;
float ultimaDistPublicada = -1;
unsigned long tUltimaEntrada = 0, tUltimaMedida = 0, tUltimaTelemetria = 0, tUltimaPagina = 0;
unsigned long tSinMqtt = 0, tReintentoMqtt = 0, tReintentoWifi = 0;

bool irOcupado = false;          // lectura estable del infrarrojo de P01
int irContrarias = 0;
unsigned long tUltimoIr = 0, tUltimaLecturaIr = 0;

bool toquePrevio = false;
unsigned long tToque = 0, tUltimaSolicitud = 0;
bool toqueLargoEnviado = false;

int pagina = 0;
char lcdLinea1[17] = "SENA SMART PARK", lcdLinea2[17] = "Conectando...";
char ultimoMensaje[24] = "Sin mensajes";

// ---------- utilidades ----------
void copiar(char* destino, const char* origen, size_t max) {
  strncpy(destino, origen ? origen : "", max);
  destino[max] = '\0';
}

void mostrarLcd() {
  char l1[17], l2[17];
  snprintf(l1, sizeof l1, "%-16s", lcdLinea1);
  snprintf(l2, sizeof l2, "%-16s", lcdLinea2);
  lcd.setCursor(0, 0); lcd.print(l1);
  lcd.setCursor(0, 1); lcd.print(l2);
}

void ponerLcd(const char* a, const char* b) {
  copiar(lcdLinea1, a, 16); copiar(lcdLinea2, b, 16);
  mostrarLcd();
}

bool publicar(const char* topic, const String& json, bool retener = false) {
  return mqtt.connected() && mqtt.publish(topic, json.c_str(), retener);
}

void ponerLeds() {
  digitalWrite(PIN_LED_VERDE, barreraAbierta ? HIGH : LOW);
  digitalWrite(PIN_LED_ROJO, barreraAbierta ? LOW : HIGH);
}

// ---------- barrera ----------
void moverBarrera(bool abrir, const char* cmdId) {
  barreraAbierta = abrir;
  angulo = abrir ? ANGULO_ABIERTA : ANGULO_CERRADA;
  if (!servo.attached()) servo.attach(PIN_SERVO, 500, 2400);
  servo.write(angulo);
  tServoActivo = millis();
  Serial.printf("[servo] %s id=%s\n", abrir ? "ABRIR" : "CERRAR", cmdId ? cmdId : "");
  ponerLeds();
  copiar(cmdIdPendiente, cmdId, sizeof cmdIdPendiente - 1);
  confirmarPendiente = true;
  tMovimiento = millis();
  if (abrir) { vistoPresenteAbierta = presente; cruceEnviado = false; }
}

void confirmarBarrera() {
  JsonDocument d;
  d["estado"] = barreraAbierta ? "abierta" : "cerrada";
  if (cmdIdPendiente[0]) d["cmd_id"] = cmdIdPendiente;
  String s; serializeJson(d, s);
  if (publicar(T_BARRERA_ESTADO, s)) confirmarPendiente = false;
}

// ---------- mensajes entrantes ----------
void alMensaje(char* topic, byte* carga, unsigned int largo) {
  JsonDocument d;
  if (deserializeJson(d, carga, largo)) return; // JSON inválido: se ignora
  if (strcmp(topic, T_CMD_BARRERA) == 0) {
    const char* accion = d["accion"] | "";
    const char* id = d["cmd_id"] | "";
    unsigned long expira = d["expira_en_ms"] | 0UL;
    // Una orden de apertura llega con vigencia: si ya pasó, no se ejecuta. (El tiempo corre desde que llega.)
    if (strcmp(accion, "abrir") == 0 && expira > 0) moverBarrera(true, id);
    else if (strcmp(accion, "abrir") == 0) { /* sin vigencia: se descarta por seguridad */ }
    else if (strcmp(accion, "cerrar") == 0) moverBarrera(false, id);
    copiar(ultimoMensaje, accion, 23);
  } else if (strcmp(topic, T_CMD_LCD) == 0) {
    ponerLcd(d["linea1"] | "", d["linea2"] | "");
  }
}

// ---------- red ----------
void conectarWifi() {
  if (WiFi.status() == WL_CONNECTED || millis() - tReintentoWifi < 5000) return;
  tReintentoWifi = millis();
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void conectarMqtt() {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED || millis() - tReintentoMqtt < 3000) return;
  tReintentoMqtt = millis();
  char id[32]; snprintf(id, sizeof id, "senapark-esp32-%04X", (uint16_t)(ESP.getEfuseMac() & 0xFFFF));
  // Last Will: si el ESP32 se cae, el broker publica "offline" (retenido).
  if (mqtt.connect(id, MQTT_USER, MQTT_PASS, T_ESTADO, 1, true, "offline")) {
    mqtt.subscribe(T_CMD_BARRERA, 1);
    mqtt.subscribe(T_CMD_LCD, 1);
    mqtt.publish(T_ESTADO, "online", true);
    ponerLcd("SENA SMART PARK", "Listo");
    ultimaDistPublicada = -1; tUltimaEntrada = 0; tUltimoIr = 0; tUltimaTelemetria = 0; // publica todo de nuevo
    if (confirmarPendiente) confirmarBarrera();
  }
}

// ---------- HC-SR04 ----------
float medirCm() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 30000);
  return us == 0 ? -1 : us * 0.0343f / 2.0f;
}

void publicarEntrada() {
  JsonDocument d;
  d["presente"] = presente;
  d["distancia_cm"] = distancia < 0 ? 400.0f : roundf(distancia * 10) / 10;
  String s; serializeJson(d, s);
  if (publicar(T_ENTRADA, s)) { tUltimaEntrada = millis(); ultimaDistPublicada = distancia; }
}

void leerSensor() {
  if (millis() - tUltimaMedida < CADA_MEDIDA_MS) return;
  tUltimaMedida = millis();
  distancia = medirCm();
  if (fabsf(distancia - distanciaPrev) >= 3.0f) tMovHc = millis();
  distanciaPrev = distancia;
  bool cerca = distancia >= 0 && distancia < UMBRAL_PRESENTE_CM;
  bool lejos = distancia < 0 || distancia >= UMBRAL_AUSENTE_CM;
  // Cambio de presencia con histéresis y varias lecturas seguidas (evita falsos por rebotes del eco).
  bool contraria = presente ? lejos : cerca;
  lecturasContrarias = contraria ? lecturasContrarias + 1 : 0;
  bool cambio = false;
  if (lecturasContrarias >= LECTURAS_PARA_CAMBIAR) {
    presente = !presente; lecturasContrarias = 0; cambio = true;
    if (presente) tPresenteDesde = millis();
  }
  if (presente && barreraAbierta) vistoPresenteAbierta = true;
  // Cruce: con la barrera abierta, el vehículo que estaba frente al sensor deja de verse.
  if (cambio && !presente && barreraAbierta && vistoPresenteAbierta && !cruceEnviado) {
    if (publicar(T_PASO, "{\"evento\":\"cruce\"}")) cruceEnviado = true;
  }
  bool movio = ultimaDistPublicada < 0 || fabsf(distancia - ultimaDistPublicada) >= CAMBIO_MIN_CM;
  if (cambio || (movio && millis() - tUltimaEntrada >= CADA_DISTANCIA_MS) || millis() - tUltimaEntrada >= LATIDO_ENTRADA_MS) publicarEntrada();
}

// ---------- sensor de movimiento (PIR) de P01 ----------
void publicarIr() {
  String s = String("{\"ocupado\":") + (irOcupado ? "true" : "false") + "}";
  if (publicar(T_P01, s)) tUltimoIr = millis();
}

void leerIr() {
  if (millis() - tUltimaLecturaIr < CADA_IR_MS) return;
  tUltimaLecturaIr = millis();
  bool visto = millis() >= CALENTAMIENTO_PIR_MS && (digitalRead(PIN_IR_P01) == (IR_ACTIVO_BAJO ? LOW : HIGH));
  irContrarias = (visto != irOcupado) ? irContrarias + 1 : 0;
  bool cambio = false;
  if (irContrarias >= LECTURAS_IR) { irOcupado = visto; irContrarias = 0; cambio = true; }
  if (cambio || millis() - tUltimoIr >= LATIDO_IR_MS) publicarIr();
}

// ---------- botón táctil ----------
void leerToque() {
  bool t = digitalRead(PIN_TOQUE) == HIGH;
  if (t && !toquePrevio) { tToque = millis(); toqueLargoEnviado = false; }
  if (t && !toqueLargoEnviado && millis() - tToque >= TOQUE_LARGO_MS) {
    publicar(T_MANUAL, "{\"solicitud\":\"mantenimiento\"}"); toqueLargoEnviado = true; copiar(ultimoMensaje, "mantenimiento", 23);
  }
  if (!t && toquePrevio && !toqueLargoEnviado && millis() - tToque >= TOQUE_MIN_MS && millis() - tUltimaSolicitud >= TOQUE_ENFRIAMIENTO_MS) {
    // Si el HC-SR04 acaba de ver movimiento, el 'toque' es la mano/vehículo cerca del táctil, no un botón.
    if (millis() - tMovHc < 2000) { Serial.println("[toque] ignorado: movimiento frente al HC-SR04"); toquePrevio = t; return; }
    tUltimaSolicitud = millis();
    publicar(T_MANUAL, "{\"solicitud\":\"apertura\"}"); copiar(ultimoMensaje, "apertura manual", 23);
  }
  if (t != toquePrevio) Serial.printf("[toque] %s (distancia %.0f cm)\n", t ? "HIGH" : "LOW", distancia);
  toquePrevio = t;
}

// ---------- telemetría y OLED ----------
void publicarTelemetria() {
  if (millis() - tUltimaTelemetria < CADA_TELEMETRIA_MS) return;
  JsonDocument d;
  d["rssi"] = WiFi.RSSI();
  d["uptime_s"] = (unsigned long)(millis() / 1000);
  d["ip"] = WiFi.localIP().toString();
  d["heap"] = ESP.getFreeHeap();
  d["angulo"] = angulo;
  String s; serializeJson(d, s);
  if (publicar(T_TELEMETRIA, s)) tUltimaTelemetria = millis();
}

void titulo(const char* t) {
  oled.setTextSize(1); oled.setCursor(0, 0); oled.print(t);
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 16);
}

void dibujarOled() {
  if (!hayOled) return;
  oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE);
  char b[32];
  switch (pagina) {
    case 0:
      titulo("ESTADO");
      oled.printf("WiFi : %s\n", WiFi.status() == WL_CONNECTED ? "conectado" : "sin red");
      oled.printf("MQTT : %s\n", mqtt.connected() ? "conectado" : "sin broker");
      oled.printf("Barrera: %s\n", barreraAbierta ? "ABIERTA" : "cerrada");
      oled.printf("Entrada: %s\n", presente ? "vehiculo" : "libre");
      oled.printf("P01    : %s\n", irOcupado ? "movim." : "quieto");
      break;
    case 1:
      titulo("DISTANCIA HC-SR04");
      oled.setTextSize(3); oled.setCursor(0, 26);
      if (distancia < 0) snprintf(b, sizeof b, "---"); else snprintf(b, sizeof b, "%d cm", (int)roundf(distancia));
      oled.print(b);
      break;
    case 2:
      titulo("BARRERA");
      oled.printf("Estado: %s\n", barreraAbierta ? "ABIERTA" : "cerrada");
      oled.printf("Angulo: %d grados\n", angulo);
      oled.printf("LED: %s\n", barreraAbierta ? "verde" : "rojo");
      break;
    case 3:
      titulo("RED");
      oled.printf("%s\n", WIFI_SSID);
      oled.printf("IP %s\n", WiFi.localIP().toString().c_str());
      oled.printf("Senal %d dBm\n", WiFi.RSSI());
      break;
    case 4:
      titulo("SISTEMA");
      oled.printf("Encendido %lu s\n", (unsigned long)(millis() / 1000));
      oled.printf("Memoria %u KB\n", (unsigned)(ESP.getFreeHeap() / 1024));
      oled.printf("Broker %s\n", MQTT_HOST);
      break;
    default:
      titulo("ULTIMO MENSAJE");
      oled.printf("%s\n\n", ultimoMensaje);
      oled.printf("LCD: %s\n", lcdLinea1);
      break;
  }
  oled.display();
}

void rotarOled() {
  if (millis() - tUltimaPagina < CADA_PAGINA_MS && tUltimaPagina != 0) {
    static unsigned long tRefresco = 0;               // se redibuja 2 veces por segundo para ver datos vivos
    if (millis() - tRefresco >= 500) { tRefresco = millis(); dibujarOled(); }
    return;
  }
  tUltimaPagina = millis(); pagina = (pagina + 1) % 6; dibujarOled();
}

// ---------- arranque ----------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT); pinMode(PIN_ECHO, INPUT); digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_LED_ROJO, OUTPUT); pinMode(PIN_LED_VERDE, OUTPUT); pinMode(PIN_TOQUE, INPUT); pinMode(PIN_IR_P01, INPUT);
  servo.setPeriodHertz(50); servo.attach(PIN_SERVO, 500, 2400);
  servo.write(ANGULO_CERRADA);   // siempre arranca cerrada
  tServoActivo = millis();
  esp_reset_reason_t rr = esp_reset_reason();
  snprintf(ultimoMensaje, sizeof ultimoMensaje, "reinicio:%s", rr == ESP_RST_BROWNOUT ? "BROWNOUT" : rr == ESP_RST_POWERON ? "encendido" : rr == ESP_RST_PANIC ? "error" : rr == ESP_RST_SW ? "software" : "otro");
  Serial.printf("[arranque] %s\n", ultimoMensaje);
  // Prueba de LEDs al encender: verde, luego rojo. Si uno no se ve, el problema es el cableado de ese LED.
  digitalWrite(PIN_LED_ROJO, LOW); digitalWrite(PIN_LED_VERDE, HIGH); delay(600);
  digitalWrite(PIN_LED_VERDE, LOW); digitalWrite(PIN_LED_ROJO, HIGH); delay(600);
  ponerLeds();

  Wire.begin(SDA_LCD, SCL_LCD);
  lcd.init(); lcd.backlight(); mostrarLcd();
  Wire1.begin(SDA_OLED, SCL_OLED);
  hayOled = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (hayOled) { oled.clearDisplay(); oled.display(); }

  WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(10);
  mqtt.setCallback(alMensaje);
  conectarWifi();
}

void loop() {
  conectarWifi();
  conectarMqtt();
  if (mqtt.connected()) { mqtt.loop(); tSinMqtt = 0; }
  else {
    if (tSinMqtt == 0) tSinMqtt = millis();
    // Sin conexión con el backend no hay quien autorice: la barrera no puede quedar abierta.
    if (barreraAbierta && millis() - tSinMqtt >= SIN_MQTT_CERRAR_MS) moverBarrera(false, "");
    if (millis() - tSinMqtt >= 2000) ponerLcd("SENA SMART PARK", "Sin conexion");
  }
  if (confirmarPendiente && millis() - tMovimiento >= MOVER_SERVO_MS) confirmarBarrera();
  // Servo sin señal cuando está quieto: así el ruido eléctrico (HC-SR04, WiFi) no lo hace temblar ni moverse.
  if (servo.attached() && !confirmarPendiente && millis() - tServoActivo >= 1500) servo.detach();
  leerSensor(); leerIr();
  leerToque();
  publicarTelemetria();
  rotarOled();
}
