# SENA SMART PARK: diseño

Fecha: 2026-11-10. Autor del proyecto: una sola persona (Fabio). Plazo: 3 días hasta la presentación ante el instructor del SENA.

Convención: lo marcado **[decisión del usuario]** lo dijo el usuario. Lo marcado **[mi decisión]** lo propuso quien redactó este documento y el usuario no lo ha rechazado, pero tampoco lo confirmó explícitamente.

## 1. Intención

Maqueta funcional de un parqueadero institucional del SENA con control de acceso por QR, barrera automática y detección física del vehículo. Un instructor del SENA la evalúa y revisa **software y hardware a la vez**: si falla cualquiera de los dos se nota.

Lo que debe lucir en la demo:

- Un celador (admin) identifica al aprendiz, decide si entra o sale y genera un QR.
- El aprendiz escanea el QR con el celular.
- La barrera (servo) se abre solo si el backend lo autoriza y un sensor confirma que el carrito de juguete está presente.
- Los sensores confirman que el carrito cruzó y que el puesto P01 quedó ocupado o libre.
- Todo queda registrado y se ve en vivo en el panel del celador y en el celular.

## 2. Objetivos, no objetivos y antiobjetivos

**Objetivos**

- Flujo completo de entrada y de salida, de extremo a extremo, repetible varias veces seguidas en la demo.
- MQTT como canal entre ESP32 y backend **[decisión del usuario: condición obligatoria]**.
- Usar la mayor cantidad posible de los componentes que tiene, mientras haya pines **[decisión del usuario]**.
- Verificación física: sin carrito en la entrada, la barrera no abre aunque el QR sea válido.
- Detección de inconsistencias simples, que se registran como eventos.

**No objetivos**

- Despliegue en producción, HTTPS con dominio propio, alta disponibilidad, escalabilidad.
- Más de un puesto, más de una barrera, reconocimiento de placas, RFID, reservas, lista de espera.
- Autenticación del celador ni del aprendiz **[decisión del usuario: el kiosco no tiene login]**.
- Matriz LED 8x8 (1088AS): es cruda, sin driver, y necesita unos 16 pines. **[mi decisión: fuera]**.

**Antiobjetivos** (se considera fallo aunque técnicamente funcione)

- Que la barrera se abra con MQTT caído o sin autorización.
- Que la demo dependa de manipular la base de datos a mano para que funcione.
- Que una falla de un sensor secundario (OLED, telemetría) bloquee el flujo principal.

## 3. Restricciones

- Tiempo: 3 días. Persona: 1. Experiencia: poca en electrónica, buena en web **[decisión del usuario]**.
- Todo corre en localhost: backend, PostgreSQL y Angular en el computador del usuario (CachyOS). El ESP32 y el celular se conectan por WiFi.
- Hardware en uso: ESP32, LCD I2C 16x2, OLED SSD1306 0.96" I2C, servo SG90, HC-SR04, TTP223B, LEDs rojo y verde, resistencias, protoboards (ver §7).
- Repo existente: proyecto PlatformIO para ESP32 con `src/main.cpp` que ya conecta a WiFi y a **EMQX en la nube** por MQTT con TLS (puerto 8883) usando PubSubClient, lee el HC-SR04 y escribe en la LCD. Las credenciales son plantillas sin rellenar. Hay ejemplos probados en `ejemplos/` (servo, OLED, PIR, LCD). El código nuevo debe construirse sobre este repo y reutilizar sus pines y librerías.
- Pines ya usados en los ejemplos del repo: I2C SDA 21, SCL 22 (LCD en 0x27, OLED en 0x3C). En la práctica se movió la OLED a un bus aparte (SDA 16, SCL 17); HC-SR04 TRIG 5 y ECHO 18; servo 13; LEDs 25 (rojo) y 26 (verde); 27 usado como entrada en un ejemplo.
- El broker EMQX aún no existe: **se crea durante el proyecto, junto con el usuario** **[decisión del usuario]**.

## 4. Decisiones de herramientas

| Capa | Elección | Quién decidió |
|---|---|---|
| Frontend | Angular (con Angular Material) | Usuario |
| Base de datos | PostgreSQL | Usuario |
| Broker | EMQX en la nube (el que usa el repo) | Repo / usuario |
| Firmware | C++ con PlatformIO y Arduino, PubSubClient | Repo |
| Backend | Node.js + TypeScript + Express, `mqtt.js`, Socket.IO, `pg` | Mi decisión |
| Tiempo real a la web | WebSocket (Socket.IO) | Mi decisión |
| QR | Librería JS (`qrcode` o equivalente) generada en el frontend | Mi decisión |
| Docker | Solo para PostgreSQL si el usuario lo tiene; si no, PostgreSQL instalado en el sistema | Mi decisión |

