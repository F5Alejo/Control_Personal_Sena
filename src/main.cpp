#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ==========================================
// 1. CONFIGURACION WIFI
// ==========================================

const char* WIFI_SSID = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASSWORD = "CONTRASENA_WIFI";

// ==========================================
// 2. CONFIGURACION DEL BROKER EMQX
// ==========================================

const char* MQTT_BROKER = "TU_HOST_EMQX";
const int MQTT_PORT = 8883;

const char* MQTT_USER = "TU_USUARIO";
const char* MQTT_PASSWORD = "TU_CONTRASENA";

// Identificador del dispositivo
const char* MQTT_CLIENT_PREFIX = "ESP32_ADSO_";

// Topic donde se publicaran las notificaciones
const char* MQTT_TOPIC = "notificaciones";

// Intervalo de publicacion: 20 segundos
const unsigned long INTERVALO_PUBLICACION = 20000;

// Tiempo entre intentos de reconexion
const unsigned long INTERVALO_RECONEXION = 5000;

// ==========================================
// 3. CERTIFICADO CA DE EMQX
// ==========================================

// Pega aqui el certificado CA descargado
// desde el panel Overview de tu despliegue EMQX.

const char* CA_CERT = R"EOF(
-----BEGIN CERTIFICATE-----
PEGA_AQUI_EL_CERTIFICADO_CA_COMPLETO
-----END CERTIFICATE-----
)EOF";

// ==========================================
// 4. CONFIGURACION LCD
// ==========================================

const int SDA_LCD = 21;
const int SCL_LCD = 22;

LiquidCrystal_I2C lcd(0x27, 16, 2);

// ==========================================
// 5. CONFIGURACION SENSOR HC-SR04
// ==========================================

// TRIG puede ir directo. ECHO entrega 5V: usar divisor
// de voltaje (ej. 1k + 2k) para bajarlo a 3.3V del ESP32.
const int PIN_TRIG = 5;
const int PIN_ECHO = 18;

// Distancia a partir de la cual se considera movimiento
const float DISTANCIA_DETECCION_CM = 50.0;

// Margen para considerar que el objeto ya se fue
const float HISTERESIS_CM = 10.0;

// Cada cuanto se lee el sensor
const unsigned long INTERVALO_LECTURA = 200;

// Tiempo minimo entre dos alertas de movimiento
const unsigned long TIEMPO_ENTRE_ALERTAS = 5000;

// Tiempo maximo de espera del eco (~5 m)
const unsigned long TIMEOUT_ECO_US = 30000;

// ==========================================
// 6. CLIENTES WIFI Y MQTT
// ==========================================

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// ==========================================
// 7. VARIABLES DE CONTROL
// ==========================================

unsigned long tiempoAnterior = 0;
unsigned long ultimoIntentoMQTT = 0;

int contadorMensajes = 0;

unsigned long ultimaLectura = 0;
unsigned long ultimaAlerta = 0;

float ultimaDistancia = -1;
bool objetoDetectado = false;

String clientId;

// ==========================================
// 8. FUNCIONES PARA LA LCD
// ==========================================

void mostrarLCD(const char* linea1, const char* linea2) {

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print(linea1);

  lcd.setCursor(0, 1);
  lcd.print(linea2);
}

// ==========================================
// 9. CONECTAR A WIFI
// ==========================================

void conectarWiFi() {

  Serial.println();
  Serial.println("Conectando a WiFi...");

  mostrarLCD("Conectando WiFi", "Espere...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi conectado");

  Serial.print("Direccion IP: ");
  Serial.println(WiFi.localIP());

  mostrarLCD("WiFi conectado", "Preparando MQTT");

  delay(1500);
}

// ==========================================
// 10. SINCRONIZAR RELOJ PARA TLS
// ==========================================

bool sincronizarHora() {

  Serial.println("Sincronizando hora para TLS...");

  configTime(0, 0, "pool.ntp.org", "time.google.com");

  struct tm timeInfo;

  for (int i = 0; i < 20; i++) {

    if (getLocalTime(&timeInfo, 1000)) {
      Serial.println("Hora sincronizada");
      return true;
    }

    Serial.print(".");
  }

  Serial.println();
  Serial.println("No se pudo sincronizar la hora");

  return false;
}

// ==========================================
// 11. CONECTAR AL BROKER MQTT
// ==========================================

void conectarMQTT() {

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (mqttClient.connected()) {
    return;
  }

  Serial.println();
  Serial.println("Conectando a EMQX...");

  mostrarLCD("Conectando EMQX", "Autenticando...");

  clientId = String(MQTT_CLIENT_PREFIX);
  clientId += WiFi.macAddress();
  clientId.replace(":", "");

  if (mqttClient.connect(
        clientId.c_str(),
        MQTT_USER,
        MQTT_PASSWORD)) {

    Serial.println("Conexion MQTT exitosa");
    Serial.print("Broker: ");
    Serial.println(MQTT_BROKER);

    Serial.print("Client ID: ");
    Serial.println(clientId);

    mostrarLCD("MQTT conectado", "EMQX listo");

    delay(1500);

  } else {

    Serial.print("Error de conexion MQTT: ");
    Serial.println(mqttClient.state());

    mostrarLCD("Error MQTT", "Reintentando...");

  }
}

