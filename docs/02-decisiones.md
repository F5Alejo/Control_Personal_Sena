# 02 · Registro de decisiones

Cada decisión tiene opciones, una recomendación y su estado. Las decisiones **propuestas** deben ser confirmadas por
el equipo; una vez **aceptadas**, solo se cambian agregando una nueva entrada que explique por qué.

| ID | Tema | Recomendación | Estado |
|---|---|---|---|
| D-01 | Tipos de vehículo | Carros y motos en el modelo de datos; maqueta con 3 espacios de carro + 1 de moto | Propuesta |
| D-02 | Asignación de espacios | Automática por el backend; el administrador puede reasignar o bloquear | Propuesta |
| D-03 | Método de identificación | Solo QR dinámico en el MVP; RFID como trabajo futuro | Propuesta |
| D-04 | Stack del backend | Node.js + TypeScript (NestJS) | Propuesta |
| D-05 | Capacidad de la maqueta | 4 espacios | Propuesta |
| D-06 | Pantalla del QR | Kiosco web en un portátil, tablet o celular existente (no comprar TFT) | Propuesta |
| D-07 | Portería | 1 barrera bidireccional con 2 sensores IR que detectan la dirección | Propuesta |
| D-08 | Canal de notificación | Bot de Telegram para el administrador + notificaciones en la app | Propuesta |
| D-09 | Agente | Agente supervisor (reglas) + consultas en lenguaje natural como extensión | Propuesta — depende del instructor |
| D-10 | Herramienta de firmware | PlatformIO (VS Code) con framework Arduino; Wokwi para simular | Propuesta |
| D-11 | Organización del código | Monorepo; mover el proyecto PlatformIO actual a `firmware/` | Propuesta |
| D-12 | Broker MQTT | EMQX Cloud (el de la plantilla del curso); Mosquitto local opcional | Propuesta |
| D-13 | Orden del frontend | Construir la web primero con datos simulados, detrás de un contrato de API | Aceptada |
| D-14 | Versión de Angular | Angular 21 (LTS) con Angular Material | Aceptada |

---

### D-01 · Tipos de vehículo

- **Opciones:** solo carros · solo motos · ambos.
- **Recomendación:** ambos en la base de datos (campo `tipo` en vehículos y espacios). En la maqueta, 3 espacios de carro y 1 de moto.
- **Por qué:** cuesta solo un campo y una regla (RN-11), pero demuestra asignación inteligente y refleja la realidad de los parqueaderos del SENA, donde abundan las motos.

### D-02 · Asignación de espacios

- **Opciones:** automática · elegida por el aprendiz · asignada por el administrador.
- **Recomendación:** **automática** — el backend elige el primer espacio libre, compatible y confirmado como libre por su sensor. El administrador puede reasignar o marcar un espacio "fuera de servicio".
- **Por qué:** es una de las funcionalidades diferenciadoras, evita conflictos entre aprendices y permite detectar si el vehículo se ubicó en otro espacio.

### D-03 · Método de identificación

- **Opciones:** solo QR · QR + RFID.
- **Recomendación:** **solo QR dinámico**. Respaldo operativo: apertura manual registrada (botón táctil o panel).
- **Por qué:** no requiere compras (el RC522 no está en el inventario) y el QR ya cubre identificación + autenticación desde el celular. RFID queda como trabajo futuro.

### D-04 · Stack del backend

- **Opciones:** Python Flask · Node.js (Express) · Node.js (NestJS).
- **Recomendación:** **Node.js + TypeScript con NestJS**.
- **Por qué:**
  - Un solo lenguaje (TypeScript) en frontend y backend; se pueden compartir tipos de datos.
  - NestJS tiene la misma estructura que Angular (módulos, servicios, inyección de dependencias), así que lo aprendido en uno sirve en el otro.
  - Trae soporte para WebSocket y MQTT, y se integra bien con PostgreSQL.
- **Alternativa válida:** Flask (+ paho-mqtt + Flask-SocketIO) si el equipo domina más Python. Lo importante es elegir uno y no cambiar.

### D-05 · Capacidad de la maqueta

- **Recomendación:** **4 espacios** (P01–P04). El modelo de datos admite cualquier capacidad, configurable desde el panel.

### D-06 · Pantalla del QR

- **Problema:** la LCD y la OLED disponibles no sirven para mostrar un QR escaneable.
- **Recomendación:** una página web de **kiosco** (`/kiosco`) abierta en un portátil, tablet o celular que ya tenga el equipo, ubicada junto a la barrera. El backend genera el QR; el ESP32 no interviene. La LCD muestra las instrucciones ("Escanee el QR de la pantalla").
- **Por qué:** cero compras, mejor resolución y el QR se actualiza en tiempo real por WebSocket.

### D-07 · Portería

- **Opciones:** 1 barrera para entrada y salida · 2 barreras (entrada y salida separadas).
- **Recomendación:** **1 barrera en un carril bidireccional** con 2 sensores IR: **IR-A** del lado exterior y **IR-B** del lado interior.
  - IR-A se activa y luego IR-B → el vehículo **entró**.
  - IR-B se activa y luego IR-A → el vehículo **salió**.
  - La barrera se cierra cuando ambos sensores quedan libres (no baja sobre el vehículo).
  - El backend sabe además si la solicitud es de entrada o salida por el estado del vehículo (RN-09); los sensores lo confirman físicamente.
