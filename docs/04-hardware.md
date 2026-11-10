# 04 · Hardware

> Rol de cada componente, viabilidad eléctrica y lo que falta confirmar. El diagrama eléctrico definitivo y los
> planos con medidas se hacen en la **Fase 1** (`maqueta/`).

## 0. Lo que ya confirma el código de `main`

El proyecto PlatformIO que ya está en `main` (`src/main.cpp`, `ejemplos/`, `platformio.ini`) confirma:

| Dato | Valor | Fuente |
|---|---|---|
| Placa | `esp32dev` (ESP32 DevKit) | `platformio.ini` |
| LCD | **16x2 con módulo I2C**, dirección `0x27` | `src/main.cpp` |
| OLED | SSD1306 128x64, dirección `0x3C` | `ejemplos/oled_fi.cpp` |
| Bus I2C | SDA 21, SCL 22 | todos los ejemplos |
| Servo | GPIO 13 con `ESP32Servo` | `ejemplos/joystick_servo_lcd.cpp` |
| HC-SR04 | TRIG 5, ECHO 18 (con divisor) | `src/main.cpp` |
| Broker MQTT | **EMQX Cloud** con TLS (puerto 8883) y librería PubSubClient | `src/main.cpp` |
| Otros componentes en ejemplos | Joystick, sensor de humedad de suelo FC-28/YL-69 | `ejemplos/` (no se necesitan en el MVP) |

Para corregir al iniciar la Fase 1:

- **Credenciales:** `src/main.cpp` tiene los campos de Wi-Fi y de EMQX. Si alguien los llena y hace *push*, las contraseñas quedan públicas. Se moverán a `include/secrets.h` (ya está en `.gitignore`) con una plantilla `secrets.example.h`.
- **Puerto de carga:** `upload_port = /dev/ttyUSB*` solo funciona en Linux; en Windows falla. Se quitará para que PlatformIO detecte el puerto solo (o cada quien usa su `COMx` localmente).
- `ejemplos/pir_lcd.cpp` contiene por error el texto de un `platformio.ini`; falta el ejemplo real del PIR.
- `marcoschwartz/LiquidCrystal_I2C` aparece dos veces en `lib_deps`.

## 1. Inventario y rol de cada componente

| Componente | Cant. | Rol en el prototipo | Zona | Clasificación |
|---|---:|---|---|---|
| ESP32 | ⚠ ? | Controlador de la portería y de los espacios | A | **Microcontrolador** |
| Micro servo SG90 | ⚠ ? | Brazo de la barrera | A | **Actuador 1** |
| Relé JQC-3FF-S-Z | 1 | Baliza o letrero "PARQUEADERO LLENO" de baja tensión | D | **Actuador 2** |
| Sensor IR LM393 (tipo FC-51) | ⚠ ? | **IR-A**, lado exterior de la barrera: vehículo que quiere entrar | A | **Sensor 1** |
| Sensor TCRT5000 | ⚠ ? | **IR-B**, lado interior, empotrado en el piso: vehículo que cruzó o quiere salir | A | **Sensor 2** |
| Sensor ultrasónico HC-SR04 | 1 | Ocupación del espacio P01 | B | **Sensor 3** |
| Sensor PIR HC-SR501 | 2 | Persona frente al kiosco (activa la LCD) · vigilancia fuera de horario | C | Sensor |
| Sensor DHT11 | 1 | Temperatura y humedad para el dashboard | C | Sensor |
| Módulo táctil TTP223B | 1 | Botón del vigilante: toque corto = apertura manual registrada; 3 s = modo mantenimiento | D | Entrada de control |
| Pantalla LCD 16x2 I2C (0x27) | ⚠ ? | Instrucciones y disponibilidad ("Libres: 2/4", "Escanee el QR") | C | Indicador |
| OLED 0.96" 128x64 I2C (0x3C) | 1 | Estado técnico: Wi-Fi, MQTT, último comando, alertas | C | Indicador |
| Matriz LED 8x8 1088AS | ⚠ ? | Símbolos: ✓ autorizado, ✗ denegado, ⧗ espera, flecha | A | Indicador |
| LEDs | varios | Ocupación de cada espacio (encendido = ocupado) | B | Indicador |
| Protoboard mini | 2 | Montaje | — | — |
| Resistencias | varias | Divisor de voltaje del HC-SR04, LEDs | — | — |