## 5. Actores y pantallas

Una sola aplicación Angular con tres vistas, servida desde el computador:

1. **Kiosco / panel del celador** (`/kiosco`), en pantalla completa en el computador. Sin login. Es el puesto del celador.
   - Registrar y editar aprendices (cédula, nombre, ficha, programa) y sus vehículos (placa, tipo, marca, color).
   - Buscar aprendiz por cédula. Elegir vehículo si tiene más de uno. Marcar **Entrada** o **Salida**.
   - Al confirmar, se muestra el QR de un solo uso, con cuenta regresiva.
   - Estado en vivo: ESP32 en línea o no, carrito en la entrada, estado de la barrera, P01 libre u ocupado, temperatura y humedad.
   - Historial de accesos y de eventos (incluye accesos denegados, aperturas manuales e inconsistencias).
   - Botón de apertura manual de emergencia (queda registrado).
2. **Vista del aprendiz en el celular** (`/acceso/:token`). Sin login. Se abre al escanear el QR. Muestra "Hola {nombre}, {ENTRADA|SALIDA} con {placa}", se confirma sola al abrirse y muestra el resultado en vivo: esperando vehículo, autorizado, denegado con el motivo, completado.
3. **Pantalla de la LCD y OLED del ESP32** (no es web, ver §7).

El celular no tiene login ni botones **[decisión del usuario: la función del celular es solo escanear]**. El celador decide la dirección **[decisión del usuario]**.

## 6. Flujo funcional

### 6.1 Entrada

1. El celador busca al aprendiz por cédula, elige vehículo, marca **Entrada** y confirma. La LCD muestra el nombre del aprendiz.
2. El backend valida: aprendiz activo, vehículo registrado y activo, el vehículo no tiene un acceso activo. Si falla, se deniega con motivo y se muestra al celador y en la LCD.
3. El backend crea una `autorizacion_qr` (token aleatorio de un solo uso, vigencia 60 s, guardado como hash) y el kiosco muestra el QR. La URL del QR usa la IP local del computador, no `localhost` **[mi decisión]**.
4. El aprendiz escanea. La página móvil consume el token (se marca como usado) y pasa la autorización a `ESPERANDO_VEHICULO`.
5. El backend espera a que el HC-SR04 (vehículo frente a la barrera) reporte presencia. Si no aparece en un tiempo límite (30 s, ajustable), la autorización caduca y se registra el evento `AUTORIZADO_SIN_VEHICULO` **[mi decisión]**.
6. Con vehículo presente, el backend publica el comando de apertura con un `cmd_id` único. El ESP32 abre el servo y confirma por MQTT.
7. El ESP32 deduce el paso cuando el vehículo, que estaba frente al HC-SR04 con la barrera abierta, deja de verse, y publica `cruce`. El backend ordena cerrar. Si el vehículo no cruza, el tiempo máximo cierra la barrera (`VEHICULO_NO_CRUZO`).
8. Tras el cruce, el backend espera `ESTACIONAR_MS` (3 s por defecto), registra el acceso como `DENTRO` con hora de entrada y puesto P01, y marca P01 ocupado desde la base de datos (P01 no tiene sensor).

### 6.2 Salida

Igual que la entrada, con estas diferencias:

- El celador marca **Salida**. El backend exige que exista un acceso `DENTRO` de ese vehículo.
- El HC-SR04 debe ver el vehículo frente a la barrera.
- Tras el cruce, el backend espera `ESTACIONAR_MS`, cierra el acceso como `FINALIZADO`, calcula la permanencia y marca P01 libre.

### 6.3 Inconsistencias que se registran como evento

- Autorización sin vehículo detectado.
- Entrada que nunca ocupó P01.
- Salida con P01 todavía ocupado.
- P01 ocupado sin acceso `DENTRO` activo.
- P01 pasa de ocupado a libre sin una salida autorizada.
- ESP32 sin heartbeat.

### 6.4 Reglas de negocio

1. Un vehículo tiene a lo sumo un acceso activo (restricción única parcial en la base de datos).
2. P01 tiene a lo sumo un acceso activo.
3. No se autoriza entrada con P01 ocupado ni salida sin acceso activo.
4. No se abre la barrera sin vehículo detectado y sin autorización vigente.
5. El QR es de un solo uso y caduca en 60 s. No contiene datos personales, solo el token.
6. Si el ESP32 pierde MQTT, la barrera queda **cerrada** y la LCD lo indica. Ningún comando de apertura se ejecuta dos veces ni con más de unos segundos de antigüedad (`cmd_id` y vigencia).