- **Por qué:** usa un solo servo y los sensores disponibles. Si el instructor exige entrada y salida separadas y hay un segundo servo, el diseño se duplica sin cambiar la lógica.

### D-08 · Canal de notificación

- **Opciones:** bot de Telegram · correo (SMTP) · Web Push (PWA).
- **Recomendación:** **bot de Telegram** para el administrador + notificaciones dentro de la app para el aprendiz.
- **Por qué:** gratuito, llega al celular en segundos, se implementa con una petición HTTP y es fácil de mostrar en vivo durante la presentación. Web Push requiere service worker, HTTPS y permisos del navegador; queda como mejora.
- **Nota:** la plantilla del curso (`src/main.cpp` en `main`) publica mensajes en el tópico MQTT `notificaciones`. Es posible que el instructor considere eso como "la notificación" mínima; en ese caso Telegram es valor agregado. **⚠ Confirmar.**

### D-09 · Agente

- **Interpretaciones posibles:** agente de IA con modelo de lenguaje · agente inteligente reactivo · chatbot.
- **Recomendación (en dos niveles):**
  1. **Agente supervisor** (núcleo, sin dependencias externas): cada pocos segundos *percibe* el estado físico (sensores) y digital (base de datos), *decide* si hay una anomalía (tabla de inconsistencias en `03-arquitectura.md`) y *actúa*: crea la alerta, la clasifica por severidad y notifica.
  2. **Extensión conversacional:** el administrador pregunta en lenguaje natural por Telegram o desde el panel ("¿cuántos espacios libres hay?", "¿quién ocupa P03?", "resume el día") y un modelo de lenguaje responde usando consultas de **solo lectura** a la API.
- **Estado:** se define cuando el instructor aclare qué espera (ver `00-requisitos-del-curso.md` §4). Se implementa en la última fase para no poner en riesgo el MVP.

### D-10 · Herramienta de firmware

- **Recomendación:** **PlatformIO** en VS Code con framework Arduino (las librerías quedan fijadas en `platformio.ini` y cualquier integrante compila igual). **Wokwi** para simular el ESP32 con servo, HC-SR04, PIR, LCD I2C, OLED y matriz MAX7219 antes de montar.
- **Alternativa:** Arduino IDE, documentando versiones de librerías.

### D-11 · Organización del código

- **Recomendación:** **monorepo** con carpetas `firmware/`, `backend/`, `frontend/`, `infra/`, `docs/`, `maqueta/` y `presentacion/`.
- **Por qué:** un solo lugar para el entregable "Código"; los contratos (tópicos MQTT, API) se versionan junto al código que los usa.
- **Estado actual:** el proyecto PlatformIO está en la raíz (`src/`, `include/`, `lib/`, `test/`, `ejemplos/`, `platformio.ini`). Al iniciar la Fase 1 se mueve a `firmware/`, de acuerdo con quien lo subió, antes de que existan `backend/` y `frontend/`; si no, un `src/` en la raíz se confunde con el código del backend. En VS Code se abre la carpeta `firmware/` para que PlatformIO la reconozca.

### D-12 · Broker MQTT

- **Opciones:** EMQX Cloud (en internet, con TLS) · Mosquitto local en Docker.
- **Recomendación:** **EMQX Cloud** como broker principal, porque es el que usa la plantilla del curso, ya incluye TLS y lo alcanzan tanto el ESP32 (desde la red del SENA) como el backend sin abrir puertos. Mosquitto en Docker queda como opción para desarrollar sin internet.
- **Consecuencia:** la arquitectura no cambia (MQTT es el mismo protocolo); cambian la dirección del broker y la gestión de usuarios y permisos, que se hace en el panel de EMQX.
- **Limitación a tener en cuenta:** la librería de la plantilla, **PubSubClient**, solo *publica* con QoS 0 (sí se *suscribe* con QoS 1). En la Fase 2 se decide entre mantenerla y compensar con confirmaciones de aplicación (*ack*), o cambiar a una librería con QoS 1 al publicar (p. ej. espMqttClient).

### D-13 · Orden del frontend

- **Decisión:** adelantar la plataforma web (Fase 4) con **datos simulados**, antes del backend.
- **Por qué:** el equipo puede avanzar en paralelo (hardware, backend y web), las pantallas se validan pronto con el
  instructor y los modelos de la web definen el contrato que el backend debe cumplir.
- **Cómo se evita rehacer trabajo:** las pantallas solo usan los contratos `ParqueaderoApi` y `AuthApi`; conectar el
  backend es cambiar un proveedor (ver `05-plataforma-web.md`).

### D-14 · Versión de Angular

- **Decisión:** **Angular 21** (versión con soporte extendido, LTS) con Angular Material y Chart.js.
- **Por qué:** Angular 22 exige Node 22.22.3 o superior; Angular 21 funciona con Node 20.19+, 22.12+ y 24, lo que
  evita problemas en los equipos del SENA. Tiene soporte de seguridad durante todo el proyecto.
- **Nota:** se versiona `package-lock.json` y se instala con `npm ci`, porque npm 10 falla al resolver las
  dependencias de pruebas desde cero.