// ==========================================
// 12. PUBLICAR NOTIFICACION
// ==========================================

bool publicarMQTT(const String& mensaje) {

  if (!mqttClient.connected()) {
    return false;
  }

  Serial.println();
  Serial.println("Publicando mensaje...");

  Serial.print("Topic: ");
  Serial.println(MQTT_TOPIC);

  Serial.print("Mensaje: ");
  Serial.println(mensaje);

  bool publicado = mqttClient.publish(
    MQTT_TOPIC,
    mensaje.c_str()
  );

  if (publicado) {
    Serial.println("Mensaje enviado correctamente");
  } else {
    Serial.println("Error al publicar mensaje");
  }

  return publicado;
}

void publicarNotificacion() {

  if (!mqttClient.connected()) {
    return;
  }

  contadorMensajes++;

  String mensaje = "Notificacion desde ESP32. Mensaje #";
  mensaje += contadorMensajes;

  mensaje += ". Distancia: ";

  if (ultimaDistancia < 0) {
    mensaje += "fuera de rango";
  } else {
    mensaje += String(ultimaDistancia, 1);
    mensaje += " cm";
  }

  if (publicarMQTT(mensaje)) {

    String linea2 = "Mensaje #";
    linea2 += contadorMensajes;

    mostrarLCD("MQTT: PUBLICADO", linea2.c_str());

  } else {

    mostrarLCD("Error al publicar", "Ver conexion");
  }
}

// ==========================================
// 13. SENSOR HC-SR04
// ==========================================

// Devuelve la distancia en cm o -1 si no hay eco
float medirDistanciaCm() {

  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);

  // Pulso de 10 us para disparar la medicion
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long duracion = pulseIn(PIN_ECHO, HIGH, TIMEOUT_ECO_US);

  if (duracion == 0) {
    return -1;
  }

  // Velocidad del sonido: 0.0343 cm/us, ida y vuelta
  return duracion * 0.0343 / 2.0;
}

void publicarMovimiento() {

  String mensaje = "Movimiento detectado a ";
  mensaje += String(ultimaDistancia, 1);
  mensaje += " cm";

  publicarMQTT(mensaje);

  String linea2 = "Dist: ";
  linea2 += String(ultimaDistancia, 1);
  linea2 += " cm";

  mostrarLCD("MOVIMIENTO!", linea2.c_str());
}

void verificarSensor() {

  unsigned long ahora = millis();

  if (ahora - ultimaLectura < INTERVALO_LECTURA) {
    return;
  }

  ultimaLectura = ahora;

  ultimaDistancia = medirDistanciaCm();

  bool cerca =
    ultimaDistancia > 0 &&
    ultimaDistancia < DISTANCIA_DETECCION_CM;

  bool lejos =
    ultimaDistancia < 0 ||
    ultimaDistancia > DISTANCIA_DETECCION_CM + HISTERESIS_CM;

  if (!objetoDetectado && cerca) {

    objetoDetectado = true;

    if (ahora - ultimaAlerta >= TIEMPO_ENTRE_ALERTAS) {

      ultimaAlerta = ahora;

      publicarMovimiento();
    }

  } else if (objetoDetectado && lejos) {

    objetoDetectado = false;

    Serial.println("Zona despejada");
  }
}

// ==========================================
// 14. CONFIGURACION INICIAL
// ==========================================

void setup() {

  Serial.begin(115200);

  // Inicializar sensor HC-SR04
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);

  digitalWrite(PIN_TRIG, LOW);

  // Inicializar LCD
  Wire.begin(SDA_LCD, SCL_LCD);

  lcd.init();
  lcd.backlight();
  lcd.clear();

  mostrarLCD("Sistema MQTT", "Iniciando...");

  delay(1500);

  // Conectar a la red WiFi
  conectarWiFi();

  // Configurar certificado TLS
  espClient.setCACert(CA_CERT);

  // Configurar broker MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);

  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(15);

  // Sincronizar hora para validar certificado
  sincronizarHora();

  // Primer intento de conexion MQTT
  conectarMQTT();

  tiempoAnterior = millis();
  ultimoIntentoMQTT = millis();
}

// ==========================================
// 15. BUCLE PRINCIPAL
// ==========================================

void loop() {

  // Verificar conexion WiFi
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi desconectado");

    WiFi.reconnect();

    delay(500);

    return;
  }

  // Verificar conexion MQTT
  if (!mqttClient.connected()) {

    unsigned long ahora = millis();

    if (ahora - ultimoIntentoMQTT >= INTERVALO_RECONEXION) {

      ultimoIntentoMQTT = ahora;

      conectarMQTT();
    }

    return;
  }

  // Mantener conexion MQTT
  mqttClient.loop();

  // Leer sensor y avisar si hay movimiento
  verificarSensor();

  // Publicar cada 20 segundos
  unsigned long ahora = millis();

  if (ahora - tiempoAnterior >= INTERVALO_PUBLICACION) {

    tiempoAnterior = ahora;

    publicarNotificacion();
  }
}