## 7. Hardware y pines (revisión 2026-11-11, definida por el usuario)

Se retiran LM393, TCRT5000, HC-SR501, DHT11 y FC-28. El HC-SR04 pasa de vigilar P01 a vigilar la aproximación a la barrera. No lleva relé.

Alimentación: ESP32 por USB. Riel de 5 V tomado de VIN: servo, HC-SR04 y LCD. Riel de 3,3 V: OLED y TTP223B. Los GND de todo van unidos. ECHO del HC-SR04 entrega 5 V y pasa por divisor de resistencias (100 Ω arriba y 220 Ω a GND, ≈3,4 V) antes del ESP32. Si el servo reinicia el ESP32 al moverse, se agrega un condensador (470 µF) en el riel de 5 V o una fuente aparte.

| Función | Componente | GPIO |
|---|---|---|
| I2C SDA / SCL | LCD 0x27 | 21 / 22 |
| I2C aparte (Wire1) SDA / SCL | OLED 0x3C | 16 / 17 |
| Vehículo cerca de la barrera (habilita el escaneo del QR) | HC-SR04 TRIG / ECHO | 5 / 18 (eco con divisor) |
| Barrera | Servo SG90 | 13 |
| LED rojo / verde | indicadores | 25 / 26 |
| Mantenimiento / apertura manual | TTP223B | 27 |

Sensado sin LM393 ni TCRT5000: el HC-SR04 es el único sensor de vehículo. «Vehículo presente» = distancia menor al umbral durante varias lecturas seguidas. «Pasó» = estuvo presente, la barrera abrió y dejó de estar presente. P01 ya no tiene sensor: el backend lo marca ocupado al finalizar una entrada y libre al finalizar una salida. Prioridad: HC-SR04 y servo son críticos; el resto no bloquea el flujo.

Pantallas del ESP32: la LCD muestra instrucciones, el nombre del aprendiz y el resultado de la autorización. La OLED rota páginas cada 4 s: (1) estado: WiFi, MQTT, barrera y vehículo; (2) distancia del HC-SR04 en grande; (3) barrera: estado, ángulo y LED; (4) red: SSID, IP y señal; (5) sistema: tiempo encendido, memoria libre y broker; (6) último mensaje recibido y texto de la LCD.

## 8. Comunicación MQTT (propuesta de contrato)

Prefijo `senapark/`. Mensajes en JSON. El backend es la única fuente de decisión: el ESP32 reporta y ejecuta, no decide autorizaciones.

ESP32 → backend:

- `senapark/estado`: `online`/`offline`, con Last Will y retenido.
- `senapark/sensores/entrada`: `{presente: bool, distancia_cm}` en cada cambio de presencia, cuando la distancia varía 3 cm (máx. cada 0,5 s) y cada 5 s como latido.
- `senapark/sensores/paso`: `{evento: "cruce"}`, deducido por el firmware con el HC-SR04.
- `senapark/telemetria`: `{rssi, uptime_s, ip, heap, angulo}` cada 5 s.
- `senapark/barrera/estado`: `{estado: "abierta"|"cerrada", cmd_id}`.
- `senapark/manual`: solicitud de apertura o de modo mantenimiento hecha con el TTP223B. Es solo una solicitud: el backend la aprueba o la rechaza y queda en el historial. El ESP32 nunca abre por su cuenta. **[mi decisión]**

Backend → ESP32:

- `senapark/cmd/barrera`: `{cmd_id, accion: "abrir"|"cerrar", expira_en_ms}`.
- `senapark/cmd/lcd`: `{linea1, linea2}`.
- `senapark/cmd/indicador`: estado de LEDs y OLED.

QoS 1 para comandos y estados. Credenciales y certificado en archivos fuera de git (`.env` para el backend, cabecera `secrets.h` ignorada para el firmware).

## 9. Modelo de datos (PostgreSQL, reducido)

Todas las tablas con `activo`, `fecha_creacion`, `fecha_modificacion` cuando corresponda.

- `aprendices`: id, cedula (única), nombre, ficha, programa, jornada, activo.
- `vehiculos`: id, aprendiz_id, placa (única), tipo, marca, color, activo.
- `espacios`: id, codigo (P01), estado.
- `autorizaciones_qr`: id, token_hash, aprendiz_id, vehiculo_id, direccion (ENTRADA/SALIDA), estado, expira_en, usado_en.
- `accesos`: id, aprendiz_id, vehiculo_id, espacio_id, entrada_en, salida_en, estado.
- `eventos`: id, tipo, detalle (jsonb), fecha.
- Lecturas de sensores: solo los últimos valores y los cambios relevantes van a `eventos`. No se crean tablas de dispositivos ni sensores en esta versión **[mi decisión]**.