**Cumplimiento del tablero:** 2/2 actuadores (servo, relé) y 3/3 sensores (IR-A, IR-B, HC-SR04), más PIR, DHT11 y táctil como valor agregado.

### Por qué cada sensor va donde va

- **FC-51 (LM393)** detecta obstáculos a 2–30 cm (ajustable con su potenciómetro): ideal en el costado del carril.
- **TCRT5000** tiene alcance muy corto (milímetros a ~2 cm): funciona bien **empotrado en el piso mirando hacia arriba**, para detectar el chasís del carro que pasa encima. También sirve para los espacios P02–P04.
- **HC-SR04** mide distancia: montado sobre un espacio, si la distancia cae por debajo de un umbral, el espacio está ocupado.
- **PIR** detecta movimiento, no presencia quieta: **no sirve** para saber si un carro está estacionado, pero sí para detectar personas.

## 2. Detección de los 4 espacios

| Si tienen… | Plan |
|---|---|
| ≥ 3 sensores IR (FC-51 o TCRT5000) además de IR-A e IR-B | P01 con HC-SR04 y P02–P04 con IR. **Sin compras.** |
| Menos de 3 IR adicionales | Comprar 2–3 módulos TCRT5000 o FC-51 (de los más económicos y usan 1 pin cada uno). |
| Solo lo listado (1 de cada) | P01 con sensor real y P02–P04 sin sensor: **no recomendado**, porque se pierde la detección de inconsistencias. |

No se recomienda comprar más HC-SR04: cada uno usa 2 pines y necesita divisor de voltaje.

## 3. Alimentación

| Componente | Alimentación | Nota |
|---|---|---|
| ESP32 | USB 5 V | — |
| Servo SG90 | **5 V externa** | Tiene picos de corriente; alimentarlo desde el ESP32 provoca reinicios. GND común con el ESP32. |
| Relé (módulo) | 5 V externa | Verificar si el módulo se activa con la señal de 3,3 V del ESP32 y si es activo en alto o en bajo. |
| HC-SR04 | 5 V | El pin **ECHO entrega 5 V**: conectarlo al ESP32 con un divisor (1 kΩ / 2 kΩ). |
| LCD 16x2 con módulo I2C | 5 V | Las resistencias pull-up del módulo llevan SDA/SCL a 5 V; lo revisamos en la Fase 1 (conversor de nivel o retirar pull-ups). |
| MAX7219 (si la matriz lo trae) | 5 V | Con lógica de 3,3 V suele funcionar, pero está al límite; si falla, se usa un conversor de nivel. |
| OLED, DHT11, TTP223B | 3,3 V | — |
| FC-51 / TCRT5000 | **3,3 V** | Así su salida no supera los 3,3 V que tolera el ESP32. |
| PIR HC-SR501 | 5 V | Su salida ya es de 3,3 V. Necesita ~1 min de calentamiento al encender. |

Fuente externa sugerida: **5 V y al menos 2 A** (sirve un cargador de celular reutilizado). La carga del relé debe ser
de **baja tensión** (LEDs o bombillo de 5–12 V): **nada de 110 V en la maqueta**.

## 4. Presupuesto de pines (preliminar)

ESP32 DevKit (`esp32dev`, módulo WROOM-32). Se evitan los pines de arranque (0, 12), los de la memoria flash (6–11) y
los del puerto serie (1, 3). Los pines 34, 35, 36 y 39 son **solo de entrada** y se usan para sensores. Se respetan
los pines que ya usa el código de `main` (I2C 21/22, servo 13, HC-SR04 5/18).

