/*
 * ============================================================
 *  PROYECTO: Joystick + Servo + LEDs + Pantalla LCD (ESP32)
 * ============================================================
 *
 *  Que hace el programa:
 *    - Joystick a la IZQUIERDA / DERECHA -> el servo gira.
 *    - Joystick ARRIBA                    -> se prende el LED rojo.
 *    - Joystick ABAJO                     -> se prende el LED verde.
 *    - La pantalla LCD muestra la direccion y los valores X / Y.
 *    - El Monitor Serial muestra todo para revisar (115200 baudios).
 *
 *  Como esta organizado:
 *    1. Librerias
 *    2. Pines (donde se conecta cada cosa)
 *    3. Configuracion (numeros que se pueden ajustar)
 *    4. Objetos y variables
 *    5. Funciones (cada una hace UNA sola tarea)
 *    6. setup()  -> se ejecuta UNA vez al encender
 *    7. loop()   -> se repite una y otra vez
 */


// ============================================================
// 1. LIBRERIAS
// ============================================================
#include <Arduino.h>            // Funciones basicas de Arduino
#include <Wire.h>               // Comunicacion I2C (la usa la pantalla LCD)
#include <LiquidCrystal_I2C.h>  // Controla la pantalla LCD
#include <ESP32Servo.h>         // Controla el servo con el ESP32


// ============================================================
// 2. PINES
// ============================================================

// Joystick
#define VRX_PIN 34   // Eje X (izquierda / derecha)
#define VRY_PIN 35   // Eje Y (arriba / abajo)
#define SW_PIN  27   // Boton del joystick (se activa al presionarlo)

// Servo
#define SERVO_PIN 13 // Cable de senal del servo (naranja o amarillo)

// LEDs (cada uno con su resistencia de 220 ohm)
#define LED_ROJO  25 // Se prende con el joystick hacia ARRIBA
#define LED_VERDE 26 // Se prende con el joystick hacia ABAJO

// Pantalla LCD (I2C)
#define SDA_PIN 21
#define SCL_PIN 22


// ============================================================
// 3. CONFIGURACION
// ============================================================

// El joystick da valores de 0 a 4095.
// Cuando esta quieto marca mas o menos 2048 (la mitad).
const int CENTRO = 2048;

// Zona muerta: margen alrededor del centro que se ignora.
// Sirve para que pequenos temblores del joystick no cuenten como movimiento.
const int ZONA_MUERTA = 800;

// Angulos del servo (en grados)
const int SERVO_MIN    = 0;   // Joystick a la izquierda
const int SERVO_CENTRO = 90;  // Joystick quieto
const int SERVO_MAX    = 180; // Joystick a la derecha


// ============================================================
// 4. OBJETOS Y VARIABLES
// ============================================================

LiquidCrystal_I2C lcd(0x27, 16, 2); // Pantalla: direccion 0x27, 16 columnas, 2 filas
Servo servo;                        // El servo

int  valorX;    // Lectura del eje X (0 a 4095)
int  valorY;    // Lectura del eje Y (0 a 4095)
bool pulsado;   // true si el boton del joystick esta presionado
int  angulo;    // Angulo actual del servo (0 a 180)
String direccion; // Texto: "CENTRO", "IZQUIERDA", "DERECHA", "ARRIBA" o "ABAJO"


// ============================================================
// 5. FUNCIONES
// ============================================================

// --- Lee el joystick y guarda los valores en las variables ---
void leerJoystick() {
    valorX  = analogRead(VRX_PIN);
    valorY  = analogRead(VRY_PIN);
    pulsado = (digitalRead(SW_PIN) == LOW); // LOW = presionado
}

// --- Decide hacia donde apunta el joystick ---
void calcularDireccion() {
    direccion = "CENTRO"; // Si no se cumple nada de abajo, queda en el centro

    // Eje X: izquierda o derecha
    if (valorX < CENTRO - ZONA_MUERTA) {
        direccion = "IZQUIERDA";
    } else if (valorX > CENTRO + ZONA_MUERTA) {
        direccion = "DERECHA";
    }

    // Eje Y: arriba o abajo (si se mueve en Y, tiene prioridad sobre X)
    if (valorY < CENTRO - ZONA_MUERTA) {
        direccion = "ABAJO";
    } else if (valorY > CENTRO + ZONA_MUERTA) {
        direccion = "ARRIBA";
    }
}