Sin tablas de usuarios ni roles, porque no hay login.

## 10. Estados y seguridad ante fallos

Máquina de estados por autorización en el backend: `CREADA → ESPERANDO_VEHICULO → AUTORIZADA → BARRERA_ABIERTA → CRUZANDO → (espera ESTACIONAR_MS) → FINALIZADA`. Estados de salida lateral: `DENEGADA`, `EXPIRADA`, `ERROR_SENSOR`, `ERROR_MQTT`, `TIEMPO_AGOTADO`. El ESP32 mantiene su propia máquina mínima (`CERRADA`, `ABRIENDO`, `ABIERTA`, `CERRANDO`, `SEGURO`) y entra en `SEGURO` (barrera cerrada) si pierde WiFi o MQTT.

## 11. Orden de construcción y recortes

Plan de 3 días (guía, lo ajusta el plan de implementación):

1. **Día 1, hardware y MQTT.** EMQX creado, ESP32 conectado, servo, HC-SR04 y LCD funcionando y publicando por MQTT. Diagrama de conexiones validado.
2. **Día 2, backend, base de datos y kiosco.** PostgreSQL, reglas, máquina de estados, MQTT en el backend, panel del celador, QR.
3. **Día 3, vista móvil, integración y ensayo.** Página móvil, tiempo real, pruebas de casos límite, ensayo completo de la demo.

Si el tiempo aprieta, se recorta en este orden: OLED, estadísticas y gráficas. Nunca se recortan: MQTT, QR de un solo uso, verificación física con el HC-SR04, historial.

## 12. Riesgos conocidos

- **Red de la demo:** ESP32, computador y celular deben estar en la misma red, y el ESP32 y el backend necesitan salida a internet por el puerto 8883 hacia EMQX. Una red institucional puede bloquear el puerto o aislar clientes. Plan B: hotspot del celular o router propio.
- **Firewall del computador:** debe permitir conexiones entrantes al puerto del backend y de Angular desde la red local.
- **Sensor de presencia/paso en una maqueta pequeña:** el HC-SR04 requiere calibrar el umbral (20 cm con histéresis a 28 cm) según el tamaño del carrito.
- **Servo y reinicios:** brownouts del ESP32 al mover el SG90.
- **Una sola persona:** el riesgo mayor es el tiempo, por eso el recorte en §11.

## 13. Lo que se deja al constructor

- Estructura exacta de carpetas del monorepo (backend, frontend y firmware, conservando el proyecto PlatformIO existente en la raíz).
- Librería de QR, forma de migraciones SQL, estilo de Angular Material y organización de componentes.
- Valores de calibración, tiempos límite exactos, histéresis y umbrales de los sensores.
- Formato definitivo de los mensajes MQTT y nombres de topics, respetando el contrato de §8.
- Si usar Docker para PostgreSQL.

## 14. Decisiones menores tomadas por mí (el usuario puede revertirlas)

- **EMQX:** se crea el despliegue gratuito (serverless) en el día 1 junto con el usuario. El ESP32 usa TLS 8883 con el certificado CA (`setCACert`, como el repo). El backend se conecta al mismo broker por TLS 8883 con credenciales propias, distintas a las del ESP32.
- **Comandos viejos:** el ESP32 se conecta con `clean session` y descarta cualquier comando de apertura que llegue con `expira_en_ms` vencido (contado desde que lo recibe). Al reconectar no ejecuta nada pendiente.
- **IP del QR:** el backend toma la IP local del computador al arrancar y la usa en la URL del QR. Se puede forzar con la variable `PUBLIC_URL` en `.env` (necesario si cambia con un hotspot). Todo va por HTTP plano.
- **Un solo origen:** el backend Express sirve la versión compilada de Angular en un único puerto. Ese es el puerto que se abre en el firewall. `ng serve` solo se usa para desarrollar.
- **Escaneo:** el celular usa su cámara nativa, que abre la URL. No se construye un lector de QR dentro de la app.
- **Estado inicial de P01:** si al arrancar P01 aparece ocupado sin un acceso `DENTRO`, se registra el evento `P01_OCUPADO_SIN_ACCESO` y se bloquean las entradas hasta que se resuelva.
- **Reinicio de la demo:** el kiosco tiene un botón "Reiniciar demo" que cierra accesos activos y limpia autorizaciones pendientes, para ensayar varias veces sin tocar la base de datos.
- **Modo simulado:** el kiosco tiene un modo oculto de pruebas que permite simular las lecturas del HC-SR04 (distancia y cruce) (publicando por MQTT como si fuera el ESP32). Sirve para desarrollar el backend y para ensayar la demo si un sensor falla.