| Señal | Pines | GPIO propuesto | Nota |
|---|---:|---|---|
| I2C (OLED + LCD) | 2 | 21 (SDA), 22 (SCL) | Bus compartido: OLED 0x3C, LCD 0x27 ✅ |
| Servo | 1 | 13 ✅ | PWM |
| HC-SR04 (TRIG, ECHO) | 2 | 5, 18 ✅ | ECHO con divisor |
| Relé | 1 | 27 | — |
| Matriz con MAX7219 (DIN, CLK, CS) | 3 | 23, 19, 15 | Solo si la matriz viene en módulo MAX7219 |
| IR-A (FC-51) | 1 | 34 | Solo entrada |
| IR-B (TCRT5000, salida D0) | 1 | 35 | Solo entrada |
| PIR | 1 | 36 | Solo entrada |
| DHT11 | 1 | 4 | — |
| TTP223B | 1 | 39 | Solo entrada |
| Sensores P02–P04 | 3 | 32, 33, 14 | — |
| LEDs P01–P04 | 4 | 25, 26, 16, 17 | 25/26 son los de los ejemplos; 16/17 no están libres si el módulo es WROVER |
| **Total** | **21** | | Queda libre: 2 |

✅ = ya usado así en el código de `main`.

**Conclusión:** todo cabe en **un solo ESP32**, pero justo. La LCD ya está confirmada como I2C; falta confirmar que
la matriz 1088AS viene montada en un módulo MAX7219 (sola necesitaría 16 pines).

Si no lo está, las opciones son: prescindir de la matriz, quitar los LEDs por espacio (el estado se ve en la LCD y en
la web) o usar un **segundo ESP32** para los espacios (si el instructor lo permite).

## 5. Distribución en la maqueta (borrador)

```text
+------------------------------------------------------------+
|   +---------+   +---------+   +---------+   +---------+    |
|   |   P01   |   |   P02   |   |   P03   |   |   P04   |    |
|   |  carro  |   |  carro  |   |  carro  |   |  moto   |    |
|   | HC-SR04 |   |   IR    |   |   IR    |   |   IR    |    |
|   |  (LED)  |   |  (LED)  |   |  (LED)  |   |  (LED)  |    |
|   +---------+   +---------+   +---------+   +---------+    |
|                                                            |
|                       via interna                          |
|                                                            |
|                                IR-B (TCRT5000, en el piso) |
|                        [servo]========== barrera           |
|                                IR-A (FC-51, lateral)       |
+-----------------------------+          +-------------------+
                              |  carril  |
                              | ent/sal  |
                              +----------+
      [kiosco QR]   [LCD + matriz LED]   [PIR]   [boton tactil]
```

**Escala sugerida:** carros de juguete 1:43 o 1:32 (10–14 cm de largo) dan más espacio a los sensores que los de
1:64. Las medidas definitivas van en los planos de la Fase 1.

## 6. Compras mínimas (solo si aplica)

| Prioridad | Ítem | Cuándo |
|---|---|---|
| 1 | Fuente de 5 V y 2 A (o cargador de celular reutilizado) | Si no tienen una |
| 2 | 2–3 sensores IR (TCRT5000 o FC-51) | Si no alcanzan para P02–P04 |
| 3 | Cables Dupont y una protoboard grande | Según el montaje |
| — | Pantalla TFT, lector RFID, más HC-SR04 | **No son necesarios** (ver D-03 y D-06) |

## 7. Pendiente por confirmar

- [ ] Cantidad exacta de: ESP32, SG90, FC-51 (LM393), TCRT5000, LEDs.
- [x] LCD: 16x2 con módulo I2C en 0x27 (confirmado en `src/main.cpp`).
- [ ] ¿La matriz 1088AS viene en módulo MAX7219 (5 pines: VCC, GND, DIN, CS, CLK)?
- [ ] ¿El relé es un módulo (con transistor, LED y bornera) o el relé suelto?
- [ ] ESP32: placa `esp32dev` confirmada; ¿de 30 o 38 pines? ¿módulo WROOM o WROVER?
- [ ] ¿Tienen fuente de 5 V externa o un cargador que se pueda reutilizar?
- [ ] ¿Qué equipo servirá de kiosco para el QR (portátil, tablet o celular)?