// --- Mueve el servo segun el eje X ---
void moverServo() {
    angulo = SERVO_CENTRO; // Por defecto se queda en el centro

    // Solo se mueve si el joystick salio de la zona muerta
    if (valorX < CENTRO - ZONA_MUERTA || valorX > CENTRO + ZONA_MUERTA) {
        // map() convierte la lectura (0 a 4095) en un angulo (0 a 180)
        angulo = map(valorX, 0, 4095, SERVO_MIN, SERVO_MAX);
    }

    servo.write(angulo);
}

// --- Prende o apaga los LEDs segun el eje Y ---
void actualizarLeds() {
    bool arriba = (valorY > CENTRO + ZONA_MUERTA);
    bool abajo  = (valorY < CENTRO - ZONA_MUERTA);

    digitalWrite(LED_ROJO,  arriba); // Rojo  prendido solo si va hacia ARRIBA
    digitalWrite(LED_VERDE, abajo);  // Verde prendido solo si va hacia ABAJO
}

// --- Muestra la informacion en la pantalla LCD ---
void mostrarLCD() {
    // Fila 1: direccion (y "SW!" si se presiona el boton)
    lcd.setCursor(0, 0);
    lcd.print("                "); // Borra la fila (16 espacios)
    lcd.setCursor(0, 0);
    lcd.print(direccion);

    if (pulsado) {
        lcd.setCursor(12, 0);
        lcd.print("SW!");
    }

    // Fila 2: valores X y Y. Ejemplo: "X:2048 Y:1990"
    char texto[17];
    snprintf(texto, sizeof(texto), "X:%4d Y:%4d", valorX, valorY);
    lcd.setCursor(0, 1);
    lcd.print(texto);
}

// --- Muestra la informacion en el Monitor Serial ---
void mostrarSerial() {
    Serial.print("X: ");            Serial.print(valorX);
    Serial.print(" | Y: ");         Serial.print(valorY);
    Serial.print(" | Servo: ");     Serial.print(angulo);
    Serial.print(" | Direccion: "); Serial.print(direccion);
    Serial.print(" | SW: ");        Serial.println(pulsado ? "PRESIONADO" : "LIBRE");
}


// ============================================================
// 6. SETUP: se ejecuta UNA sola vez al encender
// ============================================================
void setup() {
    // Monitor Serial
    Serial.begin(115200);

    // Joystick
    analogReadResolution(12);         // Lecturas de 0 a 4095
    pinMode(SW_PIN, INPUT_PULLUP);    // Boton con resistencia interna

    // LEDs como salida
    pinMode(LED_ROJO,  OUTPUT);
    pinMode(LED_VERDE, OUTPUT);

    // Servo
    servo.setPeriodHertz(50);           // Frecuencia estandar de los servos
    servo.attach(SERVO_PIN, 500, 2400); // Pulsos para recorrer de 0 a 180 grados
    servo.write(SERVO_CENTRO);          // Empieza en el centro

    // Pantalla LCD
    Wire.begin(SDA_PIN, SCL_PIN);
    lcd.init();
    lcd.backlight();

    // Mensaje de bienvenida por 2 segundos
    lcd.setCursor(0, 0);
    lcd.print("JOYSTICK ESP32");
    lcd.setCursor(0, 1);
    lcd.print("Iniciando...");
    delay(2000);
    lcd.clear();
}


// ============================================================
// 7. LOOP: se repite una y otra vez
// ============================================================
void loop() {
    leerJoystick();      // 1. Leer el joystick
    calcularDireccion(); // 2. Saber hacia donde apunta
    moverServo();        // 3. Mover el servo (izquierda / derecha)
    actualizarLeds();    // 4. Prender LEDs (arriba = rojo, abajo = verde)
    mostrarLCD();        // 5. Mostrar en la pantalla
    mostrarSerial();     // 6. Mostrar en el Monitor Serial

    delay(150);          // Pausa corta antes de repetir
}
